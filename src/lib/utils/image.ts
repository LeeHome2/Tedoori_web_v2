/**
 * Image compression and upload utilities
 */

import imageCompression from 'browser-image-compression';

/**
 * Default image compression options
 */
export const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/webp' as const,
};

/**
 * Compress an image file to WebP format
 * @param file - Original image file
 * @returns Compressed WebP file
 */
export async function compressImage(file: File): Promise<File> {
  console.log('Compressing image...', file.name, file.type, file.size);

  const compressedFile = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);

  console.log('Compressed:', compressedFile.name, compressedFile.type, compressedFile.size);

  // Rename file to have .webp extension
  const webpFile = new File(
    [compressedFile],
    `${Date.now()}.webp`,
    { type: 'image/webp' }
  );

  return webpFile;
}

/**
 * Upload an image file to the server
 * @param file - File to upload (will be compressed first)
 * @returns URL of the uploaded image
 * @throws Error if upload fails
 */
export async function uploadImage(file: File): Promise<string> {
  try {
    // Compress image
    const compressedFile = await compressImage(file);

    // Create form data
    const formData = new FormData();
    formData.append('file', compressedFile);

    console.log('Uploading to /api/upload...');

    // Upload to server
    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    console.log('Upload response status:', uploadRes.status);
    const uploadData = await uploadRes.json();
    console.log('Upload response data:', uploadData);

    if (!uploadRes.ok) {
      throw new Error(uploadData.error || 'Upload failed');
    }

    return uploadData.url;
  } catch (error: any) {
    console.error('Failed to upload image', error);
    throw new Error(`Failed to upload image: ${error.message || error}`);
  }
}

/**
 * Generate HTML img tag for an uploaded image
 * @param url - Image URL
 * @param alt - Alt text (default: 'Uploaded image')
 * @returns HTML img tag string
 */
export function generateImageHtml(url: string, alt: string = 'Uploaded image'): string {
  return `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
}
