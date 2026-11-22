import React, { useState, useEffect, useCallback } from 'react';
import { Lock, X, Loader2, ShieldCheck } from 'lucide-react';
import { usePos } from '../context/PosContext';

interface SellingModeExitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SellingModeExitModal: React.FC<SellingModeExitModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentCashier, verifyAndExitSellingMode } = usePos();
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPinInput('');
      setErrorMsg(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  const performExitVerification = useCallback(
    async (pin: string) => {
      if (isVerifying || !pin.trim()) return;
      setIsVerifying(true);
      setErrorMsg(null);
      try {
        const res = await verifyAndExitSellingMode(pin);
        if (res.success) {
          onClose();
        } else {
          setErrorMsg(res.error || 'Incorrect PIN. Please try again.');
          setPinInput('');
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Unable to verify PIN right now.');
        setPinInput('');
      } finally {
        setIsVerifying(false);
      }
    },
    [isVerifying, onClose, verifyAndExitSellingMode]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (isVerifying) return;
      setPinInput((prev) => {
        if (prev.length >= 4) return prev;
        const nextPin = prev + digit;
        setErrorMsg(null);
        if (nextPin.length === 4) {
          setTimeout(() => {
            performExitVerification(nextPin);
          }, 90);
        }
        return nextPin;
      });
    },
    [isVerifying, performExitVerification]
  );

  const handleClear = useCallback(() => {
    if (isVerifying) return;
    setPinInput('');
    setErrorMsg(null);
  }, [isVerifying]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (!isVerifying) {
          setPinInput((prev) => prev.slice(0, -1));
          setErrorMsg(null);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pinInput.length > 0) {
          performExitVerification(pinInput);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, isOpen, isVerifying, onClose, performExitVerification, pinInput]);

  if (!isOpen) return null;

  return (
    <div
      id="selling-mode-exit-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="selling-mode-exit-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] p-3 sm:p-4 flex items-center justify-center overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-lg p-5 sm:p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="selling-mode-exit-title"
                className="text-sm sm:text-base font-bold text-slate-900 leading-tight"
              >
                Exit Selling Mode
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {currentCashier.name} · PIN Verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel exiting Selling Mode"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mt-3 leading-relaxed border-t border-slate-100 pt-3">
          Enter your 4-digit operator or manager PIN to restore all navigation tabs and back-office screens.
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3.5 my-4" aria-label="PIN digits entered">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < pinInput.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-blue-600 scale-110'
                    : 'bg-slate-100 border border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-xs text-red-600 font-semibold text-center mb-3">
            {errorMsg}
          </p>
        )}

        {/* Touch & Click Numpad */}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={isVerifying}
              className="min-h-[46px] bg-slate-50 hover:bg-slate-100 active:bg-blue-50 border border-slate-200 rounded-xl font-bold text-base text-slate-800 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={isVerifying}
            className="min-h-[46px] bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 rounded-xl font-semibold text-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={isVerifying}
            className="min-h-[46px] bg-slate-50 hover:bg-slate-100 active:bg-blue-50 border border-slate-200 rounded-xl font-bold text-base text-slate-800 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => performExitVerification(pinInput)}
            disabled={isVerifying || pinInput.length === 0}
            className="min-h-[46px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
          >
            {isVerifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Unlock</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full min-h-[40px] text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
        >
          Stay in Selling Mode
        </button>
      </div>
    </div>
  );
};
