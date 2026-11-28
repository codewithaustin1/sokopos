import './storageGuard';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker only in production; in dev mode clean up any stale dev-sw registrations so Vite dynamic imports never get intercepted
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          setInterval(() => {
            registration.update().catch(() => {});
          }, 60 * 60 * 1000);
        }
      },
    });
  } else {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      })
      .catch(() => {});
  }
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
