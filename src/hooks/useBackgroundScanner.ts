import { useEffect, useRef, useState, useCallback } from 'react';
import {
  BackgroundScannerEngine,
  ScannerBurstMetadata,
  scannerDiagnostics,
  simulateHardwareBarcodeBurst,
} from '../utils/backgroundScanner';
import { Product } from '../types';

export interface UseBackgroundScannerOptions {
  onBarcodeScanned: (barcode: string, meta: ScannerBurstMetadata) => void;
  enabled?: boolean;
  maxInterKeyLatencyMs?: number;
  enableInputRestoration?: boolean;
  /**
   * Optional toggle to trigger an 'Inventory Quick-Check' HUD when a barcode
   * is scanned that is NOT currently in the POS database. Defaults to false.
   */
  enableQuickCheckHUD?: boolean;
  /**
   * Optional product list to check against if checkBarcodeExists is not provided.
   */
  products?: Product[];
  /**
   * Custom validation function to check if a barcode exists in the POS database.
   * Return true if exists, false if unrecognized.
   */
  checkBarcodeExists?: (barcode: string) => boolean;
  /**
   * Callback fired when an unrecognized barcode triggers the Quick-Check HUD.
   */
  onUnrecognizedBarcode?: (barcode: string, meta: ScannerBurstMetadata) => void;
}

export interface UseBackgroundScannerReturn {
  isListening: boolean;
  lastScan: ScannerBurstMetadata | null;
  totalScans: number;
  recentBurstAlert: {
    barcode: string;
    targetTagName: string;
    inputRestored: boolean;
    timestamp: number;
  } | null;
  simulateBurst: (barcode: string, intervalMs?: number) => Promise<void>;
  // Inventory Quick-Check HUD Controls & State
  isQuickCheckOpen: boolean;
  quickCheckBarcode: string | null;
  quickCheckMetadata: ScannerBurstMetadata | null;
  openQuickCheck: (barcode: string, meta?: ScannerBurstMetadata) => void;
  closeQuickCheck: () => void;
}

export function useBackgroundScanner(
  options: UseBackgroundScannerOptions
): UseBackgroundScannerReturn {
  const {
    onBarcodeScanned,
    enabled = true,
    maxInterKeyLatencyMs = 55,
    enableInputRestoration = true,
    enableQuickCheckHUD = false,
    products,
    checkBarcodeExists,
    onUnrecognizedBarcode,
  } = options;

  const callbackRef = useRef(onBarcodeScanned);
  callbackRef.current = onBarcodeScanned;

  const enableQuickCheckHUDRef = useRef(enableQuickCheckHUD);
  enableQuickCheckHUDRef.current = enableQuickCheckHUD;

  const productsRef = useRef(products);
  productsRef.current = products;

  const checkBarcodeExistsRef = useRef(checkBarcodeExists);
  checkBarcodeExistsRef.current = checkBarcodeExists;

  const onUnrecognizedBarcodeRef = useRef(onUnrecognizedBarcode);
  onUnrecognizedBarcodeRef.current = onUnrecognizedBarcode;

  const [lastScan, setLastScan] = useState<ScannerBurstMetadata | null>(scannerDiagnostics.lastScan);
  const [totalScans, setTotalScans] = useState<number>(scannerDiagnostics.totalScansCaptured);
  const [isListening, setIsListening] = useState<boolean>(scannerDiagnostics.isListenerActive);
  const [recentBurstAlert, setRecentBurstAlert] = useState<{
    barcode: string;
    targetTagName: string;
    inputRestored: boolean;
    timestamp: number;
  } | null>(null);

  // Quick-Check HUD State
  const [isQuickCheckOpen, setIsQuickCheckOpen] = useState(false);
  const [quickCheckBarcode, setQuickCheckBarcode] = useState<string | null>(null);
  const [quickCheckMetadata, setQuickCheckMetadata] = useState<ScannerBurstMetadata | null>(null);

  const openQuickCheck = useCallback((barcode: string, meta?: ScannerBurstMetadata) => {
    setQuickCheckBarcode(barcode);
    setQuickCheckMetadata(meta || null);
    setIsQuickCheckOpen(true);
  }, []);

  const closeQuickCheck = useCallback(() => {
    setIsQuickCheckOpen(false);
    setQuickCheckBarcode(null);
    setQuickCheckMetadata(null);
  }, []);

  // Subscribe to diagnostics store
  useEffect(() => {
    const unsubscribe = scannerDiagnostics.subscribe(() => {
      setLastScan(scannerDiagnostics.lastScan);
      setTotalScans(scannerDiagnostics.totalScansCaptured);
      setIsListening(scannerDiagnostics.isListenerActive);
    });
    return unsubscribe;
  }, []);

  // Helper: Determine if barcode exists in POS database
  const doesBarcodeExist = useCallback((rawBarcode: string): boolean => {
    if (checkBarcodeExistsRef.current) {
      return checkBarcodeExistsRef.current(rawBarcode);
    }
    if (productsRef.current && productsRef.current.length > 0) {
      const clean = rawBarcode.trim().replace(/^['"]+|['"]+$/g, '').replace(/\s+/g, '');
      const lower = clean.toLowerCase();
      return productsRef.current.some((p) => {
        const pBarcode = (p.barcode || '').trim().replace(/\s+/g, '');
        const pSku = (p.sku || '').trim().toLowerCase();
        if (pBarcode === clean || pSku === lower) return true;
        // Check 12-digit UPC-A vs 13-digit EAN-13 leading zeros
        if (clean.length === 12 && pBarcode === '0' + clean) return true;
        if (clean.length === 13 && clean.startsWith('0') && pBarcode === clean.substring(1)) return true;
        return false;
      });
    }
    return true;
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

        // Check if barcode should trigger the Inventory Quick-Check HUD
        if (enableQuickCheckHUDRef.current) {
          const exists = doesBarcodeExist(barcode);
          if (!exists) {
            setQuickCheckBarcode(barcode);
            setQuickCheckMetadata(meta);
            setIsQuickCheckOpen(true);

            if (onUnrecognizedBarcodeRef.current) {
              onUnrecognizedBarcodeRef.current(barcode, meta);
            }
            return;
          }
        }

        if (callbackRef.current) {
          callbackRef.current(barcode, meta);
        }
      },
    });

    const cleanup = engine.start();

    return () => {
      cleanup();
    };
  }, [enabled, maxInterKeyLatencyMs, enableInputRestoration, doesBarcodeExist]);

  const simulate = useCallback(async (barcode: string, intervalMs?: number) => {
    await simulateHardwareBarcodeBurst(barcode, intervalMs);
  }, []);

  return {
    isListening,
    lastScan,
    totalScans,
    recentBurstAlert,
    simulateBurst: simulate,
    isQuickCheckOpen,
    quickCheckBarcode,
    quickCheckMetadata,
    openQuickCheck,
    closeQuickCheck,
  };
}
