import React from 'react';
import { Lock } from 'lucide-react';
import { usePos } from '../../context/PosContext';

interface ShiftSessionClosedCardProps {
  onOpenShiftClick: () => void;
  className?: string;
}

export const ShiftSessionClosedCard: React.FC<ShiftSessionClosedCardProps> = ({
  onOpenShiftClick,
  className = '',
}) => {
  const { currentLocation, currentUser, currentCashier } = usePos();

  // Resolve operator name and formatted role
  const operatorName = currentUser?.name || currentCashier?.name || 'Store Manager';
  const rawRole = currentUser?.role || currentCashier?.role || 'cashier';
  const formattedRole = (() => {
    if (rawRole === 'super_admin') return 'Store Manager';
    if (rawRole === 'business_owner') return 'Business Owner';
    if (rawRole === 'manager') return 'Store Manager';
    if (rawRole === 'supervisor') return 'Shift Supervisor';
    return 'Cashier';
  })();

  const terminalLocation = currentLocation?.name || 'Garden City';
  const terminalName = currentLocation?.terminalName || 'Terminal 02 - PoS Register';

  return (
    <div
      className={`max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden text-left ${className}`}
    >
      {/* Top Header Banner: Deep Solid Navy Blue with Lock & Centered Title */}
      <div className="bg-[#132c54] px-6 py-5 sm:py-6 text-white relative flex items-center justify-between">
        <div className="flex items-center">
          <Lock className="w-5 h-5 text-slate-300 stroke-[2] shrink-0" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white text-center flex-1 pr-5">
          Shift Session Closed
        </h2>
      </div>

      {/* Main Card Body */}
      <div className="p-6 sm:p-7 space-y-4 bg-white">
        {/* Metadata Cards (2 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Card 1: TERMINAL LOCATION */}
          <div className="bg-[#f0f4f8] border border-slate-200/90 rounded-2xl p-4 transition-all">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              TERMINAL LOCATION
            </div>
            <div className="text-base font-bold text-slate-900 leading-snug truncate">
              {terminalLocation}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {terminalName}
            </div>
          </div>

          {/* Card 2: LOGGED OPERATOR */}
          <div className="bg-[#f0f4f8] border border-slate-200/90 rounded-2xl p-4 transition-all">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              LOGGED OPERATOR
            </div>
            <div className="text-base font-bold text-slate-900 leading-snug truncate">
              {operatorName}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {formattedRole}
            </div>
          </div>
        </div>

        {/* Action Button: Deep Navy Blue */}
        <button
          type="button"
          onClick={onOpenShiftClick}
          className="w-full py-4 px-6 rounded-2xl font-bold text-white text-base bg-[#132c54] hover:bg-[#0e2140] active:bg-[#0a1830] transition shadow-md flex items-center justify-center text-center cursor-pointer"
        >
          Open Shift Session & Unlock Register
        </button>
      </div>
    </div>
  );
};
