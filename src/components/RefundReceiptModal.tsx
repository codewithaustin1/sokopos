import React, { useRef } from 'react';
import { Printer, MessageSquare, Check, X, RotateCcw } from 'lucide-react';
import { usePos } from '../context/PosContext';

export const RefundReceiptModal: React.FC = () => {
  const { activeRefundReceipt, setActiveRefundReceipt, currentLocation, showToast } = usePos();
  const receiptRef = useRef<HTMLDivElement | null>(null);

  if (!activeRefundReceipt) return null;

  const { refund, originalTx } = activeRefundReceipt;

  const handlePrint = () => {
    window.print();
  };

  const handleSendSms = () => {
    showToast(`Refund confirmation SMS sent to ${refund.customerPhone || 'customer'}`, 'success');
  };

  const handleClose = () => {
    setActiveRefundReceipt(null);
  };

  const totalRestockedCount = refund.items.reduce(
    (sum, item) => sum + (item.restockToInventory ? item.quantity : 0),
    0
  );

  return (
    <div
      id="refund-receipt-display-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-200/90 p-3 sm:p-6 rounded-2xl shadow-2xl flex flex-col items-center max-h-[96vh] sm:max-h-[95vh] overflow-y-auto w-full max-w-[400px]">
        {/* Printable Thermal Refund Voucher Canvas */}
        <div
          ref={receiptRef}
          className="bg-white w-full max-w-[380px] rounded-xl shadow-xl border border-slate-300 p-4 sm:p-6 flex flex-col justify-between text-slate-800 font-mono text-xs select-text"
        >
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
              <RotateCcw className="w-3 h-3" /> Official Credit Note
            </div>
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
              <span className="text-slate-500">Credit Note No:</span>
              <span className="font-bold text-slate-900 font-mono">{refund.refundNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Original Sale:</span>
              <span className="font-bold text-blue-600 font-mono">#{refund.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date/Time:</span>
              <span>{new Date(refund.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{refund.cashierName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Refund Method:</span>
              <span className="font-bold text-amber-700 uppercase">
                {refund.refundMethod.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reason:</span>
              <span className="font-semibold text-slate-800 text-right truncate max-w-[180px]">
                {refund.refundReason}
              </span>
            </div>
            {refund.customerName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span>
                  {refund.customerName} {refund.customerPhone ? `(${refund.customerPhone})` : ''}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-[10px] text-emerald-600 font-semibold pt-0.5">
              <span>Cloud Status:</span>
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3" /> Ledger Reconciled & Synced
              </span>
            </div>
          </div>

          {/* Returned Items Table */}
          <div className="py-3 space-y-2 border-b border-dashed border-slate-300 text-left">
            <div className="flex justify-between font-bold text-slate-900 text-[11px] pb-1 border-b border-slate-100">
              <span>RETURNED ITEM</span>
              <span>REFUND</span>
            </div>
            {refund.items.map((it, idx) => (
              <div key={idx} className="space-y-0.5 text-[11px] border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
                <div className="flex justify-between">
                  <div className="pr-2 font-medium">
                    <span className="font-bold text-amber-700">{it.quantity}x</span> {it.productName}
                  </div>
                  <div className="text-right font-mono font-bold shrink-0 text-slate-900">
                    -{it.refundTotalAmount.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono">SKU: {it.sku}</span>
                  <span className={it.restockToInventory ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                    {it.restockToInventory ? '✓ Restocked to inventory' : '✗ Damaged / not restocked'}
                  </span>
                </div>
                {it.reason && it.reason !== refund.refundReason && (
                  <div className="text-[10px] text-slate-500 italic">
                    Note: {it.reason}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Refund Calculations */}
          <div className="space-y-1.5 py-3 text-right text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Credited:</span>
              <span>
                {currentLocation.currency} {refund.subtotalRefund.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT / Tax Refunded (16%):</span>
              <span>
                {currentLocation.currency} {refund.taxRefund.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-amber-700 pt-2 border-t border-slate-200">
              <span>TOTAL REFUNDED:</span>
              <span>
                {currentLocation.currency} {refund.totalRefund.toFixed(2)}
              </span>
            </div>

            <div className="pt-2 text-[10px] text-slate-500 space-y-0.5 text-left bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div className="flex justify-between">
                <span>Original Sale Total:</span>
                <span className="font-mono">{currentLocation.currency} {originalTx.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cumulative Refunded:</span>
                <span className="font-mono text-amber-700">
                  {currentLocation.currency} {(originalTx.totalRefunded || refund.totalRefund).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-slate-700 pt-0.5 border-t border-slate-200">
                <span>Updated Sale Status:</span>
                <span className="uppercase text-amber-700 font-black">
                  {originalTx.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Barcode Graphic & Footer */}
          <div className="pt-3 flex flex-col items-center text-center">
            <div className="w-56 h-8 bg-slate-900 rounded-sm flex items-center justify-center text-white text-[9px] tracking-widest font-mono select-none">
              |||| ||| ||||| || |||||| |||| ||
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              *{refund.refundNumber}*
            </span>

            <p className="text-[10px] text-slate-400 mt-2">
              {totalRestockedCount > 0
                ? `${totalRestockedCount} units returned to active store stock`
                : 'Inventory write-off / damaged goods recorded'}
            </p>
            <p className="text-[10px] text-slate-500 font-sans font-bold mt-1">
              Customer copy • Powered by SokoPOS
            </p>
          </div>
        </div>

        {/* Action Buttons Below Receipt */}
        <div className="w-full max-w-[380px] mt-3 sm:mt-4 flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Credit Note</span>
          </button>
          <button
            onClick={handleSendSms}
            className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 py-2.5 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>SMS Voucher</span>
          </button>
          <button
            onClick={handleClose}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1 cursor-pointer"
            title="Close and return to POS"
          >
            <X className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
