/**
 * Background Idle Chunk Prefetcher for SokoPoS
 *
 * Pre-warms essential POS counter chunks cleanly during browser idle time
 * without blocking initial landing TTI or wasting data-saver bandwidth.
 */

let posPrefetchStarted = false;

export const prefetchEssentialPosChunks = (): void => {
  if (posPrefetchStarted) return;
  posPrefetchStarted = true;

  // Trigger dynamic imports so Vite/Workbox fetches & caches essential counter chunks
  const loaders = [
    () => import('../components/Header'),
    () => import('../components/SidebarNav'),
    () => import('../components/MobileBottomNav'),
    () => import('../components/RegisterView'),
    () => import('../components/PaymentModal'),
    () => import('../components/ReceiptModal'),
    () => import('../components/PinLockModal'),
    () => import('../components/ShiftManagementView'),
  ];

  // Stagger slightly so we don't spike main-thread contention all at once
  loaders.forEach((loadChunk, idx) => {
    setTimeout(() => {
      void loadChunk().catch(() => {
        // Ignore network errors silently (e.g. if already offline)
      });
    }, idx * 140);
  });
};

export const schedulePosBackgroundPrefetch = (): (() => void) => {
  if (typeof window === 'undefined' || posPrefetchStarted) {
    return () => {};
  }

  // Respect Save-Data and ultra-slow 2G cellular connections
  const navConnection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (navConnection?.saveData || navConnection?.effectiveType === '2g') {
    return () => {};
  }

  let idleHandle: number | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const startPrefetch = () => {
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === 'function') {
      idleHandle = win.requestIdleCallback(() => prefetchEssentialPosChunks(), { timeout: 6000 });
    } else {
      prefetchEssentialPosChunks();
    }
  };

  // Defer until after hero/first-paint settles (3.5s)
  timeoutHandle = setTimeout(startPrefetch, 3500);

  return () => {
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
    const win = window as Window & { cancelIdleCallback?: (id: number) => void };
    if (idleHandle !== null && typeof win.cancelIdleCallback === 'function') {
      win.cancelIdleCallback(idleHandle);
    }
  };
};
