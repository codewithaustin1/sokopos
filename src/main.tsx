import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

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
