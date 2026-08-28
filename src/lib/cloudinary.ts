import { compressImage } from './imageCompressor';

const meta = import.meta as any;
const CLOUD_NAME = meta.env?.VITE_CLOUDINARY_CLOUD_NAME || 'demo';
const UPLOAD_PRESET = meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET || '';

/**
 * Upload Image with Client-Side Smart Compression
 * If Cloudinary preset is not yet configured, returns the compressed WebP Data URL directly
 * so the app continues to function seamlessly out of the box!
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

  // 2. If Cloudinary is configured with custom upload preset, upload directly
  if (UPLOAD_PRESET && CLOUD_NAME !== 'demo') {
    try {
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'nineteen_exam');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        return {
          url: result.secure_url || result.url,
          sizeReductionPercent
        };
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
 * Upload Audio File for Listening Exams
 */
export async function uploadQuestionAudio(file: File): Promise<string> {
  if (UPLOAD_PRESET && CLOUD_NAME !== 'demo') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'nineteen_exam_audio');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
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
