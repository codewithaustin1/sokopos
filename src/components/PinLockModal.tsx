import React, { useState } from 'react';
import { Lock, UserCheck, Shield, ChevronDown, Loader2 } from 'lucide-react';
import { usePos } from '../context/PosContext';

export const PinLockModal: React.FC = () => {
  const {
    isPinLocked,
    setIsPinLocked,
    currentCashier,
    cashiers,
    setCurrentCashier,
    verifyPin,
    currentLocation,
  } = usePos();

  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isPinLocked) return null;

  const performVerification = async (pin: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const ok = await verifyPin(pin);
      if (!ok) {
        setErrorMsg('Invalid PIN. Please re-enter.');
        setPinInput('');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification error. Please retry.');
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
    <div id="pin-lock-screen" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-slate-50 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-8 flex flex-col justify-between max-h-[95vh]">
        {/* Top Branding (matching Screen 1) */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-blue-600 tracking-tight leading-none">
              SokoPoS
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              by Sokoplus Horizon
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate max-w-[150px]">{currentLocation.name.split(' ')[0]}</span>
          </div>
        </div>

        {/* PIN Auth Card (matching Screen 1) */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 flex flex-col items-center">
          {/* Cashier Avatar */}
          <div
            className={`w-18 h-18 ${currentCashier.avatarColor} text-white rounded-full flex items-center justify-center font-black text-2xl mb-2 border-2 border-white shadow-md`}
          >
            {currentCashier.initials}
          </div>

          <h2 className="text-base font-bold text-slate-800">{currentCashier.name}</h2>
          <p className="text-xs text-slate-400 mb-1">
            Cashier ID: {currentCashier.code} • {currentCashier.role}
          </p>

          {/* Switch Cashier Selector */}
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-[10px] text-slate-400">Switch:</span>
            {cashiers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCurrentCashier(c);
                  setPinInput('');
                  setErrorMsg(null);
                }}
                className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                  c.id === currentCashier.id
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name.split(' ')[0]} ({c.role})
              </button>
            ))}
          </div>

          {/* Masked PIN Input Dots */}
          <div className="flex gap-4 my-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = idx < pinInput.length;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all ${
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
          <div className="grid grid-cols-3 gap-2.5 w-full mt-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigit(num)}
                className="h-12 bg-slate-50 hover:bg-slate-100 active:bg-blue-50 font-bold text-lg text-slate-800 rounded-xl border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 font-bold text-xs rounded-xl border border-red-100 transition active:scale-95 cursor-pointer"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-12 bg-slate-50 hover:bg-slate-100 active:bg-blue-50 font-bold text-lg text-slate-800 rounded-xl border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleEnter}
              disabled={isVerifying || pinInput.length === 0}
              className="h-12 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center cursor-pointer active:scale-95"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ENTER'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-200 pt-4 mt-6">
          <span>SokoPoS v3.2.0 • Online</span>
          <span>Support: +254 700 000 000</span>
        </div>
      </div>
    </div>
  );
};
