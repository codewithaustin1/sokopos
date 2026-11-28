import React, { useRef, useEffect, useState } from 'react';
import {
  Printer,
  ArrowRight,
  Check,
  Share2,
  RotateCcw,
  AlertTriangle,
  Download,
  Star,
  ExternalLink,
  Bluetooth,
  Clock,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePos } from '../context/PosContext';
import { isDemoBusinessId } from '../lib/firestoreService';
import { getItemDiscountedUnitPrice, formatDiscountBadge } from '../utils/discountUtils';
import { ReceiptShareModal } from './ReceiptShareModal';
import { generateReceiptPdf } from '../utils/receiptPdfGenerator';
import { bluetoothPrinterService } from '../services/bluetoothPrinterService';
import {
  isEtimsRelayEnabled,
  isKraQrEnabled,
  isTransactionEtimsVerified,
  shouldShowSaleEtimsInfo,
} from '../utils/etimsDisplay';
import {
  maskPhoneNumber,
  maskKraPin,
  isPlaceholderOrRepeatedKraPin,
} from '../utils/privacyAndKraSecurity';

export const ReceiptModal: React.FC = () => {
  const {
    activeReceipt,
    setActiveReceipt,
    currentLocation,
    currentBusiness,
    currentUser,
    isDemoSession,
    showToast,
    openReturnsModal,
    retryTransactionEtims,
    autoPrintReceipt,
    toggleAutoPrintReceipt,
    receiptFormat,
    printerType,
    isSellingMode,
  } = usePos();
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const hasAutoPrintedRef = useRef<string | null>(null);
  const [isAutoPrinting, setIsAutoPrinting] = useState<boolean>(false);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isRetryingEtims, setIsRetryingEtims] = useState<boolean>(false);

  const isDemoReceipt = Boolean(
    isDemoSession ||
      currentUser?.isDemoSession ||
      (activeReceipt && isDemoBusinessId(activeReceipt.businessId))
  );
  const etimsRelayEnabled = isEtimsRelayEnabled(currentBusiness?.taxSettings);
  const kraQrEnabled = isKraQrEnabled(currentBusiness?.taxSettings);

  // Generate KRA eTIMS verification QR code ONLY from a genuinely verified Digitax/KRA URL
  useEffect(() => {
    if (!activeReceipt || isDemoReceipt) {
      setQrCodeDataUrl('');
      return;
    }

    const etims = activeReceipt.etimsData;
    const isVerified = isTransactionEtimsVerified(etims);
    const canShowQr = isVerified && (etimsRelayEnabled ? kraQrEnabled : true);
    const qrTargetUrl = canShowQr ? etims?.etimsUrl || etims?.offlineUrl || '' : '';

    if (!qrTargetUrl) {
      setQrCodeDataUrl('');
      return;
    }

    QRCode.toDataURL(qrTargetUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.warn('KRA QR Code generation error:', err));
  }, [activeReceipt, isDemoReceipt, etimsRelayEnabled, kraQrEnabled]);

  // Dedicated Thermal Receipt Print Handler:
  // Adds print-isolation CSS class, invokes native window.print() or dispatches to Bluetooth, and cleans up
  const handlePrintReceipt = async () => {
    if (!activeReceipt) return;

    if (printerType === 'bluetooth') {
      setIsBluetoothPrinting(true);
      try {
        await bluetoothPrinterService.printReceipt(activeReceipt, currentLocation, {
          businessName: currentBusiness?.name,
          format: receiptFormat === 'standard' ? '80mm' : receiptFormat,
          etimsRelayEnabled,
        });
        showToast('Receipt sent to Bluetooth printer', 'success');
      } catch (err) {
        console.warn('Bluetooth print error:', err);
        showToast('Bluetooth print failed. Ensure printer is paired.', 'error');
      } finally {
        setIsBluetoothPrinting(false);
      }
      return;
    }

    document.body.classList.add('printing-thermal-receipt');

    try {
      window.print();
    } catch (err) {
      console.warn('Thermal receipt print invocation error:', err);
    }

    const cleanup = () => {
      document.body.classList.remove('printing-thermal-receipt');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2500);
  };

  // Browser print lifecycle listener: Guarantees isolation even if user triggers Ctrl+P or browser print menu
  useEffect(() => {
    if (!activeReceipt) return;

    const onBeforePrint = () => {
      document.body.classList.add('printing-thermal-receipt');
    };
    const onAfterPrint = () => {
      document.body.classList.remove('printing-thermal-receipt');
    };

    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      document.body.classList.remove('printing-thermal-receipt');
    };
  }, [activeReceipt]);

  // Auto-Print on Checkout: Automatically invoke filtered print dialog once transaction completes
  useEffect(() => {
    if (activeReceipt && autoPrintReceipt) {
      if (hasAutoPrintedRef.current !== activeReceipt.id) {
        hasAutoPrintedRef.current = activeReceipt.id;
        setIsAutoPrinting(true);

        const timer = setTimeout(() => {
          try {
            handlePrintReceipt();
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

  // Keyboard shortcut listener for receipt modal: Ctrl+P / Cmd+P to print, Esc or Enter to dismiss/next sale
  useEffect(() => {
    if (!activeReceipt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrintReceipt();
        return;
      }
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        setActiveReceipt(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReceipt, setActiveReceipt]);

  if (!activeReceipt) return null;

  const handleDownloadPdf = () => {
    if (!activeReceipt) return;
    const { fileName, url } = generateReceiptPdf({
      transaction: activeReceipt,
      location: currentLocation,
      businessName: currentBusiness?.name,
      businessTaxNumber: currentBusiness?.taxNumber,
      etimsRelayEnabled,
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

  const handleRetryEtims = async () => {
    if (!activeReceipt || isRetryingEtims) return;
    setIsRetryingEtims(true);
    try {
      await retryTransactionEtims(activeReceipt.id);
    } finally {
      setIsRetryingEtims(false);
    }
  };

  const isFullyRefunded = activeReceipt.status === 'refunded';
  const isPartiallyRefunded = activeReceipt.status === 'partially_refunded';
  const hasRefunds = (activeReceipt.refunds && activeReceipt.refunds.length > 0) || (activeReceipt.totalRefunded && activeReceipt.totalRefunded > 0);
  const etims = activeReceipt.etimsData;
  const isEtimsVerified = Boolean(!isDemoReceipt && isTransactionEtimsVerified(etims));
  const isEtimsFailed = Boolean(!isDemoReceipt && etims?.status === 'FAILED');
  const showEtimsSection = shouldShowSaleEtimsInfo(etims, etimsRelayEnabled, isDemoReceipt);
  const showDemoEtimsNote = Boolean(isDemoReceipt && etimsRelayEnabled);
  const showDigitaxFooter = isEtimsVerified || etimsRelayEnabled;

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
    >
      <div className={`bg-slate-100 border border-slate-200 p-3 sm:p-4 rounded-2xl shadow-lg flex flex-col items-center max-h-[96vh] sm:max-h-[95vh] overflow-y-auto w-full ${receiptFormat === 'standard' ? 'max-w-[460px]' : receiptFormat === '58mm' ? 'max-w-[320px]' : 'max-w-[400px]'}`}>
        
        {/* Quick Auto-Print Preference Toggle Banner */}
        <div className="no-print w-full mb-3 px-3 py-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                autoPrintReceipt
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Printer className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  Auto-Print on Checkout
                </span>
                <span className={`text-[11px] font-medium ${autoPrintReceipt ? 'text-emerald-700' : 'text-slate-400'}`}>
                  · {autoPrintReceipt ? 'Enabled' : 'Manual'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                {isAutoPrinting ? (
                  <span className="text-blue-700 font-medium inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin inline-block" />
                    <span>
                      {printerType === 'bluetooth' ? 'Dispatching Bluetooth print...' : 'Opening print dialog...'}
                    </span>
                  </span>
                ) : autoPrintReceipt ? (
                  printerType === 'bluetooth' ? 'Direct Bluetooth thermal auto-print ready' : 'Browser print dialog triggers automatically'
                ) : (
                  'Print manually using controls below'
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
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                autoPrintReceipt ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Printable Thermal Receipt Canvas */}
        <div
          ref={receiptRef}
          id="receipt-printable-canvas"
          className={`receipt-printable-canvas receipt-format-${receiptFormat || 'standard'} bg-white w-full ${receiptMaxWidthClass} rounded-xl border border-slate-200 p-4 sm:p-6 flex flex-col justify-between text-slate-800 font-mono text-xs select-text`}
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
            {activeReceipt.isReprint && (
              <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
                <Printer className="w-3 h-3 text-blue-700" /> Duplicate Receipt • Manager Reprint
              </div>
            )}
            {currentBusiness?.brandingSettings?.logoBase64 && (
              <div className="flex justify-center pb-1.5">
                <img
                  src={currentBusiness.brandingSettings.logoBase64}
                  alt={`${currentBusiness?.name || 'Business'} Logo`}
                  className="h-9 max-w-[160px] object-contain"
                />
              </div>
            )}
            <h2 className="text-lg font-black tracking-tight text-slate-900 font-sans leading-none uppercase">
              {currentBusiness?.name || 'SokoPoS Retail'}
            </h2>
            <p className="text-[10px] text-slate-500">
              {currentLocation.name} • {currentLocation.address}
            </p>
            <p className="text-[10px] text-slate-500">
              KRA PIN: {currentBusiness?.taxNumber || currentLocation.taxId}
              {isDemoReceipt
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
            {currentBusiness?.hardwareSettings?.printerHeaderNote && (
              <p className="text-[10px] font-bold text-slate-700 pt-0.5">
                {currentBusiness.hardwareSettings.printerHeaderNote}
              </p>
            )}
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
                {activeReceipt.paymentMethod === 'split'
                  ? 'SPLIT TENDER'
                  : activeReceipt.paymentMethod === 'loyalty_points'
                  ? 'LOYALTY POINTS'
                  : activeReceipt.paymentMethod === 'store_credit'
                  ? 'STORE CREDIT'
                  : activeReceipt.paymentMethod}
                {activeReceipt.paymentDetails.mpesaCode && ` (${activeReceipt.paymentDetails.mpesaCode})`}
                {activeReceipt.paymentDetails.cardLast4 && ` (*${activeReceipt.paymentDetails.cardLast4})`}
              </span>
            </div>

            {/* Customer Account Details & Loyalty Balance if assigned */}
            {activeReceipt.customerName && (
              <div className="pt-2 mt-1.5 border-t border-slate-200/80 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{activeReceipt.customerName}</span>
                </div>
                {activeReceipt.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-mono text-slate-700">
                      {maskPhoneNumber(activeReceipt.customerPhone)}
                    </span>
                  </div>
                )}
                {activeReceipt.etimsData?.customerTin && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Buyer PIN:</span>
                    <span className="font-mono text-slate-700">
                      {maskKraPin(activeReceipt.etimsData.customerTin)}
                    </span>
                  </div>
                )}

                {/* Loyalty Rewards Ledger for Existing Customer */}
                {(activeReceipt.customerPreviousPoints !== undefined ||
                  activeReceipt.customerCurrentPoints !== undefined ||
                  (activeReceipt.loyaltyPointsEarned !== undefined && activeReceipt.loyaltyPointsEarned > 0) ||
                  (activeReceipt.loyaltyPointsRedeemed !== undefined && activeReceipt.loyaltyPointsRedeemed > 0)) && (
                  <div className="mt-1.5 pt-2 border-t border-dashed border-amber-300/80 space-y-1 text-left">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between pb-1">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-600 shrink-0" />
                        Loyalty Points Balance
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-700">
                      <span>Previous Points Balance:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {activeReceipt.customerPreviousPoints ?? 0} pts
                      </span>
                    </div>

                    {activeReceipt.loyaltyPointsEarned !== undefined && activeReceipt.loyaltyPointsEarned > 0 && (
                      <div className="flex justify-between text-[11px] text-emerald-800 font-semibold">
                        <span>+ Points Earned This Sale:</span>
                        <span className="font-mono font-bold">
                          +{activeReceipt.loyaltyPointsEarned} pts
                        </span>
                      </div>
                    )}

                    {activeReceipt.loyaltyPointsRedeemed !== undefined && activeReceipt.loyaltyPointsRedeemed > 0 && (
                      <div className="flex justify-between text-[11px] text-rose-700 font-semibold">
                        <span>- Points Redeemed:</span>
                        <span className="font-mono font-bold">
                          -{activeReceipt.loyaltyPointsRedeemed} pts
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-[11px] text-amber-950 font-black pt-1 border-t border-amber-200/80">
                      <span>Current Points Balance:</span>
                      <span className="font-mono text-xs font-black text-amber-900">
                        {activeReceipt.customerCurrentPoints !== undefined
                          ? activeReceipt.customerCurrentPoints
                          : ((activeReceipt.customerPreviousPoints ?? 0) + (activeReceipt.loyaltyPointsEarned || 0) - (activeReceipt.loyaltyPointsRedeemed || 0))} pts
                      </span>
                    </div>
                  </div>
                )}

                {activeReceipt.paymentMethod === 'store_credit' && activeReceipt.newStoreCreditBalance !== undefined && (
                  <div className="flex justify-between text-indigo-800 font-bold pt-0.5">
                    <span>Store Credit Tab Balance:</span>
                    <span className="font-mono">{currentLocation.currency} {activeReceipt.newStoreCreditBalance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

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
              <span>{activeReceipt.taxLabel || currentBusiness?.taxSettings?.taxLabel || 'VAT'} ({activeReceipt.pricingType === 'exclusive' ? 'Exclusive' : 'Inclusive'}):</span>
              <span className="font-semibold font-mono">
                {currentLocation.currency} {activeReceipt.taxAmount.toFixed(2)}
              </span>
            </div>
            {activeReceipt.taxBreakdown && activeReceipt.taxBreakdown.length > 0 && (
              <div className="py-2 border-t border-b border-dashed border-slate-200 text-left space-y-1 my-1">
                <div className="text-[10px] font-semibold text-slate-600">
                  Fiscal Tax Breakdown:
                </div>
                {activeReceipt.taxBreakdown.map((tb) => (
                  <div key={`${tb.code}-${tb.rate}`} className="flex justify-between text-[10px] text-slate-600">
                    <span>
                      <strong className="font-mono text-slate-800">[{tb.code}]</strong> {tb.name} ({tb.ratePercent}%):
                    </span>
                    <span className="font-mono">
                      {currentLocation.currency} {tb.taxAmount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
              <span>
                TOTAL PAID (
                {activeReceipt.paymentMethod === 'loyalty_points'
                  ? 'LOYALTY POINTS'
                  : activeReceipt.paymentMethod === 'store_credit'
                  ? 'STORE CREDIT'
                  : activeReceipt.paymentMethod.toUpperCase()}
                ):
              </span>
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

            {activeReceipt.paymentMethod === 'split' && (
              <div className="pt-2 text-[10px] text-slate-600 space-y-1 border-t border-dashed border-slate-200 mt-1">
                <div className="font-semibold text-slate-800 text-[10px] pb-1 flex justify-between items-center">
                  <span>Split Tender Breakdown</span>
                  <span className="text-emerald-700 font-mono font-bold">
                    {activeReceipt.paymentDetails.splitBreakdown?.length || 2} Methods
                  </span>
                </div>
                {activeReceipt.paymentDetails.splitBreakdown && activeReceipt.paymentDetails.splitBreakdown.length > 0 ? (
                  activeReceipt.paymentDetails.splitBreakdown.map((b, idx) => (
                    <div key={b.id || idx} className="flex justify-between items-center py-0.5">
                      <span className="font-medium text-slate-700 capitalize flex items-center gap-1">
                        <span>
                          {b.method === 'mpesa'
                            ? 'M-Pesa'
                            : b.method === 'store_credit'
                            ? 'Store Credit'
                            : b.method === 'loyalty_points'
                            ? 'Loyalty Points'
                            : b.method}
                        </span>
                        {b.mpesaCode && <span className="text-[9px] font-mono text-emerald-700">({b.mpesaCode})</span>}
                        {b.cardLast4 && <span className="text-[9px] font-mono text-purple-700">(*{b.cardLast4})</span>}
                        {b.loyaltyPointsRedeemed && (
                          <span className="text-[9px] font-mono text-pink-700">(-{b.loyaltyPointsRedeemed} pts)</span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {currentLocation.currency} {b.amount.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    {activeReceipt.paymentDetails.cashTendered !== undefined && (
                      <div className="flex justify-between">
                        <span>Cash Tender:</span>
                        <span className="font-mono font-bold">
                          {currentLocation.currency} {activeReceipt.paymentDetails.cashTendered.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Electronic / Other:</span>
                      <span className="font-mono font-bold">
                        {currentLocation.currency}{' '}
                        {(activeReceipt.total - (activeReceipt.paymentDetails.cashTendered || 0)).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                {(activeReceipt.paymentDetails.cashChange ?? 0) > 0 && (
                  <div className="flex justify-between text-blue-700 font-bold pt-1 border-t border-slate-200">
                    <span>Cash Change Returned:</span>
                    <span className="font-mono">
                      {currentLocation.currency} {(activeReceipt.paymentDetails.cashChange ?? 0).toFixed(2)}
                    </span>
                  </div>
                )}
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
            <div className="receipt-barcode-box w-56 h-9 bg-slate-900 rounded-sm flex items-center justify-center text-white text-[9px] tracking-widest font-mono select-none">
              ||||| | |||||| ||| ||||| ||||| ||||
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              *{activeReceipt.receiptNumber}*
            </span>

            {/* Scannable KRA eTIMS Dynamic QR Code (Only rendered when genuinely KRA-verified) */}
            {qrCodeDataUrl ? (
              <div className="mt-2.5 p-2 bg-white border border-slate-200 rounded-lg flex flex-col items-center">
                <img
                  src={qrCodeDataUrl}
                  alt="KRA eTIMS Verification QR Code"
                  className="w-24 h-24 object-contain"
                />
                <span className="text-[9px] font-mono text-slate-600 mt-1 font-semibold">
                  Scan to verify with KRA
                </span>
              </div>
            ) : null}

            {/* Honest Fiscal eTIMS & Digitax Status Block */}
            {(showEtimsSection || showDemoEtimsNote) && (
              <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-200 text-center w-full max-w-[260px] space-y-1">
                {isEtimsVerified ? (
                  <>
                    <div className="text-[10px] font-bold text-slate-900 flex items-center justify-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>KRA eTIMS Verified</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-blue-600 font-semibold">Digitax</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-600 flex justify-between px-1 tabular-nums">
                      <span>CU Serial:</span>
                      <span className="font-bold text-slate-900">{etims?.cuSerialNumber || '—'}</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-600 flex justify-between px-1 tabular-nums">
                      <span>CU Invoice:</span>
                      <span className="font-bold text-slate-900">{etims?.cuInvoiceNumber ?? '—'}</span>
                    </div>
                    {etims?.receiptNumber && (
                      <div className="text-[9px] font-mono text-slate-600 flex justify-between px-1 tabular-nums">
                        <span>Fiscal Receipt:</span>
                        <span className="font-bold text-slate-900">{etims.receiptNumber}</span>
                      </div>
                    )}
                    {etims?.receiptSignature && (
                      <div className="text-[8px] font-mono text-slate-500 truncate px-1 pt-0.5 border-t border-slate-100">
                        KRA Sig: {etims.receiptSignature}
                      </div>
                    )}
                  </>
                ) : isDemoReceipt ? (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-700 flex items-center justify-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>Demo Sandbox Receipt</span>
                    </div>
                    <p className="text-[9px] font-sans text-slate-500 leading-snug">
                      Sandbox demonstration only · Not transmitted to KRA eTIMS
                    </p>
                  </div>
                ) : isEtimsFailed ? (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-rose-700 flex items-center justify-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>Fiscal Sync Attention Required</span>
                    </div>
                    {etims?.traderInvoiceNumber && (
                      <div className="text-[9px] font-mono text-slate-600 flex justify-between px-1 tabular-nums">
                        <span>Invoice Ref:</span>
                        <span className="font-bold text-slate-800">{etims.traderInvoiceNumber}</span>
                      </div>
                    )}
                    {etims?.lastError && (
                      <p className="text-[9px] font-sans text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1 text-left break-words">
                        {etims.lastError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleRetryEtims}
                      disabled={isRetryingEtims}
                      className="no-print w-full py-1.5 px-2.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-800 font-sans font-semibold text-[10px] inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRetryingEtims ? 'animate-spin' : ''}`} />
                      <span>{isRetryingEtims ? 'Retrying KRA Signing...' : 'Retry KRA Signing'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-amber-800 flex items-center justify-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Pending KRA Fiscalization</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-600 flex justify-between px-1 tabular-nums">
                      <span>Trader Inv:</span>
                      <span className="font-bold text-slate-800">
                        {etims?.traderInvoiceNumber || activeReceipt.receiptNumber}
                      </span>
                    </div>
                    {etims?.lastError && (
                      <p className="text-[9px] font-sans text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-left break-words">
                        {etims.lastError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleRetryEtims}
                      disabled={isRetryingEtims}
                      className="no-print w-full py-1.5 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 text-amber-900 font-sans font-semibold text-[10px] inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRetryingEtims ? 'animate-spin' : ''}`} />
                      <span>{isRetryingEtims ? 'Transmitting to KRA...' : 'Retry KRA Signing'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Direct External Link to KRA / Digitax portal verification */}
            {isEtimsVerified && (etims?.etimsUrl || etims?.offlineUrl) && (
              <a
                href={etims.etimsUrl || etims.offlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
              >
                <span>Verify on KRA eTIMS Portal</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}

            {currentBusiness?.hardwareSettings?.printerFooterNote && (
              <p className="text-[10px] font-bold text-slate-800 pt-1">
                {currentBusiness.hardwareSettings.printerFooterNote}
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-2">
              {showDigitaxFooter
                ? 'Powered by SokoPoS in partnership with Digitax'
                : 'Powered by SokoPoS'}
            </p>
            <p className="text-[10px] text-slate-600 font-sans font-bold">
              Asante kwa kununua na sisi!
            </p>
          </div>
        </div>

        {/* Action Buttons Below Receipt (Clear 1 Primary + Neutral Secondary Hierarchy) */}
        <div className="no-print w-full max-w-[360px] mt-3 space-y-2">
          {/* Primary Action: Dedicated 'Print Receipt' Button */}
          <button
            id="print-receipt-btn"
            type="button"
            onClick={handlePrintReceipt}
            disabled={isBluetoothPrinting}
            className={`w-full min-h-[44px] py-3 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer group ${
              isBluetoothPrinting ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            } text-white`}
            title={printerType === 'bluetooth' ? 'Print via Bluetooth thermal printer' : 'Print thermal receipt (System dialog)'}
          >
            {isBluetoothPrinting ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-200 border-t-white rounded-full animate-spin" />
                <span>Printing via Bluetooth...</span>
              </>
            ) : (
              <>
                {printerType === 'bluetooth' ? <Bluetooth className="w-4 h-4" /> : <Printer className="w-4 h-4 text-blue-100" />}
                <span>{printerType === 'bluetooth' ? 'Print via Bluetooth' : 'Print Receipt'}</span>
              </>
            )}
          </button>

          {!isSellingMode && !isFullyRefunded && (
            <button
              onClick={handleInitiateReturn}
              className="w-full min-h-[40px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>{isPartiallyRefunded ? 'Return Additional Items' : 'Process Return / Refund'}</span>
            </button>
          )}

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              onClick={handleDownloadPdf}
              className="min-h-[44px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
              title="Download official 80mm PDF receipt"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>PDF</span>
            </button>
            <button
              id="receipt-sms-share-btn"
              onClick={handleOpenShare}
              className="min-h-[44px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
              title="Share receipt via Instagram, WhatsApp, SMS, Email, or PDF"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Share</span>
            </button>
            <button
              onClick={handleClose}
              className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
              title="Start Next Sale"
            >
              <span>Next Sale</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
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
        etimsRelayEnabled={etimsRelayEnabled}
        showToast={showToast}
      />
    </div>
  );
};
