import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface HeroItem {
  id: string;
  name: string;
  unit: string;
  price: number;
  taxRate: string;
}

const HERO_CATALOG: HeroItem[] = [
  { id: 'maize', name: 'Pembe Maize Meal 2kg', unit: '2kg', price: 210, taxRate: '0% Exempt' },
  { id: 'milk', name: 'Fresh Dairy Milk 500ml', unit: '500ml', price: 65, taxRate: '0% Zero' },
  { id: 'oil', name: 'Golden Fry Cooking Oil 1L', unit: '1L', price: 340, taxRate: '16% VAT' },
  { id: 'tea', name: 'Ketepa Pride Tea 250g', unit: '250g', price: 195, taxRate: '16% VAT' },
];

export const HeroCounterPreview: React.FC<{ onLaunchDemo?: () => void }> = ({ onLaunchDemo }) => {
  const [mode, setMode] = useState<'checkout' | 'mpesa' | 'offline'>('checkout');
  const [quantities, setQuantities] = useState<Record<string, number>>({
    maize: 2,
    milk: 3,
    oil: 1,
    tea: 0,
  });
  const [heroReceiptSynced, setHeroReceiptSynced] = useState(true);

  const basketRows = HERO_CATALOG.filter((item) => (quantities[item.id] || 0) > 0);
  const totalKes = basketRows.reduce(
    (sum, item) => sum + item.price * (quantities[item.id] || 0),
    0
  );
  const totalItems = basketRows.reduce((sum, item) => sum + (quantities[item.id] || 0), 0);

  const incrementItem = (id: string) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.min(9, (prev[id] || 0) + 1),
    }));
  };

  return (
    <div className="w-full rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl shadow-slate-950/10 overflow-hidden text-[#090d16]">
      {/* Window Header + Interactive Mode Switcher */}
      <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#090d16] whitespace-nowrap">
          <Receipt className="w-4 h-4 text-[#28a745] shrink-0" />
          <span>Counter Till #01 · Nairobi</span>
        </div>

        <div
          role="tablist"
          aria-label="Hero counter simulation modes"
          className="inline-flex items-center p-0.5 rounded-lg bg-[#e2e8f0]/75 gap-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'checkout'}
            onClick={() => setMode('checkout')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              mode === 'checkout'
                ? 'bg-white text-[#090d16] shadow-xs'
                : 'text-[#475569] hover:text-[#090d16]'
            }`}
          >
            Basket
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'mpesa'}
            onClick={() => setMode('mpesa')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              mode === 'mpesa'
                ? 'bg-white text-[#28a745] shadow-xs'
                : 'text-[#475569] hover:text-[#090d16]'
            }`}
          >
            M-Pesa STK
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'offline'}
            onClick={() => setMode('offline')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              mode === 'offline'
                ? 'bg-white text-[#b45309] shadow-xs'
                : 'text-[#475569] hover:text-[#090d16]'
            }`}
          >
            Offline Safe
          </button>
        </div>
      </div>

      {/* Interactive Panel Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {mode === 'checkout' && (
          <>
            <div className="flex items-center justify-between text-xs text-[#475569]">
              <span className="font-semibold text-[#090d16]">Tap items to ring up a basket</span>
              <span className="font-mono tabular-nums">{totalItems} items</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HERO_CATALOG.map((item) => {
                const qty = quantities[item.id] || 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => incrementItem(item.id)}
                    className={`text-left p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      qty > 0
                        ? 'border-[#28a745]/40 bg-emerald-50/45 hover:bg-emerald-50/80'
                        : 'border-[#e2e8f0] bg-[#f8fafc] hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-[#090d16] truncate">
                        {item.name}
                      </span>
                      <span className="block text-[11px] text-[#475569] font-mono tabular-nums">
                        KES {item.price} · {item.taxRate}
                      </span>
                    </div>
                    <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md bg-white border border-[#e2e8f0] text-xs font-mono font-bold text-[#090d16] tabular-nums shrink-0">
                      {qty > 0 ? `×${qty}` : <Plus className="w-3.5 h-3.5 text-[#28a745]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {mode === 'mpesa' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/55 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="block text-xs font-semibold text-[#28a745]">
                  Safaricom Daraja STK · Matched
                </span>
                <h4 className="text-base font-extrabold text-[#090d16] mt-0.5">
                  Customer paid +254 712 ••• 891
                </h4>
              </div>
              <CheckCircle2 className="w-5 h-5 text-[#28a745] shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-emerald-200/80 text-xs">
              <div>
                <span className="block text-[11px] text-[#475569]">M-Pesa Reference</span>
                <span className="font-mono font-bold text-[#090d16] tabular-nums">SHK892X4LP</span>
              </div>
              <div>
                <span className="block text-[11px] text-[#475569]">Linked Receipt</span>
                <span className="font-mono font-bold text-[#090d16] tabular-nums">#INV-4092</span>
              </div>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Automatically reconciles with evening cash count—zero SMS screenshot checking required.
            </p>
          </div>
        )}

        {mode === 'offline' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="block text-xs font-semibold text-[#b45309]">
                  IndexedDB Outbox Active
                </span>
                <h4 className="text-base font-extrabold text-[#090d16] mt-0.5">
                  Fiber dropped? Keep scanning.
                </h4>
              </div>
              <WifiOff className="w-5 h-5 text-[#b45309] shrink-0" />
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-amber-200/80">
              <span className="text-[#475569]">
                {heroReceiptSynced
                  ? '3 offline receipts synced to KRA & Cloud'
                  : '1 offline receipt queued locally'}
              </span>
              <button
                type="button"
                onClick={() => setHeroReceiptSynced((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-amber-300 text-[11px] font-bold text-[#090d16] hover:bg-amber-100/60 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{heroReceiptSynced ? 'Simulate Drop' : 'Sync Outbox'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Receipt Total & Primary Action Bar */}
        <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] text-[#475569]">
              Total Due · eTIMS Ready
            </span>
            <span className="text-xl font-extrabold font-mono text-[#090d16] tabular-nums">
              KES {totalKes.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            type="button"
            onClick={onLaunchDemo}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] rounded-xl bg-[#28a745] hover:bg-[#218838] text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Open Live Till</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface OfflineQueueItem {
  receiptNo: string;
  amountKes: number;
  method: string;
  synced: boolean;
}

const INITIAL_OFFLINE_ITEMS: OfflineQueueItem[] = [
  { receiptNo: 'OFF-1041', amountKes: 640, method: 'Cash', synced: true },
  { receiptNo: 'OFF-1042', amountKes: 1280, method: 'M-Pesa Till', synced: true },
];

export const OfflineQueueSimulator: React.FC<{ activeStep: number }> = ({ activeStep }) => {
  const [isOnline, setIsOnline] = useState(false);
  const nextSeqRef = useRef<number>(1044);
  const [items, setItems] = useState<OfflineQueueItem[]>([
    ...INITIAL_OFFLINE_ITEMS,
    { receiptNo: 'OFF-1043', amountKes: 910, method: 'Cash', synced: false },
  ]);

  useEffect(() => {
    if (activeStep === 2) {
      setIsOnline(true);
    } else if (activeStep === 1) {
      setIsOnline(false);
    }
  }, [activeStep]);

  useEffect(() => {
    if (!isOnline) return;
    const timer = window.setTimeout(() => {
      setItems((prev) => prev.map((row) => ({ ...row, synced: true })));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isOnline]);

  const addOfflineSale = () => {
    const seq = nextSeqRef.current;
    nextSeqRef.current += 1;
    const sampleAmounts = [450, 1120, 780, 1950, 320];
    const amt = sampleAmounts[seq % sampleAmounts.length];
    setItems((prev) => [
      {
        receiptNo: `OFF-${seq}`,
        amountKes: amt,
        method: seq % 2 === 0 ? 'Cash' : 'M-Pesa Till',
        synced: isOnline,
      },
      ...prev.slice(0, 3),
    ]);
  };

  const pendingCount = items.filter((item) => !item.synced).length;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-200/80 via-emerald-100/80 to-sky-100/90 p-5 sm:p-7 border border-[#e2e8f0]">
      <div className="rounded-xl bg-white border border-[#e2e8f0] shadow-lg shadow-slate-900/5 overflow-hidden text-[#090d16]">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-[#28a745] shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-[#b45309] shrink-0" />
            )}
            <span>{isOnline ? 'Safaricom Fiber Connected' : 'Fiber Cut · Local Outbox Mode'}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsOnline((prev) => !prev)}
            className={`px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-bold border transition cursor-pointer whitespace-nowrap shrink-0 ${
              isOnline
                ? 'bg-amber-50 border-amber-200 text-[#b45309] hover:bg-amber-100'
                : 'bg-[#28a745] border-[#28a745] text-white hover:bg-[#218838]'
            }`}
          >
            {isOnline ? 'Simulate Fiber Drop' : 'Restore Fiber & Sync'}
          </button>
        </div>

        {/* Outbox Metrics + Ring Up Control */}
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="block text-[11px] text-[#475569]">Queued Receipts</span>
                <span className="font-mono font-extrabold text-base tabular-nums text-[#090d16]">
                  {pendingCount}
                </span>
              </div>
              <div className="h-7 w-px bg-[#e2e8f0]" aria-hidden="true" />
              <div>
                <span className="block text-[11px] text-[#475569]">Queue Continuity</span>
                <span className="font-mono font-extrabold text-base tabular-nums text-[#28a745]">
                  100%
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={addOfflineSale}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg bg-[#090d16] hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ring Up Sale</span>
            </button>
          </div>

          {/* Receipt Outbox Feed */}
          <div className="divide-y divide-[#e2e8f0] border border-[#e2e8f0] rounded-xl overflow-hidden bg-[#f8fafc]">
            {items.map((row) => (
              <div
                key={row.receiptNo}
                className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs bg-white"
              >
                <div className="min-w-0">
                  <span className="font-mono font-bold text-[#090d16]">{row.receiptNo}</span>
                  <span className="text-[#475569] ml-2">· {row.method}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-bold text-[#090d16] tabular-nums">
                    KES {row.amountKes.toLocaleString('en-KE')}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      row.synced ? 'text-[#28a745]' : 'text-[#b45309]'
                    }`}
                  >
                    {row.synced ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Synced</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MpesaMatcherSimulator: React.FC<{ activeStep: number }> = ({ activeStep }) => {
  const [channel, setChannel] = useState<'stk' | 'till'>('stk');
  const [stage, setStage] = useState<'idle' | 'sending' | 'matched'>('matched');
  const [selectedAmount, setSelectedAmount] = useState<number>(1450);

  useEffect(() => {
    if (activeStep === 1) {
      setChannel('till');
    } else if (activeStep === 0) {
      setChannel('stk');
    }
  }, [activeStep]);

  const triggerStkSimulation = (amount: number) => {
    setSelectedAmount(amount);
    setStage('sending');
  };

  useEffect(() => {
    if (stage !== 'sending') return;
    const timer = window.setTimeout(() => {
      setStage('matched');
    }, 850);
    return () => window.clearTimeout(timer);
  }, [stage]);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-200/80 via-emerald-100/85 to-teal-100/90 p-5 sm:p-7 border border-[#e2e8f0]">
      <div className="rounded-xl bg-white border border-[#e2e8f0] shadow-lg shadow-slate-900/5 overflow-hidden text-[#090d16]">
        {/* Top Controls */}
        <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Smartphone className="w-4 h-4 text-[#0284c7] shrink-0" />
            <span>M-Pesa Reconciliation</span>
          </div>

          <div className="inline-flex p-0.5 rounded-lg bg-[#e2e8f0]/75 gap-0.5">
            <button
              type="button"
              onClick={() => setChannel('stk')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                channel === 'stk' ? 'bg-white text-[#090d16] shadow-xs' : 'text-[#475569]'
              }`}
            >
              STK Push
            </button>
            <button
              type="button"
              onClick={() => setChannel('till')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                channel === 'till' ? 'bg-white text-[#090d16] shadow-xs' : 'text-[#475569]'
              }`}
            >
              Till Buy Goods
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Kenyan Amount Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#475569]">Test counter amount:</span>
            <div className="flex items-center gap-1.5">
              {[750, 1450, 3200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => triggerStkSimulation(amt)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold tabular-nums transition cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedAmount === amt
                      ? 'bg-emerald-50 border-[#28a745] text-[#28a745]'
                      : 'bg-[#f8fafc] border-[#e2e8f0] text-[#090d16] hover:border-slate-300'
                  }`}
                >
                  KES {amt.toLocaleString('en-KE')}
                </button>
              ))}
            </div>
          </div>

          {/* Match Card */}
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#475569] font-medium">
                {channel === 'stk' ? 'Daraja Express Prompt' : 'Lipa na M-Pesa Till 884210'}
              </span>
              <span
                className={`font-bold ${
                  stage === 'matched'
                    ? 'text-[#28a745]'
                    : stage === 'sending'
                    ? 'text-[#0284c7]'
                    : 'text-[#475569]'
                }`}
              >
                {stage === 'matched'
                  ? 'Matched to Receipt #INV-4092'
                  : stage === 'sending'
                  ? 'Awaiting Customer PIN...'
                  : 'Ready'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#e2e8f0] text-xs">
              <div>
                <span className="block text-[11px] text-[#475569]">Amount</span>
                <span className="font-mono font-extrabold text-[#090d16] tabular-nums">
                  KES {selectedAmount.toLocaleString('en-KE')}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#475569]">Daraja Code</span>
                <span className="font-mono font-bold text-[#090d16] tabular-nums">
                  {stage === 'sending' ? 'Waiting...' : 'SHK892X4LP'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#475569]">Shift Variance</span>
                <span className="font-mono font-bold text-[#28a745] tabular-nums">KES 0.00</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => triggerStkSimulation(selectedAmount)}
            className="w-full py-2.5 px-4 min-h-[40px] rounded-xl bg-[#28a745] hover:bg-[#218838] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>
              {stage === 'sending'
                ? 'Sending Prompt to Customer...'
                : `Simulate ${channel === 'stk' ? 'STK Push' : 'Till Match'} (KES ${selectedAmount.toLocaleString('en-KE')})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const EtimsReceiptSimulator: React.FC<{ activeStep: number }> = ({ activeStep }) => {
  const [docType, setDocType] = useState<'invoice' | 'credit_note'>('invoice');

  useEffect(() => {
    if (activeStep === 2) {
      setDocType('credit_note');
    } else {
      setDocType('invoice');
    }
  }, [activeStep]);

  const isCredit = docType === 'credit_note';

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-200/75 via-sky-100/85 to-slate-200/80 p-5 sm:p-7 border border-[#e2e8f0]">
      <div className="rounded-xl bg-white border border-[#e2e8f0] shadow-lg shadow-slate-900/5 overflow-hidden text-[#090d16]">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-[#28a745] shrink-0" />
            <span>KRA eTIMS via Digitax</span>
          </div>

          <div className="inline-flex p-0.5 rounded-lg bg-[#e2e8f0]/75 gap-0.5">
            <button
              type="button"
              onClick={() => setDocType('invoice')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                !isCredit ? 'bg-white text-[#090d16] shadow-xs' : 'text-[#475569]'
              }`}
            >
              Tax Invoice
            </button>
            <button
              type="button"
              onClick={() => setDocType('credit_note')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                isCredit ? 'bg-white text-[#b45309] shadow-xs' : 'text-[#475569]'
              }`}
            >
              Credit Note
            </button>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 text-xs">
              <span className="font-bold text-[#090d16] block">
                {isCredit ? 'KRA Fiscal Credit Note · #CN-019' : 'KRA Fiscal Tax Invoice · #INV-4092'}
              </span>
              <span className="block text-[11px] text-[#475569] font-mono tabular-nums">
                CU Serial: KRAMW0122026 · PIN: P051••••89K
              </span>
            </div>

            <div className="p-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] shrink-0">
              <QrCode className="w-9 h-9 text-[#090d16]" aria-hidden="true" />
            </div>
          </div>

          {/* Itemized Tax Breakdown */}
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#090d16] font-medium">Cooking Oil 1L (16% VAT)</span>
              <span className="font-mono font-bold tabular-nums">
                {isCredit ? '-KES 340.00' : 'KES 340.00'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#090d16] font-medium">Pembe Maize Meal 2kg (Exempt)</span>
              <span className="font-mono font-bold tabular-nums">
                {isCredit ? '-KES 420.00' : 'KES 420.00'}
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-[#e2e8f0] flex items-center justify-between font-bold">
              <span className="text-[#475569]">Verified VAT 16% + Net</span>
              <span className="font-mono text-[#090d16] tabular-nums">
                {isCredit ? '-KES 760.00' : 'KES 760.00'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-[#475569]">
            <span className="font-mono truncate">
              {isCredit ? 'Reversed against #INV-4092' : 'Signed · 22 Nov 2026 · 18:42 EAT'}
            </span>
            <button
              type="button"
              onClick={() => setDocType(isCredit ? 'invoice' : 'credit_note')}
              className="inline-flex items-center gap-1 font-bold text-[#0284c7] hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isCredit ? 'View Original Sale' : 'Simulate Refund'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
