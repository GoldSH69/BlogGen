/**
 * Free AI Image Generation & WebP Conversion Service
 * Uses Pollinations.ai FLUX.1 engine (No API key / 100% Free)
 * Converts to optimized WebP format for Naver Blog SEO
 */

/**
 * Generates an image via Pollinations.ai (FLUX.1 model) and returns it as a Blob.
 *
 * @param {string} prompt - Image generation prompt (English descriptive prompt recommended)
 * @param {object} options - Options { width, height, model, seed, timeoutMs }
 * @returns {Promise<Blob>}
 */
export async function generateFreeImageBlob(prompt, options = {}) {
  const {
    width = 1200,
    height = 514,
    model = 'flux',
    seed = Math.floor(Math.random() * 10000000),
    timeoutMs = 60000
  } = options;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('이미지 생성을 위한 프롬프트가 비어 있습니다.');
  }

  const encodedPrompt = encodeURIComponent(prompt.trim());
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&model=${model}&seed=${seed}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`이미지 서버 응답 오류 (상태 코드: ${response.status})`);
    }

    const blob = await response.blob();
    return blob;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('이미지 생성 시간이 초과되었습니다 (60초). 잠시 후 다시 시도해 주세요.', { cause: err });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Converts an image Blob into an optimized WebP DataURL with center-cover cropping.
 *
 * @param {Blob} blob - Image Blob
 * @param {number} targetWidth - Target width (e.g. 1200)
 * @param {number} targetHeight - Target height (e.g. 514)
 * @param {number} quality - WebP quality 0.0 - 1.0 (default 0.88)
 * @returns {Promise<{ webpUrl: string, width: number, height: number }>}
 */
export function convertBlobToWebP(blob, targetWidth = 1200, targetHeight = 514, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas 2D context를 생성할 수 없습니다.'));
          return;
        }

        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;
        let sx, sy, sWidth, sHeight;

        if (imgRatio > targetRatio) {
          sHeight = img.height;
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
          sy = 0;
        } else {
          sWidth = img.width;
          sHeight = img.width / targetRatio;
          sx = 0;
          sy = (img.height - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        const webpUrl = canvas.toDataURL('image/webp', quality);

        URL.revokeObjectURL(objectUrl);
        resolve({ webpUrl, width: targetWidth, height: targetHeight });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 로드하는 중 오류가 발생했습니다.'));
    };

    img.src = objectUrl;
  });
}

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
