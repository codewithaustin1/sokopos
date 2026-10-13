import React, { useState, useEffect } from 'react';
import { WhatsAppLogo } from '../ChannelLogos';
import { X, MessageCircle, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string; // e.g. +254740463021
}

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  phoneNumber = '+254740463021'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isTooltipDismissed, setIsTooltipDismissed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Clean phone number to digits only for wa.me URL
  const cleanPhone = (phoneNumber || '254740463021').replace(/[^0-9]/g, '');

  // Proactive Tooltip: Shakes the button immediately before (19.3s), then shows tooltip copy at 20s for 6s
  useEffect(() => {
    if (isOpen || isTooltipDismissed) return;

    // 1. Shake the WhatsApp button immediately before showing the tooltip (at 19.3s)
    const shakeTimer = setTimeout(() => {
      setIsShaking(true);
    }, 19300);

    // 2. Stop shake and display the Support copy at 20s
    const showTimer = setTimeout(() => {
      setIsShaking(false);
      setShowTooltip(true);
      setIsExiting(false);

      // 3. Auto-dismiss after 6 seconds
      const dismissTimer = setTimeout(() => {
        setIsExiting(true);
        const removeTimer = setTimeout(() => {
          setShowTooltip(false);
        }, 400);
        return () => clearTimeout(removeTimer);
      }, 6000);

      return () => clearTimeout(dismissTimer);
    }, 20000);

    return () => {
      clearTimeout(shakeTimer);
      clearTimeout(showTimer);
    };
  }, [isOpen, isTooltipDismissed]);

  const predefinedQueries = [
    {
      title: 'Free Setup Consultation',
      text: 'Hello SokoPoS team, I would like a quick 5-minute setup consultation for my retail business in Kenya.'
    },
    {
      title: 'Hardware Compatibility Check',
      text: 'Hi SokoPoS! Can you confirm if my existing thermal receipt printer and barcode scanner will work?'
    },
    {
      title: 'M-Pesa Till & KRA eTIMS Setup',
      text: 'Hello! I need assistance configuring Safaricom M-Pesa Buy Goods Till and KRA eTIMS tax invoicing.'
    }
  ];

  const handleOpenWhatsApp = (customMessage?: string) => {
    const message = customMessage || 'Hello SokoPoS team! I am interested in testing SokoPoS for my retail/hospitality business in Kenya.';
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDismissTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExiting(true);
    setTimeout(() => {
      setShowTooltip(false);
      setIsTooltipDismissed(true);
    }, 300);
  };

  const handleTooltipClick = () => {
    setShowTooltip(false);
    setIsTooltipDismissed(true);
    handleOpenWhatsApp('Hello SokoPoS team! I need help setting up my store in Kenya.');
  };

  const handleToggleOpen = () => {
    setIsShaking(false);
    if (showTooltip) {
      setShowTooltip(false);
      setIsTooltipDismissed(true);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-20 right-5 sm:right-6 z-40 flex flex-col items-end">
      {/* Proactive Support Beacon Tooltip (Appears after 20s, bounces gently once, auto-dismisses after 6s) */}
      {showTooltip && !isOpen && (
        <div
          role="status"
          aria-live="polite"
          onClick={handleTooltipClick}
          className={`${
            isExiting ? 'whatsapp-tooltip-exit' : 'whatsapp-tooltip-enter'
          } mb-3 mr-1 max-w-[290px] sm:max-w-[320px] bg-slate-900/95 backdrop-blur-md text-white border border-emerald-500/50 rounded-2xl p-3.5 shadow-2xl shadow-black/80 cursor-pointer hover:border-emerald-400 transition-colors group relative`}
        >
          {/* Tail pointing toward the floating WhatsApp button */}
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-slate-900 border-r border-b border-emerald-500/50 rotate-45" />

          <div className="flex items-start gap-2.5">
            {/* Green pulsing online beacon */}
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">
                Nairobi Support Specialist
              </div>
              <p className="text-xs font-semibold text-slate-100 leading-snug group-hover:text-white transition-colors">
                Need help setting up your store? Chat with our Nairobi team 👋
              </p>
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-300 font-bold">
                <span>Tap to chat on WhatsApp</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Quick manual dismiss button */}
            <button
              type="button"
              onClick={handleDismissTooltip}
              aria-label="Dismiss message"
              className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Consultation Bubble Menu */}
      {isOpen && (
        <div className="mb-3 w-72 sm:w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-3 fade-in duration-200 text-slate-100">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <WhatsAppLogo className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">SokoPoS Kenya Support</div>
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 my-3">
            {predefinedQueries.map((query, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleOpenWhatsApp(query.text)}
                className="w-full text-left p-2 rounded-xl bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/40 transition text-xs flex items-center justify-between group cursor-pointer"
              >
                <span className="font-semibold text-slate-200 group-hover:text-emerald-300 text-[11px]">
                  {query.title}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleOpenWhatsApp()}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
          >
            <WhatsAppLogo className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-900/40 transition-all duration-200 border border-emerald-400/40 hover:scale-105 cursor-pointer ${
          isShaking ? 'whatsapp-button-shake' : ''
        }`}
        aria-label="Chat with SokoPoS Specialist on WhatsApp"
      >
        <WhatsAppLogo className="w-6 h-6 shrink-0" />
        <span className="hidden sm:inline font-bold">Chat with a POS Specialist</span>
        <span className="sm:hidden font-bold">Chat</span>
      </button>
    </div>
  );
};
