import React, { useState, useEffect, useMemo } from 'react';
import {
  Keyboard,
  Search,
  Zap,
  CreditCard,
  Banknote,
  Smartphone,
  Plus,
  Minus,
  X,
  Printer,
  Copy,
  Check,
  CornerDownLeft,
  Scan,
  ShieldCheck,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { usePos } from '../context/PosContext';

export interface HotkeyItem {
  id: string;
  keys: string[];
  label: string;
  description: string;
  category: 'register' | 'checkout' | 'search' | 'system';
  scope: string;
  badge: string;
  badgeColor: string;
  keyMatcher: (e: KeyboardEvent) => boolean;
}

export const POS_HOTKEYS: HotkeyItem[] = [
  // Register & Fast Selling
  {
    id: 'search-product',
    keys: ['Ctrl', 'F'],
    label: 'Focus Product Search',
    description: 'Instantly focuses the product, SKU and barcode search field on the register tab from anywhere.',
    category: 'search',
    scope: 'Register Tab',
    badge: 'Quick Search',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/60 dark:text-blue-200',
    keyMatcher: (e) => (e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F'),
  },
  {
    id: 'f1-exact-cash',
    keys: ['F1'],
    label: '1-Tap Exact Cash Settlement',
    description: 'Directly tenders and finalizes the active cart with exact cash in 1 single tap without opening the full payment modal.',
    category: 'register',
    scope: 'Register (Active Cart)',
    badge: 'Fast Tender',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200',
    keyMatcher: (e) => e.key === 'F1',
  },
  {
    id: 'f2-mpesa-checkout',
    keys: ['F2'],
    label: 'Instant M-Pesa Checkout',
    description: 'Opens payment modal pre-selected to M-Pesa mobile money with STK push & QR prompt.',
    category: 'register',
    scope: 'Register (Active Cart)',
    badge: 'Mobile Money',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200',
    keyMatcher: (e) => e.key === 'F2',
  },
  {
    id: 'f3-card-checkout',
    keys: ['F3'],
    label: 'Instant Card Checkout',
    description: 'Opens payment modal pre-selected to Credit/Debit card tender and authorization entry.',
    category: 'register',
    scope: 'Register (Active Cart)',
    badge: 'Card Tender',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-200',
    keyMatcher: (e) => e.key === 'F3',
  },
  {
    id: 'space-quick-checkout',
    keys: ['Space', 'or', 'Enter'],
    label: 'Fast Settle / Proceed to Checkout',
    description: 'When cart contains items and text inputs are not focused, opens checkout modal immediately.',
    category: 'register',
    scope: 'Register (Active Cart)',
    badge: 'Checkout',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/60 dark:text-blue-200',
    keyMatcher: (e) => e.key === ' ' || e.key === 'Enter',
  },
  {
    id: 'qty-increment',
    keys: ['+'],
    label: 'Increment Last Item Quantity',
    description: 'Adds +1 quantity to the most recently added product in the cart with an audible confirmation chime.',
    category: 'register',
    scope: 'Register (Active Cart)',
    badge: 'Cart Adjustment',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/60 dark:text-amber-200',
    keyMatcher: (e) => e.key === '+' || e.key === '=' || e.code === 'NumpadAdd',
  },
  {
    id: 'qty-decrement',
    keys: ['-'],
    label: 'Decrement Last Item Quantity',
    description: 'Decreases -1 quantity from the most recently added item in cart (removes line if quantity hits 0).',
    category: 'register',
    scope: 'Register (Active Cart)',
    badge: 'Cart Adjustment',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/60 dark:text-amber-200',
    keyMatcher: (e) => e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract',
  },

  // Checkout Modal Hotkeys
  {
    id: 'checkout-f1-cash',
    keys: ['F1'],
    label: 'Select Cash Payment',
    description: 'Switches the tender method in the checkout dialog to Cash and focuses the tendered cash input.',
    category: 'checkout',
    scope: 'Payment Modal',
    badge: 'Method Switch',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200',
    keyMatcher: (e) => e.key === 'F1',
  },
  {
    id: 'checkout-f2-mpesa',
    keys: ['F2'],
    label: 'Select M-Pesa Payment',
    description: 'Switches the checkout dialog to Lipa Na M-Pesa, STK Push and dynamic customer QR code.',
    category: 'checkout',
    scope: 'Payment Modal',
    badge: 'Method Switch',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200',
    keyMatcher: (e) => e.key === 'F2',
  },
  {
    id: 'checkout-f3-card',
    keys: ['F3'],
    label: 'Select Card Tender',
    description: 'Switches payment modal to Debit/Credit Card terminal authorization flow.',
    category: 'checkout',
    scope: 'Payment Modal',
    badge: 'Method Switch',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-200',
    keyMatcher: (e) => e.key === 'F3',
  },
  {
    id: 'checkout-f4-credit',
    keys: ['F4'],
    label: 'Select Store Credit / Ledger',
    description: 'Switches to customer credit balance (validates customer account & assigned credit ceiling).',
    category: 'checkout',
    scope: 'Payment Modal',
    badge: 'Method Switch',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/60 dark:text-purple-200',
    keyMatcher: (e) => e.key === 'F4',
  },
  {
    id: 'checkout-f5-split',
    keys: ['F5'],
    label: 'Select Split Payment',
    description: 'Enables multi-tender split calculation (Cash + M-Pesa or Card simultaneously).',
    category: 'checkout',
    scope: 'Payment Modal',
    badge: 'Multi-Tender',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/60 dark:text-blue-200',
    keyMatcher: (e) => e.key === 'F5',
  },
  {
    id: 'checkout-enter-complete',
    keys: ['Enter'],
    label: 'Complete & Tender Transaction',
    description: 'Finalizes the sale if tender requirements are met, prints receipt, and triggers cash drawer open.',
    category: 'checkout',
    scope: 'Payment Modal',
    badge: 'Commit Sale',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200',
    keyMatcher: (e) => e.key === 'Enter',
  },

  // Search & Barcode Hardware
  {
    id: 'search-input-enter',
    keys: ['Enter'],
    label: 'Search Bar: Instant Add / Settle',
    description: 'When typing in product search: exact barcode/SKU matches add to cart instantly; if query is empty, proceeds to checkout.',
    category: 'search',
    scope: 'Search Field',
    badge: 'Auto Add',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/60 dark:text-blue-200',
    keyMatcher: (e) => e.key === 'Enter',
  },
  {
    id: 'search-input-esc',
    keys: ['Esc'],
    label: 'Clear Search / Blur Input',
    description: 'Clears the current product search text. If search is already blank, un-focuses the input back to cart hotkey mode.',
    category: 'search',
    scope: 'Search Field',
    badge: 'Input Control',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200',
    keyMatcher: (e) => e.key === 'Escape',
  },
  {
    id: 'hardware-wedge-scanner',
    keys: ['Hardware Gun'],
    label: 'Always-On Barcode Wedge Intercept',
    description: 'Physical USB/Bluetooth barcode guns (<55ms burst) are caught globally anywhere in POS and added to cart without needing input focus.',
    category: 'search',
    scope: 'Global Background',
    badge: 'Hardware Wedge',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200',
    keyMatcher: () => false,
  },

  // Global System Controls
  {
    id: 'f10-help-modal',
    keys: ['F10'],
    label: 'Toggle POS Hotkeys Help Guide',
    description: 'Opens or closes this hotkey reference modal at any time from anywhere in the application.',
    category: 'system',
    scope: 'Global Application',
    badge: 'Help & Docs',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/60 dark:text-blue-200',
    keyMatcher: (e) => e.key === 'F10',
  },
  {
    id: 'esc-cancel-modal',
    keys: ['Esc'],
    label: 'Cancel Modal / Dismiss Receipt',
    description: 'Closes any open overlay (Payment, Receipt, Scanner, Return, Super-Admin, Help modal) or blurs active text input.',
    category: 'system',
    scope: 'Global Application',
    badge: 'Escape / Cancel',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200',
    keyMatcher: (e) => e.key === 'Escape',
  },
];

interface PosHotkeysHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosHotkeysHelpModal: React.FC<PosHotkeysHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isDarkMode, soundFx, showToast } = usePos();
  const [activeCategory, setActiveCategory] = useState<'all' | 'register' | 'checkout' | 'search' | 'system'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [lastKeyPressed, setLastKeyPressed] = useState<{
    key: string;
    code: string;
    matchedId?: string;
    timestamp: number;
  } | null>(null);
  const [copiedCheatSheet, setCopiedCheatSheet] = useState(false);

  // Live key detector while modal is active
  useEffect(() => {
    if (!isOpen) return;

    const handleModalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept Esc or F10 from closing
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'F10') {
        e.preventDefault();
        onClose();
        return;
      }

      // Check if matches any hotkey
      const matched = POS_HOTKEYS.find((hk) => hk.keyMatcher(e));
      setLastKeyPressed({
        key: e.key,
        code: e.code,
        matchedId: matched?.id,
        timestamp: Date.now(),
      });

      if (matched) {
        soundFx?.playBeep?.(650, 0.03);
      }
    };

    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
  }, [isOpen, onClose, soundFx]);

  // Filtered hotkeys list
  const filteredHotkeys = useMemo(() => {
    return POS_HOTKEYS.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      const query = searchFilter.toLowerCase().trim();
      if (!query) return matchCategory;

      const matchText =
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.scope.toLowerCase().includes(query) ||
        item.keys.some((k) => k.toLowerCase().includes(query));

      return matchCategory && matchText;
    });
  }, [activeCategory, searchFilter]);

  // Copy plain text cheat sheet for printing/pasting
  const handleCopyCheatSheet = () => {
    const lines = [
      '========================================',
      '        SOKOPOS TERMINAL HOTKEYS        ',
      '========================================\n',
      'REGISTER & FAST SELLING:',
      '  Ctrl + F        : Focus Product Search / Barcode lookup',
      '  Space / Enter   : Fast Settle / Proceed to Checkout',
      '  F1              : 1-Tap Exact Cash Settlement (instant)',
      '  F2              : Instant M-Pesa Checkout',
      '  F3              : Instant Card Checkout',
      '  +               : Increment last added item quantity',
      '  -               : Decrement last added item quantity\n',
      'PAYMENT & CHECKOUT MODAL:',
      '  F1              : Switch to Cash tender',
      '  F2              : Switch to M-Pesa tender',
      '  F3              : Switch to Card tender',
      '  F4              : Switch to Store Credit / Ledger',
      '  F5              : Switch to Split tender',
      '  Enter           : Finalize and complete transaction',
      '  Esc             : Cancel payment and return to register\n',
      'SYSTEM & HARDWARE:',
      '  F10             : Toggle Hotkeys Help Modal',
      '  Esc             : Close active modal or dismiss receipt',
      '  Hardware Gun    : Global background barcode wedge (<55ms)\n',
      '========================================',
    ].join('\n');

    navigator.clipboard?.writeText(lines).then(() => {
      setCopiedCheatSheet(true);
      showToast?.('Hotkey reference copied to clipboard!', 'success');
      setTimeout(() => setCopiedCheatSheet(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      id="pos-hotkeys-help-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hotkeys-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-inner">
              <Keyboard className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="hotkeys-modal-title" className="text-base sm:text-lg font-black tracking-tight">
                  POS Keyboard Shortcuts &amp; Hotkeys
                </h2>
                <span className="bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  F10
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Hardware-accelerated cashier controls for high-speed counter checkout.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCheatSheet}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer border border-white/10"
              title="Copy text cheat sheet to clipboard"
            >
              {copiedCheatSheet ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCheatSheet ? 'Copied!' : 'Copy List'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer border border-white/10"
              title="Print hotkeys sheet for register cash desk"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              title="Close Guide (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Keypress Detector Banner */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong className="text-slate-800 dark:text-slate-100">Live Key Detector:</strong> Press any key on your keyboard to verify terminal response.
            </span>
          </div>

          {lastKeyPressed ? (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs animate-pulse">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Detected:</span>
              <kbd className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded font-mono font-black text-xs border border-blue-200 dark:border-blue-700">
                {lastKeyPressed.key === ' ' ? 'Space' : lastKeyPressed.key}
              </kbd>
              {lastKeyPressed.matchedId && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ Matched Hotkey!
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">Listening for key events...</span>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search hotkeys (e.g. search, cash, mpesa, +, enter, esc)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[
              { id: 'all', label: 'All Hotkeys' },
              { id: 'register', label: 'Register & Cart' },
              { id: 'checkout', label: 'Payment Dialog' },
              { id: 'search', label: 'Search & Gun' },
              { id: 'system', label: 'System' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hotkeys Content List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50">
          {filteredHotkeys.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Keyboard className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No matching hotkeys found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or choosing another category.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  setActiveCategory('all');
                }}
                className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredHotkeys.map((hk) => {
                const isRecentlyTriggered = lastKeyPressed?.matchedId === hk.id;
                return (
                  <div
                    key={hk.id}
                    className={`p-3 rounded-xl border transition duration-200 flex flex-col justify-between ${
                      isRecentlyTriggered
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 shadow-md ring-2 ring-blue-300 dark:ring-blue-700 scale-[1.01]'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Keys & Scope Badge */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {hk.keys.map((k, idx) => {
                            if (k === 'or') {
                              return (
                                <span key={idx} className="text-[10px] text-slate-400 font-bold px-0.5">
                                  or
                                </span>
                              );
                            }
                            return (
                              <kbd
                                key={idx}
                                className={`px-2 py-1 rounded-md text-xs font-mono font-black border shadow-2xs ${
                                  isRecentlyTriggered
                                    ? 'bg-blue-600 text-white border-blue-700'
                                    : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700'
                                }`}
                              >
                                {k}
                              </kbd>
                            );
                          })}
                        </div>

                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${hk.badgeColor}`}
                        >
                          {hk.badge}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{hk.label}</span>
                      </h3>

                      {/* Description */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {hk.description}
                      </p>
                    </div>

                    {/* Footer Scope */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Scope: <strong className="text-slate-600 dark:text-slate-300">{hk.scope}</strong></span>
                      {isRecentlyTriggered && (
                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Quick-Tips Footer */}
        <div className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-200">Pro Tip:</span>
            <span>
              Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-[10px]">Ctrl+F</kbd> anytime on Register to jump straight into product search.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              Got It (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
