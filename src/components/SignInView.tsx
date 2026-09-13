import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Building2,
  Lock,
  User,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Store,
  Clock,
  ArrowRight,
  Fingerprint,
  Delete,
  Loader2,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { SUPER_ADMIN_EMAIL } from '../data/initialData';
import { GoogleOAuthDialog } from './GoogleOAuthDialog';
import { soundFx } from '../utils/audio';

interface SignInViewProps {
  onLoginSuccess?: () => void;
}

export const SignInView: React.FC<SignInViewProps> = ({ onLoginSuccess }) => {
  const {
    loginWithGoogle,
    loginWithFirebaseGoogle,
    isFirebaseAuthLoading,
    loginWithCredentials,
    businesses,
    systemUsers,
    locations,
    showToast,
  } = usePos();

  const [activeTab, setActiveTab] = useState<'google' | 'terminal' | 'register'>('google');
  const [isGoogleDialogOpen, setIsGoogleDialogOpen] = useState(false);
  const [isFirebaseSigningIn, setIsFirebaseSigningIn] = useState(false);

  // Terminal PIN / Staff login state
  const [selectedStaffId, setSelectedStaffId] = useState<string>(() => systemUsers[0]?.id || '');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [customUsername, setCustomUsername] = useState<string>('');
  const [isCustomStaff, setIsCustomStaff] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSubmittingTerminal, setIsSubmittingTerminal] = useState<boolean>(false);

  // New Store Registration form
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');

  // Keep selectedStaffId aligned if systemUsers changes
  useEffect(() => {
    if (!selectedStaffId && systemUsers.length > 0) {
      setSelectedStaffId(systemUsers[0].id);
    }
  }, [systemUsers, selectedStaffId]);

  // Handle physical keyboard for PIN
  useEffect(() => {
    if (activeTab !== 'terminal') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if focusing an input other than PIN
      if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type !== 'password') {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        soundFx.playBarcodeBeep();
        setEnteredPin((prev) => (prev.length < 6 ? prev + e.key : prev));
        setPinError(null);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setEnteredPin((prev) => prev.slice(0, -1));
        setPinError(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleTerminalSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, enteredPin, selectedStaffId, isCustomStaff, customUsername]);

  const handleKeypadPress = (digit: string) => {
    soundFx.playBarcodeBeep();
    setPinError(null);
    if (enteredPin.length < 6) {
      setEnteredPin((prev) => prev + digit);
    }
  };

  const handleKeypadClear = () => {
    setEnteredPin('');
    setPinError(null);
  };

  const handleKeypadBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleTerminalSubmit = async () => {
    if (isSubmittingTerminal) return;
    if (!enteredPin) {
      setPinError('Please enter your 4-digit PIN');
      soundFx.playError();
      return;
    }

    let usernameOrCode = '';
    if (isCustomStaff) {
      if (!customUsername.trim()) {
        setPinError('Please enter your staff username or code');
        soundFx.playError();
        return;
      }
      usernameOrCode = customUsername.trim();
    } else {
      const staff = systemUsers.find((u) => u.id === selectedStaffId);
      if (!staff) {
        setPinError('Please select a staff profile');
        return;
      }
      usernameOrCode = staff.username || staff.code || staff.name;
    }

    setIsSubmittingTerminal(true);
    setPinError(null);
    try {
      const success = await loginWithCredentials(usernameOrCode, enteredPin);
      if (success) {
        onLoginSuccess?.();
      } else {
        setPinError('Incorrect PIN or unauthorized staff account');
        setEnteredPin('');
        soundFx.playError();
      }
    } catch (err: any) {
      setPinError(err?.message || 'Authentication error. Please retry.');
      setEnteredPin('');
      soundFx.playError();
    } finally {
      setIsSubmittingTerminal(false);
    }
  };

  const handleRegisterStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newOwnerEmail.trim()) {
      showToast('Store name and Google owner email are required', 'error');
      return;
    }
    const success = loginWithGoogle(
      newOwnerEmail.trim(),
      newOwnerName.trim() || 'Store Owner',
      newStoreName.trim()
    );
    if (success) {
      onLoginSuccess?.();
    }
  };

  const activeStaffMember = systemUsers.find((u) => u.id === selectedStaffId);

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col justify-between text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Bar: Terminal Status */}
      <header className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight text-white">SokoPoS</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PRO RETAIL
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Cloud Multi-Tenant Point of Sale</div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-300">Terminal Ready</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Encrypted Session • Offline-First Storage
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Header Description */}
          <div className="p-6 sm:p-8 pb-4 text-center border-b border-slate-800/60">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 mb-3 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sign In to POS Terminal
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Select an authentication method to activate your register shift and access store operations.
            </p>

            {/* Segmented Mode Selector */}
            <div className="mt-6 grid grid-cols-3 gap-1 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('google')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'google'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="truncate">Google OAuth</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('terminal')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'terminal'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Key className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Staff Keypad PIN</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Store className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">New Store</span>
              </button>
            </div>
          </div>

          {/* TAB 1: GOOGLE OAUTH */}
          {activeTab === 'google' && (
            <div className="p-6 sm:p-8 space-y-4">
              {/* Primary: Live Firebase Google Popup */}
              <button
                type="button"
                disabled={isFirebaseSigningIn}
                onClick={async () => {
                  setIsFirebaseSigningIn(true);
                  try {
                    const ok = await loginWithFirebaseGoogle();
                    if (ok) {
                      onLoginSuccess?.();
                    }
                  } finally {
                    setIsFirebaseSigningIn(false);
                  }
                }}
                className="w-full bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm py-3.5 px-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-3 cursor-pointer border border-slate-200 group disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isFirebaseSigningIn ? 'Opening Google Auth...' : 'Continue with Google Account'}</span>
              </button>

              {/* Secondary: Choose from pre-configured accounts */}
              <button
                type="button"
                onClick={() => setIsGoogleDialogOpen(true)}
                className="w-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
                <span>Choose from Account Picker Dialog</span>
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  One-Click Verified Google Accounts
                </span>
              </div>

              {/* Seeded Platform Super-Admin Card */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 transition hover:border-amber-500/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-amber-300">
                      Platform Super-Administrator
                    </span>
                  </div>
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                    ROOT OVERVIEW
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  Default enterprise system administrator with uninhibited cross-tenant oversight across all registered stores.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    loginWithGoogle(SUPER_ADMIN_EMAIL, 'Platform Administrator');
                    onLoginSuccess?.();
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Sign In as {SUPER_ADMIN_EMAIL}</span>
                </button>
              </div>

              {/* Registered Store Owners Cards */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Or Sign In as Tenant Business Owner:
                </span>
                <div className="space-y-2">
                  {businesses.map((biz) => (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        loginWithGoogle(biz.ownerEmail, biz.ownerName);
                        onLoginSuccess?.();
                      }}
                      className="w-full text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/60 hover:bg-slate-800/40 transition flex items-center justify-between text-xs cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                          {biz.ownerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-blue-400 transition">
                            {biz.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {biz.ownerEmail} • Owner: {biz.ownerName}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-blue-400 group-hover:translate-x-1 transition flex items-center gap-1">
                        Sign In →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TERMINAL KEYPAD PIN */}
          {activeTab === 'terminal' && (
            <div className="p-6 sm:p-8 space-y-5">
              {/* Staff Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Select Cashier / Staff Profile:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomStaff(!isCustomStaff);
                      setEnteredPin('');
                      setPinError(null);
                    }}
                    className="text-[11px] font-semibold text-blue-400 hover:underline cursor-pointer"
                  >
                    {isCustomStaff ? 'Select from list' : 'Enter custom username'}
                  </button>
                </div>

                {isCustomStaff ? (
                  <input
                    type="text"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    placeholder="Staff username or badge code (e.g. john.mutua or #8841)"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {systemUsers.map((staff) => {
                      const isSelected = staff.id === selectedStaffId;
                      return (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => {
                            setSelectedStaffId(staff.id);
                            setEnteredPin('');
                            setPinError(null);
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                              staff.avatarColor || 'bg-blue-600'
                            }`}
                          >
                            {staff.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold">{staff.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {staff.code} • {staff.role}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PIN Display & Masked Dots */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-center">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Enter 4-Digit Terminal Security PIN
                </div>

                {/* Animated PIN Dots */}
                <div className="flex items-center justify-center gap-3 my-2">
                  {[0, 1, 2, 3].map((index) => {
                    const isFilled = index < enteredPin.length;
                    return (
                      <div
                        key={index}
                        className={`w-4 h-4 rounded-full transition-all duration-150 ${
                          isFilled
                            ? 'bg-blue-500 scale-110 shadow-sm shadow-blue-500/50'
                            : 'bg-slate-800 border border-slate-700'
                        }`}
                      />
                    );
                  })}
                </div>

                {pinError && (
                  <div className="text-xs text-red-400 font-semibold mt-2 flex items-center justify-center gap-1.5 animate-shake">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{pinError}</span>
                  </div>
                )}
                {!pinError && (
                  <div className="text-[10px] text-slate-400 mt-1">
                    Staff authentication requires an assigned 4-digit PIN
                  </div>
                )}
              </div>

              {/* Touch Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-blue-600 text-lg font-black text-white border border-slate-700/70 transition shadow-xs flex items-center justify-center cursor-pointer select-none"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-400 border border-slate-800 transition flex items-center justify-center cursor-pointer select-none"
                >
                  CLEAR
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-blue-600 text-lg font-black text-white border border-slate-700/70 transition shadow-xs flex items-center justify-center cursor-pointer select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-400 border border-slate-800 transition flex items-center justify-center cursor-pointer select-none"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleTerminalSubmit}
                disabled={enteredPin.length < 4 || isSubmittingTerminal}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingTerminal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Fingerprint className="w-4 h-4" />
                )}
                <span>{isSubmittingTerminal ? 'Verifying Bcrypt Hash...' : 'Clock In & Activate Shift'}</span>
              </button>
            </div>
          )}

          {/* TAB 3: REGISTER NEW STORE */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterStoreSubmit} className="p-6 sm:p-8 space-y-4">
              <div className="text-xs text-slate-300 mb-2">
                Register an enterprise retail store in seconds. Your Google Account will be assigned full administrative ownership of the new business tenant.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Store / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="e.g. Mombasa Coastal Grocers"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Business Owner Google Email *
                </label>
                <input
                  type="email"
                  required
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  placeholder="e.g. owner@coastal-grocers.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Owner Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="e.g. Fatuma Ali"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Store className="w-4 h-4" />
                  <span>Provision Store & Sign In with Google</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer System Disclaimer */}
      <footer className="px-6 py-4 border-t border-slate-800/80 bg-slate-900/40 text-center text-xs text-slate-400">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
          <span>© 2026 SokoPoS Enterprise Platform</span>
          <span>•</span>
          <span>Multi-Tenant Retail POS</span>
          <span>•</span>
          <span>Offline SQLite/LocalStorage Buffer</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              loginWithGoogle(SUPER_ADMIN_EMAIL, 'Platform Administrator');
              onLoginSuccess?.();
            }}
            className="text-amber-400 hover:underline font-semibold cursor-pointer"
          >
            Instant Admin Bypass ({SUPER_ADMIN_EMAIL})
          </button>
        </div>
      </footer>

      {/* Google OAuth Modal */}
      <GoogleOAuthDialog
        isOpen={isGoogleDialogOpen}
        onClose={() => setIsGoogleDialogOpen(false)}
        onSuccess={() => {
          setIsGoogleDialogOpen(false);
          onLoginSuccess?.();
        }}
      />
    </div>
  );
};
