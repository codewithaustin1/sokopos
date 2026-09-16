import React, { useState } from 'react';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentMethod } from '../types';
import { usePos } from '../context/PosContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { cart, cartSubtotal, cartTax, cartTotal, currentLocation, processPayment } = usePos();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('mpesa');

  // M-Pesa state
  const [mpesaPhone, setMpesaPhone] = useState('712 345 678');
  const [isSendingMpesaPrompt, setIsSendingMpesaPrompt] = useState(false);
  const [mpesaPromptSent, setMpesaPromptSent] = useState(false);

  // Cash state
  const [cashTendered, setCashTendered] = useState<string>(Math.ceil(cartTotal).toString());

  // Card state
  const [cardLast4, setCardLast4] = useState('4192');
  const [cardNetwork, setCardNetwork] = useState('Visa');

  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

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

  const handleCompletePayment = async () => {
    setIsProcessing(true);

    await new Promise((res) => setTimeout(res, 600));

    let details = {};

    if (selectedMethod === 'mpesa') {
      const generatedCode = `QX${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(
        65 + Math.floor(Math.random() * 26)
      )}${Math.floor(10 + Math.random() * 90)}`;
      details = {
        mpesaPhone: `+254 ${mpesaPhone}`,
        mpesaCode: generatedCode,
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
  };

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
              {/* M-PESA */}
              <button
                type="button"
                onClick={() => setSelectedMethod('mpesa')}
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition text-left cursor-pointer relative ${
                  selectedMethod === 'mpesa'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                {selectedMethod === 'mpesa' && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
                )}
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-xs">
                  M
                </div>
                <span className="font-bold text-xs">M-PESA</span>
                <span className="text-[9px] text-slate-400">STK Express</span>
              </button>

              {/* Cash */}
              <button
                type="button"
                onClick={() => setSelectedMethod('cash')}
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition text-left cursor-pointer relative ${
                  selectedMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50/60 text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                {selectedMethod === 'cash' && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                )}
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-xs">
                  <Banknote className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-bold text-xs">Cash</span>
                <span className="text-[9px] text-slate-400">Drawer Tender</span>
              </button>

              {/* Card */}
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition text-left cursor-pointer relative ${
                  selectedMethod === 'card'
                    ? 'border-purple-500 bg-purple-50/60 text-purple-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                {selectedMethod === 'card' && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-500" />
                )}
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-xs">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-bold text-xs">Card</span>
                <span className="text-[9px] text-slate-400">Visa / MC</span>
              </button>
            </div>

            {/* Sub-panels according to selected method */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex-1 flex flex-col justify-between">
              {/* M-PESA Panel */}
              {selectedMethod === 'mpesa' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-xs text-slate-800">
                        M-Pesa Express / STK Push
                      </h4>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      Till: 882910
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
                        className="flex-1 bg-white border border-slate-300 font-bold text-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
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

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-[11px] text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      The customer will enter their 4-digit secret M-Pesa PIN on their phone.
                    </span>
                  </div>
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

            {/* Complete Sale Action Button */}
            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCompletePayment}
                disabled={isProcessing || (selectedMethod === 'cash' && tenderedAmount < cartTotal)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black py-3 px-4 rounded-xl shadow-md transition text-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Authorization...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      Complete Sale ({currentLocation.currency} {cartTotal.toFixed(2)})
                    </span>
                  </>
                )}
              </button>

              {selectedMethod === 'cash' && tenderedAmount < cartTotal && (
                <p className="text-[10px] text-red-600 font-bold text-center mt-1.5">
                  Tendered amount must be at least {currentLocation.currency} {cartTotal.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
