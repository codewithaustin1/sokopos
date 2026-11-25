import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import {
  EtimsReceiptSimulator,
  MpesaMatcherSimulator,
  OfflineQueueSimulator,
} from './KenyanCounterSimulators';

interface LifecycleRowConfig {
  id: 'offline' | 'mpesa' | 'etims';
  title: string;
  description: string;
  accentColor: string;
  steps: { label: string; detail: string }[];
}

const LIFECYCLE_ROWS: LifecycleRowConfig[] = [
  {
    id: 'offline',
    title: 'Sell without stopping',
    description:
      'Fiber cuts and weak bundles never freeze your queue. SokoPoS keeps scanning barcodes and printing thermal slips locally.',
    accentColor: '#d97706',
    steps: [
      {
        label: 'Scan & print when fiber drops',
        detail: 'Local IndexedDB product cache keeps barcode lookup under 50ms even offline.',
      },
      {
        label: 'Queue receipts safely in the outbox',
        detail: 'Every cash or till sale gets a tamper-safe local receipt number until signal returns.',
      },
      {
        label: 'Catch up to cloud & eTIMS automatically',
        detail: 'Pending receipts and tax transmissions drain in order as soon as data reconnects.',
      },
    ],
  },
  {
    id: 'mpesa',
    title: 'Match every shilling',
    description:
      'Stop scrolling through Safaricom SMS messages at 9 PM. Tie M-Pesa STK prompts and Till codes straight to each receipt.',
    accentColor: '#0284c7',
    steps: [
      {
        label: 'Trigger Daraja STK Push from the till',
        detail: 'Send the exact basket total straight to the shopper phone with one tap.',
      },
      {
        label: 'Verify Lipa na M-Pesa Till payments',
        detail: 'Confirm callback codes against the open basket so nobody reuses old screenshots.',
      },
      {
        label: 'Close cash and M-Pesa with zero variance',
        detail: 'Blind cashier shift counts compare drawer cash and M-Pesa separately at close.',
      },
    ],
  },
  {
    id: 'etims',
    title: 'Stay KRA eTIMS ready',
    description:
      'Transmit itemized VAT 16%, zero-rated, and exempt SKUs through Digitax automatically—including KRA Credit Notes on returns.',
    accentColor: '#28a745',
    steps: [
      {
        label: 'Verify SKU tax math before transmission',
        detail: 'Server-side validation checks net amounts, discounts, and KRA tax classes cleanly.',
      },
      {
        label: 'Print Control Unit QR codes on receipts',
        detail: 'Every fiscalized slip carries the verified Digitax CU serial, timestamp, and QR code.',
      },
      {
        label: 'Issue KRA Credit Notes on refunds',
        detail: 'Full or partial counter returns trigger linked eTIMS credit notes automatically.',
      },
    ],
  },
];

const GeometricDotMark: React.FC<{ color: string; variant: 'offline' | 'mpesa' | 'etims' }> = ({
  color,
  variant,
}) => {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className="mb-3"
    >
      {variant === 'offline' && (
        <>
          <rect x="3" y="3" width="4" height="4" rx="1" fill={color} />
          <rect x="12" y="3" width="4" height="4" rx="1" fill={color} opacity="0.45" />
          <rect x="21" y="3" width="4" height="4" rx="1" fill={color} />
          <rect x="3" y="12" width="4" height="4" rx="1" fill={color} opacity="0.45" />
          <rect x="12" y="12" width="4" height="4" rx="1" fill={color} />
          <rect x="21" y="12" width="4" height="4" rx="1" fill={color} opacity="0.45" />
          <rect x="12" y="21" width="4" height="4" rx="1" fill={color} />
        </>
      )}
      {variant === 'mpesa' && (
        <>
          <rect x="12" y="3" width="4" height="4" rx="1" fill={color} />
          <rect x="7" y="10" width="4" height="4" rx="1" fill={color} />
          <rect x="17" y="10" width="4" height="4" rx="1" fill={color} />
          <rect x="3" y="17" width="4" height="4" rx="1" fill={color} opacity="0.45" />
          <rect x="12" y="17" width="4" height="4" rx="1" fill={color} />
          <rect x="21" y="17" width="4" height="4" rx="1" fill={color} opacity="0.45" />
          <rect x="12" y="23" width="4" height="4" rx="1" fill={color} opacity="0.45" />
        </>
      )}
      {variant === 'etims' && (
        <>
          <rect x="4" y="4" width="4" height="4" rx="1" fill={color} />
          <rect x="12" y="4" width="4" height="4" rx="1" fill={color} />
          <rect x="20" y="4" width="4" height="4" rx="1" fill={color} opacity="0.45" />
          <rect x="4" y="12" width="4" height="4" rx="1" fill={color} opacity="0.45" />
          <rect x="12" y="12" width="4" height="4" rx="1" fill={color} />
          <rect x="20" y="12" width="4" height="4" rx="1" fill={color} />
          <rect x="4" y="20" width="4" height="4" rx="1" fill={color} />
          <rect x="12" y="20" width="4" height="4" rx="1" fill={color} opacity="0.45" />
          <rect x="20" y="20" width="4" height="4" rx="1" fill={color} />
        </>
      )}
    </svg>
  );
};

interface LifecycleShowcaseProps {
  onLaunchDemo?: () => void;
}

export const LifecycleShowcase: React.FC<LifecycleShowcaseProps> = ({ onLaunchDemo }) => {
  const [activeSteps, setActiveSteps] = useState<Record<LifecycleRowConfig['id'], number>>({
    offline: 0,
    mpesa: 0,
    etims: 0,
  });

  const selectStep = (rowId: LifecycleRowConfig['id'], idx: number) => {
    setActiveSteps((prev) => ({ ...prev, [rowId]: idx }));
  };

  return (
    <section id="payments" className="py-12 sm:py-16">
      <div className="sp-wrap">
        <div className="rounded-3xl bg-white border border-[#e2e8f0] shadow-xs px-5 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16 space-y-14 sm:space-y-20">
          {/* Centered Showcase Header + Single Accent CTA */}
          <div className="text-center max-w-2xl mx-auto space-y-5">
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-[1.08] text-[#090d16] text-balance">
              From opening till to{' '}
              <span className="text-[#28a745]">closing count</span> on one platform
            </h2>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              People use POS software because they have to. SokoPoS earns its spot on your counter by handling offline queues, M-Pesa matching, and KRA eTIMS together.
            </p>
            <div>
              <button
                type="button"
                onClick={onLaunchDemo}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-full bg-[#28a745] hover:bg-[#218838] text-white text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-4 h-4 fill-white shrink-0" />
                <span>See how Test Mode works</span>
              </button>
            </div>
          </div>

          {/* 3 Alternating 2-Column Lifecycle Rows */}
          <div className="space-y-16 sm:space-y-24">
            {LIFECYCLE_ROWS.map((row, rowIdx) => {
              const isMediaLeft = rowIdx % 2 === 1;
              const activeIdx = activeSteps[row.id];

              const copyColumn = (
                <div className="flex flex-col justify-center">
                  <GeometricDotMark color={row.accentColor} variant={row.id} />
                  <h3 className="text-2xl sm:text-[1.75rem] font-extrabold tracking-tight text-[#090d16] mb-2.5">
                    {row.title}
                  </h3>
                  <p className="text-sm sm:text-[15px] text-[#475569] leading-relaxed mb-6 max-w-md">
                    {row.description}
                  </p>

                  {/* Thin-Ruled Interactive Sub-Feature Rows */}
                  <div className="border-t border-[#e2e8f0]">
                    {row.steps.map((step, idx) => {
                      const isActive = activeIdx === idx;
                      return (
                        <div key={step.label} className="border-b border-[#e2e8f0]">
                          <button
                            type="button"
                            onClick={() => selectStep(row.id, idx)}
                            aria-expanded={isActive}
                            className="w-full py-3.5 text-left flex items-center justify-between gap-3 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#28a745]"
                          >
                            <span
                              className={`text-sm font-semibold transition-colors ${
                                isActive
                                  ? 'text-[#090d16]'
                                  : 'text-[#475569] group-hover:text-[#090d16]'
                              }`}
                            >
                              {step.label}
                            </span>
                            <span
                              className="text-xs font-mono font-bold shrink-0"
                              style={{ color: isActive ? row.accentColor : '#94a3b8' }}
                            >
                              {isActive ? 'Active' : `0${idx + 1}`}
                            </span>
                          </button>
                          {isActive && (
                            <p className="pb-3.5 text-xs sm:text-[13px] text-[#475569] leading-relaxed pr-6">
                              {step.detail}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );

              const simulatorColumn = (
                <div>
                  {row.id === 'offline' && <OfflineQueueSimulator activeStep={activeIdx} />}
                  {row.id === 'mpesa' && <MpesaMatcherSimulator activeStep={activeIdx} />}
                  {row.id === 'etims' && <EtimsReceiptSimulator activeStep={activeIdx} />}
                </div>
              );

              return (
                <div
                  key={row.id}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
                >
                  <div className={`lg:col-span-5 ${isMediaLeft ? 'lg:order-2' : 'lg:order-1'}`}>
                    {copyColumn}
                  </div>
                  <div className={`lg:col-span-7 ${isMediaLeft ? 'lg:order-1' : 'lg:order-2'}`}>
                    {simulatorColumn}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
