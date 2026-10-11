import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Lock,
  Wallet,
  User,
  Star,
  GitFork,
  Plus,
  Trash2,
  Split,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { PaymentMethod, SplitPaymentTender } from '../types';
import { usePos } from '../context/PosContext';
import { calculatePaymentGuardrails, roundCashHalfUp } from '../utils/cashRounding';
import { CustomerFacingMpesaQrModal } from './CustomerFacingMpesaQrModal';
import { CustomerSelectModal } from './CustomerSelectModal';

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
    cartDiscount,
    cartTotal,
    cartTaxBreakdown,
    currentBusiness,
    currentLocation,
    processPayment,
    products,
    autoPrintReceipt,
    setAutoPrintReceipt,
    activeShift,
    selectedCustomer,
    setSelectedCustomer,
    showToast,
    soundFx,
  } = usePos();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(initialMethod || 'cash');
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);

  // Split payment state
  interface SplitRowState {
    id: string;
    method: 'cash' | 'mpesa' | 'card' | 'store_credit';
    amount: string;
    cashTendered?: string;
    mpesaCode?: string;
    cardLast4?: string;
    cardNetwork?: string;
    notes?: string;
  }

  const [splitRows, setSplitRows] = useState<SplitRowState[]>([
    {
      id: 'split-1',
      method: 'cash',
      amount: '',
      cashTendered: '',
    },
    {
      id: 'split-2',
      method: 'mpesa',
      amount: '',
      mpesaCode: '',
    },
  ]);

  const initializeSplitRows = useCallback((total: number) => {
    const half = Math.floor(total / 2);
    const rest = Number((total - half).toFixed(2));
    const randomCode = `QX${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(
      65 + Math.floor(Math.random() * 26)
    )}${Math.floor(10 + Math.random() * 90)}`;
    setSplitRows([
      {
        id: 'split-1',
        method: 'cash',
        amount: half.toString(),
        cashTendered: half.toString(),
      },
      {
        id: 'split-2',
        method: 'mpesa',
        amount: rest.toString(),
        mpesaCode: randomCode,
      },
    ]);
  }, []);

  // Guardrail computation for current selection and cash
  const currentGuardrail = useMemo(
    () => calculatePaymentGuardrails(cartTotal, selectedMethod),
    [cartTotal, selectedMethod]
  );
  const cashPayable = useMemo(() => roundCashHalfUp(cartTotal), [cartTotal]);

  // Cash state initialized to cash payable
  const [cashTendered, setCashTendered] = useState<string>(roundCashHalfUp(cartTotal).toString());

  // Split totals & balance calculations
  const splitAllocatedTotal = useMemo(() => {
    return Number(
      splitRows
        .reduce((sum, row) => {
          const val = parseFloat(row.amount);
          return sum + (isNaN(val) ? 0 : val);
        }, 0)
        .toFixed(2)
    );
  }, [splitRows]);

  const splitRemaining = useMemo(() => {
    return Number((cartTotal - splitAllocatedTotal).toFixed(2));
  }, [cartTotal, splitAllocatedTotal]);

  const isSplitBalanced = useMemo(() => {
    return Math.abs(splitRemaining) < 0.01 && splitAllocatedTotal > 0;
  }, [splitRemaining, splitAllocatedTotal]);

  const splitCashRow = useMemo(() => {
    return splitRows.find((r) => r.method === 'cash');
  }, [splitRows]);

  const splitCashAmount = splitCashRow ? parseFloat(splitCashRow.amount) || 0 : 0;
  const splitCashTendered = splitCashRow
    ? parseFloat(splitCashRow.cashTendered || splitCashRow.amount) || splitCashAmount
    : 0;
  const splitCashChange = Math.max(0, splitCashTendered - splitCashAmount);

  const isSplitValid = useMemo(() => {
    if (selectedMethod !== 'split') return true;
    if (!isSplitBalanced) return false;
    const activeRows = splitRows.filter((r) => (parseFloat(r.amount) || 0) > 0);
    if (activeRows.length < 2) return false;

    for (const row of splitRows) {
      const amt = parseFloat(row.amount);
      if (isNaN(amt) || amt <= 0) return false;
      if (row.method === 'cash') {
        const tendered = parseFloat(row.cashTendered || row.amount);
        if (isNaN(tendered) || tendered < amt) return false;
      }
      if (row.method === 'store_credit') {
        if (!selectedCustomer || !selectedCustomer.isCreditAllowed) return false;
        const potentialDebt = Math.max(0, -((selectedCustomer.storeCreditBalance || 0) - amt));
        if (potentialDebt > (selectedCustomer.creditLimit || 0)) return false;
      }
    }
    return true;
  }, [selectedMethod, isSplitBalanced, splitRows, selectedCustomer]);

  // Synchronize initialMethod and default cash tendered when modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedMethod(initialMethod || 'cash');
      setCashTendered(cashPayable.toString());
      if (initialMethod === 'split') {
        initializeSplitRows(cartTotal);
      }
    }
  }, [isOpen, initialMethod, cartTotal, cashPayable, initializeSplitRows]);

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    if (method === 'cash') {
      setCashTendered(cashPayable.toString());
    } else if (method === 'split') {
      const sum = splitRows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
      if (Math.abs(sum - cartTotal) > 0.01) {
        initializeSplitRows(cartTotal);
      }
    }
  };

  // Check for items with 0 stock
  const zeroStockItems = (cart || []).filter((ci) => {
    const p = (products || []).find((prod) => prod.id === ci.productId);
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

  // Card state
  const [cardLast4, setCardLast4] = useState('4192');
  const [cardNetwork, setCardNetwork] = useState('Visa');

  const [isProcessing, setIsProcessing] = useState(false);

  const tenderedAmount = parseFloat(cashTendered) || 0;
  const cashChange = Math.max(0, tenderedAmount - cashPayable);

  // Quick cash amounts suggestions (based on standard half-up rounded cash payable)
  const roundedUp100 = Math.ceil(cashPayable / 100) * 100;
  const roundedUp500 = Math.ceil(cashPayable / 500) * 500;
  const roundedUp1000 = Math.ceil(cashPayable / 1000) * 1000;
  const quickCashOptions = useMemo(() => {
    return Array.from(
      new Set([cashPayable, roundedUp100, roundedUp500, roundedUp1000].filter((v) => v >= cashPayable))
    );
  }, [cashPayable, roundedUp100, roundedUp500, roundedUp1000]);

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
    if (!activeShift || activeShift.status !== 'open') {
      soundFx?.playError?.();
      showToast(
        'Payment Prohibited: No active shift session is open. Please open a shift session before tendering transactions.',
        'error'
      );
      return;
    }
    if (selectedMethod === 'cash' && tenderedAmount < currentGuardrail.payableAmount) return;

    if (selectedMethod === 'split') {
      if (!isSplitValid) {
        soundFx?.playError?.();
        if (!isSplitBalanced) {
          if (splitRemaining > 0) {
            showToast(
              `Split Payment Incomplete: Please allocate remaining ${currentLocation.currency} ${splitRemaining.toFixed(2)}.`,
              'error'
            );
          } else {
            showToast(
              `Split Payment Over-allocated: Total exceeds transaction amount by ${currentLocation.currency} ${Math.abs(splitRemaining).toFixed(2)}.`,
              'error'
            );
          }
        } else {
          showToast('Please check split tender amounts and cash tendered.', 'error');
        }
        return;
      }
    }

    setIsProcessing(true);

    await new Promise((res) => setTimeout(res, 400));

    let details: any = {};

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
        roundingDifference: 0,
      };
    } else if (selectedMethod === 'cash') {
      details = {
        cashTendered: tenderedAmount,
        cashChange: Number(cashChange.toFixed(2)),
        roundingDifference: currentGuardrail.roundingDifference,
      };
    } else if (selectedMethod === 'card') {
      details = {
        cardLast4,
        cardNetwork,
        roundingDifference: 0,
      };
    } else if (selectedMethod === 'store_credit') {
      details = {
        storeCreditUsed: currentGuardrail.payableAmount,
        notes: `Charged to ${selectedCustomer?.name || 'Customer'}'s store credit tab`,
        roundingDifference: 0,
      };
    } else if (selectedMethod === 'split') {
      const activeRows = splitRows.filter((r) => (parseFloat(r.amount) || 0) > 0);
      const cashRow = activeRows.find((r) => r.method === 'cash');
      const mpesaRow = activeRows.find((r) => r.method === 'mpesa');
      const cardRow = activeRows.find((r) => r.method === 'card');
      const creditRow = activeRows.find((r) => r.method === 'store_credit');

      const cAmt = cashRow ? parseFloat(cashRow.amount) || 0 : 0;
      const cTendered = cashRow ? parseFloat(cashRow.cashTendered || cashRow.amount) || cAmt : 0;
      const cChange = Math.max(0, cTendered - cAmt);

      const generatedMpesaCode =
        mpesaRow?.mpesaCode ||
        `QX${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(
          65 + Math.floor(Math.random() * 26)
        )}${Math.floor(10 + Math.random() * 90)}`;

      const splitBreakdown: SplitPaymentTender[] = activeRows.map((r) => {
        const amt = parseFloat(r.amount) || 0;
        if (r.method === 'cash') {
          return {
            id: r.id,
            method: 'cash',
            amount: amt,
            cashTendered: cTendered,
            cashChange: Number(cChange.toFixed(2)),
          };
        }
        if (r.method === 'mpesa') {
          return {
            id: r.id,
            method: 'mpesa',
            amount: amt,
            mpesaCode: r.mpesaCode || generatedMpesaCode,
            mpesaPhone: `+254 ${mpesaPhone}`,
          };
        }
        if (r.method === 'card') {
          return {
            id: r.id,
            method: 'card',
            amount: amt,
            cardLast4: r.cardLast4 || cardLast4,
            cardNetwork: r.cardNetwork || cardNetwork,
          };
        }
        return {
          id: r.id,
          method: 'store_credit',
          amount: amt,
          notes: `Split charged to ${selectedCustomer?.name || 'Customer'}'s store credit tab`,
        };
      });

      details = {
        splitBreakdown,
        cashTendered: cashRow ? cTendered : undefined,
        cashChange: cashRow ? Number(cChange.toFixed(2)) : undefined,
        mpesaCode: mpesaRow ? (mpesaRow.mpesaCode || generatedMpesaCode) : undefined,
        cardLast4: cardRow?.cardLast4 || (cardRow ? cardLast4 : undefined),
        cardNetwork: cardRow?.cardNetwork || (cardRow ? cardNetwork : undefined),
        storeCreditUsed: creditRow ? parseFloat(creditRow.amount) || 0 : undefined,
        roundingDifference: 0,
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
    currentGuardrail.payableAmount,
    currentGuardrail.roundingDifference,
    mpesaPhone,
    mpesaSubMode,
    mpesaQrType,
    tillNumber,
    paybillNumber,
    accountNumber,
    cashChange,
    cardLast4,
    cardNetwork,
    processPayment,
    onClose,
    activeShift,
    showToast,
    soundFx,
    isSplitValid,
    isSplitBalanced,
    splitRemaining,
    splitRows,
    currentLocation.currency,
  ]);

  // Modal keyboard shortcuts: Esc to close, F1 Cash, F2 M-Pesa, F3 Card, F4 Store Credit, F5 Split, Enter to Complete
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
        handleSelectMethod('cash');
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        handleSelectMethod('mpesa');
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        handleSelectMethod('card');
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        handleSelectMethod('store_credit');
        return;
      }
      if (e.key === 'F5') {
        e.preventDefault();
        handleSelectMethod('split');
        return;
      }
      if (e.key === 'Enter') {
        const isCreditLimitExceeded =
          selectedMethod === 'store_credit' &&
          selectedCustomer &&
          Math.max(0, -((selectedCustomer.storeCreditBalance || 0) - currentGuardrail.payableAmount)) >
            (selectedCustomer.creditLimit || 0);

        const canComplete =
          !isProcessing &&
          !hasZeroStock &&
          !!activeShift &&
          activeShift.status === 'open' &&
          (selectedMethod === 'split'
            ? isSplitValid
            : !(selectedMethod === 'cash' && tenderedAmount < currentGuardrail.payableAmount) &&
              !(selectedMethod === 'store_credit' && (!selectedCustomer || !selectedCustomer.isCreditAllowed || isCreditLimitExceeded)));
        if (canComplete) {
          e.preventDefault();
          handleCompletePayment();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isProcessing, hasZeroStock, selectedMethod, tenderedAmount, currentGuardrail.payableAmount, handleCompletePayment, cashPayable, selectedCustomer, isSplitValid]);

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
              {currentGuardrail.isCash ? 'Cash Payable (Half-Up)' : 'Total Amount (Exact)'}
            </span>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-base sm:text-lg font-black text-blue-600">
                {currentLocation.currency} {currentGuardrail.payableAmount.toFixed(2)}
              </span>
              {currentGuardrail.isCash && currentGuardrail.roundingDifference !== 0 && (
                <span className="text-[10px] font-mono text-slate-400 line-through">
                  {currentLocation.currency} {cartTotal.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row p-3.5 sm:p-6 gap-3.5 sm:gap-6 overflow-y-auto">
          {/* Payment Method Selector & Inputs (60%) */}
          <div className="flex-1 md:w-[60%] flex flex-col gap-4">
            {(!activeShift || activeShift.status !== 'open') && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-900">
                  <div className="font-bold mb-0.5">Tendering Prohibited: No Active Shift</div>
                  <p className="text-[11px] leading-relaxed text-red-800">
                    Transactions cannot be settled or tendered without an active till shift. Please open a shift session with an opening float declaration to trade.
                  </p>
                </div>
              </div>
            )}

            {/* Customer Assignment Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                    selectedCustomer ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {selectedCustomer ? (
                    selectedCustomer.name.slice(0, 2).toUpperCase()
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-800 truncate">
                      {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                    </span>
                    {selectedCustomer?.phone && (
                      <span className="text-[10px] font-mono text-slate-400">
                        ({selectedCustomer.phone})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    {selectedCustomer ? (
                      <>
                        <span className="text-amber-700 font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          {selectedCustomer.loyaltyPoints || 0} pts
                        </span>
                        <span>•</span>
                        <span
                          className={`font-mono font-bold ${
                            (selectedCustomer.storeCreditBalance || 0) < 0
                              ? 'text-red-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {(selectedCustomer.storeCreditBalance || 0) < 0
                            ? `Tab: -${currentLocation.currency} ${Math.abs(selectedCustomer.storeCreditBalance || 0).toFixed(0)}`
                            : `Credit: +${currentLocation.currency} ${(selectedCustomer.storeCreditBalance || 0).toFixed(0)}`}
                        </span>
                      </>
                    ) : (
                      <span>Unassigned sale (no points or store credit)</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCustomerSelectOpen(true)}
                  className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition cursor-pointer"
                >
                  {selectedCustomer ? 'Change' : '+ Assign'}
                </button>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    title="Remove customer assignment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Payment Method
            </h3>

            {/* Method Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {/* M-PESA (F2) */}
              <button
                type="button"
                onClick={() => handleSelectMethod('mpesa')}
                title="Select M-Pesa (Shortcut: F2)"
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition text-left cursor-pointer relative ${
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
                onClick={() => handleSelectMethod('cash')}
                title="Select Cash (Shortcut: F1)"
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition text-left cursor-pointer relative ${
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
                <span className="text-[9px] text-slate-400">
                  {currentGuardrail.hasCents ? 'Half-Up Rounded' : 'Drawer Tender'}
                </span>
              </button>

              {/* Card (F3) */}
              <button
                type="button"
                onClick={() => handleSelectMethod('card')}
                title="Select Card (Shortcut: F3)"
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition text-left cursor-pointer relative ${
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
                <span className="text-[9px] text-slate-400">Exact Charge</span>
              </button>

              {/* Split Tender (F5) */}
              <button
                type="button"
                onClick={() => handleSelectMethod('split')}
                title="Select Split Payment (Shortcut: F5)"
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition text-left cursor-pointer relative ${
                  selectedMethod === 'split'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {selectedMethod === 'split' && (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  )}
                  <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-500 font-bold">
                    F5
                  </kbd>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-xs">
                  <GitFork className="w-4 h-4 text-amber-600 rotate-90" />
                </div>
                <span className="font-bold text-xs truncate">Split Tender</span>
                <span className="text-[9px] text-amber-700 font-bold truncate">
                  Multi-Method
                </span>
              </button>

              {/* Store Credit (F4) */}
              <button
                type="button"
                onClick={() => handleSelectMethod('store_credit')}
                title="Select Store Credit / Daftari Tab (Shortcut: F4)"
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition text-left cursor-pointer relative col-span-2 sm:col-span-1 ${
                  selectedMethod === 'store_credit'
                    ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {selectedMethod === 'store_credit' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                  <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-500 font-bold">
                    F4
                  </kbd>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="font-bold text-xs truncate">Store Credit</span>
                <span className="text-[9px] text-slate-400 truncate">
                  {selectedCustomer ? 'Daftari Tab' : 'Assign Client'}
                </span>
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

                  {/* Cash Cents Guardrail Banner */}
                  {currentGuardrail.hasCents && (
                    <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-left space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-black text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <Banknote className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Cash Cents Guardrail: Standard Half-Up</span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-200/70 text-amber-900">
                          {currentGuardrail.roundingDifference >= 0 ? '+' : ''}
                          {currentGuardrail.roundingDifference.toFixed(2)} {currentLocation.currency}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-snug">
                        Where the total involves cents and cash is paid, Standard Half-Up Rounding applies: <strong>0.50 and above goes up to KES 1</strong>, below 0.50 goes down to KES 0.
                      </p>
                      <div className="text-[11px] font-bold text-slate-700 flex justify-between pt-1 border-t border-amber-200/80">
                        <span>Exact Cart Total:</span>
                        <span className="font-mono text-slate-600">{currentLocation.currency} {cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="text-[11px] font-black text-amber-950 flex justify-between">
                        <span>Adjusted Cash Payable:</span>
                        <span className="font-mono text-sm text-emerald-800">{currentLocation.currency} {currentGuardrail.payableAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

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
                          {amt === currentGuardrail.payableAmount ? `Exact (${amt})` : `${currentLocation.currency} ${amt}`}
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

                  {/* Electronic Guardrail for Card */}
                  {currentGuardrail.hasCents && (
                    <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-xs text-purple-900">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Electronic Payment Guardrail: Exact amount charged.</span>
                      </div>
                      <span className="font-mono font-black text-purple-800">
                        {currentLocation.currency} {cartTotal.toFixed(2)}
                      </span>
                    </div>
                  )}

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

              {/* Store Credit / Daftari Tab Panel */}
              {selectedMethod === 'store_credit' && (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-slate-800">Store Credit / "Daftari" Tab</h4>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                      Customer Ledger Account
                    </span>
                  </div>

                  {!selectedCustomer ? (
                    <div className="text-center py-6 bg-white border border-dashed border-slate-300 rounded-xl space-y-2 p-4">
                      <User className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="text-xs font-bold text-slate-700">No Customer Assigned</div>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                        Sales charged to store credit require an active customer profile. Please assign or register a customer.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCustomerSelectOpen(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        + Assign Customer Profile
                      </button>
                    </div>
                  ) : !selectedCustomer.isCreditAllowed ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5 text-xs text-red-900">
                      <div className="flex items-center gap-2 font-bold text-red-700">
                        <AlertCircle className="w-4 h-4" />
                        <span>Store Credit Not Authorized</span>
                      </div>
                      <p className="text-[11px] text-red-700">
                        "{selectedCustomer.name}" is currently set to Cash / Digital Only. Enable credit authorization in their customer profile to tender tab sales.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 bg-white border border-slate-200 rounded-xl p-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">
                            Approved Credit Limit
                          </span>
                          <span className="font-black text-slate-800 font-mono">
                            {currentLocation.currency} {(selectedCustomer.creditLimit || 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">
                            Current Tab Balance
                          </span>
                          <span
                            className={`font-black font-mono ${
                              (selectedCustomer.storeCreditBalance || 0) < 0
                                ? 'text-red-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {(selectedCustomer.storeCreditBalance || 0) < 0
                              ? `-${currentLocation.currency} ${Math.abs(selectedCustomer.storeCreditBalance || 0).toFixed(2)}`
                              : `+${currentLocation.currency} ${(selectedCustomer.storeCreditBalance || 0).toFixed(2)}`}
                          </span>
                        </div>
                      </div>

                      <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>Sale Charge to Tab:</span>
                          <span className="font-mono text-indigo-700 font-black">
                            {currentLocation.currency} {currentGuardrail.payableAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600 pt-1.5 border-t border-indigo-100">
                          <span>Projected Balance After Sale:</span>
                          <span
                            className={`font-mono font-black ${
                              (selectedCustomer.storeCreditBalance || 0) - currentGuardrail.payableAmount < 0
                                ? 'text-red-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {currentLocation.currency}{' '}
                            {((selectedCustomer.storeCreditBalance || 0) - currentGuardrail.payableAmount).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {Math.max(0, -((selectedCustomer.storeCreditBalance || 0) - currentGuardrail.payableAmount)) >
                        (selectedCustomer.creditLimit || 0) && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-bold text-red-700">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>
                            Sale exceeds customer credit limit of {currentLocation.currency}{' '}
                            {(selectedCustomer.creditLimit || 0).toFixed(2)}. Please choose another payment method or reduce cart quantity.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Split Tender Panel */}
              {selectedMethod === 'split' && (
                <div className="space-y-3.5">
                  {/* Allocation Status & Progress Header */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                          <GitFork className="w-4 h-4 rotate-90" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-800">Split Payment Allocation</h4>
                          <p className="text-[10px] text-slate-500">
                            Total Due:{' '}
                            <strong className="text-slate-700 font-mono">
                              {currentLocation.currency} {cartTotal.toFixed(2)}
                            </strong>
                          </p>
                        </div>
                      </div>

                      {/* Live Balance Status Badge */}
                      <div>
                        {isSplitBalanced ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>100% Balanced ({currentLocation.currency} {splitAllocatedTotal.toFixed(2)})</span>
                          </span>
                        ) : splitRemaining > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Remaining: {currentLocation.currency} {splitRemaining.toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-100 text-red-900 border border-red-300">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>Over by {currentLocation.currency} {Math.abs(splitRemaining).toFixed(2)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Segmented Visual Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                      {splitRows.map((row) => {
                        const amt = parseFloat(row.amount) || 0;
                        const pct = cartTotal > 0 ? Math.min(100, Math.max(0, (amt / cartTotal) * 100)) : 0;
                        if (pct <= 0) return null;
                        const colorClass =
                          row.method === 'cash'
                            ? 'bg-blue-500'
                            : row.method === 'mpesa'
                            ? 'bg-emerald-500'
                            : row.method === 'card'
                            ? 'bg-purple-500'
                            : 'bg-indigo-500';
                        return (
                          <div
                            key={row.id}
                            style={{ width: `${pct}%` }}
                            className={`${colorClass} h-full transition-all duration-200`}
                            title={`${row.method.toUpperCase()}: ${pct.toFixed(1)}%`}
                          />
                        );
                      })}
                    </div>

                    {/* Quick Split Presets Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 text-[11px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presets:</span>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const half = Math.floor(cartTotal / 2);
                            const rest = Number((cartTotal - half).toFixed(2));
                            setSplitRows([
                              { id: 'split-1', method: 'cash', amount: half.toString(), cashTendered: half.toString() },
                              { id: 'split-2', method: 'mpesa', amount: rest.toString(), mpesaCode: `QX${Math.floor(1000 + Math.random() * 9000)}K` },
                            ]);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
                        >
                          50/50 Cash &amp; M-Pesa
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const half = Math.floor(cartTotal / 2);
                            const rest = Number((cartTotal - half).toFixed(2));
                            setSplitRows([
                              { id: 'split-1', method: 'cash', amount: half.toString(), cashTendered: half.toString() },
                              { id: 'split-2', method: 'card', amount: rest.toString(), cardLast4: '4192', cardNetwork: 'Visa' },
                            ]);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
                        >
                          50/50 Cash &amp; Card
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const n = splitRows.length;
                            if (n === 0) return;
                            const perRow = Math.floor(cartTotal / n);
                            setSplitRows((prev) =>
                              prev.map((r, i) => {
                                const amt = i === n - 1 ? Number((cartTotal - perRow * (n - 1)).toFixed(2)) : perRow;
                                return {
                                  ...r,
                                  amount: amt.toString(),
                                  cashTendered: r.method === 'cash' ? amt.toString() : r.cashTendered,
                                };
                              })
                            );
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
                        >
                          Equal Split
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSplitRows((prev) =>
                              prev.map((r) => ({
                                ...r,
                                amount: '',
                                cashTendered: '',
                              }))
                            );
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 font-medium text-[10px] transition cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tender Rows List */}
                  <div className="space-y-2.5 max-h-[36vh] overflow-y-auto pr-1">
                    {splitRows.map((row, index) => {
                      const rowAmount = parseFloat(row.amount) || 0;
                      return (
                        <div
                          key={row.id}
                          className={`p-3 rounded-xl border bg-white transition space-y-2 ${
                            row.method === 'cash'
                              ? 'border-blue-200 shadow-2xs'
                              : row.method === 'mpesa'
                              ? 'border-emerald-200 shadow-2xs'
                              : row.method === 'card'
                              ? 'border-purple-200 shadow-2xs'
                              : 'border-indigo-200 shadow-2xs'
                          }`}
                        >
                          {/* Row Header: Method selector and delete */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-400 font-mono w-4">
                                #{index + 1}
                              </span>
                              <select
                                value={row.method}
                                onChange={(e) => {
                                  const newMethod = e.target.value as any;
                                  setSplitRows((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id
                                        ? {
                                            ...r,
                                            method: newMethod,
                                            mpesaCode:
                                              newMethod === 'mpesa'
                                                ? r.mpesaCode ||
                                                  `QX${Math.floor(1000 + Math.random() * 9000)}K`
                                                : undefined,
                                            cardLast4: newMethod === 'card' ? r.cardLast4 || '4192' : undefined,
                                            cardNetwork: newMethod === 'card' ? r.cardNetwork || 'Visa' : undefined,
                                          }
                                        : r
                                    )
                                  );
                                }}
                                className="bg-slate-50 border border-slate-300 font-bold text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-hidden"
                              >
                                <option value="cash">Cash Register</option>
                                <option value="mpesa">M-Pesa STK / Till</option>
                                <option value="card">Card Terminal</option>
                                <option value="store_credit">Store Credit / Tab</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Fill Remaining button */}
                              {splitRemaining > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = parseFloat(row.amount) || 0;
                                    const next = Number((cur + splitRemaining).toFixed(2));
                                    setSplitRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? {
                                              ...r,
                                              amount: next.toString(),
                                              cashTendered: r.method === 'cash' ? next.toString() : r.cashTendered,
                                            }
                                          : r
                                      )
                                    );
                                  }}
                                  className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2 py-0.5 transition cursor-pointer"
                                  title="Fill remaining unallocated balance into this tender"
                                >
                                  + Remainder ({currentLocation.currency} {splitRemaining.toFixed(2)})
                                </button>
                              )}

                              {splitRows.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSplitRows((prev) => prev.filter((r) => r.id !== row.id));
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                                  title="Remove tender line"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Amount input row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Portion Amount ({currentLocation.currency})
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                                  {currentLocation.currency}
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={row.amount}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSplitRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? {
                                              ...r,
                                              amount: val,
                                              cashTendered: r.method === 'cash' ? val : r.cashTendered,
                                            }
                                          : r
                                      )
                                    );
                                  }}
                                  placeholder="0.00"
                                  className="w-full bg-slate-50 border border-slate-300 font-mono font-black text-slate-900 rounded-lg pl-12 pr-3 py-1.5 text-sm focus:outline-hidden focus:bg-white focus:border-amber-500"
                                />
                              </div>
                            </div>

                            {/* Method-specific tender fields */}
                            <div>
                              {row.method === 'cash' && (
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      Cash Given (Tendered)
                                    </label>
                                    {parseFloat(row.cashTendered || row.amount) > rowAmount && (
                                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-mono">
                                        Change: {currentLocation.currency}{' '}
                                        {(parseFloat(row.cashTendered || '0') - rowAmount).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="number"
                                    step="any"
                                    min={rowAmount}
                                    value={row.cashTendered ?? row.amount}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSplitRows((prev) =>
                                        prev.map((r) => (r.id === row.id ? { ...r, cashTendered: val } : r))
                                      );
                                    }}
                                    placeholder={row.amount || '0'}
                                    className="w-full bg-slate-50 border border-slate-300 font-mono font-bold text-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:bg-white"
                                  />
                                </div>
                              )}

                              {row.method === 'mpesa' && (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    M-Pesa Reference Code
                                  </label>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      value={row.mpesaCode || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSplitRows((prev) =>
                                          prev.map((r) => (r.id === row.id ? { ...r, mpesaCode: val } : r))
                                        );
                                      }}
                                      placeholder="e.g. QX9102K8"
                                      className="flex-1 bg-slate-50 border border-slate-300 font-mono font-bold text-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:bg-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const code = `QX${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(
                                          65 + Math.floor(Math.random() * 26)
                                        )}${Math.floor(10 + Math.random() * 90)}`;
                                        setSplitRows((prev) =>
                                          prev.map((r) => (r.id === row.id ? { ...r, mpesaCode: code } : r))
                                        );
                                      }}
                                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                      title="Generate reference code"
                                    >
                                      Auto-Gen
                                    </button>
                                  </div>
                                </div>
                              )}

                              {row.method === 'card' && (
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Network
                                    </label>
                                    <select
                                      value={row.cardNetwork || 'Visa'}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSplitRows((prev) =>
                                          prev.map((r) => (r.id === row.id ? { ...r, cardNetwork: val } : r))
                                        );
                                      }}
                                      className="w-full bg-slate-50 border border-slate-300 font-semibold text-slate-800 rounded-lg px-2 py-1.5 text-xs focus:outline-hidden"
                                    >
                                      <option value="Visa">Visa</option>
                                      <option value="Mastercard">Mastercard</option>
                                      <option value="Amex">Amex</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Last 4
                                    </label>
                                    <input
                                      type="text"
                                      maxLength={4}
                                      value={row.cardLast4 || '4192'}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSplitRows((prev) =>
                                          prev.map((r) => (r.id === row.id ? { ...r, cardLast4: val } : r))
                                        );
                                      }}
                                      placeholder="4192"
                                      className="w-full bg-slate-50 border border-slate-300 font-mono font-bold text-slate-800 rounded-lg px-2 py-1.5 text-xs focus:outline-hidden"
                                    />
                                  </div>
                                </div>
                              )}

                              {row.method === 'store_credit' && (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Customer Tab
                                  </label>
                                  {!selectedCustomer ? (
                                    <button
                                      type="button"
                                      onClick={() => setIsCustomerSelectOpen(true)}
                                      className="w-full px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <User className="w-3 h-3" />
                                      <span>+ Assign Customer</span>
                                    </button>
                                  ) : (
                                    <div className="text-[11px] font-mono text-slate-700 bg-indigo-50/60 p-1.5 rounded-lg border border-indigo-100 flex justify-between">
                                      <span className="truncate">{selectedCustomer.name}:</span>
                                      <span className="font-bold text-indigo-800">
                                        Limit {currentLocation.currency} {(selectedCustomer.creditLimit || 0).toFixed(0)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Tender Button */}
                  {splitRows.length < 4 && (
                    <button
                      type="button"
                      onClick={() => {
                        const usedMethods = new Set(splitRows.map((r) => r.method));
                        const allMethods: ('cash' | 'mpesa' | 'card' | 'store_credit')[] = [
                          'cash',
                          'mpesa',
                          'card',
                          'store_credit',
                        ];
                        const nextMethod = allMethods.find((m) => !usedMethods.has(m)) || 'cash';
                        const rem = Math.max(0, splitRemaining);
                        setSplitRows((prev) => [
                          ...prev,
                          {
                            id: `split-${Date.now()}`,
                            method: nextMethod,
                            amount: rem > 0 ? rem.toString() : '',
                            cashTendered: nextMethod === 'cash' && rem > 0 ? rem.toString() : undefined,
                            mpesaCode: nextMethod === 'mpesa' ? `QX${Math.floor(1000 + Math.random() * 9000)}K` : undefined,
                            cardLast4: nextMethod === 'card' ? '4192' : undefined,
                            cardNetwork: nextMethod === 'card' ? 'Visa' : undefined,
                          },
                        ]);
                      }}
                      className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/50 rounded-xl text-xs font-bold text-slate-600 hover:text-amber-900 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Another Payment Method ({splitRows.length}/4)</span>
                    </button>
                  )}
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

                <div className="space-y-1.5 py-1.5 bg-slate-100/70 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span>{currentBusiness?.taxSettings?.taxLabel || 'VAT'}</span>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200">
                        {currentBusiness?.taxSettings?.pricingType === 'exclusive' ? 'Exclusive' : 'Inclusive'}
                      </span>
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {currentLocation.currency} {cartTax.toFixed(2)}
                    </span>
                  </div>

                  {/* Dynamic Category & Regional Tax Breakdown */}
                  {cartTaxBreakdown && cartTaxBreakdown.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-dashed border-slate-200">
                      {cartTaxBreakdown.map((tb) => (
                        <div key={`${tb.code}-${tb.rate}`} className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-600 flex items-center gap-1">
                            <span className="font-mono font-bold text-slate-700 bg-white px-1 py-0.2 rounded text-[9px] border border-slate-200">
                              {tb.code}
                            </span>
                            <span className="truncate max-w-[130px]">{tb.name}</span>
                            <span className="text-[10px] text-slate-400">({tb.ratePercent}%)</span>
                          </span>
                          <span className="font-mono text-slate-700 font-semibold">
                            {currentLocation.currency} {tb.taxAmount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 flex justify-between items-center pt-0.5">
                    <span>Tax PIN: <strong className="text-slate-600 font-mono">{currentBusiness?.taxSettings?.taxNumber || currentBusiness?.taxNumber || currentLocation.taxId}</strong></span>
                    <span className="text-emerald-700 font-bold text-[9px] bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200">
                      Dynamic Engine
                    </span>
                  </div>
                </div>

                {cartDiscount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Discounts</span>
                    <span className="font-semibold text-emerald-600">
                      - {currentLocation.currency} {cartDiscount.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500 font-semibold">Exact Total</span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {currentLocation.currency} {cartTotal.toFixed(2)}
                    </span>
                  </div>

                  {currentGuardrail.isCash && currentGuardrail.roundingDifference !== 0 && (
                    <div className="flex justify-between items-baseline text-xs text-blue-700 bg-blue-50/80 px-2 py-1 rounded">
                      <span className="font-semibold">Cash Rounding (Half-up):</span>
                      <span className="font-mono font-bold">
                        {currentGuardrail.roundingDifference >= 0 ? '+' : ''}
                        {currentLocation.currency} {currentGuardrail.roundingDifference.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-xs font-bold text-slate-800">
                      {currentGuardrail.isCash ? 'Cash Payable' : 'Amount Due (Exact)'}
                    </span>
                    <span className="text-xl font-black text-blue-600">
                      {currentLocation.currency} {currentGuardrail.payableAmount.toFixed(2)}
                    </span>
                  </div>

                  {currentGuardrail.hasCents && (
                    <p className="text-[10px] text-slate-500 text-right italic">
                      {currentGuardrail.isCash
                        ? 'Standard half-up rounding (0.50+ rounds up, <0.50 rounds down)'
                        : 'Exact electronic payment (no rounding applied)'}
                    </p>
                  )}

                  {selectedCustomer && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-amber-800 bg-amber-50/70 p-2 rounded-lg border border-amber-200/80">
                      <span className="flex items-center gap-1 font-bold">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>Loyalty Points to Earn:</span>
                      </span>
                      <span className="font-black font-mono">
                        +{Math.floor(currentGuardrail.payableAmount / 100)} pts
                      </span>
                    </div>
                  )}

                  {/* Split Allocation breakdown in Order Summary */}
                  {selectedMethod === 'split' && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/70">
                      <div className="flex justify-between items-center text-[10px] font-bold text-amber-900 border-b border-amber-200/80 pb-1">
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3 h-3 text-amber-700 rotate-90" />
                          <span>Split Breakdown</span>
                        </span>
                        <span className={isSplitBalanced ? 'text-emerald-700 font-bold' : 'text-amber-800 font-bold'}>
                          {isSplitBalanced ? 'Balanced' : `${splitAllocatedTotal.toFixed(2)} / ${cartTotal.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {splitRows.map((r) => {
                          const amt = parseFloat(r.amount) || 0;
                          return (
                            <div key={r.id} className="flex justify-between text-[11px] text-slate-700">
                              <span className="capitalize font-medium text-slate-600">
                                {r.method === 'mpesa' ? 'M-Pesa' : r.method === 'store_credit' ? 'Store Credit' : r.method}:
                              </span>
                              <span className="font-mono font-bold">
                                {currentLocation.currency} {amt.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {splitCashChange > 0 && (
                        <div className="flex justify-between text-[11px] text-blue-700 font-bold pt-1 border-t border-amber-200/80">
                          <span>Cash Change:</span>
                          <span className="font-mono">{currentLocation.currency} {splitCashChange.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
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
                disabled={
                  isProcessing ||
                  hasZeroStock ||
                  !activeShift ||
                  activeShift.status !== 'open' ||
                  (selectedMethod === 'cash' && tenderedAmount < currentGuardrail.payableAmount) ||
                  (selectedMethod === 'split' && !isSplitValid) ||
                  (selectedMethod === 'store_credit' &&
                    (!selectedCustomer ||
                      !selectedCustomer.isCreditAllowed ||
                      Math.max(0, -((selectedCustomer.storeCreditBalance || 0) - currentGuardrail.payableAmount)) >
                        (selectedCustomer.creditLimit || 0)))
                }
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
                ) : !activeShift || activeShift.status !== 'open' ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Tendering Blocked (No Active Shift)</span>
                  </>
                ) : selectedMethod === 'split' && !isSplitBalanced ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      {splitRemaining > 0
                        ? `Allocate Remaining ${currentLocation.currency} ${splitRemaining.toFixed(2)}`
                        : `Over-allocated by ${currentLocation.currency} ${Math.abs(splitRemaining).toFixed(2)}`}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {selectedMethod === 'split' ? 'Complete Split Sale' : 'Complete Sale'} ({currentLocation.currency} {currentGuardrail.payableAmount.toFixed(2)})
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
              ) : !activeShift || activeShift.status !== 'open' ? (
                <p className="text-[10px] text-red-600 font-bold text-center mt-1.5">
                  Drawer is closed. Declare an opening float and start a shift to tender sales.
                </p>
              ) : selectedMethod === 'cash' && tenderedAmount < currentGuardrail.payableAmount ? (
                <p className="text-[10px] text-red-600 font-bold text-center mt-1.5">
                  Tendered amount must be at least {currentLocation.currency} {currentGuardrail.payableAmount.toFixed(2)}
                </p>
              ) : selectedMethod === 'split' && !isSplitBalanced && splitRemaining > 0 ? (
                <p className="text-[10px] text-amber-700 font-bold text-center mt-1.5">
                  Total split tenders must equal {currentLocation.currency} {cartTotal.toFixed(2)}. Unallocated balance: {currentLocation.currency} {splitRemaining.toFixed(2)}.
                </p>
              ) : selectedMethod === 'split' && !isSplitBalanced && splitRemaining < 0 ? (
                <p className="text-[10px] text-red-600 font-bold text-center mt-1.5">
                  Total split tenders exceed transaction amount by {currentLocation.currency} {Math.abs(splitRemaining).toFixed(2)}.
                </p>
              ) : selectedMethod === 'split' && isSplitBalanced && !isSplitValid ? (
                <p className="text-[10px] text-red-600 font-bold text-center mt-1.5">
                  Please verify tender amounts (each portion must be &gt; 0, and cash tendered must cover cash portion).
                </p>
              ) : selectedMethod === 'store_credit' && !selectedCustomer ? (
                <p className="text-[10px] text-indigo-700 font-bold text-center mt-1.5">
                  Please assign a customer profile to charge this sale to store credit tab.
                </p>
              ) : selectedMethod === 'store_credit' && selectedCustomer && !selectedCustomer.isCreditAllowed ? (
                <p className="text-[10px] text-red-600 font-bold text-center mt-1.5">
                  Store credit is not authorized for {selectedCustomer.name}.
                </p>
              ) : selectedMethod === 'store_credit' &&
                selectedCustomer &&
                Math.max(0, -((selectedCustomer.storeCreditBalance || 0) - currentGuardrail.payableAmount)) >
                  (selectedCustomer.creditLimit || 0) ? (
                <p className="text-[10px] text-red-600 font-bold text-center mt-1.5">
                  Sale exceeds {selectedCustomer.name}'s approved credit limit of {currentLocation.currency}{' '}
                  {(selectedCustomer.creditLimit || 0).toFixed(2)}.
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

      {/* Customer Quick Selector Modal */}
      <CustomerSelectModal
        isOpen={isCustomerSelectOpen}
        onClose={() => setIsCustomerSelectOpen(false)}
        onSelectCustomer={(c) => setSelectedCustomer(c)}
      />
    </div>
  );
};
