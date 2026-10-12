import './storageGuard';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Prevent QuotaExceededError crashes in iframe environments by auto-evicting bloated cache
if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
  try {
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.setItem = function (key: string, value: string) {
      try {
        originalSetItem(key, value);
      } catch (err: any) {
        if (
          err?.name === 'QuotaExceededError' ||
          err?.code === 22 ||
          (err?.message && String(err.message).includes('exceeded the quota'))
        ) {
          console.warn(`[Storage Quota] Auto-evicting cache to accommodate key "${key}"...`);
          try {
            const keysToEvict: string[] = [];
            for (let i = 0; i < window.localStorage.length; i++) {
              const k = window.localStorage.key(i);
              if (
                k &&
                (k.startsWith('firestore_') ||
                  k.includes('sales_backups') ||
                  k.includes('sync_logs') ||
                  k.includes('admin_activity_logs') ||
                  k.includes('sa_audit') ||
                  k.includes('supervisor_overrides'))
              ) {
                keysToEvict.push(k);
              }
            }
            keysToEvict.forEach((k) => window.localStorage.removeItem(k));
            originalSetItem(key, value);
            return;
          } catch {
            console.warn(`[Storage Quota] Item "${key}" could not be stored due to quota limit.`);
            return;
          }
        }
        throw err;
      }
    };
  } catch (e) {
    console.warn('Storage guard initialization note:', e);
  }
}

// Filter out benign Firestore IndexedDB lease sub-millisecond clock drift logs in preview iframe
if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  const isBenignClockSkew = (...args: any[]) => {
    return args.some((arg) => {
      const str = typeof arg === 'string' ? arg : (arg?.message || String(arg) || '');
      return str.includes('Detected an update time that is in the future');
    });
  };

  console.error = (...args: any[]) => {
    if (isBenignClockSkew(...args)) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    if (isBenignClockSkew(...args)) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
