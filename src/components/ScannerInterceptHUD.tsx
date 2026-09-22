import React, { useState, useEffect } from 'react';
import { Scan, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { ScannerBurstMetadata } from '../utils/backgroundScanner';

export const ScannerInterceptHUD: React.FC = () => {
  const [activeAlert, setActiveAlert] = useState<ScannerBurstMetadata | null>(null);

  useEffect(() => {
    const handleScanEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ScannerBurstMetadata>;
      if (customEvent.detail) {
        setActiveAlert(customEvent.detail);

        // Auto dismiss after 3.2s
        const timer = setTimeout(() => {
          setActiveAlert((current) =>
            current && current.timestamp === customEvent.detail.timestamp ? null : current
          );
        }, 3200);

        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('barcode-burst-scanned', handleScanEvent);
    return () => {
      window.removeEventListener('barcode-burst-scanned', handleScanEvent);
    };
  }, []);

  if (!activeAlert) return null;

  return (
    <div
      id="scanner-intercept-hud"
      className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 animate-in slide-in-from-bottom-5 fade-in-50 duration-200 pointer-events-auto"
    >
      <div className="bg-slate-900/95 text-white shadow-2xl rounded-2xl p-3 border border-slate-700/80 backdrop-blur-md flex items-center gap-3 max-w-sm">
        <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-400 flex items-center justify-center shrink-0">
          <Scan className="w-4 h-4 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
            <span className="font-mono text-emerald-400 font-black">{activeAlert.barcode}</span>
            <span className="text-[10px] text-slate-400">({activeAlert.interKeyAvgMs}ms/key)</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mt-0.5">
            {activeAlert.inputWasRestored ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[10px]">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Restored focused &lt;{activeAlert.targetTagName.toLowerCase()}&gt;</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-blue-400 font-semibold text-[10px]">
                <CheckCircle2 className="w-3 h-3 text-blue-400" />
                <span>Captured in background</span>
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveAlert(null)}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
