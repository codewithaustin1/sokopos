import React, { useState, useEffect } from 'react';
import { Lock, UserCheck, Shield, Loader2, LogOut, AlertTriangle } from 'lucide-react';
import { usePos } from '../context/PosContext';
import { AppLogo } from './common/AppLogo';

export const PinLockModal: React.FC = () => {
  const {
    isPinLocked,
    setIsPinLocked,
    currentCashier,
    verifyPin,
    currentLocation,
    forceLogoutSession,
    logout,
  } = usePos();

  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Listen for physical keyboard / numpad input when locked
  useEffect(() => {
    if (!isPinLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an explicit form input element is active
      if (
        document.activeElement?.tagName === 'INPUT' &&
        (document.activeElement as HTMLInputElement).type !== 'password'
      ) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPinInput((prev) => prev.slice(0, -1));
        setErrorMsg(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleEnter();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPinLocked, isVerifying, pinInput]);

  if (!isPinLocked) return null;

  const performVerification = async (pin: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const ok = await verifyPin(pin);
      if (!ok) {
        setErrorMsg('That PIN did not match. Try your 4 digits again.');
        setPinInput('');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not check your PIN. Please try again.');
      setPinInput('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (isVerifying) return;
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setErrorMsg(null);
      if (nextPin.length === 4) {
        // Auto-verify on 4th digit with server bcrypt
        setTimeout(() => {
          performVerification(nextPin);
        }, 100);
      }
    }
  };

  const handleClear = () => {
    if (isVerifying) return;
    setPinInput('');
    setErrorMsg(null);
  };

  const handleEnter = () => {
    if (isVerifying || pinInput.length === 0) return;
    performVerification(pinInput);
  };

  return (
    <div
      id="pin-lock-screen"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm p-3 sm:p-4 md:p-6 flex justify-center items-center"
    >
      <div className="bg-slate-50 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-7 flex flex-col my-auto max-h-[92vh] overflow-y-auto modal-scrollbar overscroll-contain">
        {/* Top Branding */}
        <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
          <AppLogo theme="light" size="md" />
          <span className="text-xs font-semibold text-slate-600 truncate max-w-[160px]">
            {currentLocation.name}
          </span>
        </div>

        {/* PIN Auth Card with Dedicated Scrolling Protection */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-md border border-slate-200 flex flex-col items-center shrink-0">
          {/* Cashier Avatar */}
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 ${currentCashier.avatarColor} text-white rounded-xl flex items-center justify-center font-black text-xl sm:text-2xl mb-1.5 border-2 border-white shadow-md shrink-0`}
          >
            {currentCashier.initials}
          </div>

          <h2 className="text-sm sm:text-base font-bold text-slate-800">{currentCashier.name}</h2>
          <p className="text-xs text-slate-500 font-mono tabular-nums mb-2">
            {currentCashier.code} · {currentCashier.role}
          </p>

          {/* Shift attribution notice */}
          <div className="w-full border-y border-slate-200 py-2.5 mb-2.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700">
              <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Till locked for this shift</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Enter your 4-digit PIN to resume selling so every sale stays under your name.
            </p>
          </div>

          {/* Masked PIN Input Dots */}
          <div className="flex gap-3 sm:gap-4 my-1.5 sm:my-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = idx < pinInput.length;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all ${
                    isFilled
                      ? 'bg-blue-600 scale-110 shadow-xs'
                      : 'bg-slate-200 border border-slate-300'
                  }`}
                />
              );
            })}
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 font-bold mt-1 text-center animate-shake">
              {errorMsg}
            </p>
          )}

          {/* Touch Keypad */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full mt-3 sm:mt-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigit(num)}
                className="h-11 sm:h-12 bg-slate-50 hover:bg-slate-100 active:bg-blue-50 font-bold text-base sm:text-lg text-slate-800 rounded-xl border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-11 sm:h-12 bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 font-bold text-xs rounded-xl border border-red-100 transition active:scale-95 cursor-pointer"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-11 sm:h-12 bg-slate-50 hover:bg-slate-100 active:bg-blue-50 font-bold text-base sm:text-lg text-slate-800 rounded-xl border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleEnter}
              disabled={isVerifying || pinInput.length === 0}
              className="h-11 sm:h-12 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center cursor-pointer active:scale-95"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ENTER'}
            </button>
          </div>

          {/* Switch Account Action */}
          <button
            type="button"
            onClick={() => {
              if (typeof forceLogoutSession === 'function') {
                forceLogoutSession('admin_action', undefined, 'Operator switched at locked terminal');
              } else {
                logout();
              }
            }}
            className="mt-3 sm:mt-4 min-h-[40px] text-xs font-semibold text-slate-500 hover:text-red-600 transition flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-lg hover:bg-slate-100 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Not {currentCashier.name.split(' ')[0]}? Switch cashier</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-500 border-t border-slate-200 pt-3 sm:pt-4 mt-4 sm:mt-5 shrink-0">
          <span>Ready to resume shift</span>
          <span className="font-mono tabular-nums">Help: +254 740 463 021</span>
        </div>
      </div>
    </div>
  );
};
