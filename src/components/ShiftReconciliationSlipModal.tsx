import React, { useRef } from 'react';
import {
  X,
  Printer,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Banknote,
  FileSpreadsheet,
} from 'lucide-react';
import { ShiftSession } from '../types';
import { usePos } from '../context/PosContext';

interface ShiftReconciliationSlipModalProps {
  shift: ShiftSession | null;
  isOpen: boolean;
  onClose: () => void;
  isMidShiftXReport?: boolean;
}

export const ShiftReconciliationSlipModal: React.FC<ShiftReconciliationSlipModalProps> = ({
  shift,
  isOpen,
  onClose,
  isMidShiftXReport = false,
}) => {
  const { currentBusiness, currentLocation, showToast } = usePos();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !shift) return null;

  const currency = currentLocation.currency || 'KES';
  const isClosed = shift.status === 'closed';

  // Calculate duration
  const startMs = new Date(shift.openedAt).getTime();
  const endMs = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();
  const diffMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  const durationStr = `${hours}h ${mins}m`;

  const totalDrops = Number(
    shift.cashDrops.reduce((acc, d) => acc + d.amount, 0).toFixed(2)
  );
  const totalExpenses = Number(
    shift.expenses.reduce((acc, e) => acc + e.amount, 0).toFixed(2)
  );
  const expectedCash =
    shift.expectedCash !== undefined
      ? shift.expectedCash
      : Number((shift.openingFloat + shift.cashSales - shift.cashRefunds - totalDrops - totalExpenses).toFixed(2));

  const countedCash = shift.closingCountedCash !== undefined ? shift.closingCountedCash : expectedCash;
  const variance = shift.cashVariance !== undefined ? shift.cashVariance : Number((countedCash - expectedCash).toFixed(2));

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `
========================================
   ${currentBusiness?.name || 'SokoPoS Store'}
   ${currentLocation.name} - ${shift.terminalName}
========================================
${isMidShiftXReport ? '*** MID-SHIFT AUDIT (X-REPORT) ***' : '*** SHIFT RECONCILIATION (Z-REPORT) ***'}
Shift #: ${shift.shiftNumber}
Cashier: ${shift.cashierName}
Opened:  ${new Date(shift.openedAt).toLocaleString()}
${shift.closedAt ? `Closed:  ${new Date(shift.closedAt).toLocaleString()}` : 'Status:  ACTIVE (OPEN)'}
Duration: ${durationStr}
----------------------------------------
CASH DRAWER RECONCILIATION:
(+) Opening Float:        ${currency} ${shift.openingFloat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
(+) Cash Counter Sales:   ${currency} ${shift.cashSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
(-) Cash Returns/Refunds: ${currency} ${shift.cashRefunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
(-) Safe Cash Drops:      ${currency} ${totalDrops.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
(-) Drawer Expenses:      ${currency} ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
----------------------------------------
(=) Expected Cash:        ${currency} ${expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Actual Counted Cash:      ${currency} ${countedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Variance (Over/Short):    ${currency} ${variance >= 0 ? '+' : ''}${variance.toFixed(2)}
----------------------------------------
DIGITAL & TOTAL REVENUE:
M-Pesa Tender:            ${currency} ${shift.mpesaSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Card Tender:              ${currency} ${shift.cardSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Total Gross Turnover:     ${currency} ${shift.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Total Transactions:       ${shift.transactionCount}
========================================
`.trim();

    navigator.clipboard.writeText(text);
    showToast('Reconciliation slip copied to clipboard', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in-50">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col my-4">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">
                {isMidShiftXReport ? 'Mid-Shift Audit (X-Report)' : 'Shift Close & Cash Reconciliation'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {shift.shiftNumber} • {shift.terminalName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Slip Container */}
        <div className="p-5 overflow-y-auto max-h-[72vh] bg-slate-100 flex justify-center">
          <div
            ref={printRef}
            id="shift-thermal-slip"
            className="w-full max-w-[340px] bg-white p-5 rounded-2xl shadow-xs border border-slate-200 text-slate-900 font-mono text-xs select-text leading-relaxed"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-base font-black tracking-tight font-sans text-slate-950">
                {currentBusiness?.name || 'SokoPoS Horizon'}
              </h2>
              <p className="text-[11px] text-slate-600 font-sans">{currentLocation.name}</p>
              <p className="text-[10px] text-slate-500 font-sans">
                {currentLocation.address} • Tel: {currentBusiness?.phone || '+254 700 000 000'}
              </p>
              <p className="text-[10px] text-slate-500 font-sans">
                Tax PIN: {currentBusiness?.taxNumber || 'P051234567X'}
              </p>
              <div className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white font-sans">
                {isMidShiftXReport
                  ? 'MID-SHIFT AUDIT (X-SLIP)'
                  : isClosed
                  ? 'SHIFT RECONCILIATION (Z-SLIP)'
                  : 'DRAWER STATUS AUDIT'}
              </div>
            </div>

            {/* Shift Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Shift Number:</span>
                <span className="font-bold">{shift.shiftNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Register Terminal:</span>
                <span className="font-bold">{shift.terminalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operator / Cashier:</span>
                <span className="font-bold">{shift.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Opened At:</span>
                <span>{new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(shift.openedAt).toLocaleDateString()})</span>
              </div>
              {shift.closedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Closed At:</span>
                  <span>{new Date(shift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(shift.closedAt).toLocaleDateString()})</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Trading Duration:</span>
                <span>{durationStr}</span>
              </div>
            </div>

            {/* Cash Drawer Movement Ledger */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between font-sans font-black text-slate-800 uppercase tracking-wider text-[10px] pb-1">
                <span>Cash Drawer Movements</span>
                <span className="font-normal lowercase text-[9px] text-slate-400">float + sales - returns - drops - exp</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>(+) Opening Float</span>
                <span className="font-bold">{currency} {shift.openingFloat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>(+) Cash Counter Sales Tendered</span>
                <span className="font-bold">+{currency} {shift.cashSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className={`flex justify-between ${shift.cashRefunds > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                <span>(-) Cash Returns / Refunds</span>
                <span>-{currency} {shift.cashRefunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className={`flex justify-between ${totalDrops > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}`}>
                <span>(-) Mid-Shift Safe Drops</span>
                <span>-{currency} {totalDrops.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className={`flex justify-between ${totalExpenses > 0 ? 'text-rose-700 font-bold' : 'text-slate-400'}`}>
                <span>(-) Petty Cash Expenses</span>
                <span>-{currency} {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between font-black text-xs text-slate-900 bg-slate-50 -mx-2 px-2 py-1.5 rounded-lg">
                <span>(=) Theoretical Expected Cash:</span>
                <span className="text-blue-700 font-mono text-sm">{currency} {expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-xs text-slate-800 pt-1">
                <span>Actual Counted Cash:</span>
                <span className="font-mono">{currency} {countedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {/* Variance Badge */}
              <div
                className={`mt-2 p-2 rounded-lg flex items-center justify-between text-[11px] font-sans font-bold ${
                  Math.abs(variance) < 0.01
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : variance < 0
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {Math.abs(variance) < 0.01 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  <span>
                    {Math.abs(variance) < 0.01
                      ? 'Drawer Balanced (Zero Variance)'
                      : variance < 0
                      ? 'Cash Shortage'
                      : 'Cash Overage'}
                  </span>
                </div>
                <span className="font-mono font-black text-xs">
                  {variance >= 0 ? '+' : ''}
                  {currency} {variance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Petty Cash Itemization if any */}
            {shift.expenses.length > 0 && (
              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[10px]">
                <div className="font-sans font-black text-slate-800 uppercase tracking-wider text-[9px] pb-0.5">
                  Itemized Drawer Expenses ({shift.expenses.length})
                </div>
                {shift.expenses.map((e) => (
                  <div key={e.id} className="flex justify-between items-start text-slate-700">
                    <div className="max-w-[200px]">
                      <span className="font-bold uppercase text-[9px] text-slate-500 mr-1">[{e.category}]</span>
                      <span className="truncate">{e.description}</span>
                    </div>
                    <span className="font-mono shrink-0">-{currency} {e.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Mid-Shift Drops if any */}
            {shift.cashDrops.length > 0 && (
              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[10px]">
                <div className="font-sans font-black text-slate-800 uppercase tracking-wider text-[9px] pb-0.5">
                  Safe Cash Drops ({shift.cashDrops.length})
                </div>
                {shift.cashDrops.map((d) => (
                  <div key={d.id} className="flex justify-between text-slate-700">
                    <span>
                      {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {d.reason}
                    </span>
                    <span className="font-mono shrink-0">-{currency} {d.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Non-Cash & Total Turnover */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="font-sans font-black text-slate-800 uppercase tracking-wider text-[10px] pb-1">
                Total Trading Revenue
              </div>
              <div className="flex justify-between">
                <span>M-Pesa Mobile Money:</span>
                <span className="font-bold">{currency} {shift.mpesaSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Card Terminal:</span>
                <span className="font-bold">{currency} {shift.cardSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Tendered:</span>
                <span className="font-bold">{currency} {shift.cashSales.toLocaleString()}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex justify-between font-black text-xs text-slate-950 font-sans">
                <span>GROSS SALES TURNOVER:</span>
                <span>{currency} {shift.totalSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Completed Orders:</span>
                <span>{shift.transactionCount} transactions</span>
              </div>
            </div>

            {/* Handover & Notes */}
            {(shift.handoverToCashierName || shift.closingNotes) && (
              <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-1 text-slate-600">
                {shift.handoverToCashierName && (
                  <div className="flex justify-between font-sans">
                    <span className="font-bold">Handover To:</span>
                    <span>{shift.handoverToCashierName}</span>
                  </div>
                )}
                {shift.closingNotes && (
                  <div>
                    <span className="font-bold block">Closing Remarks:</span>
                    <span className="italic">{shift.closingNotes}</span>
                  </div>
                )}
              </div>
            )}

            {/* Signature Blocks */}
            <div className="pt-5 pb-2 text-[10px] text-slate-500 space-y-5 font-sans">
              <div className="flex justify-between items-end gap-4">
                <div className="flex-1 text-center">
                  <div className="border-b border-slate-400 mb-1 h-6"></div>
                  <span>Cashier: {shift.cashierName}</span>
                </div>
                <div className="flex-1 text-center">
                  <div className="border-b border-slate-400 mb-1 h-6"></div>
                  <span>Supervisor / Auditor</span>
                </div>
              </div>
              <p className="text-center text-[9px] text-slate-400 pt-2">
                Certified audit slip generated by SokoPoS Enterprise System
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Text</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Done
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
