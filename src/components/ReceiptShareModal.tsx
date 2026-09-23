import React, { useState, useMemo } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  ExternalLink,
  Smartphone,
  Phone,
  FileText,
  AlertCircle,
  Download,
} from 'lucide-react';
import { Transaction, Location } from '../types';
import { formatTransactionReceiptText, normalizePhoneNumber } from '../utils/receiptFormatter';
import { WhatsAppLogo, TelegramLogo, EmailOpenLogo, SmsBubbleLogo, InstagramLogo } from './ChannelLogos';
import { generateReceiptPdf } from '../utils/receiptPdfGenerator';

interface ReceiptShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction;
  customText?: string;
  customTitle?: string;
  customSubtitle?: string;
  defaultPhone?: string;
  location: Location;
  businessName?: string;
  businessTaxNumber?: string;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ReceiptShareModal: React.FC<ReceiptShareModalProps> = ({
  isOpen,
  onClose,
  transaction,
  customText,
  customTitle,
  customSubtitle,
  defaultPhone,
  location,
  businessName,
  businessTaxNumber,
  showToast,
}) => {
  // Pre-fill phone if available on payment details or defaultPhone
  const initialPhone = defaultPhone || transaction?.paymentDetails?.mpesaPhone || '';
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [emailAddress, setEmailAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'channels' | 'preview'>('channels');

  // Format digital receipt text
  const receiptText = useMemo(() => {
    if (customText) return customText;
    if (transaction) {
      return formatTransactionReceiptText(transaction, location, businessName, businessTaxNumber);
    }
    return '';
  }, [customText, transaction, location, businessName, businessTaxNumber]);

  const receiptTitle = customTitle || (transaction ? `Receipt #${transaction.receiptNumber}` : 'Digital Receipt');
  const receiptSubtitle =
    customSubtitle ||
    (transaction
      ? `${location.currency} ${transaction.total.toFixed(2)}`
      : `${location.name}`);

  const cleanPhone = useMemo(() => {
    return normalizePhoneNumber(phoneNumber);
  }, [phoneNumber]);

  // Helper to generate and download the official 80mm POS PDF receipt
  const handleDirectPdfDownload = () => {
    try {
      const { fileName, url } = generateReceiptPdf({
        transaction,
        location,
        businessName,
        businessTaxNumber,
        customTitle: receiptTitle,
        customSubtitle: receiptSubtitle,
        customText: customText || receiptText,
      });

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3000);
      showToast(`Official PDF receipt downloaded (${fileName})`, 'success');
    } catch (err) {
      console.error('PDF download error:', err);
      showToast('Failed to generate PDF receipt', 'error');
    }
  };

  if (!isOpen) return null;

  // 1. Native OS Share Sheet (Direct text sharing via system sheet)
  const canUseNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    if (!navigator.share) {
      showToast('Native OS share not supported on this browser/device', 'info');
      return;
    }

    try {
      await navigator.share({
        title: `${receiptTitle} - ${businessName || location.name}`,
        text: receiptText,
      });
      showToast('Receipt shared successfully', 'success');
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.warn('Native share error:', err);
        showToast('Share dialog closed', 'info');
      }
    }
  };

  // 2. WhatsApp (Direct pre-filled receipt text)
  const handleWhatsAppShare = () => {
    const encodedText = encodeURIComponent(receiptText);
    const targetUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    showToast('Dispatched to WhatsApp', 'success');
  };

  // 3. Instagram (Copies text to clipboard & opens Instagram Direct)
  const handleInstagramShare = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${receiptTitle} - ${businessName || location.name}`,
          text: receiptText,
        });
        showToast('Receipt shared via system menu (select Instagram)!', 'success');
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener,noreferrer');
    showToast('Receipt text copied! Opening Instagram Direct', 'success');
  };

  // 4. SMS (Direct Text Messaging via cellular SMS protocol)
  const handleSmsShare = () => {
    const encodedText = encodeURIComponent(receiptText);
    const smsUrl = cleanPhone ? `sms:${cleanPhone}?body=${encodedText}` : `sms:?body=${encodedText}`;

    window.location.href = smsUrl;
    showToast('Opened native messaging app for SMS', 'info');
  };

  // 5. Email (Direct email draft with complete receipt text)
  const handleEmailShare = () => {
    const store = businessName || location.name;
    const subject = encodeURIComponent(`Receipt: ${receiptTitle} - ${store}`);
    const body = encodeURIComponent(receiptText);
    const mailtoUrl = emailAddress
      ? `mailto:${encodeURIComponent(emailAddress)}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;

    window.location.href = mailtoUrl;
    showToast('Opened default email client', 'info');
  };

  // 6. Telegram (Direct Telegram Share)
  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?text=${encodeURIComponent(receiptText)}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    showToast('Dispatched to Telegram', 'success');
  };

  // 7. Copy to Clipboard (Direct Text Format)
  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      showToast('Receipt text copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy error:', err);
      showToast('Failed to copy. Please copy from preview tab.', 'error');
    }
  };

  return (
    <div
      id="receipt-share-modal"
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-fade-in text-slate-800"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 leading-tight">
                Share Digital Document
              </h3>
              <p className="text-xs text-slate-500">
                {receiptTitle} • {receiptSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            aria-label="Close Share Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('channels')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'channels'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Sharing Channels</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Message Preview</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {activeTab === 'channels' ? (
            <div className="space-y-4">
              {/* Optional Recipient Phone & Email Fields */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Customer Contact Information</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Phone Number (M-Pesa / SMS)
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. 0712 345 678"
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="customer@email.com"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {cleanPhone && (
                  <p className="text-[10px] text-slate-500 font-mono">
                    Formatted for WhatsApp / Tel: +{cleanPhone}
                  </p>
                )}
              </div>

              {/* Primary Action Buttons Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Select Channel
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="p-3 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-300 rounded-xl text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
                    title="Send receipt text directly via WhatsApp"
                  >
                    <div className="flex items-center gap-2.5">
                      <WhatsAppLogo className="w-10 h-10" />
                      <div>
                        <div className="font-bold text-slate-900 text-xs group-hover:text-emerald-800">
                          WhatsApp
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {cleanPhone ? `Direct to +${cleanPhone}` : 'Choose contact in app'}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0" />
                  </button>

                  {/* Instagram */}
                  <button
                    type="button"
                    onClick={handleInstagramShare}
                    className="p-3 bg-fuchsia-50/70 hover:bg-fuchsia-100/80 border border-fuchsia-300 rounded-xl text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
                    title="Share receipt to Instagram Direct Messages / Stories"
                  >
                    <div className="flex items-center gap-2.5">
                      <InstagramLogo className="w-10 h-10" />
                      <div>
                        <div className="font-bold text-slate-900 text-xs group-hover:text-fuchsia-800">
                          Instagram
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Direct message / Stories
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-fuchsia-600 shrink-0" />
                  </button>

                  {/* SMS Message */}
                  <button
                    type="button"
                    onClick={handleSmsShare}
                    className="p-3 bg-sky-50/70 hover:bg-sky-100/80 border border-sky-300 rounded-xl text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
                    title="Send standard cellular text SMS"
                  >
                    <div className="flex items-center gap-2.5">
                      <SmsBubbleLogo className="w-10 h-10" />
                      <div>
                        <div className="font-bold text-slate-900 text-xs group-hover:text-sky-800">
                          SMS Messaging
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {cleanPhone ? `Text to +${cleanPhone}` : 'Open default SMS app'}
                        </div>
                      </div>
                    </div>
                    <Send className="w-4 h-4 text-sky-600 shrink-0" />
                  </button>

                  {/* Email Receipt */}
                  <button
                    type="button"
                    onClick={handleEmailShare}
                    className="p-3 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-300 rounded-xl text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
                    title="Draft email with receipt breakdown"
                  >
                    <div className="flex items-center gap-2.5">
                      <EmailOpenLogo className="w-10 h-10" />
                      <div>
                        <div className="font-bold text-slate-900 text-xs group-hover:text-blue-800">
                          Email Receipt
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {emailAddress ? emailAddress : 'Open mail client (pre-filled)'}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                  </button>

                  {/* Native System Share Sheet */}
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className={`p-3 rounded-xl text-left transition flex items-center justify-between group cursor-pointer shadow-xs ${
                      canUseNativeShare
                        ? 'bg-purple-50/70 hover:bg-purple-100/80 border border-purple-300'
                        : 'bg-slate-100 border border-slate-200 text-slate-400'
                    }`}
                    title={canUseNativeShare ? 'Open OS native sharing menu' : 'Native share not supported on this browser'}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${canUseNativeShare ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
                        <Share2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs group-hover:text-purple-800">
                          Device Share Sheet
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {canUseNativeShare ? 'iOS / Android / Desktop Share' : 'Unavailable on browser'}
                        </div>
                      </div>
                    </div>
                    <Share2 className={`w-4 h-4 ${canUseNativeShare ? 'text-purple-600' : 'text-slate-400'} shrink-0`} />
                  </button>

                  {/* Telegram */}
                  <button
                    type="button"
                    onClick={handleTelegramShare}
                    className="p-3 bg-cyan-50/70 hover:bg-cyan-100/80 border border-cyan-300 rounded-xl text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
                    title="Send receipt to Telegram"
                  >
                    <div className="flex items-center gap-2.5">
                      <TelegramLogo className="w-10 h-10" />
                      <div>
                        <div className="font-bold text-slate-900 text-xs group-hover:text-cyan-800">
                          Telegram
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Share to chat or contact
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-cyan-600 shrink-0" />
                  </button>

                  {/* Download PDF Receipt */}
                  <button
                    type="button"
                    onClick={handleDirectPdfDownload}
                    className="p-3 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-300 rounded-xl text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
                    title="Download official 80mm POS PDF receipt"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition ${pdfDownloaded ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                        {pdfDownloaded ? <Check className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs group-hover:text-rose-800 flex items-center gap-1.5">
                          <span>Download PDF</span>
                          <span className="text-[9px] bg-rose-200/80 text-rose-900 px-1 py-0.2 rounded font-mono font-bold">80mm</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {pdfDownloaded ? 'Downloaded to device!' : 'Save official PDF document'}
                        </div>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-rose-600 shrink-0" />
                  </button>

                  {/* Copy to Clipboard */}
                  <button
                    type="button"
                    onClick={handleCopyClipboard}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
                    title="Copy formatted receipt text directly"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>Copy Text Receipt</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {copied ? 'Copied to Clipboard!' : 'Paste into any app'}
                        </div>
                      </div>
                    </div>
                    <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Quick Info Box */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  Receipts contain complete itemized breakdowns, store tax registration (KRA PIN), cashier ID, and payment reference numbers for audit compliance.
                </p>
              </div>
            </div>
          ) : (
            /* Live Message Preview */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Formatted Digital Slip
                </span>
                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all max-h-80 overflow-y-auto border border-slate-800">
                {receiptText}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleDirectPdfDownload}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
