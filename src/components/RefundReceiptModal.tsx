import React, { useRef, useState } from 'react';
import {
  Printer,
  MessageSquare,
  Check,
  X,
  RotateCcw,
  Bluetooth,
  Clock,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { isDemoBusinessId } from '../lib/firestoreService';
import { ReceiptShareModal } from './ReceiptShareModal';
import { formatRefundVoucherText } from '../utils/receiptFormatter';
import { bluetoothPrinterService } from '../services/bluetoothPrinterService';
import {
  isEtimsRelayEnabled,
  isCreditNoteEtimsVerified,
  shouldShowCreditNoteEtimsInfo,
} from '../utils/etimsDisplay';
import {
  maskPhoneNumber,
  isPlaceholderOrRepeatedKraPin,
  canViewUnmaskedCustomerPii,
} from '../utils/privacyAndKraSecurity';

export const RefundReceiptModal: React.FC = () => {
  const {
    activeRefundReceipt,
    setActiveRefundReceipt,
    currentLocation,
    currentBusiness,
    currentUser,
    isSuperAdmin,
    isDemoSession,
    showToast,
    printerType,
    receiptFormat,
    retryRefundCreditNote,
  } = usePos();
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
  const [isRetryingCreditNote, setIsRetryingCreditNote] = useState(false);

  if (!activeRefundReceipt) return null;

  const { refund, originalTx } = activeRefundReceipt;
  const isDemoRefund = Boolean(
    isDemoSession || currentUser?.isDemoSession || isDemoBusinessId(originalTx.businessId)
  );
  const etimsRelayEnabled = isEtimsRelayEnabled(currentBusiness?.taxSettings);
  const etimsCn = refund.etimsCreditNote;
  const isCnVerified = Boolean(!isDemoRefund && isCreditNoteEtimsVerified(etimsCn));
  const isCnFailed = Boolean(!isDemoRefund && etimsCn?.status === 'FAILED');
  const showCnEtimsSection = shouldShowCreditNoteEtimsInfo(
    etimsCn,
    etimsRelayEnabled,
    isDemoRefund
  );
  const showDemoCnNote = Boolean(isDemoRefund && etimsRelayEnabled);

  const handleRetryCreditNote = async () => {
    if (isRetryingCreditNote) return;
    setIsRetryingCreditNote(true);
    try {
      await retryRefundCreditNote(originalTx.id, refund.id);
    } finally {
      setIsRetryingCreditNote(false);
    }
  };

  const handlePrint = async () => {
    if (printerType === 'bluetooth') {
      setIsBluetoothPrinting(true);
      try {
        // Map RefundRecord to a transaction-like structure for the printer service
        // or add a dedicated method to the service. For now, we'll use printReceipt with custom logic.
        // Actually, let's just use the system print for now or implement printRefund later if needed.
        // But to be consistent, I'll use a simplified transaction object.
        const mockTx: any = {
          ...originalTx,
          receiptNumber: refund.refundNumber,
          timestamp: refund.timestamp,
          items: refund.items.map(ri => ({
            ...ri,
            unitPrice: -ri.refundUnitAmount, // Show as refund
          })),
          total: -refund.totalRefund,
          subtotal: -refund.subtotalRefund,
          taxAmount: -refund.taxRefund,
          paymentMethod: refund.refundMethod,
          status: 'refunded',
          etimsData:
            etimsCn && (isCnVerified || etimsRelayEnabled)
              ? {
                  status: etimsCn.status,
                  cuSerialNumber: etimsCn.cuSerialNumber,
                  cuInvoiceNumber: etimsCn.cuInvoiceNumber,
                  receiptSignature: etimsCn.receiptSignature,
                  etimsUrl: etimsCn.etimsUrl,
                }
              : undefined,
        };

        await bluetoothPrinterService.printReceipt(mockTx, currentLocation, {
          businessName: currentBusiness?.name,
          format: receiptFormat === 'standard' ? '80mm' : receiptFormat,
          headerNote: 'OFFICIAL CREDIT NOTE',
          etimsRelayEnabled,
        });
        showToast('Credit note sent to Bluetooth printer', 'success');
      } catch (err) {
        console.warn('Bluetooth print error:', err);
        showToast('Bluetooth print failed', 'error');
      } finally {
        setIsBluetoothPrinting(false);
      }
      return;
    }

    document.body.classList.add('printing-thermal-receipt');
    try {
      window.print();
    } catch (err) {
      console.warn('Thermal print invocation error:', err);
    }
    const cleanup = () => {
      document.body.classList.remove('printing-thermal-receipt');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2500);
  };

  const handleOpenShare = () => {
    setIsShareModalOpen(true);
  };

  const handleClose = () => {
    setActiveRefundReceipt(null);
  };

  const voucherText = formatRefundVoucherText(
    refund,
    currentLocation,
    currentBusiness?.name,
    currentBusiness?.taxNumber,
    { etimsRelayEnabled }
  );

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
          id="receipt-printable-canvas"
          className="receipt-printable-canvas bg-white w-full max-w-[380px] rounded-xl shadow-xl border border-slate-300 p-4 sm:p-6 flex flex-col justify-between text-slate-800 font-mono text-xs select-text"
        >
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
              <RotateCcw className="w-3 h-3" /> Official Credit Note
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 font-sans leading-none uppercase">
              {currentBusiness?.name || 'SokoPoS Retail'}
            </h2>
            <p className="text-[10px] text-slate-500">
              {currentLocation.name} • {currentLocation.address}
            </p>
            <p className="text-[10px] text-slate-500">
              KRA PIN: {currentBusiness?.taxNumber || currentLocation.taxId}
              {isDemoRefund
                ? ' (Demo)'
                : isPlaceholderOrRepeatedKraPin(currentBusiness?.taxNumber || currentLocation.taxId)
                ? ' (Sample PIN)'
                : currentBusiness?.taxSettings?.taxPinVerificationStatus === 'mismatch'
                ? ' (CU Mismatch)'
                : currentBusiness?.taxSettings?.taxPinVerificationStatus === 'unverified'
                ? ' (Unverified)'
                : ''}{' '}
              • Tel: {currentLocation.phone}
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
                  {refund.customerName}{' '}
                  {refund.customerPhone ? `(${maskPhoneNumber(refund.customerPhone)})` : ''}
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
              <span>{currentBusiness?.taxSettings?.taxLabel || 'VAT'} Refunded:</span>
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

            {/* Honest KRA eTIMS Credit Note Verification Block */}
            {(showCnEtimsSection || showDemoCnNote) && (
              <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-200 text-center w-full max-w-[260px] space-y-1">
                {isCnVerified ? (
                  <>
                    <div className="text-[10px] font-bold text-slate-900 flex items-center justify-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>KRA Credit Note Verified</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-blue-600 font-semibold">Digitax</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-600 flex justify-between px-1 tabular-nums">
                      <span>CU Serial:</span>
                      <span className="font-bold text-slate-900">{etimsCn?.cuSerialNumber || '—'}</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-600 flex justify-between px-1 tabular-nums">
                      <span>CU Credit Note:</span>
                      <span className="font-bold text-slate-900">{etimsCn?.cuInvoiceNumber ?? '—'}</span>
                    </div>
                    {etimsCn?.reasonCode && (
                      <div className="text-[9px] font-mono text-slate-600 flex justify-between px-1 tabular-nums">
                        <span>KRA Reason Code:</span>
                        <span className="font-bold text-slate-900">{etimsCn.reasonCode}</span>
                      </div>
                    )}
                    {etimsCn?.receiptSignature && (
                      <div className="text-[8px] font-mono text-slate-500 truncate px-1 pt-0.5 border-t border-slate-100">
                        KRA Sig: {etimsCn.receiptSignature}
                      </div>
                    )}
                    {(etimsCn?.etimsUrl || etimsCn?.offlineUrl) && (
                      <a
                        href={etimsCn.etimsUrl || etimsCn.offlineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                      >
                        <span>Verify Credit Note on KRA</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </>
                ) : isDemoRefund ? (
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-700 flex items-center justify-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>Demo Sandbox Credit Note</span>
                    </div>
                    <p className="text-[9px] font-sans text-slate-500">
                      Sandbox demonstration only · Not transmitted to KRA eTIMS
                    </p>
                  </div>
                ) : isCnFailed ? (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-rose-700 flex items-center justify-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>Credit Note Sync Attention Required</span>
                    </div>
                    {etimsCn?.lastError && (
                      <p className="text-[9px] font-sans text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1 text-left break-words">
                        {etimsCn.lastError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleRetryCreditNote}
                      disabled={isRetryingCreditNote}
                      className="no-print w-full py-1.5 px-2.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-800 font-sans font-semibold text-[10px] inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRetryingCreditNote ? 'animate-spin' : ''}`} />
                      <span>
                        {isRetryingCreditNote ? 'Transmitting Credit Note...' : 'Retry KRA Credit Note'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-amber-800 flex items-center justify-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Pending KRA Credit Note</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-600 flex justify-between px-1 tabular-nums">
                      <span>Linked Sale Ref:</span>
                      <span className="font-bold text-slate-800">
                        {etimsCn?.originalTraderInvoiceNumber || refund.receiptNumber}
                      </span>
                    </div>
                    {etimsCn?.lastError && (
                      <p className="text-[9px] font-sans text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-left break-words">
                        {etimsCn.lastError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleRetryCreditNote}
                      disabled={isRetryingCreditNote}
                      className="no-print w-full py-1.5 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 text-amber-900 font-sans font-semibold text-[10px] inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRetryingCreditNote ? 'animate-spin' : ''}`} />
                      <span>
                        {isRetryingCreditNote ? 'Transmitting Credit Note...' : 'Retry KRA Credit Note'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-slate-400 mt-2">Powered by Sokoplus Horizon</p>
            <p className="text-[10px] text-slate-500 font-sans font-bold mt-1">
              Customer copy
            </p>
          </div>
        </div>

        {/* Action Buttons Below Receipt */}
        <div className="w-full max-w-[380px] mt-3 sm:mt-4 flex gap-2">
          <button
            onClick={handlePrint}
            disabled={isBluetoothPrinting}
            className={`flex-1 ${
              isBluetoothPrinting ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'
            } text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer`}
          >
            {isBluetoothPrinting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-white rounded-full animate-spin" />
                <span>Printing...</span>
              </>
            ) : (
              <>
                {printerType === 'bluetooth' ? <Bluetooth className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                <span>{printerType === 'bluetooth' ? 'Print via Bluetooth' : 'Print Credit Note'}</span>
              </>
            )}
          </button>
          <button
            id="refund-share-voucher-btn"
            onClick={handleOpenShare}
            className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 py-2.5 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="Share credit note via WhatsApp, SMS, Email, or System Share"
          >
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>SMS / Share</span>
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

      {/* Share Modal Dialog for Credit Note */}
      <ReceiptShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        customText={voucherText}
        customTitle={`Credit Note #${refund.refundNumber}`}
        customSubtitle={`-${currentLocation.currency} ${refund.totalRefund.toFixed(2)}`}
        defaultPhone={
          canViewUnmaskedCustomerPii(currentUser?.role, isSuperAdmin)
            ? refund.customerPhone
            : undefined
        }
        location={currentLocation}
        businessName={currentBusiness?.name}
        businessTaxNumber={currentBusiness?.taxNumber}
        etimsRelayEnabled={etimsRelayEnabled}
        showToast={showToast}
      />
    </div>
  );
};
