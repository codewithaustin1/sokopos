import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'compact' | 'badge' | 'menu-item';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed and running standalone, suppress prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
  };

  if (installSuccess) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span>Installed for offline use</span>
      </div>
    );
  }

  // Chromium / Android / Desktop Install Flow
  if (isInstallable) {
    if (variant === 'menu-item') {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Install SokoPoS on device for 100% offline access"
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer ${className}`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Download className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">Install SokoPoS App</span>
          </span>
          <span className="text-[11px] font-medium text-blue-600 whitespace-nowrap shrink-0">
            Offline Ready
          </span>
        </button>
      );
    }

    if (variant === 'compact') {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Install SokoPoS on device for 100% offline access"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Install App</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleInstallClick}
        title="Install SokoPoS on device for 100% offline access"
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1565d8] hover:bg-[#1255b5] text-white text-xs sm:text-sm font-bold transition shadow-2xs cursor-pointer active:scale-95 ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Install SokoPoS</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Add SokoPoS to Home Screen"
          className={
            variant === 'menu-item'
              ? `w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer ${className}`
              : `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${className}`
          }
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">{variant === 'menu-item' ? 'Install SokoPoS App' : 'Install App'}</span>
          </span>
          {variant === 'menu-item' && (
            <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">iOS</span>
          )}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-left border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1565d8] text-white font-black flex items-center justify-center text-sm shadow-2xs">
                    S
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">Install on iPhone / iPad</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Enables 100% offline loading</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-[#1565d8] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button (box with upward arrow) in the Safari toolbar.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-[#1565d8] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Scroll down and select <strong>Add to Home Screen</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-[#1565d8] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Tap <strong>Add</strong>. SokoPoS will launch like a native app even without internet!
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-[#1565d8] hover:bg-[#1255b5] text-white font-bold text-xs transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
