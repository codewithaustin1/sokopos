import React, { useRef } from 'react';
import { Printer, MessageSquare, ArrowRight, Check, Share2, RotateCcw, AlertTriangle } from 'lucide-react';
import { usePos } from '../context/PosContext';

export const ReceiptModal: React.FC = () => {
  const { activeReceipt, setActiveReceipt, currentLocation, showToast, openReturnsModal } = usePos();
  const receiptRef = useRef<HTMLDivElement | null>(null);

  if (!activeReceipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendSms = () => {
    showToast(`Digital SMS receipt dispatched to customer`, 'success');
  };

  const handleClose = () => {
    setActiveReceipt(null);
  };

  const handleInitiateReturn = () => {
    const tx = activeReceipt;
    setActiveReceipt(null);
    openReturnsModal(tx);
  };

  const isFullyRefunded = activeReceipt.status === 'refunded';
  const isPartiallyRefunded = activeReceipt.status === 'partially_refunded';
  const hasRefunds = (activeReceipt.refunds && activeReceipt.refunds.length > 0) || (activeReceipt.totalRefunded && activeReceipt.totalRefunded > 0);

  return (
    <div
      id="receipt-display-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-200/90 p-3 sm:p-6 rounded-2xl shadow-2xl flex flex-col items-center max-h-[96vh] sm:max-h-[95vh] overflow-y-auto w-full max-w-[380px]">
        {/* Printable Thermal Receipt Canvas */}
        <div
          ref={receiptRef}
          className="bg-white w-full max-w-[360px] rounded-xl shadow-xl border border-slate-300 p-4 sm:p-6 flex flex-col justify-between text-slate-800 font-mono text-xs select-text"
        >
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            {isFullyRefunded && (
              <div className="inline-flex items-center gap-1 bg-red-100 text-red-900 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
                <AlertTriangle className="w-3 h-3 text-red-600" /> Fully Refunded
              </div>
            )}
            {isPartiallyRefunded && (
              <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
                <RotateCcw className="w-3 h-3 text-amber-700" /> Partially Refunded
              </div>
            )}
            <h2 className="text-lg font-black tracking-tight text-slate-900 font-sans leading-none">
              SOKOPOS RETAIL
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Sokoplus Horizon Ltd</p>
            <p className="text-[10px] text-slate-500">
              {currentLocation.name} • {currentLocation.address}
            </p>
            <p className="text-[10px] text-slate-500">
              KRA PIN: {currentLocation.taxId} • Tel: {currentLocation.phone}
            </p>
          </div>

          {/* Meta Details */}
          <div className="text-left text-[11px] space-y-1 py-3 border-b border-dashed border-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-bold text-slate-900">{activeReceipt.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date/Time:</span>
              <span>{new Date(activeReceipt.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{activeReceipt.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Terminal:</span>
              <span>{activeReceipt.terminalName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment:</span>
              <span className="font-bold text-emerald-700 uppercase">
                {activeReceipt.paymentMethod}
                {activeReceipt.paymentDetails.mpesaCode && ` (${activeReceipt.paymentDetails.mpesaCode})`}
                {activeReceipt.paymentDetails.cardLast4 && ` (*${activeReceipt.paymentDetails.cardLast4})`}
              </span>
            </div>
            {activeReceipt.syncedToCloud && (
              <div className="flex justify-between items-center text-[10px] text-blue-600 font-semibold pt-0.5">
                <span>Cloud Status:</span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced & Replicated
                </span>
              </div>
            )}
          </div>

          {/* Itemized Table */}
          <div className="py-3 space-y-2 border-b border-dashed border-slate-300 text-left">
            <div className="flex justify-between font-bold text-slate-900 text-[11px] pb-1 border-b border-slate-100">
              <span>QTY / ITEM</span>
              <span>AMOUNT</span>
            </div>
            {activeReceipt.items.map((it, idx) => (
              <div key={idx} className="flex justify-between text-[11px] leading-tight">
                <div className="pr-2">
                  <span className="font-bold">{it.quantity}x</span> {it.productName}
                </div>
                <div className="text-right font-mono shrink-0">
                  {(it.unitPrice * (1 - it.discountPercent / 100) * it.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Calculations */}
          <div className="space-y-1.5 py-3 text-right text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Net Subtotal:</span>
              <span>
                {currentLocation.currency} {activeReceipt.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT / Tax (16%):</span>
              <span>
                {currentLocation.currency} {activeReceipt.taxAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>TOTAL PAID:</span>
              <span>
                {currentLocation.currency} {activeReceipt.total.toFixed(2)}
              </span>
            </div>

            {activeReceipt.paymentMethod === 'cash' &&
              activeReceipt.paymentDetails.cashTendered !== undefined && (
                <div className="pt-2 text-[10px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Cash Tendered:</span>
                    <span>
                      {currentLocation.currency}{' '}
                      {activeReceipt.paymentDetails.cashTendered.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Change Returned:</span>
                    <span>
                      {currentLocation.currency}{' '}
                      {(activeReceipt.paymentDetails.cashChange ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

            {/* Refund Reconciliation Record (if any) */}
            {hasRefunds && (
              <div className="pt-2 mt-2 border-t border-dashed border-slate-300 text-left bg-amber-50/70 p-2 rounded-lg text-[10px] space-y-1">
                <div className="flex justify-between text-amber-900 font-bold">
                  <span>Cumulative Refunded:</span>
                  <span>
                    -{currentLocation.currency}{' '}
                    {(activeReceipt.totalRefunded || (activeReceipt.refunds?.reduce((s, r) => s + r.totalRefund, 0) ?? 0)).toFixed(2)}
                  </span>
                </div>
                {activeReceipt.refunds && activeReceipt.refunds.length > 0 && (
                  <div className="text-[9px] text-amber-700 space-y-0.5">
                    {activeReceipt.refunds.map((ref, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{ref.refundNumber} ({ref.refundReason})</span>
                        <span className="font-mono">-{ref.totalRefund.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-800 pt-0.5 border-t border-amber-200">
                  <span>Net Retained Revenue:</span>
                  <span className="font-mono">
                    {currentLocation.currency}{' '}
                    {Math.max(0, activeReceipt.total - (activeReceipt.totalRefunded || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Barcode Graphic & Footer */}
          <div className="pt-4 flex flex-col items-center text-center">
            {/* Styled Simulated Thermal Barcode */}
            <div className="w-56 h-9 bg-slate-900 rounded-sm flex items-center justify-center text-white text-[9px] tracking-widest font-mono select-none">
              ||||| | |||||| ||| ||||| ||||| ||||
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              *{activeReceipt.receiptNumber}*
            </span>

            <p className="text-[10px] text-slate-400 mt-3">Powered by Sokoplus Horizon</p>
            <p className="text-[10px] text-slate-500 font-sans font-bold">
              Asante kwa kununua na sisi!
            </p>
          </div>
        </div>

        {/* Action Buttons Below Receipt */}
        <div className="w-full max-w-[360px] mt-3 sm:mt-4 space-y-2">
          {!isFullyRefunded && (
            <button
              onClick={handleInitiateReturn}
              className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 py-2 rounded-xl font-bold text-xs shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>{isPartiallyRefunded ? 'Return Additional Items' : 'Process Return / Refund'}</span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={handleSendSms}
              className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 py-2.5 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>SMS / Share</span>
            </button>
            <button
              onClick={handleClose}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1 cursor-pointer"
              title="Start Next Sale"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
