import React from 'react';
import { LogOut, AlertTriangle, X, ShieldAlert, ShoppingBag } from 'lucide-react';
import { usePos } from '../context/PosContext';
import { isSuperAdminEmail } from '../data/initialData';

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
    isDemoSession,
  } = usePos();

  if (!isOpen || !currentUser) return null;

  const isShiftOpen = !!activeShift && activeShift.status === 'open';

  const handleConfirmSignOut = () => {
    const success = logout();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl border bg-red-500/20 text-red-400 border-red-500/30">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Sign out of your till?
              </h3>
              <p className="text-[11px] text-slate-300">
                Check your open shift and unfinished basket before leaving
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Active User Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                currentUser.role === 'super_admin' && !isDemoSession
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {currentUser.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800 truncate">
                  {currentUser.name}
                </span>
                <span className="text-[11px] capitalize font-medium text-slate-500">
                  ·{' '}
                  {currentUser.role === 'super_admin'
                    ? isDemoSession
                      ? 'Store Manager'
                      : 'Platform Support'
                    : currentUser.role.replace('_', ' ')}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {isSuperAdminEmail(currentUser.email) ? 'support@sokopos.co.ke' : currentUser.email}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {currentBusiness.name} · {currentLocation.name}
              </div>
            </div>
          </div>

          {/* Active Shift Notice */}
          {isShiftOpen && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="text-xs text-amber-900 flex-1">
                  <div className="font-bold text-xs text-amber-950 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono tabular-nums">Shift #{activeShift.shiftNumber} is still open</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800 mt-1">
                    Signing out will close this shift automatically and save all cash, M-Pesa, and sales totals under <span className="font-bold">{activeShift.cashierName}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {cart.length > 0 ? (
            /* Cart Warning if active items exist */
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <div className="font-bold mb-1 flex items-center gap-1.5 tabular-nums">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Unfinished customer basket ({cart.length} item{cart.length > 1 ? 's' : ''})</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  You still have <span className="font-bold tabular-nums">{cart.length} item{cart.length > 1 ? 's' : ''}</span> totaling{' '}
                  <span className="font-bold font-mono tabular-nums">{currentLocation.currency} {cartTotal.toLocaleString()}</span> in
                  the basket. Signing out now will clear this unfinished sale.
                </p>
              </div>
            </div>
          ) : !isShiftOpen ? (
            <div className="text-xs text-slate-600 leading-relaxed">
              Your shift is closed and no customer items are waiting in the basket. You can sign out safely now.
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer whitespace-nowrap"
            >
              Stay on till
            </button>

            <button
              type="button"
              id="confirm-signout-btn"
              onClick={handleConfirmSignOut}
              className="min-h-[44px] bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign out now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
