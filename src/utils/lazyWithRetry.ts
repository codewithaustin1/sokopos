import React, { Component, ComponentType, LazyExoticComponent, ReactNode, lazy } from 'react';

export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    typeof err === 'string'
      ? err
      : err instanceof Error
      ? `${err.name}: ${err.message}`
      : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('error loading dynamically imported module') ||
    lower.includes('importing a module script failed') ||
    lower.includes('loading chunk') ||
    lower.includes('loading css chunk') ||
    lower.includes('chunkloaderror')
  );
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Wraps React.lazy with automatic transient-network retries so brief dev-server restarts,
 * connection blips, or Vite pre-bundle invalidations do not crash the React tree.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  maxRetries = 3
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await importer();
      } catch (err) {
        lastError = err;
        if (!isChunkLoadError(err) || attempt === maxRetries) {
          throw err;
        }
        await wait(250 * Math.pow(2, attempt));
      }
    }
    throw lastError;
  });
}

interface SilentBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface SilentBoundaryState {
  hasError: boolean;
}

/**
 * Isolates non-critical background overlays & banners so a single failed optional chunk
 * never tears down the primary POS checkout screen.
 */
export class SilentLazyBoundary extends Component<SilentBoundaryProps, SilentBoundaryState> {
  public state: SilentBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): SilentBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    console.warn('[SokoPoS] Isolated optional module error:', error?.message || error);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
