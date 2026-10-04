import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X, Trash2, KeyRound, Loader2 } from 'lucide-react';
import { usePos } from '../context/PosContext';
import { CartItem } from '../types';

interface VoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  voidType: 'line_item' | 'cart_void';
  item?: CartItem | null;
  itemsToVoid: CartItem[];
  onConfirmVoid: () => void;
}

const COMMON_VOID_REASONS = [
  'Customer Changed Mind',
  'Wrong Item Scanned',
  'Customer Insufficient Funds',
  'Defective / Damaged Packaging',
  'Pricing Dispute / Discrepancy',
  'Operator Scan Error',
  'Customer Abandoned Cart',
  'Other Reason',
];

export const VoidModal: React.FC<VoidModalProps> = ({
  isOpen,
  onClose,
  voidType,
  item,
  itemsToVoid,
  onConfirmVoid,
}) => {
  const {
    currentCashier,
    currentLocation,
    systemUsers,
    verifyManagerOverridePin,
    recordVoid,
    showToast,
  } = usePos();

  const isDirectlyAuthorized =
    currentCashier.role === 'manager' ||
    currentCashier.role === 'supervisor' ||
    currentCashier.role === 'business_owner';

  const [selectedReason, setSelectedReason] = useState<string>(COMMON_VOID_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [managerPin, setManagerPin] = useState<string>('');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState<string>('');

  if (!isOpen) return null;

  const eligibleManagers = systemUsers.filter(
    (u) =>
      u.role === 'manager' ||
      u.role === 'supervisor' ||
      u.role === 'business_owner' ||
      u.canApplyDiscount === true
  );

  const totalVoidAmount = itemsToVoid.reduce((sum, it) => {
    const discountedUnitPrice =
      it.discountType === 'flat'
        ? Math.max(0, it.unitPrice - (it.discountAmount || 0))
        : it.unitPrice * (1 - (it.discountPercent || 0) / 100);
    return sum + discountedUnitPrice * it.quantity;
  }, 0);

  const finalReason = selectedReason === 'Other Reason' && customReason.trim()
    ? customReason.trim()
    : selectedReason;

  const handleExecuteVoid = async () => {
    let authorizingSupervisorId: string | undefined = undefined;
    let authorizingSupervisorName: string | undefined = undefined;
    let authorizingSupervisorRole: string | undefined = undefined;

    // Cashiers require supervisor override PIN
    if (!isDirectlyAuthorized) {
      if (!managerPin.trim()) {
        setPinError('Supervisor Override PIN is required to authorize void.');
        return;
      }

      setIsVerifyingPin(true);
      setPinError('');

      try {
        const verifyResult = await verifyManagerOverridePin(managerPin, selectedManagerId || undefined);
        if (!verifyResult.success) {
          setPinError(verifyResult.error || 'Invalid supervisor PIN. Try again.');
          setIsVerifyingPin(false);
          return;
        }

        authorizingSupervisorId = verifyResult.managerId || selectedManagerId || 'supervisor-mgr';
        authorizingSupervisorName = verifyResult.managerName || 'Store Supervisor';
        authorizingSupervisorRole = verifyResult.managerRole || 'supervisor';
      } catch {
        setPinError('Failed to verify supervisor PIN. Please retry.');
        setIsVerifyingPin(false);
        return;
      } finally {
        setIsVerifyingPin(false);
      }
    } else {
      // Manager/Supervisor/Owner is directly performing
      authorizingSupervisorId = currentCashier.id;
      authorizingSupervisorName = currentCashier.name;
      authorizingSupervisorRole = currentCashier.role;
    }

    // Record the void with non-repudiable operator attribution & supervisor audit field
    recordVoid({
      voidType,
      items: itemsToVoid.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: Number(
          (
            (i.discountType === 'flat'
              ? Math.max(0, i.unitPrice - (i.discountAmount || 0))
              : i.unitPrice * (1 - (i.discountPercent || 0) / 100)) * i.quantity
          ).toFixed(2)
        ),
      })),
      reason: finalReason,
      authorizingSupervisorId,
      authorizingSupervisorName,
      authorizingSupervisorRole,
    });

    onConfirmVoid();

    showToast(
      `${voidType === 'cart_void' ? 'Cart Void' : 'Line Void'} recorded (Attributed to ${currentCashier.name}${
        authorizingSupervisorName && authorizingSupervisorName !== currentCashier.name
          ? `, Authorized by ${authorizingSupervisorName}`
          : ''
      })`,
      'info'
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <Trash2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black">
                {voidType === 'cart_void' ? 'Authorize Cart Void (Cancel Sale)' : 'Authorize Line Item Void'}
              </h2>
              <p className="text-[11px] text-red-100">
                Audited transaction cancellation • Non-repudiable attribution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Target items summary */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-1 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              <span>{voidType === 'cart_void' ? `All Cart Items (${itemsToVoid.length})` : 'Void Target Item'}</span>
              <span>Total: {currentLocation.currency} {totalVoidAmount.toFixed(2)}</span>
            </div>
            {item ? (
              <div className="font-bold text-slate-800 text-sm truncate">
                {item.quantity}x {item.productName}
              </div>
            ) : (
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {itemsToVoid.map((it) => (
                  <div key={it.productId} className="flex justify-between text-slate-700 font-medium">
                    <span className="truncate max-w-[240px]">{it.quantity}x {it.productName}</span>
                    <span className="font-mono text-slate-500">
                      {currentLocation.currency} {(it.unitPrice * it.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attribution Info */}
          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center gap-2 text-amber-800 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <strong>Performing Operator:</strong> {currentCashier.name} ({currentCashier.role})
              <span className="block text-[10px] text-amber-700">
                Attribution follows the authenticated account. Action recorded in audit ledger.
              </span>
            </div>
          </div>

          {/* Void Reason Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Official Reason for Void <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-red-500"
            >
              {COMMON_VOID_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === 'Other Reason' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Specify Reason</label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter detailed reason for void..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500"
              />
            </div>
          )}

          {/* Supervisor Override PIN requirement for Cashier */}
          {!isDirectlyAuthorized ? (
            <div className="pt-2 border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <KeyRound className="w-4 h-4 text-red-600" />
                <span>Supervisor Override PIN Required</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Cashier role requires authorization from an active store supervisor or manager.
              </p>

              {eligibleManagers.length > 1 && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Authorizing Supervisor
                  </label>
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    <option value="">Any Eligible Supervisor / Manager</option>
                    {eligibleManagers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Supervisor 4-Digit Security PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={managerPin}
                  onChange={(e) => {
                    setManagerPin(e.target.value);
                    setPinError('');
                  }}
                  placeholder="••••"
                  className="w-full tracking-widest text-center text-lg font-mono bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              {pinError && (
                <p className="text-xs text-red-600 font-bold text-center animate-shake">
                  {pinError}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-2 text-emerald-800 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Authorized by current operator role (<strong>{currentCashier.role}</strong>). Direct override permitted.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isVerifyingPin}
            onClick={handleExecuteVoid}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-300 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            {isVerifyingPin ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Void & Record Audit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
