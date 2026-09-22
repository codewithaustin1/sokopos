import { useEffect, useRef, useState, useCallback } from 'react';
import {
  BackgroundScannerEngine,
  ScannerBurstMetadata,
  scannerDiagnostics,
  simulateHardwareBarcodeBurst,
} from '../utils/backgroundScanner';

export interface UseBackgroundScannerOptions {
  onBarcodeScanned: (barcode: string, meta: ScannerBurstMetadata) => void;
  enabled?: boolean;
  maxInterKeyLatencyMs?: number;
  enableInputRestoration?: boolean;
}

export function useBackgroundScanner(options: UseBackgroundScannerOptions) {
  const {
    onBarcodeScanned,
    enabled = true,
    maxInterKeyLatencyMs = 55,
    enableInputRestoration = true,
  } = options;

  const callbackRef = useRef(onBarcodeScanned);
  callbackRef.current = onBarcodeScanned;

  const [lastScan, setLastScan] = useState<ScannerBurstMetadata | null>(scannerDiagnostics.lastScan);
  const [totalScans, setTotalScans] = useState<number>(scannerDiagnostics.totalScansCaptured);
  const [isListening, setIsListening] = useState<boolean>(scannerDiagnostics.isListenerActive);
  const [recentBurstAlert, setRecentBurstAlert] = useState<{
    barcode: string;
    targetTagName: string;
    inputRestored: boolean;
    timestamp: number;
  } | null>(null);

  // Subscribe to diagnostics store
  useEffect(() => {
    const unsubscribe = scannerDiagnostics.subscribe(() => {
      setLastScan(scannerDiagnostics.lastScan);
      setTotalScans(scannerDiagnostics.totalScansCaptured);
      setIsListening(scannerDiagnostics.isListenerActive);
    });
    return unsubscribe;
  }, []);

  // Initialize and bind background scanner engine with persistent lifecycle
  useEffect(() => {
    if (!enabled) return;

    const engine = new BackgroundScannerEngine({
      maxInterKeyLatencyMs,
      enableInputRestoration,
      onScan: (barcode, meta) => {
        // Record burst alert for UI HUD feedback
        setRecentBurstAlert({
          barcode,
          targetTagName: meta.targetTagName,
          inputRestored: meta.inputWasRestored,
          timestamp: Date.now(),
        });

        // Auto-dismiss HUD burst alert after 3.5s
        setTimeout(() => {
          setRecentBurstAlert((prev) => (prev && prev.timestamp === meta.timestamp ? null : prev));
        }, 3500);

        if (callbackRef.current) {
          callbackRef.current(barcode, meta);
        }
      },
    });

    const cleanup = engine.start();

    return () => {
      cleanup();
    };
  }, [enabled, maxInterKeyLatencyMs, enableInputRestoration]);

  const simulate = useCallback(async (barcode: string, intervalMs?: number) => {
    await simulateHardwareBarcodeBurst(barcode, intervalMs);
  }, []);

  return {
    isListening,
    lastScan,
    totalScans,
    recentBurstAlert,
    simulateBurst: simulate,
  };
}
