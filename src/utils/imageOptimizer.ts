/**
 * Image validation, inspection, and optimization utility for platform branding assets.
 * Enforces format safety, file size bounds, natural dimension inspection, and Firestore-safe payload sizes.
 */

import { BrandingSlotId } from '../types';

export interface BrandingSlotSpec {
  slotId: BrandingSlotId;
  docId: string;
  label: string;
  recommendedDimensions: string;
  aspectRatioLabel: string;
  recommendedHint: string;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  outputFormat: 'auto' | 'image/png' | 'image/jpeg' | 'image/webp';
  maxFileBytes: number;
  allowIco: boolean;
  accept: string;
  formatsLabel: string;
}

export const BRANDING_SLOT_SPECS: Record<BrandingSlotId, BrandingSlotSpec> = {
  logo: {
    slotId: 'logo',
    docId: 'branding_logo',
    label: 'platform logo',
    recommendedDimensions: '400 × 100 px',
    aspectRatioLabel: '4:1 or 1:1',
    recommendedHint: 'Recommended: 400 × 100 px (4:1 horizontal) or 512 × 512 px (1:1 mark)',
    maxWidth: 800,
    maxHeight: 400,
    quality: 0.94,
    outputFormat: 'image/png',
    maxFileBytes: 2 * 1024 * 1024,
    allowIco: false,
    accept: 'image/png,image/svg+xml,image/webp,image/jpeg',
    formatsLabel: 'PNG, SVG, WebP, JPG · Max 2 MB',
  },
  favicon: {
    slotId: 'favicon',
    docId: 'branding_favicon',
    label: 'favicon',
    recommendedDimensions: '128 × 128 px',
    aspectRatioLabel: '1:1',
    recommendedHint: 'Recommended: 64 × 64 px or 128 × 128 px (1:1 square)',
    maxWidth: 128,
    maxHeight: 128,
    quality: 0.94,
    outputFormat: 'image/png',
    maxFileBytes: 2 * 1024 * 1024,
    allowIco: true,
    accept: 'image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/webp,image/jpeg,.ico',
    formatsLabel: 'PNG, ICO, SVG, WebP · Max 2 MB',
  },
  hero: {
    slotId: 'hero',
    docId: 'branding_hero',
    label: 'hero showcase visual',
    recommendedDimensions: '1920 × 1080 px',
    aspectRatioLabel: '16:9',
    recommendedHint: 'Recommended: 1920 × 1080 px (16:9 widescreen) or 1600 × 1200 px (4:3)',
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    outputFormat: 'auto',
    maxFileBytes: 5 * 1024 * 1024,
    allowIco: false,
    accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
    formatsLabel: 'PNG, JPG, WebP, SVG · Max 5 MB',
  },
  industry_retail: {
    slotId: 'industry_retail',
    docId: 'branding_industry_retail',
    label: 'Retail card photo',
    recommendedDimensions: '1200 × 900 px',
    aspectRatioLabel: '4:3',
    recommendedHint: 'Recommended: 1200 × 900 px (4:3 landscape)',
    maxWidth: 1200,
    maxHeight: 900,
    quality: 0.84,
    outputFormat: 'auto',
    maxFileBytes: 5 * 1024 * 1024,
    allowIco: false,
    accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
    formatsLabel: 'PNG, JPG, WebP · Max 5 MB',
  },
  industry_bars: {
    slotId: 'industry_bars',
    docId: 'branding_industry_bars',
    label: 'Bars card photo',
    recommendedDimensions: '1200 × 900 px',
    aspectRatioLabel: '4:3',
    recommendedHint: 'Recommended: 1200 × 900 px (4:3 landscape)',
    maxWidth: 1200,
    maxHeight: 900,
    quality: 0.84,
    outputFormat: 'auto',
    maxFileBytes: 5 * 1024 * 1024,
    allowIco: false,
    accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
    formatsLabel: 'PNG, JPG, WebP · Max 5 MB',
  },
  industry_supermarkets: {
    slotId: 'industry_supermarkets',
    docId: 'branding_industry_supermarkets',
    label: 'Supermarkets card photo',
    recommendedDimensions: '1200 × 900 px',
    aspectRatioLabel: '4:3',
    recommendedHint: 'Recommended: 1200 × 900 px (4:3 landscape)',
    maxWidth: 1200,
    maxHeight: 900,
    quality: 0.84,
    outputFormat: 'auto',
    maxFileBytes: 5 * 1024 * 1024,
    allowIco: false,
    accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
    formatsLabel: 'PNG, JPG, WebP · Max 5 MB',
  },
  industry_pharmacies: {
    slotId: 'industry_pharmacies',
    docId: 'branding_industry_pharmacies',
    label: 'Pharmacies card photo',
    recommendedDimensions: '1200 × 900 px',
    aspectRatioLabel: '4:3',
    recommendedHint: 'Recommended: 1200 × 900 px (4:3 landscape)',
    maxWidth: 1200,
    maxHeight: 900,
    quality: 0.84,
    outputFormat: 'auto',
    maxFileBytes: 5 * 1024 * 1024,
    allowIco: false,
    accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
    formatsLabel: 'PNG, JPG, WebP · Max 5 MB',
  },
};

export interface BrandingFileValidationOptions {
  allowIco?: boolean;
  maxBytes?: number;
  label?: string;
}

export interface BrandingFileValidationResult {
  valid: boolean;
  error?: string;
  extension?: string;
  formatLabel?: string;
}

export interface InspectedImageAsset {
  valid: boolean;
  width: number;
  height: number;
  aspectRatio: number;
  format?: string;
  error?: string;
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

const ALLOWED_ICO_MIME_TYPES = new Set([
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/ico',
  'application/octet-stream',
]);

export function detectImageFormatLabel(src: string, fallbackName?: string | null): string {
  const lower = (src || '').toLowerCase();
  if (lower.startsWith('data:image/svg+xml') || (fallbackName || '').toLowerCase().endsWith('.svg')) return 'SVG';
  if (lower.startsWith('data:image/png') || (fallbackName || '').toLowerCase().endsWith('.png')) return 'PNG';
  if (lower.startsWith('data:image/webp') || (fallbackName || '').toLowerCase().endsWith('.webp')) return 'WebP';
  if (
    lower.startsWith('data:image/jpeg') ||
    lower.startsWith('data:image/jpg') ||
    /\.(jpe?g)(\?|$)/i.test(lower) ||
    /\.(jpe?g)$/i.test(fallbackName || '')
  ) {
    return 'JPG';
  }
  if (
    lower.startsWith('data:image/x-icon') ||
    lower.startsWith('data:image/vnd.microsoft.icon') ||
    lower.endsWith('.ico') ||
    (fallbackName || '').toLowerCase().endsWith('.ico')
  ) {
    return 'ICO';
  }
  if (/\.png(\?|$)/i.test(lower)) return 'PNG';
  if (/\.webp(\?|$)/i.test(lower)) return 'WebP';
  if (/\.svg(\?|$)/i.test(lower)) return 'SVG';
  return 'Image';
}

export function validateBrandingAssetUrl(rawUrl: string): { valid: boolean; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'Enter an image URL to verify and apply.' };
  }
  if (trimmed.startsWith('data:image/')) {
    if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml|x-icon|vnd\.microsoft\.icon)[;,]/i.test(trimmed)) {
      return { valid: false, error: 'Data URL must be a PNG, JPG, WebP, SVG, or ICO image.' };
    }
    return { valid: true };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: 'URL must use https:// or http://.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Enter a valid https://, http://, or data:image/ URL.' };
  }
}

export function validateBrandingAssetFile(
  file: File,
  options: BrandingFileValidationOptions = {}
): BrandingFileValidationResult {
  const { allowIco = false, maxBytes = 2 * 1024 * 1024, label = 'asset' } = options;
  const nameLower = (file.name || '').toLowerCase();
  const ext = nameLower.includes('.') ? nameLower.split('.').pop() || '' : '';
  const mime = (file.type || '').toLowerCase();

  const validExtensions = allowIco
    ? ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico']
    : ['png', 'jpg', 'jpeg', 'webp', 'svg'];

  const isAllowedIco =
    allowIco &&
    (ext === 'ico'
      ? mime === '' || ALLOWED_ICO_MIME_TYPES.has(mime)
      : mime === 'image/x-icon' || mime === 'image/vnd.microsoft.icon' || mime === 'image/ico');

  const isAllowedMime =
    ALLOWED_IMAGE_MIME_TYPES.has(mime) ||
    isAllowedIco ||
    (!mime && validExtensions.includes(ext));

  if (!isAllowedMime || (ext && !validExtensions.includes(ext))) {
    const allowedText = allowIco ? 'PNG, ICO, SVG, WebP, or JPG' : 'PNG, SVG, WebP, or JPG';
    return {
      valid: false,
      error: `Unsupported file format for ${label}. Please upload a ${allowedText} file.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: `The selected ${label} file appears to be empty.`,
    };
  }

  if (file.size > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(maxBytes >= 1024 * 1024 ? 0 : 1);
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is ${maxMb} MB.`,
    };
  }

  return {
    valid: true,
    extension: ext,
    formatLabel: ext ? ext.toUpperCase() : undefined,
  };
}

function sanitizeSvgTextIfNeeded(svgText: string): string {
  const trimmed = svgText.trim();
  if (!trimmed.toLowerCase().includes('<svg')) {
    throw new Error('Invalid SVG file: missing <svg> root element.');
  }
  const hasUnsafePattern =
    /<script[\s>]/i.test(trimmed) ||
    /<foreignObject[\s>]/i.test(trimmed) ||
    /\son[a-z]+\s*=/i.test(trimmed) ||
    /javascript:/i.test(trimmed);
  if (hasUnsafePattern) {
    throw new Error('SVG contains active scripts, foreignObject, or event handlers which are blocked for security.');
  }
  return trimmed;
}

function extractSvgFallbackDimensions(src: string): { width: number; height: number } | null {
  if (!src.toLowerCase().startsWith('data:image/svg+xml')) return null;
  try {
    const commaIdx = src.indexOf(',');
    if (commaIdx === -1) return null;
    const header = src.slice(0, commaIdx).toLowerCase();
    const payload = src.slice(commaIdx + 1);
    const decoded = header.includes(';base64') ? atob(payload) : decodeURIComponent(payload);

    const widthMatch = decoded.match(/<svg[^>]*\bwidth=["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);
    const heightMatch = decoded.match(/<svg[^>]*\bheight=["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);
    if (widthMatch && heightMatch) {
      const w = Math.round(parseFloat(widthMatch[1]));
      const h = Math.round(parseFloat(heightMatch[1]));
      if (w > 0 && h > 0) return { width: w, height: h };
    }

    const viewBoxMatch = decoded.match(/viewBox=["']?\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']?/i);
    if (viewBoxMatch) {
      const w = Math.round(parseFloat(viewBoxMatch[1]));
      const h = Math.round(parseFloat(viewBoxMatch[2]));
      if (w > 0 && h > 0) return { width: w, height: h };
    }
  } catch {
    return null;
  }
  return null;
}

export function inspectImageAsset(src: string, timeoutMs = 8000): Promise<InspectedImageAsset> {
  return new Promise((resolve) => {
    if (!src || typeof src !== 'string') {
      resolve({ valid: false, width: 0, height: 0, aspectRatio: 0, error: 'Empty image source.' });
      return;
    }

    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    let settled = false;
    const format = detectImageFormatLabel(src);

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({
        valid: false,
        width: 0,
        height: 0,
        aspectRatio: 0,
        format,
        error: 'Timed out while loading image preview. Check the URL or network access.',
      });
    }, timeoutMs);

    img.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      let w = img.naturalWidth || img.width || 0;
      let h = img.naturalHeight || img.height || 0;

      if (w === 0 || h === 0) {
        const svgFallback = extractSvgFallbackDimensions(src);
        if (svgFallback) {
          w = svgFallback.width;
          h = svgFallback.height;
        }
      }

      if (w === 0 || h === 0) {
        resolve({
          valid: false,
          width: 0,
          height: 0,
          aspectRatio: 0,
          format,
          error: 'Image loaded with zero dimensions. Ensure SVGs include a viewBox or explicit width/height.',
        });
        return;
      }

      resolve({
        valid: true,
        width: w,
        height: h,
        aspectRatio: w / h,
        format,
      });
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve({
        valid: false,
        width: 0,
        height: 0,
        aspectRatio: 0,
        format,
        error: 'Unable to load image. Verify the URL points directly to a valid image file.',
      });
    };

    img.src = src;
  });
}

export function estimateAssetSizeKb(src: string): number {
  if (!src) return 0;
  if (src.startsWith('data:')) {
    return Math.max(1, Math.round((src.length * 0.75) / 1024));
  }
  return 0;
}

export async function processAndOptimizeImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.84,
  outputFormat: 'auto' | 'image/png' | 'image/jpeg' | 'image/webp' = 'auto'
): Promise<string> {
  // Handle SVG cleanly with script validation and size cap
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    const svgText = await file.text();
    const safeSvg = sanitizeSvgTextIfNeeded(svgText);
    const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(safeSvg)}`;
    if (encoded.length > 750 * 1024) {
      throw new Error('SVG asset exceeds the 750 KB cloud sync limit. Please simplify or export as PNG.');
    }
    return encoded;
  }

  // Handle ICO favicons directly with Firestore-safe size cap
  if (
    file.type === 'image/x-icon' ||
    file.type === 'image/vnd.microsoft.icon' ||
    file.type === 'image/ico' ||
    file.name.toLowerCase().endsWith('.ico')
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result.length > 750 * 1024) {
          reject(new Error('ICO favicon exceeds the 750 KB cloud sync limit. Use a 64×64 or 128×128 PNG or ICO.'));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read ICO favicon file.'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const rawDataUrl = readerEvent.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (!width || !height) {
          reject(new Error('Image has invalid dimensions (0 × 0).'));
          return;
        }

        // Preserve already-optimal raster files verbatim to prevent PNG re-encoding bloat
        const fitsBounds = width <= maxWidth && height <= maxHeight;
        if (fitsBounds && rawDataUrl && rawDataUrl.length <= 480 * 1024) {
          resolve(rawDataUrl);
          return;
        }

        // Calculate aspect-ratio preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const sourceIsPngOrWebp =
          file.type === 'image/png' ||
          file.type === 'image/webp' ||
          file.name.toLowerCase().endsWith('.png') ||
          file.name.toLowerCase().endsWith('.webp');

        const isPng =
          outputFormat === 'image/png' ||
          (outputFormat === 'auto' && (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')));

        let mimeType = isPng
          ? 'image/png'
          : outputFormat === 'image/webp'
          ? 'image/webp'
          : 'image/jpeg';
        let dataUrl = canvas.toDataURL(mimeType, quality);

        // Ensure payload stays safely under Firestore 1MB per-slot document limit (~650 KB max data URL)
        const MAX_DATA_URL_CHARS = 650 * 1024;
        if (dataUrl.length > MAX_DATA_URL_CHARS) {
          if (sourceIsPngOrWebp) {
            const webpUrl = canvas.toDataURL('image/webp', 0.86);
            if (webpUrl.startsWith('data:image/webp')) {
              dataUrl = webpUrl;
              mimeType = 'image/webp';
            }
          }
          let stepQuality = Math.min(quality, 0.78);
          while (dataUrl.length > MAX_DATA_URL_CHARS && stepQuality >= 0.42) {
            const targetMime = mimeType === 'image/png' ? 'image/jpeg' : mimeType;
            dataUrl = canvas.toDataURL(targetMime, stepQuality);
            stepQuality -= 0.12;
          }
        }

        if (dataUrl.length > 900 * 1024) {
          reject(
            new Error(
              'Optimized asset still exceeds the Firestore storage limit (~900 KB). Please use a smaller image or external HTTPS URL.'
            )
          );
          return;
        }

        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('The selected file could not be decoded as a valid image.'));
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => reject(new Error('Failed to read image file from disk.'));
    reader.readAsDataURL(file);
  });
}

export async function optimizeBrandingSlotFile(
  slotId: BrandingSlotId,
  file: File
): Promise<{ dataUrl: string; metrics: InspectedImageAsset }> {
  const spec = BRANDING_SLOT_SPECS[slotId];
  const validation = validateBrandingAssetFile(file, {
    allowIco: spec.allowIco,
    maxBytes: spec.maxFileBytes,
    label: spec.label,
  });

  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file.');
  }

  const optimized = await processAndOptimizeImage(
    file,
    spec.maxWidth,
    spec.maxHeight,
    spec.quality,
    spec.outputFormat
  );

  const check = await inspectImageAsset(optimized);
  if (!check.valid) {
    throw new Error(check.error || 'Processed image could not be rendered.');
  }

  return { dataUrl: optimized, metrics: check };
}
