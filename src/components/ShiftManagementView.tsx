import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Coins,
  Banknote,
  Lock,
  History,
  Calculator,
  ArrowDownRight,
  ArrowUpRight,
  X,
  Search,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { ShiftSession, ShiftExpense, CashDrop, ExpenseCategory } from '../types';
import { ShiftReconciliationSlipModal } from './ShiftReconciliationSlipModal';
import { ShiftInitializationCard } from './shift/ShiftInitializationCard';
import { ShiftSessionClosedCard } from './shift/ShiftSessionClosedCard';

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
  const [closedViewMode, setClosedViewMode] = useState<'init' | 'status'>('init');

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
  const [dropWarningConfirmed, setDropWarningConfirmed] = useState<boolean>(false);

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
        if (t.paymentDetails?.splitBreakdown && t.paymentDetails.splitBreakdown.length > 0) {
          t.paymentDetails.splitBreakdown.forEach((entry) => {
            if (entry.method === 'cash') cashSales += entry.amount;
            else if (entry.method === 'mpesa') mpesaSales += entry.amount;
            else if (entry.method === 'card') cardSales += entry.amount;
          });
        } else {
          const cashPortion = t.paymentDetails?.cashTendered || 0;
          cashSales += cashPortion;
          const nonCashPortion = Math.max(0, t.total - cashPortion);
          mpesaSales += nonCashPortion;
        }
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

    if (liveStats && amount > liveStats.expectedCash && !dropWarningConfirmed) {
      setDropWarningConfirmed(true);
      showToast(
        `Drop amount exceeds expected drawer cash (${currency} ${liveStats.expectedCash.toFixed(2)}). Click Confirm again to proceed.`,
        'info'
      );
      return;
    }

    recordCashDrop(amount, dropReason, dropAuthorizedBy, dropEnvelope);
    setDropAmount('');
    setDropEnvelope('');
    setDropWarningConfirmed(false);
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
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Shift & Till Management
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span>{currentBusiness?.name || 'Active Store'}</span>
            <span aria-hidden="true">·</span>
            <span>{currentLocation.name}</span>
            <span aria-hidden="true">·</span>
            <span>{currentLocation.terminalName}</span>
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] ${
              activeTab === 'current'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Active Session</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
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
              /* ================= NO ACTIVE SHIFT: TERMINAL INITIALIZATION (Image 2 Card) ================= */
              <div className="max-w-xl mx-auto my-6 px-2 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3 px-1 max-w-lg">
                  <div className="inline-flex p-1 bg-slate-200/80 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setClosedViewMode('init')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        closedViewMode === 'init'
                          ? 'bg-white text-slate-900 shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Terminal Open (Float)
                    </button>
                    <button
                      type="button"
                      onClick={() => setClosedViewMode('status')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        closedViewMode === 'status'
                          ? 'bg-white text-slate-900 shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Closed Session Status
                    </button>
                  </div>
                </div>

                {closedViewMode === 'init' ? (
                  <ShiftInitializationCard />
                ) : (
                  <ShiftSessionClosedCard
                    onOpenShiftClick={() => setClosedViewMode('init')}
                  />
                )}
              </div>
            ) : (
              /* ================= ACTIVE SHIFT SUMMARY & LEDGERS ================= */
              <div className="space-y-6">
                {/* Current Active Shift Summary Card */}
                <section
                  aria-label="Current Active Shift Summary"
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                >
                  {/* Summary Header & Quick Actions */}
                  <div className="px-5 py-5 sm:px-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Active Shift</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-500 font-normal tabular-nums">
                          Opened {new Date(activeShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 tabular-nums">
                        Shift #{activeShift.shiftNumber}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-1">
                        <span>
                          Operator: <strong className="font-semibold text-slate-800">{activeShift.cashierName}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{activeShift.locationName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeShift.terminalName}</span>
                      </div>
                    </div>

                    {/* Quick-Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setDropWarningConfirmed(false);
                          setIsDropModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
                        title="Transfer excess cash to drop safe"
                      >
                        <ArrowDownRight className="w-4 h-4 text-amber-600" />
                        <span>Cash Drop</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
                        title="Record petty cash paid out from till"
                      >
                        <ArrowUpRight className="w-4 h-4 text-rose-600" />
                        <span>Add Expense</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenMidShiftSlip}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
                        title="Print mid-shift X-Report without closing drawer"
                      >
                        <Printer className="w-4 h-4 text-slate-600" />
                        <span>X-Report</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleStartCloseShift}
                        className="inline-flex items-center gap-2 px-5 py-2 min-h-[40px] rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-black transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
                        title="Count drawer cash and close active shift"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Close Shift</span>
                      </button>
                    </div>
                  </div>

                  {/* Primary 4-Column Financial Summary Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                    {/* Total Sales */}
                    <div className="p-5 sm:p-6">
                      <div className="text-xs font-medium text-slate-500">
                        Total Sales
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5 font-mono tabular-nums tracking-tight">
                        {currency} {(liveStats?.totalSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-500 mt-2 tabular-nums">
                        {liveStats?.transactionCount || 0} {liveStats?.transactionCount === 1 ? 'transaction' : 'transactions'} completed
                      </div>
                    </div>

                    {/* Cash Collected */}
                    <div className="p-5 sm:p-6">
                      <div className="text-xs font-medium text-slate-500">
                        Cash Collected
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1.5 font-mono tabular-nums tracking-tight">
                        {currency} {(liveStats?.cashSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs mt-2 tabular-nums">
                        {liveStats && liveStats.cashRefunds > 0 ? (
                          <span className="text-rose-600 font-medium">
                            Cash refunds: -{currency} {liveStats.cashRefunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-500">Gross cash tendered in shift</span>
                        )}
                      </div>
                    </div>

                    {/* Expected in Drawer */}
                    <div className="p-5 sm:p-6">
                      <div className="text-xs font-medium text-slate-500">
                        Expected in Drawer
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5 font-mono tabular-nums tracking-tight">
                        {currency} {(liveStats?.expectedCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-500 mt-2 tabular-nums">
                        Opening float: {currency} {activeShift.openingFloat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Digital / Non-Cash Tenders */}
                    <div className="p-5 sm:p-6">
                      <div className="text-xs font-medium text-slate-500">
                        M-Pesa & Card Sales
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5 font-mono tabular-nums tracking-tight">
                        {currency} {((liveStats?.mpesaSales || 0) + (liveStats?.cardSales || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-500 mt-2 flex items-center gap-2 tabular-nums">
                        <span>M-Pesa {currency} {(liveStats?.mpesaSales || 0).toLocaleString()}</span>
                        <span aria-hidden="true">·</span>
                        <span>Card {currency} {(liveStats?.cardSales || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Drawer Reconciliation Formula Summary Strip */}
                  <div className="bg-slate-50/80 border-t border-slate-100 px-5 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-slate-600 tabular-nums">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        Float: <strong className="font-mono text-slate-800">{currency} {activeShift.openingFloat.toLocaleString()}</strong>
                      </span>
                      <span aria-hidden="true" className="text-slate-300">+</span>
                      <span>
                        Cash: <strong className="font-mono text-emerald-700">{currency} {(liveStats?.cashSales || 0).toLocaleString()}</strong>
                      </span>
                      <span aria-hidden="true" className="text-slate-300">-</span>
                      <span>
                        Drops: <strong className="font-mono text-slate-800">{currency} {(liveStats?.totalDrops || 0).toLocaleString()}</strong>
                      </span>
                      <span aria-hidden="true" className="text-slate-300">-</span>
                      <span>
                        Expenses: <strong className="font-mono text-slate-800">{currency} {(liveStats?.totalExpenses || 0).toLocaleString()}</strong>
                      </span>
                      {liveStats && liveStats.cashRefunds > 0 && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">-</span>
                          <span>
                            Refunds: <strong className="font-mono text-rose-700">{currency} {liveStats.cashRefunds.toLocaleString()}</strong>
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-slate-500">
                      {activeShift.cashDrops.length} {activeShift.cashDrops.length === 1 ? 'drop' : 'drops'} · {activeShift.expenses.length} {activeShift.expenses.length === 1 ? 'expense' : 'expenses'}
                    </div>
                  </div>
                </section>

                {/* Activity Ledgers Grid: Expenses & Cash Drops */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Petty Cash Expenses List */}
                  <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Petty Cash Expenses</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Paid out directly from active till</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="text-xs font-semibold text-rose-700 hover:text-rose-800 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer whitespace-nowrap shrink-0"
                      >
                        + Add Expense
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-slate-100 mt-2">
                      {activeShift.expenses.length === 0 ? (
                        <div className="py-8 text-center space-y-2.5">
                          <p className="text-xs text-slate-500">
                            No petty cash expenses recorded for this shift yet.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5 text-rose-600" />
                            <span>Log First Expense</span>
                          </button>
                        </div>
                      ) : (
                        activeShift.expenses.map((exp) => (
                          <div key={exp.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">{exp.description}</div>
                              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="capitalize font-medium text-rose-700">{exp.category.replace('_', ' ')}</span>
                                <span aria-hidden="true">·</span>
                                <span>Payee: {exp.payee}</span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">{new Date(exp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            <div className="font-mono tabular-nums font-bold text-rose-700 shrink-0">
                              -{currency} {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Mid-Shift Cash Drops to Safe List */}
                  <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Safe Cash Drops</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Excess till cash skimmed to safe</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDropWarningConfirmed(false);
                          setIsDropModalOpen(true);
                        }}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition cursor-pointer whitespace-nowrap shrink-0"
                      >
                        + Add Cash Drop
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-slate-100 mt-2">
                      {activeShift.cashDrops.length === 0 ? (
                        <div className="py-8 text-center space-y-2.5">
                          <p className="text-xs text-slate-500">
                            No mid-shift cash drops recorded for this session.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setDropWarningConfirmed(false);
                              setIsDropModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                          >
                            <Banknote className="w-3.5 h-3.5 text-amber-600" />
                            <span>Record Cash Drop</span>
                          </button>
                        </div>
                      ) : (
                        activeShift.cashDrops.map((drop) => (
                          <div key={drop.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">{drop.reason}</div>
                              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span>Auth: {drop.authorizedBy}</span>
                                {drop.envelopeNumber && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>Env #{drop.envelopeNumber}</span>
                                  </>
                                )}
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">{new Date(drop.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            <div className="font-mono tabular-nums font-bold text-amber-700 shrink-0">
                              -{currency} {drop.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
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
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Shift ID</th>
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Started / Closed</th>
                    <th className="px-4 py-3 text-right">Opening Float</th>
                    <th className="px-4 py-3 text-right">Total Sales</th>
                    <th className="px-4 py-3 text-right">Cash Sales</th>
                    <th className="px-4 py-3 text-right">Counted Cash</th>
                    <th className="px-4 py-3 text-right">Variance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-500">
                        {historySearchQuery.trim()
                          ? 'No shift records match your search query.'
                          : 'Completed shifts and Z-reports will appear here after your first shift is closed.'}
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((s) => {
                      const variance = s.cashVariance !== undefined ? s.cashVariance : 0;
                      const isBalanced = Math.abs(variance) < 0.01;
                      const totalSales =
                        typeof s.totalSales === 'number'
                          ? s.totalSales
                          : Number(s.cashSales || 0) + Number(s.mpesaSales || 0) + Number(s.cardSales || 0);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 tabular-nums">
                              <span>{s.shiftNumber}</span>
                              {s.status === 'interrupted' && (
                                <span className="text-[11px] font-medium text-amber-700" title="Interrupted - Attribution Preserved">
                                  · Interrupted
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-normal text-slate-500 block">{s.terminalName}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {s.cashierName}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap tabular-nums">
                            <div>
                              {new Date(s.openedAt).toLocaleDateString()}{' '}
                              {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {s.closedAt ? new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Still Open'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                            {currency} {s.openingFloat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {currency} {totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                            {currency} {s.cashSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {currency} {(s.closingCountedCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                            {isBalanced ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Balanced</span>
                              </span>
                            ) : (
                              <span className={`font-semibold ${variance < 0 ? 'text-rose-700' : 'text-blue-700'}`}>
                                {variance > 0 ? '+' : ''}
                                {currency} {variance.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSlipShift(s);
                                setIsMidShiftAuditSlip(s.status === 'open');
                                setIsSlipModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer whitespace-nowrap"
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
                type="button"
                onClick={() => {
                  setDropWarningConfirmed(false);
                  setIsDropModalOpen(false);
                }}
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
                    onChange={(e) => {
                      setDropAmount(e.target.value);
                      setDropWarningConfirmed(false);
                    }}
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

              {dropWarningConfirmed && liveStats && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Drop exceeds expected drawer cash ({currency}{' '}
                    {liveStats.expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Click{' '}
                    <strong>Confirm Drop &amp; Log Voucher</strong> again to proceed.
                  </span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDropWarningConfirmed(false);
                    setIsDropModalOpen(false);
                  }}
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
