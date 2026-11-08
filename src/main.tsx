import './storageGuard';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for 100% offline cold loading & asset caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}


// Filter out benign Firestore IndexedDB lease sub-millisecond clock drift logs in preview iframe
if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  const isBenignNoise = (...args: any[]) => {
    return args.some((arg) => {
      const str = typeof arg === 'string' ? arg : (arg?.message || String(arg) || '');
      return (
        str.includes('Detected an update time that is in the future') ||
        str.includes('WebSocket closed without opened') ||
        (str.includes('[vite]') && str.includes('WebSocket'))
      );
    });
  };

  console.error = (...args: any[]) => {
    if (isBenignNoise(...args)) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    if (isBenignNoise(...args)) {
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
