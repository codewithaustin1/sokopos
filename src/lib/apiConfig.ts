const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();

function sanitizeApiBaseUrl(raw: string): string {
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (
      parsed.protocol === 'https:' ||
      (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'))
    ) {
      const cleanPath = parsed.pathname.replace(/\/+$/, '').replace(/\/api$/i, '');
      return `${parsed.origin}${cleanPath}`;
    }
  } catch {
    // Ignore malformed base URL and fall back to same-origin relative API paths
  }
  return '';
}

export const API_BASE_URL = sanitizeApiBaseUrl(RAW_API_BASE_URL);

export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
