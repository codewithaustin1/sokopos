import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Printer,
  Coins,
  Banknote,
  DollarSign,
  Lock,
  Unlock,
  FileSpreadsheet,
  History,
  UserCheck,
  Calculator,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  X,
  ChevronRight,
  Info,
  Calendar,
  Building2,
  Users,
  Search,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { ShiftSession, ShiftExpense, CashDrop, ExpenseCategory } from '../types';
import { ShiftReconciliationSlipModal } from './ShiftReconciliationSlipModal';

const DENOMINATIONS = [
  { value: 1000, label: '1,000 Notes', type: 'note' },
  { value: 500, label: '500 Notes', type: 'note' },
  { value: 200, label: '200 Notes', type: 'note' },
  { value: 100, label: '100 Notes', type: 'note' },
  { value: 50, label: '50 Notes', type: 'note' },
  { value: 20, label: '20 Coins', type: 'coin' },
  { value: 10, label: '10 Coins', type: 'coin' },
  { value: 5, label: '5 Coins', type: 'coin' },
  { value: 1, label: '1 Coins', type: 'coin' },
];

export const ShiftManagementView: React.FC = () => {
  const {
    currentBusiness,
    currentLocation,
    currentCashier,
    systemUsers,
    activeShift,
    interruptedSession,
    shiftHistory,
    openShift,
    resumeInterruptedShift,
    recordCashDrop,
    recordShiftExpense,
    closeShift,
    transactions,
    setCurrentCashier,
    setIsPinLocked,
    showToast,
  } = usePos();

  const currency = currentLocation.currency || 'KES';

  // Sub-tabs: 'active' | 'history'
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  // Open Shift Form State
  const [openingFloatInput, setOpeningFloatInput] = useState<string>('5000');
  const [openingNotes, setOpeningNotes] = useState<string>('');
  const [isDenomDrawerOpen, setIsDenomDrawerOpen] = useState<boolean>(false);
  const [openDenoms, setOpenDenoms] = useState<Record<string, number>>({});

  // Mid-Shift Cash Drop Modal State
  const [isDropModalOpen, setIsDropModalOpen] = useState<boolean>(false);
  const [dropAmount, setDropAmount] = useState<string>('');
  const [dropReason, setDropReason] = useState<string>('Mid-day cash safe drop');
  const [dropAuthorizedBy, setDropAuthorizedBy] = useState<string>('Store Manager');
  const [dropEnvelope, setDropEnvelope] = useState<string>('');

  // Petty Cash / Drawer Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('supplies');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expensePayee, setExpensePayee] = useState<string>('');
  const [expenseApprovedBy, setExpenseApprovedBy] = useState<string>('Store Manager');
  const [expenseReceiptRef, setExpenseReceiptRef] = useState<string>('');

  // End of Shift Reconciliation Modal State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [handoverCashierId, setHandoverCashierId] = useState<string>('');
  const [closeDenoms, setCloseDenoms] = useState<Record<string, number>>({});
  const [isCloseDenomActive, setIsCloseDenomActive] = useState<boolean>(true);

  // Reconciliation Slip Modal State
  const [selectedSlipShift, setSelectedSlipShift] = useState<ShiftSession | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState<boolean>(false);
  const [isMidShiftAuditSlip, setIsMidShiftAuditSlip] = useState<boolean>(false);

  // Search in History
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Calculate live statistics for active shift
  const liveStats = useMemo(() => {
    if (!activeShift) return null;

    const sOpenMs = new Date(activeShift.openedAt).getTime();
    const shiftTxs = transactions.filter((t) => {
      // Tenant match guardrail
      if (t.businessId && t.businessId !== activeShift.businessId) return false;
      // Location match guardrail (if both specified)
      if (t.locationId && activeShift.locationId && t.locationId !== activeShift.locationId) return false;

      // Strict Edge Case 2: Session isolation - transactions with shiftId MUST match this shift
      if (t.shiftId) {
        return t.shiftId === activeShift.id;
      }

      // Active session window: include unassigned counter transactions on or after shift open
      const tTime = new Date(t.timestamp).getTime();
      return !isNaN(tTime) && tTime >= sOpenMs - 2000;
    });

    let cashSales = 0;
    let cashRefunds = 0;
    let mpesaSales = 0;
    let cardSales = 0;

    // 1. Inflows: Counter sales tendered during this active shift window
    shiftTxs.forEach((t) => {
      if (t.paymentMethod === 'cash') {
        cashSales += t.total;
      } else if (t.paymentMethod === 'split') {
        const cashPortion = t.paymentDetails?.cashTendered || 0;
        cashSales += cashPortion;
        const nonCashPortion = Math.max(0, t.total - cashPortion);
        mpesaSales += nonCashPortion;
      } else if (t.paymentMethod === 'mpesa') {
        mpesaSales += t.total;
      } else if (t.paymentMethod === 'card') {
        cardSales += t.total;
      }
    });

    // 2. Outflows: Cash refunds tendered during this shift (strictly partitioned by shiftId or session window)
    transactions.forEach((t) => {
      if (t.locationId !== activeShift.locationId) return;
      if (t.refunds && t.refunds.length > 0) {
        t.refunds.forEach((r) => {
          if (r.shiftId) {
            if (r.shiftId !== activeShift.id) return;
          } else {
            const rTime = new Date(r.timestamp).getTime();
            if (isNaN(rTime) || rTime < sOpenMs) return;
          }

          const isCashRefund =
            r.refundMethod === 'cash' ||
            (r.refundMethod === 'original' && t.paymentMethod === 'cash');
          if (isCashRefund) {
            cashRefunds += r.totalRefund;
          }
        });
      }
    });

    const totalDrops = Number(
      activeShift.cashDrops.reduce((acc, d) => acc + d.amount, 0).toFixed(2)
    );
    const totalExpenses = Number(
      activeShift.expenses.reduce((acc, e) => acc + e.amount, 0).toFixed(2)
    );
    cashSales = Number(cashSales.toFixed(2));
    cashRefunds = Number(cashRefunds.toFixed(2));

    // Strictly Enforced Formula:
    // Theoretical Expected Cash = Opening Float + Cash Sales - Cash Refunds - Cash Drops - Petty Cash Expenses
    const expectedCash = Number(
      (activeShift.openingFloat + cashSales - cashRefunds - totalDrops - totalExpenses).toFixed(2)
    );

    return {
      cashSales,
      cashRefunds,
      mpesaSales,
      cardSales,
      totalSales: cashSales + mpesaSales + cardSales,
      transactionCount: shiftTxs.length,
      totalDrops,
      totalExpenses,
      expectedCash,
      shiftTxs,
    };
  }, [activeShift, transactions]);

  // Denomination calculators
  const calculateDenomTotal = (denoms: Record<string, number>) => {
    return DENOMINATIONS.reduce((sum, item) => {
      const count = denoms[String(item.value)] || 0;
      return sum + count * item.value;
    }, 0);
  };

  const handleOpenDenomChange = (valStr: string, count: number) => {
    const updated = { ...openDenoms, [valStr]: Math.max(0, count) };
    setOpenDenoms(updated);
    const total = calculateDenomTotal(updated);
    setOpeningFloatInput(String(total));
  };

  const handleCloseDenomChange = (valStr: string, count: number) => {
    const updated = { ...closeDenoms, [valStr]: Math.max(0, count) };
    setCloseDenoms(updated);
    const total = calculateDenomTotal(updated);
    setCountedCashInput(String(total));
  };

  // Submit Open Shift
  const handleOpenShiftSubmit = (e: React.FormEvent) => {
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
    setOpeningNotes('');
    setOpenDenoms({});
    setIsDenomDrawerOpen(false);
  };

  // Submit Cash Drop
  const handleDropSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(dropAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid cash drop amount.', 'error');
      return;
    }

    if (liveStats && amount > liveStats.expectedCash) {
      if (!confirm(`Warning: Drop amount (${currency} ${amount}) exceeds currently expected drawer cash (${currency} ${liveStats.expectedCash.toFixed(2)}). Continue?`)) {
        return;
      }
    }

    recordCashDrop(amount, dropReason, dropAuthorizedBy, dropEnvelope);
    setDropAmount('');
    setDropEnvelope('');
    setIsDropModalOpen(false);
  };

  // Submit Petty Cash Expense
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid expense amount.', 'error');
      return;
    }
    if (!expenseDescription.trim()) {
      showToast('Please specify an expense purpose or description.', 'error');
      return;
    }
    if (!expensePayee.trim()) {
      showToast('Please specify the recipient or vendor name.', 'error');
      return;
    }

    recordShiftExpense({
      amount,
      category: expenseCategory,
      description: expenseDescription,
      payee: expensePayee,
      approvedBy: expenseApprovedBy,
      receiptRef: expenseReceiptRef,
    });

    setExpenseAmount('');
    setExpenseDescription('');
    setExpensePayee('');
    setExpenseReceiptRef('');
    setIsExpenseModalOpen(false);
  };

  // Open Close Shift Modal
  const handleStartCloseShift = () => {
    if (!liveStats) return;
    // Default counted to expected if blank, or empty for blind count
    setCountedCashInput('');
    setCloseDenoms({});
    setClosingNotes('');
    setIsCloseModalOpen(true);
  };

  // Submit Shift Close
  const handleConfirmCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(countedCashInput);
    if (isNaN(counted) || counted < 0) {
      showToast('Please enter the physical cash count in drawer.', 'error');
      return;
    }

    const variance = liveStats ? counted - liveStats.expectedCash : 0;
    if (Math.abs(variance) > 0.01 && !closingNotes.trim()) {
      showToast('Please provide an explanation note for the drawer variance.', 'error');
      return;
    }

    try {
      const closed = closeShift({
        closingCountedCash: counted,
        notes: closingNotes.trim() || undefined,
        denominations: Object.keys(closeDenoms).length > 0 ? closeDenoms : undefined,
        handoverToCashierId: handoverCashierId || undefined,
      });

      setIsCloseModalOpen(false);
      // Immediately open the Z-Reconciliation Slip
      setSelectedSlipShift(closed);
      setIsMidShiftAuditSlip(false);
      setIsSlipModalOpen(true);

      // Edge Case 2: Outgoing session is closed and attributed; if handed over, prepare terminal for incoming operator
      if (handoverCashierId) {
        const nextCashier = systemUsers.find((u) => u.id === handoverCashierId);
        if (nextCashier) {
          setCurrentCashier(nextCashier);
          setIsPinLocked(true);
        }
      }
    } catch (err) {
      showToast('Error closing shift: ' + (err as Error).message, 'error');
    }
  };

  // Open Mid-Shift Audit (X-Report)
  const handleOpenMidShiftSlip = () => {
    if (!activeShift || !liveStats) return;
    const currentShiftState: ShiftSession = {
      ...activeShift,
      cashSales: liveStats.cashSales,
      cashRefunds: liveStats.cashRefunds,
      mpesaSales: liveStats.mpesaSales,
      cardSales: liveStats.cardSales,
      totalSales: liveStats.totalSales,
      transactionCount: liveStats.transactionCount,
      expectedCash: liveStats.expectedCash,
    };
    setSelectedSlipShift(currentShiftState);
    setIsMidShiftAuditSlip(true);
    setIsSlipModalOpen(true);
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return shiftHistory.filter((s) => {
      if (!historySearchQuery.trim()) return true;
      const q = historySearchQuery.toLowerCase();
      return (
        s.shiftNumber.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q) ||
        s.terminalName.toLowerCase().includes(q) ||
        (s.closingNotes && s.closingNotes.toLowerCase().includes(q))
      );
    });
  }, [shiftHistory, historySearchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto min-w-0">
      {/* View Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Shift & Till Management
            </h1>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              Session Lifecycle
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Drawer float declarations, mid-shift safe drops, petty cash expenses, and fiscal end-of-shift reconciliation.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'current'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Active Session</span>
            {activeShift && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History ({shiftHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {activeTab === 'current' ? (
          <>
            {/* Interrupted Session Banner (Edge Case 4) */}
            {interruptedSession && (
              <div className="bg-amber-50 rounded-3xl border-2 border-amber-300 p-5 sm:p-6 shadow-md mb-6 space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-amber-950">
                          Session Interrupted (Shift #{interruptedSession.shiftNumber})
                        </h3>
                        <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Attribution Preserved
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Attributed Operator: <strong>{interruptedSession.cashierName}</strong> • Interrupted at:{' '}
                        {new Date(interruptedSession.interruptedAt || interruptedSession.openedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => resumeInterruptedShift(interruptedSession.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resume Session ({interruptedSession.cashierName})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCountedCashInput('');
                        setIsCloseModalOpen(true);
                      }}
                      className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reconcile & Close Interrupted Session</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white/80 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] text-amber-600 block">Interruption Trigger</span>
                    <strong className="capitalize">
                      {interruptedSession.interruptionReason === 'timeout'
                        ? 'Inactivity Timeout (15m)'
                        : interruptedSession.interruptionReason === 'admin_action'
                        ? 'Admin Sign-Out Action'
                        : 'System Restart / Reload'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600 block">Opening Float</span>
                    <strong>{currency} {interruptedSession.openingFloat.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600 block">Terminal</span>
                    <strong>{interruptedSession.terminalName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600 block">Compliance Status</span>
                    <strong className="text-emerald-700">Audit Trail Protected</strong>
                  </div>
                </div>
              </div>
            )}

            {!activeShift ? (
              /* ================= NO ACTIVE SHIFT: OPEN SHIFT DECLARATION ================= */
              <div className="max-w-xl mx-auto my-8 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-6 sm:p-8 bg-linear-to-br from-blue-600 to-indigo-700 text-white text-center relative overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <Unlock className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">Open New Register Shift</h2>
                  <p className="text-xs text-blue-100 max-w-sm mx-auto mt-1">
                    Declare the physical opening float to initiate sales, track cash movements, and enable drawer reconciliation.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-blue-200" />
                    <span>{currentLocation.name} ({currentLocation.terminalName})</span>
                  </div>
                </div>

                <form onSubmit={handleOpenShiftSubmit} className="p-6 sm:p-8 space-y-6">
                  {/* Cashier Banner */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                        {currentCashier.initials}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{currentCashier.name}</div>
                        <div className="text-[11px] text-slate-500">Operating Cashier • ID: {currentCashier.code}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      Terminal Ready
                    </span>
                  </div>

                  {/* Float Declaration Input */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      Opening Cash Float Amount ({currency})
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                        {currency}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={openingFloatInput}
                        onChange={(e) => setOpeningFloatInput(e.target.value)}
                        placeholder="5000"
                        className="w-full pl-14 pr-4 py-3 bg-white border-2 border-slate-300 rounded-2xl text-lg font-black text-slate-900 focus:outline-hidden focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-semibold">Quick Floats:</span>
                      {[2000, 3000, 5000, 10000, 20000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setOpeningFloatInput(String(preset))}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                            openingFloatInput === String(preset)
                              ? 'bg-blue-50 border-blue-400 text-blue-700'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {currency} {preset.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Currency Denominations Toggle */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsDenomDrawerOpen(!isDenomDrawerOpen)}
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-blue-600" />
                        <span>Interactive Denomination Counter (Optional)</span>
                      </div>
                      <span className="text-blue-600 text-[11px]">
                        {isDenomDrawerOpen ? 'Collapse ▲' : 'Expand Count ▼'}
                      </span>
                    </button>

                    {isDenomDrawerOpen && (
                      <div className="p-4 bg-white border-t border-slate-200 space-y-2.5">
                        <p className="text-[11px] text-slate-500 mb-2">
                          Count notes and coins individually. The total will automatically calculate into the opening float.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {DENOMINATIONS.map((d) => (
                            <div key={d.value} className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                              <div className="text-[10px] font-bold text-slate-500 mb-1">
                                {d.label}
                              </div>
                              <input
                                type="number"
                                min="0"
                                value={openDenoms[String(d.value)] || ''}
                                onChange={(e) => handleOpenDenomChange(String(d.value), parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-right"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Opening Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Opening Notes / Handover Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={openingNotes}
                      onChange={(e) => setOpeningNotes(e.target.value)}
                      placeholder="e.g. Standard morning float received from supervisor"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-600 transition"
                    />
                  </div>

                  {/* Submit Action */}
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black tracking-tight shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Confirm & Open Shift ({currency} {parseFloat(openingFloatInput || '0').toLocaleString()})</span>
                  </button>
                </form>
              </div>
            ) : (
              /* ================= ACTIVE SHIFT DASHBOARD HUD ================= */
              <div className="space-y-6">
                {/* Active Shift Hero Card */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                        <Lock className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            {activeShift.shiftNumber}
                          </h2>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Drawer Active
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Cashier: <strong className="text-slate-800">{activeShift.cashierName}</strong> • {activeShift.locationName} ({activeShift.terminalName})
                        </p>
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setIsDropModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                        title="Transfer excess cash to drop safe"
                      >
                        <ArrowDownRight className="w-4 h-4 text-amber-600" />
                        <span>Cash Drop (Safe)</span>
                      </button>

                      <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                        title="Record petty cash paid out from till"
                      >
                        <ArrowUpRight className="w-4 h-4 text-rose-600" />
                        <span>Pay Out / Expense</span>
                      </button>

                      <button
                        onClick={handleOpenMidShiftSlip}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                        title="Print mid-shift X-Report without closing drawer"
                      >
                        <Printer className="w-4 h-4 text-slate-600" />
                        <span>X-Report Audit</span>
                      </button>

                      <button
                        onClick={handleStartCloseShift}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-black shadow-xs transition cursor-pointer"
                        title="Reconcile cash and close shift"
                      >
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>End Shift & Reconcile</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Hero Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
                    {/* Expected Drawer Cash (HERO) */}
                    <div className="bg-linear-to-br from-blue-600 to-indigo-700 text-white p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                        Expected Drawer Cash
                      </div>
                      <div className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">
                        {currency} {liveStats?.expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-blue-100 mt-2 flex items-center justify-between">
                        <span>Float: {currency} {activeShift.openingFloat.toLocaleString()}</span>
                        <span>Net: {liveStats && liveStats.cashSales - liveStats.cashRefunds >= 0 ? '+' : ''}{liveStats && (liveStats.cashSales - liveStats.cashRefunds).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Cash Sales Inflow */}
                    <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Cash Counter Sales Inflows
                        </span>
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                        +{currency} {liveStats?.cashSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2">
                        {liveStats && liveStats.cashRefunds > 0 ? (
                          <span className="text-rose-600 font-bold">
                            Returns: -{currency} {liveStats.cashRefunds.toLocaleString()}
                          </span>
                        ) : (
                          <span>{liveStats?.transactionCount || 0} counter transactions completed</span>
                        )}
                      </div>
                    </div>

                    {/* Safe Drops & Expenses Outflow */}
                    <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Drawer Deductions
                        </span>
                        <TrendingDown className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                        -{currency} {((liveStats?.totalDrops || 0) + (liveStats?.totalExpenses || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
                        <span>Drops: -{currency} {liveStats?.totalDrops.toLocaleString()}</span>
                        <span>Exp: -{currency} {liveStats?.totalExpenses.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Digital Volume (M-Pesa + Card) */}
                    <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Digital Non-Cash Tender
                        </span>
                        <DollarSign className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                        {currency} {((liveStats?.mpesaSales || 0) + (liveStats?.cardSales || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
                        <span>M-Pesa: {currency} {liveStats?.mpesaSales.toLocaleString()}</span>
                        <span>Card: {currency} {liveStats?.cardSales.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Ledgers Grid: Drops, Expenses, Sales */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Petty Cash Expenses List */}
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                          <Coins className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Petty Cash Expenses</h3>
                          <p className="text-[11px] text-slate-400">Paid out from active drawer</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        + Add Expense
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-slate-100 mt-2">
                      {activeShift.expenses.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          No petty cash expenses paid from drawer yet.
                        </div>
                      ) : (
                        activeShift.expenses.map((exp) => (
                          <div key={exp.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">{exp.description}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="uppercase font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                                  {exp.category}
                                </span>
                                <span>• Payee: {exp.payee}</span>
                                <span>• {new Date(exp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            <div className="font-mono font-black text-rose-700 shrink-0">
                              -{currency} {exp.amount.toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Mid-Shift Cash Drops to Safe List */}
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Safe Cash Drops (Skims)</h3>
                          <p className="text-[11px] text-slate-400">Cash removed to back-office safe</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsDropModalOpen(true)}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                      >
                        + Add Safe Drop
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-slate-100 mt-2">
                      {activeShift.cashDrops.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          No cash drops recorded for this session.
                        </div>
                      ) : (
                        activeShift.cashDrops.map((drop) => (
                          <div key={drop.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">{drop.reason}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span>Auth: {drop.authorizedBy}</span>
                                {drop.envelopeNumber && <span>• Env #{drop.envelopeNumber}</span>}
                                <span>• {new Date(drop.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            <div className="font-mono font-black text-amber-700 shrink-0">
                              -{currency} {drop.amount.toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ================= SHIFT AUDIT HISTORY TAB ================= */
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Past Shift Reconciliations & Z-Reports
                </h2>
                <p className="text-xs text-slate-500">
                  Archived cash register sessions, operator variances, and verified Z-reports.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search shift #, cashier, terminal..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-600"
                />
              </div>
            </div>

            {/* Shifts Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Shift ID</th>
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Started / Closed</th>
                    <th className="px-4 py-3 text-right">Opening Float</th>
                    <th className="px-4 py-3 text-right">Cash Sales</th>
                    <th className="px-4 py-3 text-right">Expenses / Drops</th>
                    <th className="px-4 py-3 text-right">Counted Cash</th>
                    <th className="px-4 py-3 text-center">Variance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No shift records found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((s) => {
                      const totalExpenses = s.expenses.reduce((a, b) => a + b.amount, 0);
                      const totalDrops = s.cashDrops.reduce((a, b) => a + b.amount, 0);
                      const variance = s.cashVariance !== undefined ? s.cashVariance : 0;
                      const isBalanced = Math.abs(variance) < 0.01;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{s.shiftNumber}</span>
                              {s.status === 'open' && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active Open" />
                              )}
                              {s.status === 'interrupted' && (
                                <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded" title="Interrupted - Attribution Preserved">
                                  Interrupted
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block">{s.terminalName}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {s.cashierName}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            <div>{new Date(s.openedAt).toLocaleDateString()} {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="text-[10px] text-slate-400">
                              {s.closedAt ? new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Still Open'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">
                            {currency} {s.openingFloat.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            +{currency} {s.cashSales.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500 text-[11px]">
                            {totalExpenses + totalDrops > 0 ? `-${currency} ${(totalExpenses + totalDrops).toLocaleString()}` : '0.00'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            {currency} {(s.closingCountedCash || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                                isBalanced
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : variance < 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {isBalanced ? 'Balanced' : `${variance > 0 ? '+' : ''}${variance.toFixed(2)}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedSlipShift(s);
                                setIsMidShiftAuditSlip(s.status === 'open');
                                setIsSlipModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            >
                              View Slip
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: MID-SHIFT CASH DROP (SAFE SKIM) ================= */}
      {isDropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-amber-600 text-white">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                <h3 className="text-sm font-black tracking-tight">Record Safe Cash Drop (Skim)</h3>
              </div>
              <button
                onClick={() => setIsDropModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-amber-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDropSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Transfers excess cash from drawer to the back-office drop safe. Reduces cash liability in till without affecting gross revenue.
              </p>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Cash Drop Amount ({currency})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    {currency}
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={dropAmount}
                    onChange={(e) => setDropAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-hidden focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Purpose</label>
                <select
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="Mid-day cash safe drop">Mid-day cash safe drop</option>
                  <option value="Cash threshold exceeded (> KES 30,000)">Cash threshold exceeded</option>
                  <option value="Bank deposit preparation">Bank deposit preparation</option>
                  <option value="End of peak-hour cash skim">End of peak-hour cash skim</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Authorized Manager</label>
                  <input
                    type="text"
                    required
                    value={dropAuthorizedBy}
                    onChange={(e) => setDropAuthorizedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Envelope / Bag #</label>
                  <input
                    type="text"
                    value={dropEnvelope}
                    onChange={(e) => setDropEnvelope(e.target.value)}
                    placeholder="ENV-048"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDropModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 transition cursor-pointer shadow-xs"
                >
                  Confirm Drop & Log Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PETTY CASH / DRAWER EXPENSE ================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-rose-600 text-white">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                <h3 className="text-sm font-black tracking-tight">Record Petty Cash Paid From Till</h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-rose-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Deducts cash directly from active till. Requires expense category and payee documentation for accounting export reconciliation.
              </p>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Expense Amount ({currency})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    {currency}
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="1500"
                    className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-hidden focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="supplies">Store Supplies</option>
                    <option value="logistics">Courier & Freight</option>
                    <option value="meals">Staff Lunch / Water</option>
                    <option value="utilities">Minor Utilities</option>
                    <option value="repairs">Emergency Repair</option>
                    <option value="inventory_cod">Urgent Supplier COD</option>
                    <option value="other">General Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payee / Recipient</label>
                  <input
                    type="text"
                    required
                    value={expensePayee}
                    onChange={(e) => setExpensePayee(e.target.value)}
                    placeholder="Vendor / Rider Name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Item Purchased</label>
                <input
                  type="text"
                  required
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="e.g. Receipt paper rolls (box of 24)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Approved By</label>
                  <input
                    type="text"
                    required
                    value={expenseApprovedBy}
                    onChange={(e) => setExpenseApprovedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Voucher / Receipt Ref</label>
                  <input
                    type="text"
                    value={expenseReceiptRef}
                    onChange={(e) => setExpenseReceiptRef(e.target.value)}
                    placeholder="VCH-1029"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer shadow-xs"
                >
                  Record Paid Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: END OF SHIFT RECONCILIATION ================= */}
      {isCloseModalOpen && liveStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in-50">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-4">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-black tracking-tight">Shift Close & Drawer Reconciliation</h3>
                  <p className="text-[11px] text-slate-400">Physical count verification & variance calculation</p>
                </div>
              </div>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCloseShift} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Expected vs Actual Live Breakdown */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-200 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  <span>Reconciliation Formula Breakdown</span>
                  <span className="font-mono text-slate-600">Float + Counter Sales - Returns - Drops - Expenses</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="font-medium">Opening Float:</span>
                  <span className="font-bold">{currency} {activeShift?.openingFloat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>(+) Counter Sales Tendered (Cash):</span>
                  <span className="font-bold">+{currency} {liveStats.cashSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className={`flex justify-between font-medium ${liveStats.cashRefunds > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  <span>(-) Cash Returns / Refunds:</span>
                  <span className={liveStats.cashRefunds > 0 ? 'font-bold' : ''}>
                    -{currency} {liveStats.cashRefunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={`flex justify-between font-medium ${liveStats.totalDrops > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                  <span>(-) Mid-Shift Safe Drops:</span>
                  <span className={liveStats.totalDrops > 0 ? 'font-bold' : ''}>
                    -{currency} {liveStats.totalDrops.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={`flex justify-between font-medium ${liveStats.totalExpenses > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                  <span>(-) Petty Cash Expenses:</span>
                  <span className={liveStats.totalExpenses > 0 ? 'font-bold' : ''}>
                    -{currency} {liveStats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-slate-300 flex justify-between font-black text-sm text-slate-900 bg-white -mx-4 -mb-4 px-4 py-2.5 rounded-b-2xl shadow-xs">
                  <span>THEORETICAL EXPECTED CASH:</span>
                  <span className="text-blue-700 font-mono text-base">
                    {currency} {liveStats.expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Total Active Session Counter Turnover Summary */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 bg-blue-50/70 border border-blue-200/60 px-3.5 py-2 rounded-xl">
                <span>Total Active Session Counter Sales:</span>
                <span className="font-black text-blue-900">
                  {currency} {liveStats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({liveStats.transactionCount} transactions)
                </span>
              </div>

              {/* Physical Cash Count Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Actual Physical Counted Cash ({currency})
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCloseDenomActive(!isCloseDenomActive)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{isCloseDenomActive ? 'Hide Denominations' : 'Count Notes & Coins'}</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                    {currency}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={countedCashInput}
                    onChange={(e) => setCountedCashInput(e.target.value)}
                    placeholder="Enter physical cash in drawer"
                    className="w-full pl-14 pr-4 py-3 bg-white border-2 border-slate-300 rounded-2xl text-lg font-black text-slate-900 focus:outline-hidden focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              {/* Denomination Counter for Closing */}
              {isCloseDenomActive && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 mb-1">
                    Count Notes & Coins (Sums directly into counted cash):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {DENOMINATIONS.map((d) => (
                      <div key={d.value} className="bg-white p-2 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 mb-1">{d.label}</div>
                        <input
                          type="number"
                          min="0"
                          value={closeDenoms[String(d.value)] || ''}
                          onChange={(e) => handleCloseDenomChange(String(d.value), parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-right"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-time Variance Feedback Card */}
              {countedCashInput !== '' && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
                    Math.abs(parseFloat(countedCashInput) - liveStats.expectedCash) < 0.01
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : parseFloat(countedCashInput) < liveStats.expectedCash
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {Math.abs(parseFloat(countedCashInput) - liveStats.expectedCash) < 0.01 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-sm">
                        {Math.abs(parseFloat(countedCashInput) - liveStats.expectedCash) < 0.01
                          ? 'Zero Variance (Perfect Balance)'
                          : parseFloat(countedCashInput) < liveStats.expectedCash
                          ? 'Cash Shortage Detected'
                          : 'Cash Overage Detected'}
                      </div>
                      <div className="text-[11px] opacity-80">
                        {Math.abs(parseFloat(countedCashInput) - liveStats.expectedCash) < 0.01
                          ? 'Drawer matches expected cash balance to the cent.'
                          : 'Explanation note required before closing.'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold block opacity-70">Variance</span>
                    <span className="font-mono font-black text-base">
                      {parseFloat(countedCashInput) - liveStats.expectedCash >= 0 ? '+' : ''}
                      {currency} {(parseFloat(countedCashInput) - liveStats.expectedCash).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Variance explanation note if variance exists */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Closing Notes / Variance Reason {Math.abs(parseFloat(countedCashInput || '0') - liveStats.expectedCash) > 0.01 && <span className="text-rose-600">*</span>}
                </label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Explain any discrepancy or note any incident during the shift..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-600"
                />
              </div>

              {/* Handover to Next Operator (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Handover Register To Operator (Optional)
                </label>
                <select
                  value={handoverCashierId}
                  onChange={(e) => setHandoverCashierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="">No immediate handover (Till locked)</option>
                  {systemUsers
                    .filter((u) => u.id !== currentCashier.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.replace('_', ' ')})
                      </option>
                    ))}
                </select>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-black transition cursor-pointer shadow-md"
                >
                  Finalize & Close Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RECONCILIATION SLIP (X/Z-REPORT) MODAL ================= */}
      <ShiftReconciliationSlipModal
        shift={selectedSlipShift}
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        isMidShiftXReport={isMidShiftAuditSlip}
      />
    </div>
  );
};
