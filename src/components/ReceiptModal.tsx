import React, { useRef, useEffect, useState } from 'react';
import { Printer, MessageSquare, ArrowRight, Check, Share2, RotateCcw, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { usePos } from '../context/PosContext';
import { getItemDiscountedUnitPrice, formatDiscountBadge } from '../utils/discountUtils';
import { ReceiptShareModal } from './ReceiptShareModal';
import { generateReceiptPdf } from '../utils/receiptPdfGenerator';

export const ReceiptModal: React.FC = () => {
  const {
    activeReceipt,
    setActiveReceipt,
    currentLocation,
    currentBusiness,
    showToast,
    openReturnsModal,
    autoPrintReceipt,
    toggleAutoPrintReceipt,
    receiptFormat,
  } = usePos();
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const hasAutoPrintedRef = useRef<string | null>(null);
  const [isAutoPrinting, setIsAutoPrinting] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Auto-Print on Checkout: Automatically invoke browser window.print() dialog once transaction completes
  useEffect(() => {
    if (activeReceipt && autoPrintReceipt) {
      if (hasAutoPrintedRef.current !== activeReceipt.id) {
        hasAutoPrintedRef.current = activeReceipt.id;
        setIsAutoPrinting(true);

        const timer = setTimeout(() => {
          try {
            window.print();
          } catch (err) {
            console.warn('Auto-print invocation error:', err);
          } finally {
            setIsAutoPrinting(false);
          }
        }, 280);

        return () => clearTimeout(timer);
      }
    }
  }, [activeReceipt, autoPrintReceipt]);

  // Keyboard shortcut listener for receipt modal: Esc or Enter to dismiss/next sale
  useEffect(() => {
    if (!activeReceipt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        setActiveReceipt(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReceipt, setActiveReceipt]);

  if (!activeReceipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (!activeReceipt) return;
    const { fileName, url } = generateReceiptPdf({
      transaction: activeReceipt,
      location: currentLocation,
      businessName: currentBusiness?.name,
      businessTaxNumber: currentBusiness?.taxNumber,
    });
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`PDF receipt (${fileName}) downloaded`, 'success');
  };

  const handleOpenShare = () => {
    setIsShareModalOpen(true);
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

  // Paper width styling based on user hardware preference
  const receiptMaxWidthClass =
    receiptFormat === '58mm'
      ? 'max-w-[280px]'
      : receiptFormat === 'standard'
      ? 'max-w-[420px]'
      : 'max-w-[360px]';

  return (
    <div
      id="receipt-display-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
    >
      <div className={`bg-slate-200/90 p-3 sm:p-5 rounded-2xl shadow-2xl flex flex-col items-center max-h-[96vh] sm:max-h-[95vh] overflow-y-auto w-full ${receiptFormat === 'standard' ? 'max-w-[460px]' : receiptFormat === '58mm' ? 'max-w-[320px]' : 'max-w-[400px]'}`}>
        
        {/* Quick Auto-Print Preference Toggle Banner */}
        <div className="no-print w-full mb-3 px-3 py-2 rounded-xl bg-white border border-slate-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                autoPrintReceipt
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Printer className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  Auto-Print on Checkout
                </span>
                {autoPrintReceipt && (
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                    ON
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 block leading-tight">
                {isAutoPrinting ? (
                  <span className="text-blue-600 font-bold animate-pulse">
                    Dispatching to printer dialog...
                  </span>
                ) : autoPrintReceipt ? (
                  'Browser print dialog triggers automatically on sale'
                ) : (
                  'Manual printing mode active'
                )}
              </span>
            </div>
          </div>

          <button
            id="receipt-auto-print-quick-toggle"
            type="button"
            role="switch"
            aria-checked={autoPrintReceipt}
            onClick={toggleAutoPrintReceipt}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
              autoPrintReceipt ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
            title={autoPrintReceipt ? 'Turn off Auto-Print' : 'Turn on Auto-Print'}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                autoPrintReceipt ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Printable Thermal Receipt Canvas */}
        <div
          ref={receiptRef}
          id="receipt-printable-canvas"
          className={`receipt-printable-canvas bg-white w-full ${receiptMaxWidthClass} rounded-xl shadow-xl border border-slate-300 p-4 sm:p-6 flex flex-col justify-between text-slate-800 font-mono text-xs select-text`}
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
            <h2 className="text-lg font-black tracking-tight text-slate-900 font-sans leading-none uppercase">
              {currentBusiness?.name || 'SokoPoS Retail'}
            </h2>
            <p className="text-[10px] text-slate-500">
              {currentLocation.name} • {currentLocation.address}
            </p>
            <p className="text-[10px] text-slate-500">
              KRA PIN: {currentBusiness?.taxNumber || currentLocation.taxId} • Tel: {currentLocation.phone}
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
            {activeReceipt.items.map((it, idx) => {
              const discountedUnit = getItemDiscountedUnitPrice(it);
              const lineTotal = discountedUnit * it.quantity;
              const discountBadge = formatDiscountBadge(it, currentLocation.currency);
              return (
                <div key={idx} className="flex justify-between text-[11px] leading-tight">
                  <div className="pr-2">
                    <span className="font-bold">{it.quantity}x</span> {it.productName}
                    {discountBadge && (
                      <span className="ml-1.5 text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-bold">
                        {discountBadge}
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono shrink-0">
                    {lineTotal.toFixed(2)}
                  </div>
                </div>
              );
            })}
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
            {activeReceipt.rawTotal !== undefined && activeReceipt.roundingAmount !== undefined && activeReceipt.roundingAmount !== 0 && (
              <>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Cart Total (Exact):</span>
                  <span>
                    {currentLocation.currency} {activeReceipt.rawTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Cash Rounding (Half-up):</span>
                  <span>
                    {activeReceipt.roundingAmount >= 0 ? '+' : ''}
                    {currentLocation.currency} {activeReceipt.roundingAmount.toFixed(2)}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>TOTAL PAID ({activeReceipt.paymentMethod.toUpperCase()}):</span>
              <span>
                {currentLocation.currency} {activeReceipt.total.toFixed(2)}
              </span>
            </div>

            {activeReceipt.paymentMethod !== 'cash' && activeReceipt.total % 1 !== 0 && (
              <div className="text-[9px] text-slate-500 text-right italic">
                Exact electronic settlement (no rounding applied)
              </div>
            )}

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
        <div className="no-print w-full max-w-[360px] mt-3 sm:mt-4 space-y-2">
          {!isFullyRefunded && (
            <button
              onClick={handleInitiateReturn}
              className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 py-2 rounded-xl font-bold text-xs shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>{isPartiallyRefunded ? 'Return Additional Items' : 'Process Return / Refund'}</span>
            </button>
          )}

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1 cursor-pointer"
              title="Print thermal receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 py-2.5 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
              title="Download official 80mm PDF receipt"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>
            <button
              id="receipt-sms-share-btn"
              onClick={handleOpenShare}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 py-2.5 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
              title="Share receipt via Instagram, WhatsApp, SMS, Email, or PDF"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Share</span>
            </button>
            <button
              onClick={handleClose}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1 cursor-pointer"
              title="Start Next Sale"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal Dialog */}
      <ReceiptShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        transaction={activeReceipt}
        location={currentLocation}
        businessName={currentBusiness?.name}
        businessTaxNumber={currentBusiness?.taxNumber}
        showToast={showToast}
      />
    </div>
  );
};
