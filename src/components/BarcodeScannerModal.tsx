import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Scan, Zap, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { usePos } from '../context/PosContext';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose }) => {
  const { products, handleBarcodeScanned } = usePos();
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState<{ name: string; barcode: string; time: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Initialize camera
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API not accessible in current frame. Use test barcodes or manual entry.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }

      // Check for native BarcodeDetector
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (BarcodeDetectorClass) {
        try {
          const barcodeDetector = new BarcodeDetectorClass({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
          });

          const detectLoop = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const rawVal = barcodes[0].rawValue;
                  const res = handleBarcodeScanned(rawVal);
                  if (res.success && res.product) {
                    setLastScannedResult({
                      name: res.product.name,
                      barcode: rawVal,
                      time: new Date().toLocaleTimeString(),
                    });
                  }
                }
              } catch {
                // frame detection error
              }
            }
            animFrameIdRef.current = requestAnimationFrame(detectLoop);
          };

          detectLoop();
        } catch {
          // detector init error
        }
      }
    } catch (err) {
      console.warn('Camera stream could not start:', err);
      setCameraError('Camera access denied or device unavailable. Quick barcode simulator available below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const res = handleBarcodeScanned(manualCode.trim());
    if (res.success && res.product) {
      setLastScannedResult({
        name: res.product.name,
        barcode: manualCode.trim(),
        time: new Date().toLocaleTimeString(),
      });
      setManualCode('');
    }
  };

  const scanDemoProduct = (barcode: string) => {
    const res = handleBarcodeScanned(barcode);
    if (res.success && res.product) {
      setLastScannedResult({
        name: res.product.name,
        barcode,
        time: new Date().toLocaleTimeString(),
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div id="barcode-scanner-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Barcode & Optical Scanner</h3>
              <p className="text-xs text-slate-400">Supports EAN-13, UPC, Code-128 & Laser Handhelds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Camera Viewport */}
          <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 text-slate-400 flex flex-col items-center">
                <Camera className="w-12 h-12 text-slate-600 mb-2 stroke-1" />
                <span className="text-xs font-medium">
                  {cameraError || 'Camera inactive. Click retry or choose a quick sample below.'}
                </span>
                {cameraError && (
                  <button
                    onClick={startCamera}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                  </button>
                )}
              </div>
            )}

            {/* Viewfinder Target Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-36 border-2 border-blue-500/80 rounded-lg relative bg-blue-500/5">
                {/* Corner reticles */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-400" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-400" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-400" />

                {/* Animated Red Laser Scanline */}
                <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse absolute top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-1 rounded flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
              {isCameraActive ? 'Laser Active • Aim at Barcode' : 'Hardware Listener Ready'}
            </div>
          </div>

          {/* Last Scanned Banner */}
          {lastScannedResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Added: {lastScannedResult.name}</div>
                  <div className="text-[11px] font-mono text-slate-500">Barcode: {lastScannedResult.barcode} • {lastScannedResult.time}</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">+1 In Cart</span>
            </div>
          )}

          {/* Manual Barcode Input */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Manual Barcode or SKU Entry
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Scan className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. 616110123456 or SKU-8821"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-xs font-mono font-bold focus:outline-none focus:border-blue-600"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
              >
                <Zap className="w-4 h-4" /> Scan
              </button>
            </div>
          </form>

          {/* One-Click Quick Sample Barcodes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Quick Test Barcodes (Click to simulate scan)
              </span>
              <span className="text-[10px] text-slate-400">Inventory sample</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => scanDemoProduct(p.barcode)}
                  className="text-left p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition group"
                >
                  <div className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600">
                    {p.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    |||| {p.barcode.slice(-6)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-[11px] text-slate-500">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Tip: Any connected USB or Bluetooth laser barcode gun works globally without opening this dialog.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
