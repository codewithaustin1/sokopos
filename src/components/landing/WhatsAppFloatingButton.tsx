import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WhatsAppLogo } from '../ChannelLogos';
import {
  X,
  ArrowRight,
  Send,
  Sparkles,
  MessageSquare,
  Bot,
  User,
  RotateCcw,
  Minimize2,
  ExternalLink,
  CheckCheck,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string; // e.g. +254740463021
  delayEntranceMs?: number; // default: 2000ms
  playEntranceSound?: boolean; // default: true
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
  playEntranceSound = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isTooltipDismissed, setIsTooltipDismissed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);

  // Chat message state & input
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Jambo! 👋 I am Saras, your SokoPoS Kenya Specialist. How can I help you set up or optimize your retail store today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      whatsappPrompt: 'Hello SokoPoS team! I need assistance setting up my store in Kenya.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Clean phone number to digits only for wa.me URL
  const cleanPhone = (phoneNumber || '254740463021').replace(/[^0-9]/g, '');

  // Entrance timer: Triggers entrance animation and sound effect exactly after delayEntranceMs (2s)
  useEffect(() => {
    setIsMounted(true);

    const entranceTimer = setTimeout(() => {
      setHasEntered(true);
      if (playEntranceSound) {
        soundFx.playBubblePop();
      }
    }, delayEntranceMs);

    return () => clearTimeout(entranceTimer);
  }, [delayEntranceMs, playEntranceSound]);

  // Unlock Web Audio context on user gesture if browser has suspended it
  useEffect(() => {
    if (!playEntranceSound) return;
    const unlockAudio = () => {
      soundFx.playBeep(0, 0.001);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [playEntranceSound]);

  // Auto-scroll chat stream to latest message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen, isMinimized]);

  // Proactive Beacon Callout: Shakes button at 18s after entry, pops tooltip at 19s for 7s
  useEffect(() => {
    if (!hasEntered || isOpen || isTooltipDismissed) return;

    const shakeTimer = setTimeout(() => {
      setIsShaking(true);
    }, 18000);

    const showTimer = setTimeout(() => {
      setIsShaking(false);
      setShowTooltip(true);
      setIsExiting(false);

      const dismissTimer = setTimeout(() => {
        setIsExiting(true);
        const removeTimer = setTimeout(() => {
          setShowTooltip(false);
        }, 400);
        return () => clearTimeout(removeTimer);
      }, 7000);

      return () => clearTimeout(dismissTimer);
    }, 19000);

    return () => {
      clearTimeout(shakeTimer);
      clearTimeout(showTimer);
    };
  }, [hasEntered, isOpen, isTooltipDismissed]);

  const quickChips = [
    {
      label: '🚀 Free Setup Advisory',
      query: 'I would like a free 5-minute setup consultation for my retail business in Kenya.',
    },
    {
      label: '💳 M-Pesa & eTIMS Tax',
      query: 'How does SokoPoS integrate Safaricom M-Pesa Buy Goods Tills and KRA eTIMS invoices?',
    },
    {
      label: '🖨️ Printer & Scanner Setup',
      query: 'Will my existing thermal receipt printer and USB/Bluetooth barcode scanner work?',
    },
    {
      label: '👥 Staff & PIN Security',
      query: 'How do I add cashiers and set manager PIN overrides for discounts?',
    },
    {
      label: '💰 Software Pricing',
      query: 'What are the subscription plans and onboarding fees for SokoPoS?',
    },
  ];

  const handleOpenWhatsApp = (customMessage?: string) => {
    const message =
      customMessage ||
      'Hello SokoPoS team! I am interested in testing SokoPoS for my retail/hospitality business in Kenya.';
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getKnowledgeResponse = (userQuery: string): { responseText: string; waPrompt: string } => {
    const lower = userQuery.toLowerCase();

    if (lower.includes('m-pesa') || lower.includes('till') || lower.includes('etims') || lower.includes('tax') || lower.includes('kra')) {
      return {
        responseText:
          'SokoPoS provides full 1-click integration with Safaricom M-Pesa Buy Goods & Paybill, plus certified KRA eTIMS tax invoicing with QR receipt printing and automatic 16% VAT tax calculation.',
        waPrompt: 'Hi SokoPoS team, please assist me with M-Pesa Till & KRA eTIMS integration.',
      };
    }

    if (lower.includes('printer') || lower.includes('scanner') || lower.includes('hardware') || lower.includes('barcode')) {
      return {
        responseText:
          'SokoPoS works out-of-the-box with all ESC/POS thermal receipt printers (58mm & 80mm via USB/Bluetooth) and standard barcode scanners in high-speed keyboard wedge mode.',
        waPrompt: 'Hello SokoPoS, can you verify hardware compatibility for my store printer and scanner?',
      };
    }

    if (lower.includes('price') || lower.includes('fee') || lower.includes('plan') || lower.includes('cost') || lower.includes('free')) {
      return {
        responseText:
          'SokoPoS Core Cloud POS is Ksh 0/month forever with zero subscription fees. For full 1-on-1 store setup, catalog import, and hardware pairing, our Nairobi advisory fee is a single Ksh 1,999 payment.',
        waPrompt: 'Hello SokoPoS! I want to confirm pricing and book the Ksh 1,999 onboarding advisory.',
      };
    }

    if (lower.includes('staff') || lower.includes('cashier') || lower.includes('pin') || lower.includes('role') || lower.includes('shift')) {
      return {
        responseText:
          'You can add unlimited staff members with 4-digit PIN authentication and granular role permissions (Cashier, Supervisor, Manager, Inventory Clerk) to audit discounts and shift cash reconciliations.',
        waPrompt: 'Hi SokoPoS team, I need help setting up cashier roles and shift reconciliation.',
      };
    }

    return {
      responseText:
        'Thank you for your inquiry! SokoPoS is engineered specifically for Kenyan retail supermarkets, hardware stores, chemists, and restaurants. For detailed assistance, our Nairobi team is ready on WhatsApp!',
      waPrompt: `Hello SokoPoS team! I have a question: "${userQuery}"`,
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
    setIsShaking(false);
    if (showTooltip) {
      setShowTooltip(false);
      setIsTooltipDismissed(true);
    }
    if (!isOpen) {
      soundFx.playBeep(520, 0.1);
      setUnreadCount(0);
      setIsMinimized(false);
    }
    setIsOpen(!isOpen);
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
    setUnreadCount(0);
    setIsOpen(true);
    setIsMinimized(false);
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
      {/* Proactive Callout Banner Tooltip */}
      {showTooltip && !isOpen && (
        <div
          role="status"
          aria-live="polite"
          onClick={handleTooltipClick}
          className={`${
            isExiting ? 'whatsapp-tooltip-exit' : 'whatsapp-tooltip-enter'
          } mb-3 mr-1 max-w-[290px] sm:max-w-[330px] bg-slate-900/95 backdrop-blur-xl text-white border border-emerald-500/50 rounded-2xl p-3.5 shadow-2xl shadow-black/80 cursor-pointer hover:border-emerald-400 transition-all group relative`}
        >
          {/* Arrow pointing down to the FAB */}
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-slate-900 border-r border-b border-emerald-500/50 rotate-45" />

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3 h-3" />
                <span>Nairobi Support Specialist</span>
              </div>
              <p className="text-xs font-bold text-slate-100 leading-snug group-hover:text-white transition-colors">
                Need help setting up your Kenya store or M-Pesa till? Chat live with us!
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-300 font-extrabold">
                <span>Start Interactive Chat</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissTooltip}
              aria-label="Dismiss message"
              className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modern In-App Chat Assistant Window */}
      {isOpen && (
        <div
          className={`mb-3 w-[92vw] max-w-[380px] sm:w-[380px] bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-2xl shadow-black/90 flex flex-col transition-all duration-300 overflow-hidden text-slate-100 ${
            isMinimized ? 'h-16' : 'h-[500px] max-h-[75vh]'
          } animate-in slide-in-from-bottom-4 fade-in duration-200`}
        >
          {/* Header Bar */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center p-1 text-emerald-400 shadow-inner">
                  <img
                    src="/assets/aistudio/icons8-messages-96_71cfa6af.png"
                    alt="Messages"
                    className="w-6 h-6 object-contain rounded-lg"
                  />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-white truncate">SokoPoS Kenya Support</h3>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Nairobi Specialist & AI Assistant</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition cursor-pointer"
                title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition cursor-pointer"
                title="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* WhatsApp Direct Hand-off Banner */}
              <div className="bg-emerald-950/40 border-b border-emerald-900/40 px-3.5 py-2 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <WhatsAppLogo className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Prefer human chat on WhatsApp?</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp()}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-[10px] transition flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 modal-scrollbar">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs shrink-0 mb-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap font-medium">{msg.text}</p>

                      <div
                        className={`mt-1.5 flex items-center justify-between gap-2 text-[9px] font-mono ${
                          msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-500'
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                        {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-emerald-200" />}
                      </div>

                      {msg.sender === 'bot' && msg.whatsappPrompt && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(msg.whatsappPrompt)}
                            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>Discuss on WhatsApp</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.sender === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs shrink-0 mb-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Simulated AI Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                      <span className="text-[10px] font-bold text-slate-500 ml-1.5">Typing...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Chip Suggestions */}
              <div className="px-3 py-2 bg-slate-900/60 border-t border-slate-800/80 overflow-x-auto flex items-center gap-1.5 modal-scrollbar shrink-0">
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip.query)}
                    className="px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-emerald-950/60 border border-slate-700/80 hover:border-emerald-500/50 text-[10px] font-bold text-slate-300 hover:text-emerald-300 transition whitespace-nowrap cursor-pointer shrink-0"
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
                className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0"
              >
                <input
                  ref={chatInputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask about setup, eTIMS, M-Pesa..."
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent transition"
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
        className={`group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer select-none filter drop-shadow-xl hover:drop-shadow-2xl whatsapp-bubble-enter ${
          isShaking ? 'whatsapp-button-shake' : ''
        }`}
        aria-label={isOpen ? 'Close Chat' : 'Chat with POS Specialist on WhatsApp'}
        title={isOpen ? 'Close Chat' : 'Chat with POS Specialist on WhatsApp'}
      >
        <img
          src="/assets/aistudio/icons8-messages-96_71cfa6af.png"
          alt="WhatsApp / Messages"
          className="w-full h-full object-contain rounded-2xl sm:rounded-3xl transition-transform duration-200 group-hover:scale-105"
        />

        {isOpen ? (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center border-2 border-white shadow-md">
            <X className="w-3.5 h-3.5" />
          </span>
        ) : (
          <>
            {/* Live presence indicator */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white shadow-xs" />
            </span>

            {unreadCount > 0 && (
              <span className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow-md animate-bounce border border-white">
                {unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>,
    document.body
  );
};
