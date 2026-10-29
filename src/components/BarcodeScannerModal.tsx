import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  X,
  Scan,
  Zap,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  SlidersHorizontal,
  Barcode as BarcodeIcon,
  ShoppingCart,
  History,
  Check,
  Sparkles,
  Volume2,
  Keyboard,
  Clock,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import {
  BrowserMultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
} from '@zxing/library';
import { usePos } from '../context/PosContext';
import { soundFx } from '../utils/audio';
import { BarcodeVisual } from './BarcodeVisual';
import { Product } from '../types';
import { simulateHardwareBarcodeBurst } from '../utils/backgroundScanner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface RecentScanItem {
  id: string;
  scanNumber: number;
  product: Product;
  barcode: string;
  timestamp: string;
  timeMs: number;
}

interface ScanHistoryItem {
  id: string;
  product: Product;
  barcode: string;
  timestamp: string;
  count: number;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose }) => {
  const { products, handleBarcodeScanned, currentLocation, cart } = usePos();

  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [scanSuccessFeedback, setScanSuccessFeedback] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'history' | 'test-lab'>('camera');
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const totalScansCounterRef = useRef<number>(0);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [lastScannedResult, setLastScannedResult] = useState<{
    product: Product;
    barcode: string;
    time: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize high-speed ZXing reader instance
  useEffect(() => {
    const hints = new Map();
    const formats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

    // 200ms interval between decode attempts to ensure video frames are rendered and avoid 0-width canvas IndexSizeError
    readerRef.current = new BrowserMultiFormatReader(hints, 200);

    return () => {
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch {
          // ignore reset errors
        }
      }
    };
  }, []);

  // Handle open/close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      return;
    }

    // Modal opened: Start camera if on camera tab
    if (activeTab === 'camera') {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, selectedDeviceId]);

  const startCamera = async () => {
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera media devices API is not supported in this browser or frame.');
      }

      const reader = readerRef.current;
      if (!reader) {
        throw new Error('Barcode reader is not initialized.');
      }

      // Reset any active stream
      try {
        reader.reset();
      } catch {
        // ignore
      }

      // Enumerate available video inputs
      let devices: MediaDeviceInfo[] = [];
      try {
        devices = await reader.listVideoInputDevices();
        setVideoDevices(devices);
      } catch (err) {
        console.warn('Could not enumerate video devices:', err);
      }

      // Determine which device to use
      let chosenDeviceId = selectedDeviceId;
      if (!chosenDeviceId && devices.length > 0) {
        // Prefer rear/environment camera on smartphones
        const backCam = devices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
        );
        chosenDeviceId = backCam ? backCam.deviceId : devices[devices.length - 1].deviceId;
        setSelectedDeviceId(chosenDeviceId);
      }

      if (!videoRef.current) {
        setIsStartingCamera(false);
        return;
      }

      // Start continuous scanning with ZXing
      await reader.decodeFromVideoDevice(
        chosenDeviceId || undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const rawText = result.getText();
            if (rawText) {
              onBarcodeDetected(rawText);
            }
          }
          // Errors occur on frames where no barcode is visible; this is expected
        }
      );

      // Apply continuous auto-focus constraints if available
      if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
        const track = videoRef.current.srcObject.getVideoTracks()[0];
        if (track && (track as any).applyConstraints) {
          (track as any).applyConstraints({
            advanced: [
              {
                focusMode: 'continuous',
                width: { ideal: 1280 },
                height: { ideal: 720 },
              } as any,
            ],
          }).catch(() => {});
        }
      }

      setIsCameraActive(true);
      setIsStartingCamera(false);

      // Check if video track supports flashlight / torch
      checkTorchSupport();
    } catch (err: any) {
      console.warn('Barcode camera startup failed:', err);
      setIsCameraActive(false);
      setIsStartingCamera(false);
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access or use the Interactive Test Lab below.'
          : err?.message || 'Unable to access camera video stream.';
      setCameraError(msg);
    }
  };

  const checkTorchSupport = () => {
    try {
      const track = videoRef.current?.srcObject instanceof MediaStream
        ? (videoRef.current.srcObject as MediaStream).getVideoTracks()[0]
        : null;
      if (track) {
        const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : null;
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      }
    } catch {
      setHasTorch(false);
    }
  };

  const toggleTorch = async () => {
    try {
      const track = videoRef.current?.srcObject instanceof MediaStream
        ? (videoRef.current.srcObject as MediaStream).getVideoTracks()[0]
        : null;
      if (track && (track as any).applyConstraints) {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      }
    } catch (err) {
      console.warn('Could not toggle torch:', err);
    }
  };

  const stopCamera = () => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {
        // ignore
      }
    }
    if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsStartingCamera(false);
    setIsTorchOn(false);
  };

  // Called when a barcode is detected (either via camera optical stream, hardware gun, or test button)
  const onBarcodeDetected = (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    const now = Date.now();
    // Debounce duplicate scans of the EXACT same item by 800ms to allow quick consecutive scans
    if (trimmed === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 800) {
      return;
    }

    lastScannedCodeRef.current = trimmed;
    lastScannedTimeRef.current = now;

    // Mobile haptic vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch {
        // ignore
      }
    }

    // Trigger visual green reticle flash
    setScanSuccessFeedback(true);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setScanSuccessFeedback(false);
    }, 600);

    // Call POS barcode engine
    const res = handleBarcodeScanned(trimmed);

    if (res.success && res.product) {
      const product = res.product;
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setLastScannedResult({
        product,
        barcode: trimmed,
        time: timeStr,
      });

      // Update the last 5 successfully scanned items during the current session
      totalScansCounterRef.current += 1;
      const newRecentScan: RecentScanItem = {
        id: `recent-scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        scanNumber: totalScansCounterRef.current,
        product,
        barcode: trimmed,
        timestamp: timeStr,
        timeMs: Date.now(),
      };
      setRecentScans((prev) => [newRecentScan, ...prev].slice(0, 5));

      // Update in-modal session scan history
      setScanHistory((prev) => {
        const existingIdx = prev.findIndex((item) => item.product.id === product.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            count: updated[existingIdx].count + 1,
            timestamp: timeStr,
          };
          return updated;
        } else {
          return [
            {
              id: `scan-${Date.now()}`,
              product,
              barcode: trimmed,
              timestamp: timeStr,
              count: 1,
            },
            ...prev,
          ];
        }
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onBarcodeDetected(manualCode.trim());
    setManualCode('');
  };

  // Filter products for the current business
  const storeProducts = useMemo(() => {
    return products.slice(0, 8);
  }, [products]);

  const totalSessionScansCount = useMemo(() => {
    return scanHistory.reduce((sum, item) => sum + item.count, 0);
  }, [scanHistory]);

  if (!isOpen) return null;

  return (
    <div
      id="barcode-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in"
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[96vh] sm:max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  High-Speed Barcode Scanner
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider">
                  ZXing Multi-Format
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Optical camera reader, USB laser gun wedge & manual SKU entry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="scanner-test-beep-btn"
              onClick={() => soundFx.playBarcodeBeep()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer"
              title="Test Retail Barcode Scanner Beep"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden xs:inline">Test Sound</span>
            </button>

            <button
              type="button"
              id="close-scanner-modal-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Close scanner (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs: Camera vs History vs Interactive Test Lab */}
        <div className="flex items-center overflow-x-auto bg-slate-100 px-4 sm:px-6 border-b border-slate-200 shrink-0 gap-1">
          <button
            type="button"
            id="tab-camera-btn"
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'camera'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-blue-600" />
            <span>Live Camera</span>
            {isCameraActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>

          <button
            type="button"
            id="tab-history-btn"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-emerald-600" />
            <span>History</span>
            <span
              className={`text-[10px] font-black px-1.5 py-0.2 rounded-full transition ${
                recentScans.length > 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {recentScans.length}/5
            </span>
          </button>

          <button
            type="button"
            id="tab-testlab-btn"
            onClick={() => setActiveTab('test-lab')}
            className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'test-lab'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarcodeIcon className="w-4 h-4 text-purple-600" />
            <span>Simulator</span>
            <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {storeProducts.length} Items
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {/* Subtle Keyframes Animation for History List Items */}
          <style>{`
            @keyframes scanItemSlideIn {
              0% {
                opacity: 0;
                transform: translateY(-8px) scale(0.98);
                background-color: #ecfdf5;
              }
              50% {
                background-color: #d1fae5;
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            .animate-scan-item-entry {
              animation: scanItemSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
            }
          `}</style>
          {/* CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              {/* Camera Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {/* Camera selector */}
                <div className="flex items-center gap-2 min-w-0">
                  <SwitchCamera className="w-4 h-4 text-slate-500 shrink-0" />
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    disabled={videoDevices.length <= 1}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 max-w-[200px] truncate"
                  >
                    {videoDevices.length === 0 && <option value="">Default Camera</option>}
                    {videoDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Torch & Restart buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        isTorchOn
                          ? 'bg-amber-400 text-slate-950 border-amber-500'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isTorchOn ? (
                        <>
                          <FlashlightOff className="w-3.5 h-3.5" /> Torch Off
                        </>
                      ) : (
                        <>
                          <Flashlight className="w-3.5 h-3.5 text-amber-500" /> Torch On
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={isStartingCamera}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer"
                    title="Restart camera video stream"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isStartingCamera ? 'animate-spin text-blue-600' : ''}`} />
                    <span>{isStartingCamera ? 'Starting...' : 'Restart Cam'}</span>
                  </button>
                </div>
              </div>

              {/* Viewport Box */}
              <div
                className={`relative w-full aspect-video sm:aspect-16/9 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 transition duration-200 shadow-inner ${
                  scanSuccessFeedback ? 'border-emerald-500 ring-4 ring-emerald-500/30' : 'border-slate-800'
                }`}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Loading / Error placeholder if camera isn't transmitting */}
                {(!isCameraActive || cameraError) && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-3 z-10">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                      <Camera className="w-7 h-7 text-slate-400" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-200">
                        {cameraError ? 'Camera Stream Unavailable' : 'Initializing Optical Camera...'}
                      </div>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        {cameraError ||
                          'Requesting camera permission to scan barcodes using high-accuracy ZXing multi-format decoding.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Try Camera Again
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('test-lab')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <BarcodeIcon className="w-3.5 h-3.5" /> Open Barcode Simulator
                      </button>
                    </div>
                  </div>
                )}

                {/* Optical Viewfinder Target Reticle Overlay */}
                {isCameraActive && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div
                      className={`w-64 sm:w-80 h-36 sm:h-44 border-2 rounded-2xl relative transition-all duration-200 ${
                        scanSuccessFeedback
                          ? 'border-emerald-400 bg-emerald-500/20 scale-105'
                          : 'border-blue-500/80 bg-blue-500/5'
                      }`}
                    >
                      {/* Corner Target Markers */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-400 rounded-tl-sm" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-400 rounded-tr-sm" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-400 rounded-bl-sm" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-400 rounded-br-sm" />

                      {/* Laser Scanline */}
                      <div
                        className={`w-full h-0.5 absolute shadow-[0_0_12px_#ef4444] transition ${
                          scanSuccessFeedback
                            ? 'bg-emerald-400 shadow-[0_0_16px_#10b981]'
                            : 'bg-red-500 animate-pulse'
                        } top-1/2 -translate-y-1/2`}
                      />

                    </div>
                  </div>
                )}

                {/* Streamlined Minimalist Status Badge */}
                <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10 z-10">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span>{isCameraActive ? 'High-Speed Scanner Active' : 'Connecting Camera...'}</span>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY TAB: LAST 5 SCANNED ITEMS WITH SUBTLE ENTRY ANIMATION */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Header Info Banner */}
              <div className="p-3.5 sm:p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                        Recent Scan History (Last 5 Items)
                      </h4>
                      <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {recentScans.length} of 5
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Real-time cashier feed for instant visual verification without checking the main cart.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {recentScans.length > 0 && (
                    <button
                      type="button"
                      id="clear-recent-scans-btn"
                      onClick={() => setRecentScans([])}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-xl transition cursor-pointer shadow-2xs"
                      title="Clear the recent scans list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear History</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Scanned Items List or Empty State */}
              {recentScans.length === 0 ? (
                <div className="p-8 sm:p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                    <Scan className="w-7 h-7 text-slate-400" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h5 className="font-bold text-sm text-slate-800">No Items Scanned Yet in This Session</h5>
                    <p className="text-xs text-slate-500 mt-1">
                      Start scanning barcodes with the live optical camera, your handheld barcode scanner gun, or the
                      interactive simulator. Your last 5 scans will appear here with subtle entry animations for quick
                      verification.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('camera')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" /> Scan with Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('test-lab')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <BarcodeIcon className="w-3.5 h-3.5" /> Open Simulator
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>Session Stream (Newest First)</span>
                    <span>Max 5 items kept in buffer</span>
                  </div>

                  <div className="space-y-2">
                    {recentScans.map((item, index) => {
                      const isLatest = index === 0;
                      return (
                        <div
                          key={item.id}
                          className={`animate-scan-item-entry p-3.5 rounded-2xl transition-all duration-200 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isLatest
                              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            {/* Sequence number / status icon */}
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-xs ${
                                isLatest
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {isLatest ? (
                                <Check className="w-5 h-5 stroke-[2.5]" />
                              ) : (
                                <span>#{item.scanNumber}</span>
                              )}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                  {item.product.name}
                                </span>
                                {isLatest && (
                                  <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                    Latest Scan
                                  </span>
                                )}
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                                  +1 Added to Cart
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                <span className="font-medium text-slate-600">{item.product.category}</span>
                                <span>•</span>
                                <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 font-semibold">
                                  {item.barcode}
                                </span>
                                <span>•</span>
                                <span className="font-mono text-slate-400">SKU: {item.product.sku}</span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-slate-400 font-mono">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {item.timestamp}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <div className="text-right">
                              <div className="text-xs sm:text-sm font-black text-slate-900">
                                {currentLocation.currency} {item.product.sellingPrice.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400">Unit Price</div>
                            </div>

                            <button
                              type="button"
                              onClick={() => onBarcodeDetected(item.barcode)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                              title={`Scan another ${item.product.name}`}
                            >
                              <Zap className="w-3 h-3" />
                              <span>+1 Scan Again</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Batch Summary Card */}
                  <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium text-slate-700">
                        Recent 5 Scans Subtotal:{' '}
                        <strong className="text-slate-900">
                          {currentLocation.currency}{' '}
                          {recentScans
                            .reduce((sum, item) => sum + item.product.sellingPrice, 0)
                            .toLocaleString()}
                        </strong>
                      </span>
                    </div>

                    <div className="text-slate-500 font-mono text-[11px]">
                      Session scans: <strong>{totalScansCounterRef.current}</strong> • Current cart items:{' '}
                      <strong>{cart.reduce((sum, item) => sum + item.quantity, 0)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INTERACTIVE TEST LAB TAB */}
          {activeTab === 'test-lab' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider">
                      Interactive Barcode Verification Lab
                    </h4>
                    <p className="text-xs text-purple-800 mt-0.5">
                      Verify instant recognition and cart additions. Click any product to simulate a hardware/optical
                      scan, or scan the high-contrast barcode stripes below directly using your phone or handheld gun!
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid of Store Products with Authentic Barcodes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {storeProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 bg-white border border-slate-200 hover:border-blue-400 rounded-2xl transition shadow-2xs hover:shadow-xs flex flex-col justify-between group space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {p.category} • SKU: <span className="font-mono font-bold">{p.sku}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-slate-900">
                          {currentLocation.currency} {p.sellingPrice.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Stock: {p.stockByLocation[currentLocation.id] ?? 0}
                        </div>
                      </div>
                    </div>

                    {/* Scannable Barcode SVG Graphic */}
                    <div className="flex justify-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <BarcodeVisual value={p.barcode} height={42} showText={true} />
                    </div>

                    {/* Quick Simulation Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onBarcodeDetected(p.barcode)}
                        className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs py-2 rounded-xl transition border border-blue-200 hover:border-blue-600 cursor-pointer shadow-2xs"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Instant Add</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => simulateHardwareBarcodeBurst(p.barcode, 12)}
                        className="flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white font-bold text-xs py-2 rounded-xl transition border border-amber-200 hover:border-amber-600 cursor-pointer shadow-2xs"
                        title="Simulate hardware barcode gun wedge burst in background (< 15ms/keystroke)"
                      >
                        <Keyboard className="w-3.5 h-3.5 text-amber-600 group-hover:text-white" />
                        <span>Wedge Burst</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Scanned Recognition Banner */}
          {lastScannedResult && (
            <div className="p-3.5 sm:p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-900">
                      {lastScannedResult.product.name}
                    </span>
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      +1 Added
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-800 mt-0.5">
                    Barcode: <span className="font-bold">{lastScannedResult.barcode}</span> • {currentLocation.currency}{' '}
                    {lastScannedResult.product.sellingPrice} • {lastScannedResult.time}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  id="scanner-banner-view-history-btn"
                  onClick={() => setActiveTab('history')}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <History className="w-3.5 h-3.5 text-emerald-700" />
                  <span>View History ({recentScans.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => onBarcodeDetected(lastScannedResult.barcode)}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  + Add Another
                </button>
              </div>
            </div>
          )}

          {/* Manual Barcode or SKU Entry Form */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label htmlFor="manual-barcode-input" className="block text-xs font-bold text-slate-700">
                Manual Barcode or SKU Entry
              </label>
              <span className="text-[10px] text-slate-400">Press Enter or click Scan</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Scan className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="manual-barcode-input"
                  type="text"
                  placeholder="e.g. 616330112233 or SKU-WHT-02"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono font-bold focus:outline-none focus:border-blue-600 focus:bg-white text-slate-900 placeholder:font-sans placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                id="submit-manual-barcode-btn"
                disabled={!manualCode.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Zap className="w-4 h-4" /> Scan
              </button>
            </div>
          </form>

          {/* Session Scan History (Bottom Summary on Camera & Simulator Tabs) */}
          {activeTab !== 'history' && scanHistory.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700">
                    Session Scan Activity ({totalSessionScansCount} items)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                  >
                    <span>View Last 5 Stream</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanHistory([])}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                {scanHistory.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-2 flex items-center justify-between text-xs hover:bg-slate-50"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-800 truncate">{item.product.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {item.barcode} • {item.timestamp}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-slate-700">
                        {currentLocation.currency} {(item.product.sellingPrice * item.count).toLocaleString()}
                      </span>
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                        x{item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Hardware Tip Note */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 text-xs text-slate-600">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Hardware Ready:</strong> Any handheld USB or Bluetooth laser scanner transmits directly to
              the POS register with automatic barcode lookup, audio confirmation, and cart increment.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span>
              Cart Total: {cart.reduce((sum, item) => sum + item.quantity, 0)} items (
              {currentLocation.currency}{' '}
              {cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toLocaleString()})
            </span>
          </div>

          <button
            type="button"
            id="done-scanning-btn"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
