import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Tag,
  Percent,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Check,
  RotateCcw,
  Sparkles,
  AlertCircle,
  UserCheck,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { CartItem, Cashier } from '../types';
import { usePos } from '../context/PosContext';
import { soundFx } from '../utils/audio';

interface ItemDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem | null;
}

export const ItemDiscountModal: React.FC<ItemDiscountModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const {
    currentLocation,
    currentCashier,
    currentUser,
    applyItemDiscount,
    removeItemDiscount,
    hasDiscountPermission,
    verifyManagerOverridePin,
    allSystemUsers,
    showToast,
  } = usePos();

  // Mode: 'percentage' or 'flat'
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('flat');
  const [flatAmount, setFlatAmount] = useState<number>(50);
  const [percentValue, setPercentValue] = useState<number>(10);
  const [customInput, setCustomInput] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('Promotional');

  // Permission / Manager Override state
  const isDirectlyAuthorized = useMemo(() => {
    return hasDiscountPermission(currentCashier);
  }, [hasDiscountPermission, currentCashier, currentUser]);

  const [isPromptingManagerPin, setIsPromptingManagerPin] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [managerPin, setManagerPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [overrideAuthorizedBy, setOverrideAuthorizedBy] = useState<string | null>(null);

  // Eligible managers for override in this location/store
  const eligibleManagers = useMemo(() => {
    return allSystemUsers.filter(
      (u) =>
        u.businessId === currentLocation.businessId &&
        (u.role === 'manager' ||
          u.role === 'supervisor' ||
          u.role === 'business_owner' ||
          u.canApplyDiscount === true)
    );
  }, [allSystemUsers, currentLocation.businessId]);

  // Sync state when item opens
  useEffect(() => {
    if (isOpen && item) {
      setIsPromptingManagerPin(false);
      setManagerPin('');
      setPinError('');
      setOverrideAuthorizedBy(null);

      if (eligibleManagers.length > 0 && !selectedManagerId) {
        setSelectedManagerId(eligibleManagers[0].id);
      }

      if (item.discountType === 'percentage' && (item.discountPercent || 0) > 0) {
        setDiscountType('percentage');
        setPercentValue(item.discountPercent);
        setCustomInput(item.discountPercent.toString());
      } else if (item.discountType === 'flat' && (item.discountAmount || 0) > 0) {
        setDiscountType('flat');
        setFlatAmount(item.discountAmount || 50);
        setCustomInput((item.discountAmount || 50).toString());
      } else if ((item.discountPercent || 0) > 0) {
        setDiscountType('percentage');
        setPercentValue(item.discountPercent);
        setCustomInput(item.discountPercent.toString());
      } else {
        // Default to flat KES 50 as requested
        setDiscountType('flat');
        setFlatAmount(50);
        setPercentValue(10);
        setCustomInput('50');
      }

      if (item.discountReason) {
        setSelectedReason(item.discountReason);
      }
    }
  }, [isOpen, item, eligibleManagers]);

  if (!isOpen || !item) return null;

  // Calculations preview
  const originalUnitPrice = item.unitPrice;
  const currentDiscountAmount =
    discountType === 'flat'
      ? Math.min(originalUnitPrice, Math.max(0, flatAmount))
      : Math.min(originalUnitPrice, originalUnitPrice * (Math.min(100, Math.max(0, percentValue)) / 100));

  const discountedUnitPrice = Math.max(0, originalUnitPrice - currentDiscountAmount);
  const totalLineSavings = currentDiscountAmount * item.quantity;
  const newTotalLinePrice = discountedUnitPrice * item.quantity;

  const handleApplyPreset = (type: 'flat' | 'percentage', value: number) => {
    setDiscountType(type);
    if (type === 'flat') {
      setFlatAmount(value);
      setCustomInput(value.toString());
    } else {
      setPercentValue(value);
      setCustomInput(value.toString());
    }

    // If already authorized, apply immediately with 1-tap convenience!
    if (isDirectlyAuthorized || overrideAuthorizedBy) {
      applyItemDiscount(item.productId, type, value, {
        reason: selectedReason,
        authorizedBy: overrideAuthorizedBy || currentCashier.name,
      });
      soundFx.playSuccess();
      showToast(
        `Applied ${type === 'flat' ? `-${currentLocation.currency} ${value}` : `-${value}%`} discount to ${item.productName}`,
        'success'
      );
      onClose();
    } else {
      // Cashier requires approval: switch to PIN step
      setIsPromptingManagerPin(true);
      setPinError('');
    }
  };

  const handleApplyCustom = () => {
    const val = parseFloat(customInput);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid discount value', 'warning');
      return;
    }

    if (discountType === 'percentage' && val > 100) {
      showToast('Percentage cannot exceed 100%', 'warning');
      return;
    }

    if (discountType === 'flat' && val > originalUnitPrice) {
      showToast(`Flat discount cannot exceed unit price (${currentLocation.currency} ${originalUnitPrice.toFixed(2)})`, 'warning');
      return;
    }

    if (isDirectlyAuthorized || overrideAuthorizedBy) {
      applyItemDiscount(item.productId, discountType, val, {
        reason: selectedReason,
        authorizedBy: overrideAuthorizedBy || currentCashier.name,
      });
      soundFx.playSuccess();
      showToast(
        `Applied ${discountType === 'flat' ? `-${currentLocation.currency} ${val.toFixed(2)}` : `-${val}%`} to ${item.productName}`,
        'success'
      );
      onClose();
    } else {
      setIsPromptingManagerPin(true);
      setPinError('');
    }
  };

  const handleRemoveDiscount = () => {
    removeItemDiscount(item.productId);
    soundFx.playBeep(450, 0.08);
    showToast(`Removed discount from ${item.productName}`, 'info');
    onClose();
  };

  const handleVerifyManagerPin = async () => {
    if (!managerPin.trim()) {
      setPinError('Please enter the 4-digit Manager PIN');
      return;
    }

    setIsVerifyingPin(true);
    setPinError('');

    try {
      const result = await verifyManagerOverridePin(managerPin, selectedManagerId || undefined);
      if (result.success) {
        soundFx.playSuccess();
        const authName = result.managerName || 'Store Manager';
        setOverrideAuthorizedBy(authName);
        setIsPromptingManagerPin(false);

        // Commit discount
        const val = discountType === 'flat' ? flatAmount : percentValue;
        applyItemDiscount(item.productId, discountType, val, {
          reason: selectedReason,
          authorizedBy: authName,
        });

        showToast(
          `Discount authorized by ${authName} and applied to cart!`,
          'success'
        );
        onClose();
      } else {
        soundFx.playError();
        setPinError(result.error || 'Invalid PIN entered. Try again.');
      }
    } catch {
      soundFx.playError();
      setPinError('Verification error. Please retry.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const appendPinDigit = (digit: string) => {
    if (managerPin.length < 6) {
      setManagerPin((prev) => prev + digit);
      setPinError('');
    }
  };

  const clearPin = () => {
    setManagerPin('');
    setPinError('');
  };

  const backspacePin = () => {
    setManagerPin((prev) => prev.slice(0, -1));
    setPinError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Line Item Discount</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                {item.productName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item Summary Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono">SKU: {item.sku}</span>
            <span className="text-slate-300">•</span>
            <span className="font-bold text-slate-700">Qty: {item.quantity}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-500 text-[11px]">Unit Price:</span>
            <span className="font-bold text-slate-800">
              {currentLocation.currency} {item.unitPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Cashier Permission Status Banner */}
        <div className="px-5 pt-3 pb-1">
          {isDirectlyAuthorized || overrideAuthorizedBy ? (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">
                    {overrideAuthorizedBy
                      ? `Authorized by ${overrideAuthorizedBy}`
                      : `${currentCashier.name} (${currentCashier.role.replace('_', ' ')})`}
                  </span>
                  <p className="text-[10px] text-emerald-700">
                    Pre-approved for instant line item markdown
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                Authorized
              </span>
            </div>
          ) : (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">{currentCashier.name} (Cashier)</span>
                  <p className="text-[10px] text-amber-700">
                    Requires Manager / Supervisor PIN approval
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                PIN Required
              </span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* VIEW A: MANAGER PIN OVERRIDE STEP */}
          {isPromptingManagerPin ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-900">
                    Manager Override Authorization
                  </h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Cashier <span className="font-bold">{currentCashier.name}</span> is applying a discount of{' '}
                    <span className="font-bold text-amber-950">
                      {discountType === 'flat'
                        ? `- ${currentLocation.currency} ${flatAmount}`
                        : `- ${percentValue}%`}
                    </span>{' '}
                    on <span className="font-bold">{item.productName}</span>.
                  </p>
                </div>
              </div>

              {/* Manager Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Approving Manager / Supervisor
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500"
                >
                  {eligibleManagers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name} — {mgr.role === 'manager' ? 'Store Manager' : mgr.role === 'supervisor' ? 'Supervisor' : 'Authorized Staff'}
                    </option>
                  ))}
                  <option value="">Any Registered Manager PIN</option>
                </select>
              </div>

              {/* PIN Input & Keypad */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter Manager 4-Digit Security PIN
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="password"
                      maxLength={6}
                      value={managerPin}
                      onChange={(e) => {
                        setManagerPin(e.target.value);
                        setPinError('');
                      }}
                      placeholder="••••"
                      autoFocus
                      className="w-full text-center tracking-widest text-lg font-mono font-bold py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-blue-600"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyManagerPin}
                    disabled={isVerifyingPin || !managerPin}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isVerifyingPin ? (
                      <span>Checking...</span>
                    ) : (
                      <>
                        <span>Approve</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {pinError && (
                  <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{pinError}</span>
                  </p>
                )}
              </div>

              {/* Touch Numpad */}
              <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => appendPinDigit(digit)}
                    className="h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearPin}
                  className="h-10 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => appendPinDigit('0')}
                  className="h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm rounded-lg transition active:scale-95 cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={backspacePin}
                  className="h-10 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  ⌫
                </button>
              </div>

              {/* Demo Hint */}
              <div className="p-2 bg-slate-100 rounded-lg text-[10px] text-slate-500 text-center font-mono">
                Store Demo PINs: David Omondi (3456) • Sarah Wanjiku (2345) • Admin (1234)
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsPromptingManagerPin(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                >
                  ← Back to Discount Selection
                </button>
              </div>
            </div>
          ) : (
            /* VIEW B: MAIN DISCOUNT SELECTION & PRESETS */
            <>
              {/* Type Switcher: Flat Amount vs. Percentage */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('flat');
                    setCustomInput(flatAmount.toString());
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    discountType === 'flat'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Flat Amount (- KES)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('percentage');
                    setCustomInput(percentValue.toString());
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    discountType === 'percentage'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5 text-blue-600" />
                  <span>Percentage (- %)</span>
                </button>
              </div>

              {/* SECTION 1: FLAT PRESETS */}
              {discountType === 'flat' ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Quick Tap Flat Presets
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* User-requested - KES 50 */}
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('flat', 50)}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                        flatAmount === 50
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                          : 'bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-900 border-emerald-200'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase opacity-80">Popular</div>
                      <div className="text-base font-black tracking-tight">- 50 KES</div>
                      <div className="text-[10px] font-medium opacity-90">Instant Apply</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset('flat', 20)}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                        flatAmount === 20
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Small</div>
                      <div className="text-base font-black tracking-tight">- 20 KES</div>
                      <div className="text-[10px] text-slate-500">Instant Apply</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset('flat', 100)}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                        flatAmount === 100
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Major</div>
                      <div className="text-base font-black tracking-tight">- 100 KES</div>
                      <div className="text-[10px] text-slate-500">Instant Apply</div>
                    </button>
                  </div>

                  {/* Custom Flat Amount Input */}
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Or Enter Custom Flat Discount ({currentLocation.currency})
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                          {currentLocation.currency}
                        </span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max={originalUnitPrice}
                          value={customInput}
                          onChange={(e) => {
                            setCustomInput(e.target.value);
                            const n = parseFloat(e.target.value);
                            if (!isNaN(n)) setFlatAmount(n);
                          }}
                          placeholder="e.g. 50"
                          className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCustom}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* SECTION 2: PERCENTAGE PRESETS */
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Quick Tap Percentage Presets
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {/* User-requested -10% */}
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('percentage', 10)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        percentValue === 10
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                          : 'bg-blue-50/60 hover:bg-blue-100/80 text-blue-900 border-blue-200'
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase opacity-80">Popular</div>
                      <div className="text-sm sm:text-base font-black">- 10%</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset('percentage', 5)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        percentValue === 5
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="text-[9px] text-slate-400 font-bold uppercase">Minor</div>
                      <div className="text-sm sm:text-base font-black">- 5%</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset('percentage', 15)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        percentValue === 15
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="text-[9px] text-slate-400 font-bold uppercase">Loyalty</div>
                      <div className="text-sm sm:text-base font-black">- 15%</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset('percentage', 20)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        percentValue === 20
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="text-[9px] text-slate-400 font-bold uppercase">Staff</div>
                      <div className="text-sm sm:text-base font-black">- 20%</div>
                    </button>
                  </div>

                  {/* Custom Percentage Input */}
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Or Enter Custom Percentage (%)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          max="100"
                          value={customInput}
                          onChange={(e) => {
                            setCustomInput(e.target.value);
                            const n = parseFloat(e.target.value);
                            if (!isNaN(n)) setPercentValue(n);
                          }}
                          placeholder="e.g. 10"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-blue-500"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCustom}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Price & Savings Preview Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Original Unit Price:</span>
                  <span className="font-mono text-slate-700">
                    {currentLocation.currency} {originalUnitPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-emerald-700 font-bold">
                  <span>
                    Discount Applied (
                    {discountType === 'flat'
                      ? `- ${currentLocation.currency} ${currentDiscountAmount.toFixed(2)}`
                      : `- ${percentValue}%`}
                    ):
                  </span>
                  <span className="font-mono">
                    - {currentLocation.currency} {currentDiscountAmount.toFixed(2)} / ea
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      New Line Total ({item.quantity} units)
                    </div>
                    <div className="text-xs text-emerald-600 font-bold">
                      Save {currentLocation.currency} {totalLineSavings.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs line-through text-slate-400 mr-2 font-mono">
                      {currentLocation.currency} {(originalUnitPrice * item.quantity).toFixed(2)}
                    </span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      {currentLocation.currency} {newTotalLinePrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discount Reason Tag Chips */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Markdown Justification / Audit Reason
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Promotional',
                    'Customer Goodwill',
                    'Damaged Box',
                    'Loyalty Reward',
                    'Manager Discretion',
                    'Expiry Clearance',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedReason(r)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        selectedReason === r
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                {(item.discountPercent > 0 || (item.discountAmount || 0) > 0) && (
                  <button
                    type="button"
                    onClick={handleRemoveDiscount}
                    className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApplyCustom}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Apply Discount ({discountType === 'flat' ? `- ${currentLocation.currency} ${flatAmount}` : `- ${percentValue}%`})
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
