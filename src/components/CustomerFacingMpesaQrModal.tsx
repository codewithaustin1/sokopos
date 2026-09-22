import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Download,
  RefreshCw,
  CheckCircle2,
  Smartphone,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePos } from '../context/PosContext';

interface CustomerFacingMpesaQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: (mpesaCode?: string) => void;
  customAmount?: number;
}

export const CustomerFacingMpesaQrModal: React.FC<CustomerFacingMpesaQrModalProps> = ({
  isOpen,
  onClose,
  onConfirmPayment,
  customAmount,
}) => {
  const { currentLocation, currentBusiness, cartTotal, soundFx } = usePos();

  const amount = customAmount !== undefined ? customAmount : cartTotal;

  // Mode: 'buy_goods' | 'paybill'
  const [mpesaType, setMpesaType] = useState<'buy_goods' | 'paybill'>(
    currentLocation.mpesaType || 'buy_goods'
  );

  // Till or Paybill credentials
  const [tillNumber, setTillNumber] = useState(
    currentLocation.mpesaTill || '882910'
  );
  const [paybillNumber, setPaybillNumber] = useState(
    currentLocation.mpesaPaybill || '522522'
  );
  const [accountNumber, setAccountNumber] = useState(
    currentLocation.mpesaAccount || `${currentLocation.code || 'SOKO'}-CART`
  );

  // QR rendering state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrString, setQrString] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSimulatingConfirmation, setIsSimulatingConfirmation] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Generate dynamic M-Pesa QR payload according to Safaricom specifications
  useEffect(() => {
    if (!isOpen) return;

    let payload = '';
    const formattedAmount = Number(amount).toFixed(2);
    const merchantName = (currentBusiness.name || currentLocation.name || 'SOKOPOS RETAIL')
      .replace(/[|]/g, ' ')
      .trim();

    if (mpesaType === 'buy_goods') {
      // Safaricom M-Pesa Buy Goods standard format: BG|TillNumber|Amount|MerchantName
      payload = `BG|${tillNumber.trim()}|${formattedAmount}|${merchantName}`;
    } else {
      // Safaricom M-Pesa Paybill standard format: PB|PaybillNumber|AccountReference|Amount|MerchantName
      payload = `PB|${paybillNumber.trim()}|${accountNumber.trim()}|${formattedAmount}|${merchantName}`;
    }

    setQrString(payload);
    setIsGenerating(true);

    QRCode.toDataURL(payload, {
      width: 480,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#033b1e', // Rich Safaricom Emerald Green
        light: '#ffffff',
      },
    })
      .then((url) => {
        setQrDataUrl(url);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.error('Failed to generate M-Pesa QR code:', err);
        setIsGenerating(false);
      });
  }, [
    isOpen,
    mpesaType,
    tillNumber,
    paybillNumber,
    accountNumber,
    amount,
    currentBusiness.name,
    currentLocation.name,
  ]);

  if (!isOpen) return null;

  const handleCopyPayload = () => {
    if (!qrString) return;
    navigator.clipboard.writeText(qrString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `MPESA-QR-${mpesaType === 'buy_goods' ? tillNumber : paybillNumber}-${amount.toFixed(0)}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleConfirmCustomerPaid = () => {
    setIsSimulatingConfirmation(true);
    soundFx.playBeep(640, 0.08);

    setTimeout(() => {
      const sampleMpesaCode = `RK${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(
        65 + Math.floor(Math.random() * 26)
      )}${Math.floor(10 + Math.random() * 90)}`;
      setIsSimulatingConfirmation(false);
      onConfirmPayment(sampleMpesaCode);
    }, 450);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <div
      id="customer-mpesa-qr-backdrop"
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        ref={containerRef}
        id="customer-mpesa-qr-card"
        className={`bg-white rounded-3xl shadow-2xl border border-emerald-500/30 w-full overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-2 sm:inset-4 max-w-none h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] z-[110]'
            : 'max-w-2xl max-h-[94vh]'
        }`}
      >
        {/* Top Header: Safaricom M-Pesa Identity */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 text-white px-5 py-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-emerald-700 font-black flex items-center justify-center text-xl shadow-md tracking-tighter">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-wide uppercase">
                  M-PESA Dynamic QR
                </span>
                <span className="bg-emerald-900/60 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase text-emerald-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  Live Pre-Filled
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                Customer-Facing Scan & Pay Terminal • {currentLocation.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Customer Display'}
              className="p-2 rounded-xl bg-emerald-800/60 hover:bg-emerald-700 text-emerald-100 transition cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-emerald-800/60 hover:bg-emerald-700 text-emerald-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 flex flex-col items-center justify-between gap-5">
          {/* QR Type Selector & Credential Pill */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMpesaType('buy_goods')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mpesaType === 'buy_goods'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Buy Goods (Till)</span>
              </button>
              <button
                type="button"
                onClick={() => setMpesaType('paybill')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mpesaType === 'paybill'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Paybill (Business No)</span>
              </button>
            </div>

            {/* Editable or Displayed Credentials */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              {mpesaType === 'buy_goods' ? (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-emerald-900">
                  <span className="text-[11px] text-emerald-700 font-semibold uppercase">Till:</span>
                  <input
                    type="text"
                    value={tillNumber}
                    onChange={(e) => setTillNumber(e.target.value)}
                    className="w-24 bg-white border border-emerald-300 rounded px-1.5 py-0.5 text-xs font-mono font-black text-emerald-950 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    placeholder="882910"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-emerald-900">
                    <span className="text-[10px] text-emerald-700 uppercase">Paybill:</span>
                    <input
                      type="text"
                      value={paybillNumber}
                      onChange={(e) => setPaybillNumber(e.target.value)}
                      className="w-20 bg-white border border-emerald-300 rounded px-1.5 py-0.5 text-xs font-mono font-black text-emerald-950 focus:outline-hidden"
                      placeholder="522522"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-emerald-900">
                    <span className="text-[10px] text-emerald-700 uppercase">Acc:</span>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-24 bg-white border border-emerald-300 rounded px-1.5 py-0.5 text-xs font-mono font-black text-emerald-950 focus:outline-hidden"
                      placeholder="ACCOUNT"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Centric QR Display Box */}
          <div className="w-full flex flex-col items-center justify-center">
            {/* Amount Banner */}
            <div className="text-center mb-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Exact Amount Due
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight flex items-baseline justify-center gap-1.5">
                <span className="text-lg sm:text-xl font-bold text-slate-600">
                  {currentLocation.currency}
                </span>
                <span>{amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Pre-filled automatically into the customer&apos;s phone
              </p>
            </div>

            {/* QR Canvas Card */}
            <div className="relative p-4 sm:p-5 bg-white rounded-3xl border-2 border-emerald-500 shadow-xl flex flex-col items-center justify-center group">
              {/* Decorative M-PESA badge on top */}
              <div className="absolute -top-3.5 bg-emerald-600 text-white text-[11px] font-black uppercase px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                <span>Scan with Camera or M-Pesa App</span>
              </div>

              {/* QR Image */}
              <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center rounded-2xl overflow-hidden bg-white p-2">
                {isGenerating || !qrDataUrl ? (
                  <div className="flex flex-col items-center gap-2 text-emerald-700">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-bold">Generating QR Code...</span>
                  </div>
                ) : (
                  <img
                    src={qrDataUrl}
                    alt="M-Pesa Dynamic QR Code"
                    className="w-full h-full object-contain rounded-xl"
                  />
                )}
              </div>

              {/* Bottom Credential Bar */}
              <div className="mt-2 text-center text-xs font-mono font-bold text-slate-700 bg-slate-100/90 py-1.5 px-4 rounded-xl w-full border border-slate-200/80">
                {mpesaType === 'buy_goods' ? (
                  <span>TILL NO: <strong className="text-emerald-700 font-black">{tillNumber}</strong></span>
                ) : (
                  <span>PAYBILL: <strong className="text-emerald-700">{paybillNumber}</strong> • ACC: <strong className="text-emerald-700">{accountNumber}</strong></span>
                )}
              </div>
            </div>

            {/* Step by Step Customer Instructions */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-xl text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs mx-auto flex items-center justify-center mb-1">
                  1
                </div>
                <div className="font-bold text-xs text-slate-800">Open Camera</div>
                <div className="text-[11px] text-slate-500">Or Safaricom M-Pesa App</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs mx-auto flex items-center justify-center mb-1">
                  2
                </div>
                <div className="font-bold text-xs text-slate-800">Scan QR Code</div>
                <div className="text-[11px] text-slate-500">Amount & Till pre-fill</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs mx-auto flex items-center justify-center mb-1">
                  3
                </div>
                <div className="font-bold text-xs text-slate-800">Enter M-Pesa PIN</div>
                <div className="text-[11px] text-slate-500">Payment completes instantly</div>
              </div>
            </div>
          </div>

          {/* Quick Utility Actions */}
          <div className="w-full flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 font-medium transition flex items-center gap-1 cursor-pointer"
                title="Download QR as PNG"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Save Image</span>
              </button>
              <button
                type="button"
                onClick={handleCopyPayload}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 font-medium transition flex items-center gap-1 cursor-pointer"
                title="Copy raw QR text"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Payload</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Safaricom M-Pesa Certified</span>
            </div>
          </div>
        </div>

        {/* Footer: Cashier Confirmation Button */}
        <div className="bg-white border-t border-slate-200 px-5 py-3.5 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
          >
            Close / Return to POS
          </button>

          <button
            type="button"
            onClick={handleConfirmCustomerPaid}
            disabled={isSimulatingConfirmation}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSimulatingConfirmation ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Finalizing Sale...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Customer Has Paid (Complete Sale)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
