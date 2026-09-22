import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Smartphone,
  Banknote,
  CreditCard,
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Zap,
  Printer,
  QrCode,
  Maximize2,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { PaymentMethod } from '../types';
import { usePos } from '../context/PosContext';
import { CustomerFacingMpesaQrModal } from './CustomerFacingMpesaQrModal';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMethod?: PaymentMethod;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, initialMethod }) => {
  const {
    cart,
    cartSubtotal,
    cartTax,
    cartTotal,
    currentLocation,
    processPayment,
    products,
    autoPrintReceipt,
    setAutoPrintReceipt,
  } = usePos();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(initialMethod || 'mpesa');

  // Synchronize initialMethod when modal is opened
  useEffect(() => {
    if (isOpen) {
      if (initialMethod) {
        setSelectedMethod(initialMethod);
      }
      setCashTendered(Math.ceil(cartTotal).toString());
    }
  }, [isOpen, initialMethod, cartTotal]);

  // Check for items with 0 stock
  const zeroStockItems = cart.filter((ci) => {
    const p = products.find((prod) => prod.id === ci.productId);
    const stock = p ? (p.stockByLocation[currentLocation.id] ?? 0) : 0;
    return stock <= 0;
  });
  const hasZeroStock = zeroStockItems.length > 0;

  // M-Pesa state
  const [mpesaSubMode, setMpesaSubMode] = useState<'qr' | 'stk'>('qr');
  const [isCustomerQrModalOpen, setIsCustomerQrModalOpen] = useState(false);
  const [mpesaQrType, setMpesaQrType] = useState<'buy_goods' | 'paybill'>(
    currentLocation.mpesaType || 'buy_goods'
  );
  const [tillNumber, setTillNumber] = useState(currentLocation.mpesaTill || '882910');
  const [paybillNumber, setPaybillNumber] = useState(currentLocation.mpesaPaybill || '522522');
  const [accountNumber, setAccountNumber] = useState(
    currentLocation.mpesaAccount || `${currentLocation.code || 'SOKO'}-CART`
  );
  const [inlineQrUrl, setInlineQrUrl] = useState('');
  const [isGeneratingInlineQr, setIsGeneratingInlineQr] = useState(false);
  const [isCopiedQrPayload, setIsCopiedQrPayload] = useState(false);

  // STK state
  const [mpesaPhone, setMpesaPhone] = useState('712 345 678');
  const [isSendingMpesaPrompt, setIsSendingMpesaPrompt] = useState(false);
  const [mpesaPromptSent, setMpesaPromptSent] = useState(false);

  // Generate dynamic M-Pesa QR data URL
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'mpesa') return;

    const formattedAmount = Number(cartTotal).toFixed(2);
    const merchantName = (currentLocation.name || 'SOKOPOS RETAIL').replace(/[|]/g, ' ').trim();
    let payload = '';

    if (mpesaQrType === 'buy_goods') {
      // Safaricom M-Pesa format for Buy Goods Till
      payload = `BG|${tillNumber.trim()}|${formattedAmount}|${merchantName}`;
    } else {
      // Safaricom M-Pesa format for Paybill
      payload = `PB|${paybillNumber.trim()}|${accountNumber.trim()}|${formattedAmount}|${merchantName}`;
    }

    setIsGeneratingInlineQr(true);
    QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#033b1e',
        light: '#ffffff',
      },
    })
      .then((url) => {
        setInlineQrUrl(url);
        setIsGeneratingInlineQr(false);
      })
      .catch((err) => {
        console.error('Failed to generate inline M-Pesa QR code:', err);
        setIsGeneratingInlineQr(false);
      });
  }, [
    isOpen,
    selectedMethod,
    mpesaQrType,
    tillNumber,
    paybillNumber,
    accountNumber,
    cartTotal,
    currentLocation.name,
  ]);

  // Cash state
  const [cashTendered, setCashTendered] = useState<string>(Math.ceil(cartTotal).toString());

  // Card state
  const [cardLast4, setCardLast4] = useState('4192');
  const [cardNetwork, setCardNetwork] = useState('Visa');

  const [isProcessing, setIsProcessing] = useState(false);

  const tenderedAmount = parseFloat(cashTendered) || 0;
  const cashChange = Math.max(0, tenderedAmount - cartTotal);

  // Quick cash amounts suggestions
  const roundedUp100 = Math.ceil(cartTotal / 100) * 100;
  const roundedUp500 = Math.ceil(cartTotal / 500) * 500;
  const roundedUp1000 = Math.ceil(cartTotal / 1000) * 1000;
  const quickCashOptions = Array.from(
    new Set([Math.ceil(cartTotal), roundedUp100, roundedUp500, roundedUp1000].filter((v) => v >= cartTotal))
  );

  const handleMpesaStkPush = async () => {
    setIsSendingMpesaPrompt(true);
    // Simulate STK Push prompt to phone
    await new Promise((res) => setTimeout(res, 1200));
    setIsSendingMpesaPrompt(false);
    setMpesaPromptSent(true);
  };

  const handleCompletePayment = useCallback(async () => {
    if (isProcessing) return;
    if (hasZeroStock) return;
    if (selectedMethod === 'cash' && tenderedAmount < cartTotal) return;

    setIsProcessing(true);

    await new Promise((res) => setTimeout(res, 400));

    let details = {};

    if (selectedMethod === 'mpesa') {
      const generatedCode = `QX${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(
        65 + Math.floor(Math.random() * 26)
      )}${Math.floor(10 + Math.random() * 90)}`;
      details = {
        mpesaPhone: mpesaSubMode === 'stk' ? `+254 ${mpesaPhone}` : 'Customer QR Scan',
        mpesaCode: generatedCode,
        mpesaMode: mpesaSubMode,
        mpesaType: mpesaQrType,
        mpesaTarget: mpesaQrType === 'buy_goods' ? `Till ${tillNumber}` : `Paybill ${paybillNumber} / Acc ${accountNumber}`,
      };
    } else if (selectedMethod === 'cash') {
      details = {
        cashTendered: tenderedAmount,
        cashChange: Number(cashChange.toFixed(2)),
      };
    } else if (selectedMethod === 'card') {
      details = {
        cardLast4,
        cardNetwork,
      };
    }

    processPayment(selectedMethod, details);

    // Fire subtle celebratory confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    setIsProcessing(false);
    onClose();
  }, [
    isProcessing,
    hasZeroStock,
    selectedMethod,
    tenderedAmount,
    cartTotal,
    mpesaPhone,
    cashChange,
    cardLast4,
    cardNetwork,
    processPayment,
    onClose,
  ]);

  // Modal keyboard shortcuts: Esc to close, F1 Cash, F2 M-Pesa, F3 Card, Enter to Complete
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'F1') {
        e.preventDefault();
        setSelectedMethod('cash');
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setSelectedMethod('mpesa');
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        setSelectedMethod('card');
        return;
      }
      if (e.key === 'Enter') {
        const canComplete =
          !isProcessing &&
          !hasZeroStock &&
          !(selectedMethod === 'cash' && tenderedAmount < cartTotal);
        if (canComplete) {
          e.preventDefault();
          handleCompletePayment();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isProcessing, hasZeroStock, selectedMethod, tenderedAmount, cartTotal, handleCompletePayment]);

  if (!isOpen) return null;

  return (
    <div id="payment-checkout-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={onClose}
              className="bg-slate-100 p-2 rounded-lg text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              title="Return to Cart"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Checkout & Payment</h2>
              <p className="text-[10px] text-slate-400">Terminal: {currentLocation.terminalName}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Total Amount
            </span>
            <span className="text-base sm:text-lg font-black text-blue-600">
              {currentLocation.currency} {cartTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row p-3.5 sm:p-6 gap-3.5 sm:gap-6 overflow-y-auto">
          {/* Payment Method Selector & Inputs (60%) */}
          <div className="flex-1 md:w-[60%] flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Payment Method
            </h3>

            {/* Method Tabs */}
            <div className="grid grid-cols-3 gap-3">
              {/* M-PESA (F2) */}
              <button
                type="button"
                onClick={() => setSelectedMethod('mpesa')}
                title="Select M-Pesa (Shortcut: F2)"
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition text-left cursor-pointer relative ${
                  selectedMethod === 'mpesa'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {selectedMethod === 'mpesa' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                  <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-500 font-bold">
                    F2
                  </kbd>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-xs">
                  M
                </div>
                <span className="font-bold text-xs">M-PESA</span>
                <span className="text-[9px] text-emerald-700 font-bold flex items-center gap-0.5">
                  <QrCode className="w-2.5 h-2.5" /> Dynamic QR
                </span>
              </button>

              {/* Cash (F1) */}
              <button
                type="button"
                onClick={() => setSelectedMethod('cash')}
                title="Select Cash (Shortcut: F1)"
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition text-left cursor-pointer relative ${
                  selectedMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50/60 text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {selectedMethod === 'cash' && (
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                  <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-500 font-bold">
                    F1
                  </kbd>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-xs">
                  <Banknote className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-bold text-xs">Cash</span>
                <span className="text-[9px] text-slate-400">Drawer Tender</span>
              </button>

              {/* Card (F3) */}
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                title="Select Card (Shortcut: F3)"
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition text-left cursor-pointer relative ${
                  selectedMethod === 'card'
                    ? 'border-purple-500 bg-purple-50/60 text-purple-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {selectedMethod === 'card' && (
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                  )}
                  <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-500 font-bold">
                    F3
                  </kbd>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-xs">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-bold text-xs">Card</span>
                <span className="text-[9px] text-slate-400">Visa / MC</span>
              </button>
            </div>

            {/* Sub-panels according to selected method */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex-1 flex flex-col justify-between">
              {/* M-PESA Panel */}
              {selectedMethod === 'mpesa' && (
                <div className="space-y-3.5">
                  {/* Sub-mode Switcher & Customer Display Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex bg-slate-200/80 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setMpesaSubMode('qr')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          mpesaSubMode === 'qr'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Dynamic QR Scan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMpesaSubMode('stk')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          mpesaSubMode === 'stk'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>STK Express Push</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCustomerQrModalOpen(true)}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Open dedicated customer-facing display"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Customer Screen</span>
                    </button>
                  </div>

                  {/* SUB-VIEW 1: DYNAMIC QR CODE */}
                  {mpesaSubMode === 'qr' ? (
                    <div className="space-y-3">
                      {/* Buy Goods vs Paybill Switcher & Credentials */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white p-2 rounded-xl border border-slate-200">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setMpesaQrType('buy_goods')}
                            className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition cursor-pointer ${
                              mpesaQrType === 'buy_goods'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Buy Goods (Till)
                          </button>
                          <button
                            type="button"
                            onClick={() => setMpesaQrType('paybill')}
                            className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition cursor-pointer ${
                              mpesaQrType === 'paybill'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Paybill
                          </button>
                        </div>

                        {/* Credentials inputs */}
                        <div className="flex items-center gap-2">
                          {mpesaQrType === 'buy_goods' ? (
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-slate-400 font-bold uppercase">Till:</span>
                              <input
                                type="text"
                                value={tillNumber}
                                onChange={(e) => setTillNumber(e.target.value)}
                                className="w-20 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 font-mono font-bold text-slate-800 text-xs focus:outline-hidden focus:border-emerald-500"
                                placeholder="882910"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-slate-400 font-bold uppercase">PB:</span>
                              <input
                                type="text"
                                value={paybillNumber}
                                onChange={(e) => setPaybillNumber(e.target.value)}
                                className="w-16 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 font-mono font-bold text-slate-800 text-xs focus:outline-hidden"
                                placeholder="522522"
                              />
                              <span className="text-slate-400 font-bold uppercase">Acc:</span>
                              <input
                                type="text"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                className="w-20 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 font-mono font-bold text-slate-800 text-xs focus:outline-hidden"
                                placeholder="ACC"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* QR Display Card */}
                      <div className="bg-white border-2 border-emerald-500/80 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center gap-4">
                        {/* Dynamic QR Code Canvas */}
                        <div className="relative shrink-0 w-36 h-36 bg-emerald-50/40 rounded-xl border border-emerald-200 flex items-center justify-center p-1 overflow-hidden">
                          {isGeneratingInlineQr || !inlineQrUrl ? (
                            <div className="flex flex-col items-center gap-1 text-emerald-700">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <span className="text-[10px] font-bold">Creating QR...</span>
                            </div>
                          ) : (
                            <img
                              src={inlineQrUrl}
                              alt="M-Pesa QR Code"
                              className="w-full h-full object-contain rounded-lg"
                            />
                          )}
                        </div>

                        {/* QR Details and Scan Prompt */}
                        <div className="flex-1 text-left space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                              Amount Pre-Filled
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-500">
                              {mpesaQrType === 'buy_goods' ? `Till: ${tillNumber}` : `PB: ${paybillNumber}`}
                            </span>
                          </div>

                          <div className="text-xl font-black text-emerald-700 tracking-tight">
                            {currentLocation.currency} {cartTotal.toFixed(2)}
                          </div>

                          <p className="text-[11px] text-slate-600 leading-snug">
                            Customer points phone camera or M-Pesa App at QR. Amount and Till will automatically populate.
                          </p>

                          <div className="pt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsCustomerQrModalOpen(true)}
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                            >
                              <Maximize2 className="w-3 h-3" />
                              <span>Expand Full Screen for Customer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const payload = mpesaQrType === 'buy_goods'
                                  ? `BG|${tillNumber.trim()}|${cartTotal.toFixed(2)}|${currentLocation.name}`
                                  : `PB|${paybillNumber.trim()}|${accountNumber.trim()}|${cartTotal.toFixed(2)}|${currentLocation.name}`;
                                navigator.clipboard.writeText(payload);
                                setIsCopiedQrPayload(true);
                                setTimeout(() => setIsCopiedQrPayload(false), 2000);
                              }}
                              className="text-[11px] font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                              title="Copy raw QR payload text"
                            >
                              {isCopiedQrPayload ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-slate-500" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* SUB-VIEW 2: STK PUSH */
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-bold text-xs text-slate-800">
                            M-Pesa Express / STK Push
                          </h4>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                          Till: {tillNumber}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Customer Mobile Number
                        </label>
                        <div className="flex gap-2">
                          <span className="bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center">
                            +254
                          </span>
                          <input
                            type="text"
                            value={mpesaPhone}
                            onChange={(e) => {
                              setMpesaPhone(e.target.value);
                              setMpesaPromptSent(false);
                            }}
                            placeholder="712 345 678"
                            className="flex-1 bg-white border border-slate-300 font-bold text-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-hidden focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {!mpesaPromptSent ? (
                        <button
                          type="button"
                          onClick={handleMpesaStkPush}
                          disabled={isSendingMpesaPrompt}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSendingMpesaPrompt ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Pinging Safaricom Gateway...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              <span>
                                Trigger STK Push Prompt ({currentLocation.currency} {cartTotal.toFixed(2)})
                              </span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-lg flex items-center gap-2.5 text-xs text-emerald-900 animate-in fade-in">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold">STK Prompt Dispatched to +254 {mpesaPhone}</div>
                            <div className="text-[11px] text-emerald-700">
                              Customer PIN requested. Ready to finalize transaction.
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-[11px] text-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          The customer will enter their 4-digit secret M-Pesa PIN on their phone.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cash Panel */}
              {selectedMethod === 'cash' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-slate-800">Cash Received at Register</h4>
                    <span className="text-[10px] text-slate-400">Open Drawer on Complete</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Amount Tendered ({currentLocation.currency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full bg-white border border-slate-300 font-mono font-black text-slate-800 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Quick Cash Presets
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {quickCashOptions.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashTendered(amt.toString())}
                          className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs transition border ${
                            tenderedAmount === amt
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {currentLocation.currency} {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change Output */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-900">Change Due Customer:</span>
                    <span className="text-base font-mono font-black text-blue-700">
                      {currentLocation.currency} {cashChange.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Card Panel */}
              {selectedMethod === 'card' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-slate-800">Payment Card Terminal (POS)</h4>
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                      Contactless / EMV
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Card Network
                      </label>
                      <select
                        value={cardNetwork}
                        onChange={(e) => setCardNetwork(e.target.value)}
                        className="w-full bg-white border border-slate-300 font-semibold text-slate-800 rounded-lg px-3 py-2 text-xs"
                      >
                        <option value="Visa">Visa</option>
                        <option value="Mastercard">Mastercard</option>
                        <option value="Amex">American Express</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Card Last 4 Digits
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value)}
                        className="w-full bg-white border border-slate-300 font-mono font-bold text-slate-800 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2 text-xs text-purple-800">
                    <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Card terminal authorization pre-cleared via secure bank gateway.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Breakdown (40%) */}
          <div className="md:w-[40%] bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2.5 text-xs uppercase tracking-wider">
                Order Summary
              </h3>

              <div className="py-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Items count</span>
                  <span className="font-semibold text-slate-800">
                    {cart.reduce((a, b) => a + b.quantity, 0)} items ({cart.length} distinct)
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal (Net)</span>
                  <span className="font-semibold text-slate-800">
                    {currentLocation.currency} {cartSubtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>VAT / Tax (16%)</span>
                  <span className="font-semibold text-slate-800">
                    {currentLocation.currency} {cartTax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Discounts</span>
                  <span className="font-semibold text-emerald-600">
                    {currentLocation.currency} 0.00
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-800">Amount Due</span>
                  <span className="text-xl font-black text-blue-600">
                    {currentLocation.currency} {cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Zero Stock Alert Banner */}
            {hasZeroStock && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left">
                <div className="flex items-center gap-1.5 text-xs font-black text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>Cannot Complete Sale: Zero Stock Rule</span>
                </div>
                <p className="text-[11px] text-red-600 mt-1">
                  The following item(s) have 0 stock at {currentLocation.name} and cannot be sold:{' '}
                  <span className="font-bold">{zeroStockItems.map((i) => i.productName).join(', ')}</span>. Please return to cart and remove them.
                </p>
              </div>
            )}

            {/* Auto-Print on Checkout Preference Toggle */}
            <div className="pt-3 pb-1 flex items-center justify-between text-xs">
              <label
                htmlFor="checkout-auto-print-switch"
                className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 hover:text-slate-900"
              >
                <Printer className={`w-3.5 h-3.5 ${autoPrintReceipt ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="font-semibold text-[11px] sm:text-xs">Auto-Print Receipt on Checkout</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  {autoPrintReceipt ? 'Enabled' : 'Manual'}
                </span>
                <button
                  id="checkout-auto-print-switch"
                  type="button"
                  role="switch"
                  aria-checked={autoPrintReceipt}
                  onClick={() => setAutoPrintReceipt(!autoPrintReceipt)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    autoPrintReceipt ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  title={autoPrintReceipt ? 'Receipt print dialog triggers automatically on sale' : 'Receipt must be printed manually'}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      autoPrintReceipt ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Complete Sale Action Button */}
            <div className="pt-2 sm:pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCompletePayment}
                disabled={isProcessing || hasZeroStock || (selectedMethod === 'cash' && tenderedAmount < cartTotal)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black py-3 px-4 rounded-xl shadow-md transition text-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Authorization...</span>
                  </>
                ) : hasZeroStock ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Cannot Sell: Zero Stock in Cart</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      Complete Sale ({currentLocation.currency} {cartTotal.toFixed(2)})
                    </span>
                    <kbd className="hidden sm:inline-block text-[10px] bg-emerald-800/60 border border-emerald-400/40 text-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold ml-1.5">
                      Enter ↵
                    </kbd>
                  </>
                )}
              </button>

              {hasZeroStock ? (
                <p className="text-[10px] text-red-600 font-bold text-center mt-1.5">
                  Products with 0 stock cannot be sold. Please remove them to proceed.
                </p>
              ) : selectedMethod === 'cash' && tenderedAmount < cartTotal ? (
                <p className="text-[10px] text-red-600 font-bold text-center mt-1.5">
                  Tendered amount must be at least {currentLocation.currency} {cartTotal.toFixed(2)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Customer Facing M-Pesa QR Modal */}
      <CustomerFacingMpesaQrModal
        isOpen={isCustomerQrModalOpen}
        onClose={() => setIsCustomerQrModalOpen(false)}
        onConfirmPayment={(code) => {
          setIsCustomerQrModalOpen(false);
          const generatedCode =
            code ||
            `QX${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(
              65 + Math.floor(Math.random() * 26)
            )}${Math.floor(10 + Math.random() * 90)}`;

          processPayment('mpesa', {
            mpesaPhone: 'Customer QR Scan',
            mpesaCode: generatedCode,
            mpesaMode: 'qr',
            mpesaType: mpesaQrType,
            mpesaTarget:
              mpesaQrType === 'buy_goods'
                ? `Till ${tillNumber}`
                : `Paybill ${paybillNumber} / Acc ${accountNumber}`,
          });

          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.7 },
            });
          } catch {
            // ignore
          }

          onClose();
        }}
        customAmount={cartTotal}
      />
    </div>
  );
};
