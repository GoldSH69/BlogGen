/**
 * Safe Google Gemini Flash Image (Nano Banana) Generation & WebP Conversion Service
 * Uses Google's official Flash Image models (gemini-2.5-flash-image, gemini-3.1-flash-image)
 * with multi-stage fallback to Imagen 3, utilizing the user's existing Gemini API key.
 * Converts to pixel-perfect 1200x514 WebP format for Naver Blog SEO.
 */

import { getApiKey } from './gemini';

const FLASH_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image',
  'gemini-3.1-flash-lite-image'
];

/**
 * Automatically enhances image prompts to ensure authentic Korean demographic representation,
 * domestic Korean environment/aesthetic, and strict avoidance of Western/foreigners.
 *
 * @param {string} prompt 
 * @returns {string}
 */
export function enhancePromptForKoreanContext(prompt) {
  if (!prompt || typeof prompt !== 'string') return '';
  let p = prompt.trim();

  // Check if human/person keywords exist
  const hasHumanKeywords = /(?:person|woman|man|people|girl|boy|model|face|female|male|family|mother|father|parent|doctor|worker|expert|customer|user|blogger|creator|couple|human|portrait)/i.test(p);
  const alreadyMentionsKorean = /(?:korean|south korea|seoul|east asian)/i.test(p);

  const additions = [];

  if (hasHumanKeywords) {
    if (!alreadyMentionsKorean) {
      additions.push('featuring authentic modern South Korean person with natural Korean facial features and hair styling');
    }
    additions.push('no Caucasian, no Western people, no foreign models');
  }

  // Ensure Korean domestic living context if setting/interior/lifestyle is mentioned
  const hasSettingKeywords = /(?:room|kitchen|living|apartment|house|home|interior|office|store|cafe|shop|desk|table|indoor|lifestyle)/i.test(p);
  if (hasSettingKeywords && !alreadyMentionsKorean) {
    additions.push('contemporary South Korean apartment interior setting, clean Korean modern aesthetic');
  }

  // Ensure no watermark or text
  if (!/(?:no watermark|no text)/i.test(p)) {
    additions.push('clean composition, no text, no watermark, no logo');
  }

  if (additions.length > 0) {
    p = `${p}, ${additions.join(', ')}`;
  }

  return p;
}

/**
 * Generates an image using Google's Flash Image (Nano Banana) models via Gemini API.
 * Employs automatic fallback across models to ensure maximum reliability and free tier safety.
 *
 * @param {string} prompt - Image generation prompt (English descriptive prompt)
 * @param {object} options - Options { timeoutMs }
 * @returns {Promise<string>} Data URL of the generated image (data:image/png;base64,...)
 */
export async function generateGeminiFlashImage(prompt, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. 우측 상단의 [설정] 버튼을 눌러 API 키를 먼저 입력해 주세요.');
  }

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('이미지 생성을 위한 프롬프트가 비어 있습니다.');
  }

  const { timeoutMs = 60000 } = options;
  const cleanPrompt = prompt.trim();
  const finalPrompt = enhancePromptForKoreanContext(cleanPrompt);
  let lastError = null;

  // 1. Try Google Gemini Flash Image (generateContent with responseModalities: ["TEXT", "IMAGE"])
  for (const model of FLASH_IMAGE_MODELS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: finalPrompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE']
          }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`[${model}] 서버 응답 오류 (${response.status}): ${errText.slice(0, 120)}`);
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData && p.inlineData.data);

      if (imagePart && imagePart.inlineData) {
        const { mimeType = 'image/png', data: base64Data } = imagePart.inlineData;
        return `data:${mimeType};base64,${base64Data}`;
      }

      throw new Error(`[${model}] 응답에 이미지 데이터가 포함되지 않았습니다.`);
    } catch (err) {
      if (err.name === 'AbortError') {
        lastError = new Error(`[${model}] 이미지 생성 시간 초과 (60초)`, { cause: err });
      } else {
        lastError = err;
      }
      console.warn(`Flash image model ${model} failed, trying next fallback:`, err.message);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 2. Final Fallback: Imagen 3.0 (:predict endpoint)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: finalPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9'
        }
      }),
      signal: controller.signal
    });

    if (response.ok) {
      const data = await response.json();
      const prediction = data.predictions?.[0];
      if (prediction && prediction.bytesBase64Encoded) {
        return `data:${prediction.mimeType || 'image/jpeg'};base64,${prediction.bytesBase64Encoded}`;
      }
    }
  } catch (err) {
    console.warn('Imagen 3 fallback also failed:', err.message);
  } finally {
    clearTimeout(timeoutId);
  }

  throw new Error(`구글 AI 이미지 생성에 실패했습니다: ${lastError ? lastError.message : '알 수 없는 오류'}`);
}

/**
 * Converts an image source (DataURL, Blob, or URL) into an optimized WebP DataURL with top-aligned cropping.
 * By default, crops from the top (sy = 0) to completely eliminate bottom-right watermarks.
 *
 * @param {Blob|string} imageSource - Image Blob, DataURL, or image URL
 * @param {number} targetWidth - Target width (default 1200)
 * @param {number} targetHeight - Target height (default 514)
 * @param {number} quality - WebP quality 0.0 - 1.0 (default 0.88)
 * @param {'top'|'center'} cropPosition - Cropping alignment ('top' cuts off bottom watermark, default 'top')
 * @returns {Promise<{ webpUrl: string, width: number, height: number }>}
 */
export function convertImageToWebP(imageSource, targetWidth = 1200, targetHeight = 514, quality = 0.88, cropPosition = 'top') {
  return new Promise((resolve, reject) => {
    let objectUrl = null;
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas 2D context를 생성할 수 없습니다.'));
          return;
        }

        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;
        let sx, sy, sWidth, sHeight;

        if (imgRatio > targetRatio) {
          sHeight = img.height;
          sWidth = img.height * targetRatio;
          // When image is wider than target ratio, align left so the right edge (watermark) is sliced off
          sx = cropPosition === 'top' ? 0 : (img.width - sWidth) / 2;
          sy = 0;
        } else {
          sWidth = img.width;
          sHeight = img.width / targetRatio;
          sx = 0;
          // Top-aligned crop: sy = 0 cleanly eliminates the bottom 190~500px containing the watermark
          sy = cropPosition === 'top' ? 0 : (img.height - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        const webpUrl = canvas.toDataURL('image/webp', quality);

        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve({ webpUrl, width: targetWidth, height: targetHeight });
      } catch (err) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 캔버스에 로드하는 중 오류가 발생했습니다.'));
    };

    if (imageSource instanceof Blob) {
      objectUrl = URL.createObjectURL(imageSource);
      img.src = objectUrl;
    } else if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      reject(new Error('지원하지 않는 이미지 소스 형식입니다.'));
    }
  });
}

// Alias for backwards compatibility
export const convertBlobToWebP = convertImageToWebP;

/**
 * Triggers a browser download for a DataURL or Blob URL.
 *
 * @param {string} url - DataURL or object URL
 * @param {string} filename - Desired download filename
 */
export function downloadDataUrl(url, filename = 'image.webp') {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.webp') ? filename : `${filename}.webp`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
