/**
 * High-Quality FLUX Image Generation & WebP Conversion Service
 * 100% Free, Zero Google Quota / Billing Dependency.
 * Generates 1344x576 photorealistic images via FLUX (exact 1200:514 aspect,
 * zero crop waste) with multi-tier fallbacks, and converts to pixel-perfect
 * 1200x514 WebP with center crop for professional Naver Blog SEO.
 * NOTE: Top-crop watermark removal was for Gemini (SynthID) only.
 * FLUX path uses center crop (no aggressive cut).
 */

// Candidate FLUX models in priority order (turbo excluded: SDXL-Turbo draft quality)
const FLUX_MODELS = ['flux', 'flux-realism'];

/**
 * Automatically enhances image prompts to emphasize aesthetic still life,
 * modern Korean domestic atmosphere, and strictly avoid awkward human faces/watermarks.
 *
 * @param {string} prompt 
 * @returns {string}
 */
export function enhancePromptForKoreanContext(prompt) {
  if (!prompt || typeof prompt !== 'string') return '';
  let p = prompt.trim();

  // Check if human face/person keywords exist
  const hasHumanKeywords = /(?:person|woman|man|people|girl|boy|model|face|female|male|family|portrait)/i.test(p);
  const alreadyMentionsKorean = /(?:korean|south korea|seoul|east asian)/i.test(p);

  const additions = [];

  if (hasHumanKeywords) {
    if (!alreadyMentionsKorean) {
      additions.push('authentic modern South Korean lifestyle aesthetic, East Asian look');
    }
    additions.push('strictly no Caucasian, no Western people, no foreign models, no distorted facial features, no uncanny valley');
  }

  // Ensure Korean domestic living / studio aesthetic if setting/interior is mentioned
  const hasSettingKeywords = /(?:room|kitchen|living|apartment|house|home|interior|office|store|cafe|shop|desk|table|indoor|lifestyle|studio)/i.test(p);
  if (hasSettingKeywords && !alreadyMentionsKorean) {
    additions.push('contemporary South Korean interior atmosphere, clean minimalist aesthetic');
  }

  // Quality, lighting, and watermark elimination tags
  additions.push('soft natural morning sunlight, aesthetic editorial photography, 8k uhd, clean composition');

  if (!/(?:no watermark|no text)/i.test(p)) {
    additions.push('strictly no text, no watermark, no logo');
  }

  if (additions.length > 0) {
    p = `${p}, ${additions.join(', ')}`;
  }

  // Safe truncation to avoid URL limit issues in GET requests
  if (p.length > 700) {
    p = p.slice(0, 700).replace(/,[^,]*$/, '');
  }

  return p;
}

/**
 * Loads an image from a URL into an HTML Image element with crossOrigin support,
 * then renders it onto an offscreen canvas and converts it to a Data URL.
 * Used as a reliable fallback if direct fetch() is blocked by CORS.
 *
 * @param {string} url 
 * @param {number} timeoutMs 
 * @returns {Promise<string>} Data URL
 */
function loadImageViaElement(url, timeoutMs = 35000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('이미지 로딩 시간 초과 (35초)'));
    }, timeoutMs);

    img.onload = () => {
      cleanup();
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context 생성 실패'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(dataUrl);
      } catch (err) {
        // Tainted canvas fallback: return direct URL if CORS tainted
        resolve(url);
      }
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('이미지 엘리먼트 로드 실패'));
    };

    img.src = url;
  });
}

/**
 * Generates an image using FLUX with multi-tier model fallback.
 * 100% Free, zero billing, zero quota error.
 *
 * @param {string} prompt - Image generation prompt
 * @param {object} options - Options { timeoutMs, width, height }
 * @returns {Promise<Blob|string>} Raw image Blob or Data URL (1344x576)
 */
export async function generateFluxImage(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('이미지 생성을 위한 프롬프트가 비어 있습니다.');
  }

  const { timeoutMs = 35000, width = 1344, height = 576 } = options;
  const cleanPrompt = prompt.trim();
  const finalPrompt = enhancePromptForKoreanContext(cleanPrompt);
  const encodedPrompt = encodeURIComponent(finalPrompt);
  const seed = Math.floor(Math.random() * 1000000);

  let lastError = null;

  for (const model of FLUX_MODELS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true&private=true`;

    try {
      // Step 1: Try direct fetch with Blob response
      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: { 'Accept': 'image/*' },
        signal: controller.signal
      });

      if (response.ok) {
        const blob = await response.blob();
        if (blob && blob.size > 2000 && blob.type.startsWith('image/')) {
          return blob;
        }
      }

      // If fetch response was not ok, try Step 2 (Image element loading)
      const dataUrl = await loadImageViaElement(imageUrl, timeoutMs);
      if (dataUrl) return dataUrl;

      throw new Error(`[${model}] 이미지 응답 수신 실패`);
    } catch (err) {
      if (err.name === 'AbortError') {
        lastError = new Error(`[${model}] 서버 응답 지연 (35초 초과)`);
      } else {
        // If fetch failed (e.g. CORS), attempt image element fallback once before giving up this model
        try {
          const fallbackDataUrl = await loadImageViaElement(imageUrl, 15000);
          if (fallbackDataUrl) return fallbackDataUrl;
        } catch {
          lastError = err;
        }
      }
      console.warn(`Model [${model}] failed or timed out, trying next fallback...`, err.message);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`AI 이미지 생성에 실패했습니다: ${lastError ? lastError.message : '무료 이미지 서버 일시 혼잡'}. 잠시 후 다시 시도해 주세요.`);
}

/**
 * Backward compatibility alias for existing callers
 */
export const generateGeminiFlashImage = generateFluxImage;

/**
 * Converts an image source (DataURL, Blob, or URL) into an optimized WebP DataURL with center cropping.
 * By default, crops from the center to preserve composition (FLUX path, no watermark).
 * Pass cropPosition='top' only for Gemini legacy outputs with a bottom watermark.
 *
 * @param {Blob|string} imageSource - Image Blob, DataURL, or image URL
 * @param {number} targetWidth - Target width (default 1200)
 * @param {number} targetHeight - Target height (default 514)
 * @param {number} quality - WebP quality 0.0 - 1.0 (default 0.88)
 * @param {'top'|'center'} cropPosition - Cropping alignment (default 'center'; 'top' = Gemini legacy only)
 * @returns {Promise<{ webpUrl: string, width: number, height: number }>}
 */
export function convertImageToWebP(imageSource, targetWidth = 1200, targetHeight = 514, quality = 0.88, cropPosition = 'center') {
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
          // 'top' = Gemini legacy only (slices bottom watermark). FLUX uses center.
          sx = cropPosition === 'top' ? 0 : (img.width - sWidth) / 2;
          sy = 0;
        } else {
          sWidth = img.width;
          sHeight = img.width / targetRatio;
          sx = 0;
          // 'top' = Gemini legacy (cuts bottom watermark). FLUX uses center to preserve composition.
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
