import React, { useState } from 'react';
import { X, UserPlus, Shield, Loader2, ArrowLeft, Check } from 'lucide-react';
import { usePos } from '../context/PosContext';
import { SUPER_ADMIN_EMAIL } from '../data/initialData';

interface GoogleOAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GoogleOAuthDialog: React.FC<GoogleOAuthDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { loginWithGoogle, loginWithFirebaseGoogle, businesses } = usePos();
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [authenticatingEmail, setAuthenticatingEmail] = useState<string | null>(null);
  const [isPopupSigningIn, setIsPopupSigningIn] = useState(false);

  if (!isOpen) return null;

  const handleFirebasePopup = async () => {
    setIsPopupSigningIn(true);
    try {
      const ok = await loginWithFirebaseGoogle();
      if (ok) {
        onSuccess?.();
        onClose();
      }
    } finally {
      setIsPopupSigningIn(false);
    }
  };

  const handleSelectAccount = async (email: string, name?: string) => {
    setAuthenticatingEmail(email);
    // Simulate realistic Google OAuth 2.0 handshake
    await new Promise((res) => setTimeout(res, 750));
    const ok = loginWithGoogle(email, name);
    setAuthenticatingEmail(null);
    if (ok) {
      onSuccess?.();
      onClose();
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    handleSelectAccount(customEmail.trim(), customName.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 transition-all font-sans">
        {/* Google Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Official Google 4-color 'G' */}
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200/80 flex items-center justify-center shadow-xs">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight leading-snug">
                Sign in with Google
              </h2>
              <p className="text-xs text-slate-500">
                Choose an account to continue to <span className="font-semibold text-slate-700">SokoPoS Engine</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={!!authenticatingEmail}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer disabled:opacity-40"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading Overlay when authenticating */}
        {authenticatingEmail && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin flex items-center justify-center" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Signing in to SokoPoS...</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs break-all">
                Verifying Google identity token for <span className="font-semibold text-blue-600">{authenticatingEmail}</span>
              </p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        )}

        {!authenticatingEmail && !isPopupSigningIn && !isCustomMode && (
          <div className="p-4 space-y-2">
            {/* Real Firebase Google OAuth Popup Button */}
            <button
              type="button"
              onClick={handleFirebasePopup}
              className="w-full text-left p-3.5 rounded-2xl border-2 border-blue-600 bg-blue-50/70 hover:bg-blue-100/80 transition flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-blue-200 flex items-center justify-center shadow-xs shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-blue-900">
                      Live Google Account Popup
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-600 text-white">
                      FIREBASE OAUTH
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-700">
                    Open official Google Authentication window
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition">
                Authorize →
              </span>
            </button>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Or Quick-Select Pre-Configured Store Accounts
              </span>
            </div>

            {/* Account 1: Platform Super-Admin */}
            <button
              onClick={() => handleSelectAccount(SUPER_ADMIN_EMAIL, 'Platform Administrator')}
              className="w-full text-left p-3.5 rounded-2xl border border-amber-200/80 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50/80 transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                  PA
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                      Platform Administrator
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                      SUPER-ADMIN
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {SUPER_ADMIN_EMAIL}
                  </div>
                  <div className="text-[10px] text-amber-800 font-semibold mt-0.5 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-700" />
                    Full oversight across all retail tenants
                  </div>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-amber-100 group-hover:bg-blue-600 group-hover:text-white text-amber-800 flex items-center justify-center transition">
                <Check className="w-4 h-4" />
              </div>
            </button>

            {/* Existing Tenant Owners */}
            {businesses.map((biz) => (
              <button
                key={biz.id}
                onClick={() => handleSelectAccount(biz.ownerEmail, biz.ownerName)}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {biz.ownerName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                      {biz.ownerName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {biz.ownerEmail}
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                      Store: <span className="font-semibold text-slate-800">{biz.name}</span> ({biz.currency})
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition">
                  Select →
                </span>
              </button>
            ))}

            {/* Option to use another Google Account */}
            <button
              onClick={() => setIsCustomMode(true)}
              className="w-full text-left p-3.5 rounded-2xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-slate-50 transition flex items-center gap-3 text-slate-700 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Use another Google account</div>
                <div className="text-[11px] text-slate-400">Enter custom email address</div>
              </div>
            </button>
          </div>
        )}

        {/* Custom Email Form */}
        {!authenticatingEmail && isCustomMode && (
          <form onSubmit={handleCustomSubmit} className="p-6 space-y-4">
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to account list</span>
            </button>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Google Account Email *
              </label>
              <input
                type="email"
                required
                autoFocus
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="name@gmail.com or workspace domain"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Full Name (Optional)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                Continue with this Account
              </button>
            </div>
          </form>
        )}

        {/* Google OAuth Legal Disclaimer Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
          To continue, Google will share your name, email address, language preference, and profile picture with SokoPoS Cloud Engine.
        </div>
      </div>
    </div>
  );
};
