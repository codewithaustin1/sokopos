import React, { useState } from 'react';
import {
  Scan,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Activity,
  X,
  Play,
  Keyboard,
  Info,
} from 'lucide-react';
import { useBackgroundScanner } from '../hooks/useBackgroundScanner';
import { usePos } from '../context/PosContext';

interface ScannerStatusBadgeProps {
  onScan?: (code: string) => void;
  variant?: 'pill' | 'menu-item';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export const ScannerStatusBadge: React.FC<ScannerStatusBadgeProps> = ({
  onScan,
  variant = 'pill',
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}) => {
  const { handleBarcodeScanned, showToast } = usePos();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next);
    } else {
      setInternalOpen(next);
    }
  };
  const [testInputText, setTestInputText] = useState('Customer searching soda...');
  const [isSimulating, setIsSimulating] = useState(false);

  const { lastScan, totalScans, simulateBurst } = useBackgroundScanner({
    onBarcodeScanned: (barcode) => {
      if (onScan) {
        onScan(barcode);
      } else {
        handleBarcodeScanned(barcode);
      }
    },
    enabled: !!onScan,
  });

  const handleRunSimulation = async (sampleBarcode = '070000000001') => {
    setIsSimulating(true);
    try {
      await simulateBurst(sampleBarcode, 14);
      showToast(`Simulated scanner burst: ${sampleBarcode}`, 'info');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <>
      {!hideTrigger && (
        variant === 'menu-item' ? (
          <button
            id="header-scanner-status-pill"
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
            title="Hardware Scanner Diagnostics & Test"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Scan className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="truncate">Hardware Scanner Diagnostics</span>
            </span>
            <span className="text-[11px] font-medium text-emerald-700 whitespace-nowrap shrink-0">
              Ready
            </span>
          </button>
        ) : (
          <button
            id="header-scanner-status-pill"
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors duration-150 cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border-slate-200 whitespace-nowrap shrink-0"
            title="Hardware Scanner Status: Background Listener is Active"
          >
            <Scan className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Scanner</span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="text-emerald-700 font-medium">Ready</span>
          </button>
        )
      )}

      {/* Diagnostics & Verification Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
          <div
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 z-10 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Scan className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Background Scanner Listener
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Persistent Keyboard Wedge & Burst Interception
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Listener Status
                </div>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Listening (24/7)</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Capture phase window hook
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Total Scans Captured
                </div>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-blue-700 font-mono text-base">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>{totalScans}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  This POS session
                </div>
              </div>
            </div>

            {/* Focused Input Immunity Feature Highlight */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Focused Input Immunity Active</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                When you scan an item while typing in the product search box, customer field,
                or modal input, the scanner listener captures the barcode and automatically restores
                your input element without character pollution.
              </p>
            </div>

            {/* Last Captured Telemetry */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-bold">Last Scanned Barcode:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {lastScan ? lastScan.barcode : 'None yet'}
                </span>
              </div>
              {lastScan && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[11px] text-slate-500">
                  <div>
                    <span>Avg Key Gap: </span>
                    <strong className="text-slate-800 font-mono">
                      {lastScan.interKeyAvgMs}ms
                    </strong>
                  </div>
                  <div>
                    <span>Target Focus: </span>
                    <strong className="text-slate-800">
                      {lastScan.targetTagName}
                    </strong>
                  </div>
                  <div>
                    <span>Input Restored: </span>
                    <strong className={lastScan.inputWasRestored ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
                      {lastScan.inputWasRestored ? 'Yes (Cleaned)' : 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span>Burst Time: </span>
                    <strong className="text-slate-800 font-mono">
                      {lastScan.burstDurationMs}ms
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Hardware Simulation Playground */}
            <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900 flex items-center gap-1">
                  <Keyboard className="w-3.5 h-3.5 text-blue-600" />
                  <span>Test Focused Input Immunity</span>
                </span>
                <span className="text-[10px] text-blue-600 font-medium">Interactive Demo</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Focus this test box below, then click &quot;Simulate Hardware Scan&quot;. Notice how the test text is preserved while the barcode adds to the cart!
              </p>
              <div className="flex gap-2">
                <input
                  id="scanner-test-focus-input"
                  type="text"
                  value={testInputText}
                  onChange={(e) => setTestInputText(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  placeholder="Focus here to test immunity..."
                />
                <button
                  type="button"
                  id="simulate-catalog-scan-btn"
                  disabled={isSimulating}
                  onClick={() => handleRunSimulation('070000000001')}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
                  title="Simulate known catalog item (adds directly to cart)"
                >
                  <Play className="w-3 h-3" />
                  <span>{isSimulating ? 'Bursting...' : 'Simulate Scan'}</span>
                </button>
              </div>

              {/* Unrecognized Barcode Quick-Check HUD Test Trigger */}
              <div className="pt-1.5 border-t border-blue-200/60 flex items-center justify-between gap-2">
                <span className="text-[11px] text-blue-950 font-medium">
                  Test Unrecognized Barcode:
                </span>
                <button
                  type="button"
                  id="simulate-unrecognized-barcode-btn"
                  disabled={isSimulating}
                  onClick={() => {
                    const sampleUncatalogued = `616${Math.floor(100000000 + Math.random() * 900000000)}`;
                    handleRunSimulation(sampleUncatalogued);
                    setIsOpen(false);
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 disabled:opacity-50 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer"
                  title="Simulates a scan for a barcode NOT in the database, opening the Inventory Quick-Check HUD"
                >
                  <Zap className="w-3 h-3 text-cyan-200" />
                  <span>Trigger Quick-Check HUD</span>
                </button>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close Diagnostic
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
