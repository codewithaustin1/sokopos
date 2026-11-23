import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WhatsAppLogo } from '../ChannelLogos';
import {
  X,
  ArrowRight,
  Send,
  User,
  Minimize2,
  ExternalLink,
  CheckCheck,
  ShieldCheck,
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string; // e.g. +254740463021
  delayEntranceMs?: number; // default: 2000ms
  playEntranceSound?: boolean; // deprecated: popup entrance is silent
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  whatsappPrompt?: string;
}

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  phoneNumber = '+254740463021',
  delayEntranceMs = 2000,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  // Chat message state & input
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Jambo! Need help setting up your till, M-Pesa matching, or KRA eTIMS receipts? Ask a question here or chat with our Nairobi team on WhatsApp.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      whatsappPrompt: 'Hello SokoPoS team! I need assistance setting up my shop in Kenya.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Clean phone number to digits only for wa.me URL
  const cleanPhone = (phoneNumber || '254740463021').replace(/[^0-9]/g, '');

  // Entrance timer: Triggers entrance animation cleanly after delayEntranceMs (silent)
  useEffect(() => {
    setIsMounted(true);

    const entranceTimer = setTimeout(() => {
      setHasEntered(true);
    }, delayEntranceMs);

    return () => clearTimeout(entranceTimer);
  }, [delayEntranceMs]);

  // Auto-scroll chat stream to latest message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen, isMinimized]);



  const quickChips = [
    {
      label: '5-Min Setup Help',
      query: 'Can you help me set up my shop items and counter in 5 minutes?',
    },
    {
      label: 'M-Pesa & eTIMS',
      query: 'How does SokoPoS match M-Pesa Till payments and print KRA eTIMS receipts?',
    },
    {
      label: 'Printers & Scanners',
      query: 'Will my existing thermal receipt printer and barcode scanner work?',
    },
    {
      label: 'Stop Till Shortages',
      query: 'How do cashier PINs and shift counts prevent cash shortages?',
    },
    {
      label: 'Costs & Free Plan',
      query: 'What does SokoPoS cost per month, and what do I get for free?',
    },
  ];

  const handleOpenWhatsApp = (customMessage?: string) => {
    const message =
      customMessage ||
      'Hello SokoPoS team! I want to see how SokoPoS works for my shop in Kenya.';
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getKnowledgeResponse = (userQuery: string): { responseText: string; waPrompt: string } => {
    const lower = userQuery.toLowerCase();

    if (lower.includes('m-pesa') || lower.includes('till') || lower.includes('etims') || lower.includes('tax') || lower.includes('kra')) {
      return {
        responseText:
          'You can confirm Safaricom M-Pesa Buy Goods or Paybill payments right at checkout so you never have to match SMS messages at closing time. KRA eTIMS QR receipts and 16% VAT breakdowns are handled automatically through Digitax.',
        waPrompt: 'Hi SokoPoS team, please show me how M-Pesa Till matching & KRA eTIMS receipts work.',
      };
    }

    if (lower.includes('printer') || lower.includes('scanner') || lower.includes('hardware') || lower.includes('barcode')) {
      return {
        responseText:
          'Yes—plug in your current 58mm or 80mm USB/Bluetooth receipt printer and standard barcode scanner, and open your till on the phone, tablet, or laptop you already own.',
        waPrompt: 'Hello SokoPoS, can you check if my shop printer and barcode scanner will work?',
      };
    }

    if (lower.includes('price') || lower.includes('fee') || lower.includes('plan') || lower.includes('cost') || lower.includes('free')) {
      return {
        responseText:
          'You can run a core counter free (Ksh 0/month) with zero subscription fees. If you want our Nairobi team to import your stock sheet and pair your printer 1-on-1, onboarding help is a single Ksh 1,999 fee.',
        waPrompt: 'Hello SokoPoS! I want to confirm pricing and book the Ksh 1,999 shop setup.',
      };
    }

    if (lower.includes('staff') || lower.includes('cashier') || lower.includes('pin') || lower.includes('role') || lower.includes('shift') || lower.includes('shortage')) {
      return {
        responseText:
          'Every cashier gets their own 4-digit PIN and can only apply discounts if a manager approves with a PIN. At closing time, blind shift counts show expected cash and M-Pesa vs. what is actually in the drawer.',
        waPrompt: 'Hi SokoPoS team, I want to set up cashier PINs and shift cash counts for my shop.',
      };
    }

    return {
      responseText:
        'Glad to help! Tell us what kind of shop you run (duka, supermarket, bar, hardware, or chemist) and our Nairobi team can walk you through setup right on WhatsApp.',
      waPrompt: `Hello SokoPoS team! I have a question about my shop: "${userQuery}"`,
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    soundFx.playBeep(480, 0.08);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    // Simulate AI specialist response delay
    setTimeout(() => {
      setIsTyping(false);
      soundFx.playBeep(640, 0.12);

      const knowledge = getKnowledgeResponse(query);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: knowledge.responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        whatsappPrompt: knowledge.waPrompt,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 1100);
  };

  const handleToggleOpen = () => {
    if (!isOpen) {
      setIsMinimized(false);
    }
    setIsOpen(!isOpen);
  };

  if (!isMounted || typeof document === 'undefined' || !hasEntered) {
    return null;
  }

  return createPortal(
    <div
      id="whatsapp-fab-container"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col items-end pointer-events-auto select-none"
      style={{ isolation: 'isolate' }}
    >
      {/* Modern In-App Chat Assistant Window */}
      {isOpen && (
        <div
          className={`mb-3 w-[92vw] max-w-[380px] sm:w-[380px] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl shadow-slate-900/15 flex flex-col transition-all duration-300 overflow-hidden text-slate-800 ${
            isMinimized ? 'h-16' : 'h-[500px] max-h-[75vh]'
          } animate-in slide-in-from-bottom-4 fade-in duration-200`}
        >
          {/* Header Bar */}
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-50/80 via-white to-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center overflow-hidden text-emerald-600 shadow-xs">
                  <img
                    src="/assets/aistudio/IMG_20261104_091006_253_1f889bfe.jpg"
                    alt="Support Specialist"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-slate-900 truncate">SokoPoS Shop Support</h3>
                </div>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">Nairobi Setup Team</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                title="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* WhatsApp Direct Hand-off Banner */}
              <div className="bg-emerald-50/90 border-b border-emerald-200/80 px-3.5 py-2 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <WhatsAppLogo className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Prefer human chat on WhatsApp?</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp()}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-[10px] transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/70 modal-scrollbar">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden text-emerald-600 text-xs shrink-0 mb-0.5 shadow-xs">
                        <img
                          src="/assets/aistudio/IMG_20261104_091006_253_1f889bfe.jpg"
                          alt="Support"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 rounded-bl-xs shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap font-medium">{msg.text}</p>

                      <div
                        className={`mt-1.5 flex items-center justify-between gap-2 text-[9px] font-mono ${
                          msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                        {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-emerald-100" />}
                      </div>

                      {msg.sender === 'bot' && msg.whatsappPrompt && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(msg.whatsappPrompt)}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>Discuss on WhatsApp</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.sender === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 text-xs shrink-0 mb-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Simulated AI Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden text-emerald-600 shrink-0 shadow-xs">
                      <img
                        src="/assets/aistudio/IMG_20261104_091006_253_1f889bfe.jpg"
                        alt="Support"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2 flex items-center gap-1 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                      <span className="text-[10px] font-bold text-slate-500 ml-1.5">Typing...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="px-3 py-2 bg-white border-t border-slate-200 overflow-x-auto flex items-center gap-1.5 modal-scrollbar shrink-0">
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip.query)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 transition whitespace-nowrap cursor-pointer shrink-0"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Chat Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
              >
                <input
                  ref={chatInputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask about setup, eTIMS, M-Pesa..."
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-sm cursor-pointer shrink-0"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating Action Button (FAB) Bubble - using attached icon with no accompanying text */}
      <button
        type="button"
        id="whatsapp-landing-fab"
        onClick={handleToggleOpen}
        className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer select-none filter drop-shadow-xl hover:drop-shadow-2xl whatsapp-bubble-enter"
        aria-label={isOpen ? 'Close Chat' : 'Chat with POS Specialist on WhatsApp'}
        title={isOpen ? 'Close Chat' : 'Chat with POS Specialist on WhatsApp'}
      >
        <img
          src="/assets/aistudio/icons8-messages-96_71cfa6af.png"
          alt="WhatsApp / Messages"
          className="w-full h-full object-contain rounded-2xl sm:rounded-3xl transition-transform duration-200 group-hover:scale-105"
        />

        {isOpen && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center border-2 border-white shadow-md">
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>
    </div>,
    document.body
  );
};
