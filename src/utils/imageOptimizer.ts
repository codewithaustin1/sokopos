/**
 * Image optimization utility for platform branding and background graphics.
 * Automatically compresses and scales images to ensure crisp 1080p full-bleed rendering
 * while staying well within localStorage and Firestore document size quotas.
 */

export async function processAndOptimizeImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.84,
  outputFormat: 'auto' | 'image/png' | 'image/jpeg' | 'image/webp' = 'auto'
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If SVG or ICO, read as direct data URL
    if (file.type === 'image/svg+xml' || file.type === 'image/x-icon' || file.name.endsWith('.ico') || file.name.endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect-ratio preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original data URL if 2D context fails
          resolve(readerEvent.target?.result as string);
          return;
        }

        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Determine output MIME type
        const isPng =
          outputFormat === 'image/png' ||
          (outputFormat === 'auto' && (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')));
        
        const mimeType = isPng ? 'image/png' : outputFormat === 'image/webp' ? 'image/webp' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image file for optimization'));
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
