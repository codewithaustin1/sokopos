import React, { useState } from 'react';
import {
  LogIn,
  Shield,
  Key,
  Building2,
  X,
  UserCheck,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { SUPER_ADMIN_EMAIL } from '../data/initialData';
import { SignUpSkeleton } from './SignUpSkeleton';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'google' | 'credentials' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'google',
}) => {
  const {
    currentUser,
    loginWithGoogle,
    loginWithFirebaseGoogle,
    isFirebaseAuthLoading,
    loginWithCredentials,
    isSuperAdmin,
    currentBusiness,
    businesses,
    systemUsers,
  } = usePos();

  const [mode, setMode] = useState<'google' | 'credentials' | 'signup'>(defaultMode);
  const [isFirebaseSigningIn, setIsFirebaseSigningIn] = useState(false);

  // Google Sign-In fields
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);

  // Credentials fields
  const [credUsername, setCredUsername] = useState('');
  const [credPin, setCredPin] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingCreds, setIsSubmittingCreds] = useState(false);

  if (!isOpen) return null;

  // Real Firebase Google OAuth Popup
  const handleFirebasePopup = async () => {
    setIsFirebaseSigningIn(true);
    try {
      const ok = await loginWithFirebaseGoogle();
      if (ok) {
        onClose();
      }
    } finally {
      setIsFirebaseSigningIn(false);
    }
  };

  // 1. Quick Sign-In with Super-Admin
  const handleSuperAdminQuickLogin = () => {
    loginWithGoogle(SUPER_ADMIN_EMAIL, 'Platform Administrator');
    onClose();
  };

  // 2. Custom Google Sign-In
  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;

    if (mode === 'signup') {
      setIsSubmittingSignup(true);
      try {
        // Render structural skeleton shimmer for mental model continuity
        await new Promise((resolve) => setTimeout(resolve, 450));
        const ok = loginWithGoogle(
          googleEmail.trim(),
          googleName.trim() || undefined,
          newStoreName.trim()
        );
        if (ok) {
          onClose();
        }
      } finally {
        setIsSubmittingSignup(false);
      }
      return;
    }

    const ok = loginWithGoogle(
      googleEmail.trim(),
      googleName.trim() || undefined,
      undefined
    );
    if (ok) {
      onClose();
    }
  };

  // 3. System User Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCreds) return;
    if (!credUsername.trim() || !credPin.trim()) return;

    setIsSubmittingCreds(true);
    setAuthError(null);
    try {
      const success = await loginWithCredentials(credUsername.trim(), credPin.trim());
      if (success) {
        onClose();
      } else {
        setAuthError('Invalid credentials. Check your username and PIN.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error. Please retry.');
    } finally {
      setIsSubmittingCreds(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <LogIn className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm">Account Authentication</h3>
              <p className="text-[10px] text-slate-400">
                Google OAuth & System User Access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 flex items-center gap-2 text-xs font-bold p-1.5">
          <button
            onClick={() => {
              setMode('google');
              setAuthError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-center transition cursor-pointer ${
              mode === 'google'
                ? 'bg-white text-blue-600 shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Google OAuth
          </button>
          <button
            onClick={() => {
              setMode('signup');
              setAuthError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-center transition cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-blue-600 shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Business Signup
          </button>
          <button
            onClick={() => {
              setMode('credentials');
              setAuthError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-center transition cursor-pointer ${
              mode === 'credentials'
                ? 'bg-white text-blue-600 shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            System Users
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* TAB 1: GOOGLE OAUTH */}
          {mode === 'google' && (
            <div className="space-y-4">
              {/* Real Firebase Google OAuth Popup Button */}
              <button
                type="button"
                disabled={isFirebaseSigningIn}
                onClick={handleFirebasePopup}
                className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs py-3 px-3 rounded-xl transition border-2 border-blue-600 flex items-center justify-center gap-2.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span>{isFirebaseSigningIn ? 'Connecting to Google OAuth...' : 'Sign in with Google (Firebase Popup)'}</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Or Quick-Select Store Account
                </span>
              </div>

              {/* Seeded Super-Admin Callout */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-700" />
                    Platform Administrator Account
                  </span>
                  <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded">
                    SUPER-ADMIN
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mb-2">
                  Seed account with full read-write privileges across all businesses.
                </p>
                <button
                  type="button"
                  onClick={handleSuperAdminQuickLogin}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Authenticate as {SUPER_ADMIN_EMAIL}</span>
                </button>
              </div>

              {/* Existing Business Owners Quick Pick */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Or Sign in as Business Owner via Google:
                </span>
                <div className="space-y-2">
                  {businesses.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        loginWithGoogle(b.ownerEmail, b.ownerName);
                        onClose();
                      }}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{b.name}</div>
                        <div className="text-[11px] text-slate-400">{b.ownerEmail}</div>
                      </div>
                      <span className="text-blue-600 font-bold text-[11px]">Sign in →</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Google Email Entry */}
              <form onSubmit={handleGoogleSubmit} className="pt-2 border-t border-slate-100 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Other Google Account Email
                  </label>
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="e.g. name@gmail.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                  <span>Sign In with Google</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: BUSINESS OWNER SELF-SIGNUP (GOOGLE) */}
          {mode === 'signup' && (
            isSubmittingSignup ? (
              <div className="py-2">
                <SignUpSkeleton
                  variant="form-only"
                  theme="light"
                  mode="signup"
                  message="Provisioning business tenant & linking Google credentials..."
                />
              </div>
            ) : (
              <form onSubmit={handleGoogleSubmit} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Self-signup: Register a new business tenant and link it directly to your Google Account.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Business / Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="e.g. Rift Valley Mart"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Google Account Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="e.g. owner@riftvalleymart.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="e.g. Daniel Kiprop"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete Signup via Google Account</span>
                </button>
              </form>
            )
          )}

          {/* TAB 3: SYSTEM USER CREDENTIALS LOGIN */}
          {mode === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-3">
              <p className="text-xs text-slate-500">
                Cashiers and managers log in with credentials assigned by the business owner.
              </p>

              {authError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Username / Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={credUsername}
                  onChange={(e) => setCredUsername(e.target.value)}
                  placeholder="e.g. john.mutua or #8841"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4-Digit Access PIN *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={credPin}
                  onChange={(e) => setCredPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 text-sm tracking-widest border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              {/* Helper chips for fast demo */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                <span className="font-bold block text-slate-700 mb-1">Quick Demo Staff Accounts:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCredUsername('john.mutua');
                      setCredPin('1234');
                    }}
                    className="bg-white border border-slate-200 px-2 py-0.5 rounded font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    John Mutua (PIN: 1234)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCredUsername('sarah.wanjiku');
                      setCredPin('2345');
                    }}
                    className="bg-white border border-slate-200 px-2 py-0.5 rounded font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Sarah Wanjiku (PIN: 2345)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingCreds}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isSubmittingCreds ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Key className="w-3.5 h-3.5" />
                )}
                <span>{isSubmittingCreds ? 'Verifying Bcrypt Hash...' : 'Log In with Assigned Credentials'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
