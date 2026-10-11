import React, { useState } from 'react';
import { Lock, AlignLeft, ChevronDown } from 'lucide-react';
import { usePos } from '../../context/PosContext';

interface ShiftInitializationCardProps {
  onSuccess?: () => void;
  className?: string;
}

const DENOMINATIONS = [
  { value: 1000, label: '1,000 Notes' },
  { value: 500, label: '500 Notes' },
  { value: 200, label: '200 Notes' },
  { value: 100, label: '100 Notes' },
  { value: 50, label: '50 Notes' },
  { value: 20, label: '20 Coins' },
  { value: 10, label: '10 Coins' },
  { value: 5, label: '5 Coins' },
  { value: 1, label: '1 Coins' },
];

const QUICK_FLOAT_PRESETS = [2000, 3000, 5000, 10000, 20000];

export const ShiftInitializationCard: React.FC<ShiftInitializationCardProps> = ({
  onSuccess,
  className = '',
}) => {
  const {
    currentLocation,
    currentCashier,
    currentUser,
    openShift,
    showToast,
  } = usePos();

  const [openingFloatInput, setOpeningFloatInput] = useState<string>('5000');
  const [openingNotes, setOpeningNotes] = useState<string>('');
  const [isDenomDrawerOpen, setIsDenomDrawerOpen] = useState<boolean>(false);
  const [openDenoms, setOpenDenoms] = useState<Record<string, number>>({});

  // Display operator details
  const operatorName = currentCashier?.name || currentUser?.name || 'Platform Administrator / Cashier';
  const operatorInitials =
    currentCashier?.initials ||
    operatorName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    'PA';
  const operatorCode = currentCashier?.code || '1001';

  const terminalLocation = currentLocation?.name || 'Garden City';
  const terminalName = currentLocation?.terminalName || 'Terminal 02 - PoS Register';

  const calculateDenomTotal = (denoms: Record<string, number>) => {
    return DENOMINATIONS.reduce((sum, item) => {
      const count = denoms[String(item.value)] || 0;
      return sum + count * item.value;
    }, 0);
  };

  const handleDenomChange = (valStr: string, count: number) => {
    const updated = { ...openDenoms, [valStr]: Math.max(0, count) };
    setOpenDenoms(updated);
    const total = calculateDenomTotal(updated);
    setOpeningFloatInput(String(total));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const floatAmount = parseFloat(openingFloatInput);
    if (isNaN(floatAmount) || floatAmount < 0) {
      showToast('Please enter a valid opening float amount.', 'error');
      return;
    }

    openShift(
      floatAmount,
      openingNotes.trim() || undefined,
      Object.keys(openDenoms).length > 0 ? openDenoms : undefined
    );

    showToast(`Shift opened successfully with KES ${floatAmount.toLocaleString()} float!`, 'success');
    if (onSuccess) {
      onSuccess();
    }
  };

  const parsedFloat = parseFloat(openingFloatInput) || 0;

  return (
    <div
      className={`max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden text-left ${className}`}
    >
      {/* Top Header Section: Light Gradient with Lock, Underlined Title & Location Badge */}
      <div className="bg-gradient-to-b from-[#e8edf3] to-[#f4f7fa] pt-8 pb-5 px-6 text-center border-b border-slate-200/60">
        <Lock className="w-8 h-8 text-slate-400 stroke-[1.5] mx-auto mb-2" />
        <h2 className="text-xl sm:text-2xl font-black text-[#132c54] text-center tracking-tight underline underline-offset-4 decoration-2 decoration-[#132c54]">
          Shift Initialization: Terminal Open
        </h2>
        <p className="text-xs text-slate-500 text-center mt-1">
          Set opening cash float to begin operations.
        </p>
        <div className="mt-2.5 inline-flex items-center gap-1.5 bg-white/90 border border-slate-200 px-3.5 py-1 rounded-full text-xs font-medium text-slate-700 shadow-2xs mx-auto">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>
            {terminalLocation}: {terminalName}
          </span>
        </div>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4 bg-white">
        {/* Operating Cashier Box */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
              {operatorInitials}
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {operatorName}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                Operating Cashier + ID: #{operatorCode}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-200/80 text-slate-600 border border-slate-300/40 shrink-0">
            Terminal Ready
          </span>
        </div>

        {/* Opening Cash Float Amount */}
        <div>
          <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            OPENING CASH FLOAT AMOUNT (KES)
          </label>
          <div className="relative flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs focus-within:border-[#132c54] focus-within:ring-2 focus-within:ring-[#132c54]/10 transition">
            <span className="pl-3.5 pr-1 font-bold text-slate-400 text-sm select-none">
              KES
            </span>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={openingFloatInput}
              onChange={(e) => setOpeningFloatInput(e.target.value)}
              placeholder="5000"
              className="w-full py-3 pr-3.5 pl-1 text-xl sm:text-2xl font-bold text-slate-900 focus:outline-hidden"
            />
          </div>

          {/* Quick Floats Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            <span className="text-xs text-slate-500 font-medium mr-1">Quick Floats:</span>
            {QUICK_FLOAT_PRESETS.map((preset) => {
              const isSelected = openingFloatInput === String(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setOpeningFloatInput(String(preset))}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#132c54] border-[#132c54] text-white shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                  }`}
                >
                  KES {preset.toLocaleString()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Denomination Counter Collapsible */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsDenomDrawerOpen(!isDenomDrawerOpen)}
            className="w-full py-2.5 px-3.5 bg-[#f1f5f9] border-b border-transparent hover:bg-[#e9eff5] flex items-center justify-between text-xs font-medium text-slate-700 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-slate-500" />
              <span>Interactive Denomination Counter (Optional)</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform duration-150 ${
                isDenomDrawerOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isDenomDrawerOpen && (
            <div className="p-3.5 bg-white border-t border-slate-200 space-y-2">
              <p className="text-[11px] text-slate-500">
                Count notes and coins. The total will automatically calculate into the opening float.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DENOMINATIONS.map((d) => (
                  <div key={d.value} className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 mb-1">{d.label}</div>
                    <input
                      type="number"
                      min="0"
                      value={openDenoms[String(d.value)] || ''}
                      onChange={(e) => handleDenomChange(String(d.value), parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-bold text-right focus:outline-hidden focus:border-[#132c54]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Opening Notes / Handover Reference */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Opening Notes / Handover Reference (Optional)
          </label>
          <input
            type="text"
            value={openingNotes}
            onChange={(e) => setOpeningNotes(e.target.value)}
            placeholder="e.g. Standard morning float received from supervisor"
            className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-[#132c54] transition"
          />
        </div>

        {/* Action Button: Deep Navy Blue */}
        <button
          type="submit"
          className="w-full py-3.5 px-4 bg-[#132c54] hover:bg-[#0e2140] active:bg-[#0a1830] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          <Lock className="w-4 h-4 text-white" />
          <span>
            Confirm Float & Open Shift (KES {parsedFloat.toLocaleString()})
          </span>
        </button>
      </form>
    </div>
  );
};
