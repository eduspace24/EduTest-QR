import { compressImage, compressDataUrl, dataUrlToFile } from './imageCompressor';

const meta = import.meta as any;

export function getCloudinaryConfig(): { cloudName: string; uploadPreset: string; isConfigured: boolean } {
  const cloudName = (
    meta.env?.VITE_CLOUDINARY_CLOUD_NAME || 
    localStorage.getItem('edu_cloudinary_cloud_name') || 
    ''
  ).trim();
  const uploadPreset = (
    meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET || 
    localStorage.getItem('edu_cloudinary_upload_preset') || 
    ''
  ).trim();

  return {
    cloudName,
    uploadPreset,
    isConfigured: !!(cloudName && cloudName !== 'demo' && uploadPreset)
  };
}

export function saveCloudinaryConfig(cloudName: string, uploadPreset: string): void {
  localStorage.setItem('edu_cloudinary_cloud_name', cloudName.trim());
  localStorage.setItem('edu_cloudinary_upload_preset', uploadPreset.trim());
}

/**
 * Upload Image with Client-Side Smart Compression
 * If Cloudinary is configured (via env or localStorage), uploads to Cloudinary CDN
 * Otherwise, falls back to compressed WebP Data URL for local/offline storage.
 */
export async function uploadQuestionImage(file: File): Promise<{ url: string; sizeReductionPercent: number }> {
  // 1. Smart Client-Side Compression in Browser
  const { file: compressedFile, dataUrl, originalSize, compressedSize } = await compressImage(file, {
    maxWidth: 1400,
    maxHeight: 1400,
    quality: 0.82,
    mimeType: 'image/webp'
  });

  const sizeReductionPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

  // 2. If Cloudinary is configured, upload directly to Cloudinary CDN
  const { cloudName, uploadPreset, isConfigured } = getCloudinaryConfig();
  if (isConfigured) {
    try {
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'nineteen_exam');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        return {
          url: result.secure_url || result.url,
          sizeReductionPercent
        };
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn('Cloudinary upload response not ok:', errJson);
      }
    } catch (err) {
      console.warn('Cloudinary upload fallback to compressed Data URL:', err);
    }
  }

  // 3. Ultra-compressed WebP Data URL fallback (stored in Supabase/IndexedDB)
  return {
    url: dataUrl,
    sizeReductionPercent
  };
}

/**
 * Compress a Data URL (from Word docx or canvas) and upload to Cloudinary if preset is present.
 * If Cloudinary is not configured or fails, returns the ultra-compressed WebP data URL.
 */
export async function uploadOrCompressDataUrl(
  dataUrl: string,
  filename: string = 'image',
  options: { maxWidth?: number; maxHeight?: number; isOption?: boolean } = {}
): Promise<{ url: string; sizeReductionPercent: number; originalSize: number; compressedSize: number }> {
  const defaultMax = options.isOption ? 500 : 900;
  const maxWidth = options.maxWidth || defaultMax;
  const maxHeight = options.maxHeight || defaultMax;
  const quality = options.isOption ? 0.78 : 0.80;

  const compressed = await compressDataUrl(dataUrl, {
    maxWidth,
    maxHeight,
    quality,
    mimeType: 'image/webp'
  });

  const { cloudName, uploadPreset, isConfigured } = getCloudinaryConfig();
  if (isConfigured) {
    try {
      const file = dataUrlToFile(compressed.dataUrl, `${filename}.webp`);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'nineteen_exam');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        return {
          url: result.secure_url || result.url,
          sizeReductionPercent: compressed.sizeReductionPercent,
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize
        };
      }
    } catch (err) {
      console.warn('Cloudinary upload fallback to compressed Data URL:', err);
    }
  }

  return {
    url: compressed.dataUrl,
    sizeReductionPercent: compressed.sizeReductionPercent,
    originalSize: compressed.originalSize,
    compressedSize: compressed.compressedSize
  };
}

/**
 * Upload Audio File for Listening Exams
 */
export async function uploadQuestionAudio(file: File): Promise<string> {
  const { cloudName, uploadPreset, isConfigured } = getCloudinaryConfig();
  if (isConfigured) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'nineteen_exam_audio');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        return result.secure_url || result.url;
      }
    } catch (err) {
      console.warn('Cloudinary audio upload fallback:', err);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}
