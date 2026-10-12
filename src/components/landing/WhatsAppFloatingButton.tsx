import React, { useState } from 'react';
import { WhatsAppLogo } from '../ChannelLogos';
import { X, MessageCircle, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string; // e.g. +254740463021
}

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  phoneNumber = '+254740463021'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Clean phone number to digits only for wa.me URL
  const cleanPhone = (phoneNumber || '254740463021').replace(/[^0-9]/g, '');

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

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
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
                  <span>Online • +254 740 463 021</span>
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

          <p className="text-[11px] text-slate-300 my-2.5 leading-relaxed">
            Need quick assistance with your hardware, M-Pesa Till, or store setup? Chat directly with our Nairobi deployment team (+254 740 463 021):
          </p>

          <div className="space-y-1.5 mb-3">
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
            <span>Chat on WhatsApp (+254 740 463 021)</span>
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-900/40 transition-all duration-200 border border-emerald-400/40 hover:scale-105 cursor-pointer"
        aria-label="Chat with SokoPoS Specialist on WhatsApp +254740463021"
      >
        <WhatsAppLogo className="w-6 h-6 shrink-0" />
        <span className="hidden sm:inline font-bold">Chat with a POS Specialist</span>
        <span className="sm:hidden font-bold">Chat</span>
      </button>
    </div>
  );
};
