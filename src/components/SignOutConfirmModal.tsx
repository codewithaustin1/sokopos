import React from 'react';
import { LogOut, AlertTriangle, X, ShieldAlert, ShoppingBag, Clock, Lock } from 'lucide-react';
import { usePos } from '../context/PosContext';

interface SignOutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignOutConfirmModal: React.FC<SignOutConfirmModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    currentBusiness,
    currentLocation,
    cart,
    cartTotal,
    logout,
    activeShift,
    openShiftManagement,
  } = usePos();

  if (!isOpen || !currentUser) return null;

  const isShiftOpen = !!activeShift && activeShift.status === 'open';

  const handleConfirmSignOut = () => {
    if (isShiftOpen) return;
    const success = logout();
    if (success) {
      onClose();
    }
  };

  const handleNavigateToCloseShift = () => {
    onClose();
    openShiftManagement();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className={`${isShiftOpen ? 'bg-amber-950' : 'bg-slate-900'} px-6 py-4 text-white flex items-center justify-between transition-colors`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isShiftOpen ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              {isShiftOpen ? <Lock className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-sm text-white">
                {isShiftOpen ? 'Logout Blocked by Policy' : 'Sign Out of POS Terminal'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isShiftOpen ? 'Active Cash Till Session Safeguard' : 'Secure Session Termination'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Active User Card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                currentUser.role === 'super_admin'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {currentUser.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-slate-800 truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {currentBusiness.name} • {currentLocation.name}
              </div>
            </div>
          </div>

          {/* Strict Active Shift Blocking Guardrail Alert */}
          {isShiftOpen ? (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-red-100 rounded-lg text-red-700 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="text-xs text-red-900 flex-1">
                  <div className="font-black text-xs text-red-950 flex items-center gap-1.5">
                    <span>Shift #{activeShift.shiftNumber} Currently Open</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-200 text-red-900 uppercase">
                      Blocking Logout
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-red-800 mt-1">
                    An operator may not log out while they have an open cash drawer session. System security strictly enforces drawer balance and shift closure prior to signing out.
                  </p>
                  <div className="mt-2 text-[10px] text-red-700 bg-red-100/60 p-2 rounded-xl border border-red-200">
                    <div>• Opened at: <span className="font-bold">{new Date(activeShift.openedAt).toLocaleTimeString()}</span></div>
                    <div>• Opening Float: <span className="font-bold">{currentLocation.currency} {activeShift.openingFloat.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNavigateToCloseShift}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Go to Shift & Balance Till to Close Session</span>
              </button>
            </div>
          ) : cart.length > 0 ? (
            /* Cart Warning if active items exist when no shift open */
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Active Cart Session ({cart.length} item{cart.length > 1 ? 's' : ''})
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  You currently have <span className="font-bold">{cart.length} items</span> totaling{' '}
                  <span className="font-bold">{currentLocation.currency} {cartTotal.toLocaleString()}</span> in
                  the register cart. Signing out will <span className="underline font-semibold">clear the cart</span>.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to sign out? Your terminal session will be closed and you will be returned to the sign-in screen.
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              {isShiftOpen ? 'Return to Terminal' : 'Cancel & Stay Signed In'}
            </button>

            {isShiftOpen ? (
              <button
                type="button"
                disabled
                className="bg-slate-200 text-slate-400 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-not-allowed border border-slate-300"
                title="Logout blocked: active shift session must be balanced and closed first"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Logout Prohibited</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmSignOut}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Confirm Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
