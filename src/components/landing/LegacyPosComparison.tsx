import React from 'react';
import { Check, X } from 'lucide-react';

export const LegacyPosComparison: React.FC<{ onLaunchDemo?: () => void; onStartRegister?: () => void }> = () => {
  const comparisons = [
    {
      feature: 'Upfront Software License',
      legacy: 'KSh 30,000 – 60,000+ upfront fee per terminal',
      soko: 'KSh 0 Upfront — Free trial & affordable plans',
      winner: 'soko'
    },
    {
      feature: 'Setup & Installation Time',
      legacy: 'Days waiting for a field technician to install .exe files',
      soko: 'Instant 30-second browser setup on any device',
      winner: 'soko'
    },
    {
      feature: 'Hardware Requirement',
      legacy: 'Locked to bulky Windows desktop towers & proprietary screens',
      soko: 'Any smartphone, Android tablet, iPad, or laptop',
      winner: 'soko'
    },
    {
      feature: 'Store Owner Remote Access',
      legacy: 'Requires expensive networking add-on or physical presence',
      soko: 'Live real-time sales & stock monitoring on your phone 24/7',
      winner: 'soko'
    },
    {
      feature: 'M-Pesa STK & Till Reconciliation',
      legacy: 'Manual cashier code entry or third-party paid bridging',
      soko: 'Native STK Push, Dynamic QR & automated reference verification',
      winner: 'soko'
    },
    {
      feature: 'Offline Operation & Cloud Sync',
      legacy: 'Manual flash drive backups (high risk of data loss or virus)',
      soko: 'Automated encrypted Google Cloud sync + 100% offline resilience',
      winner: 'soko'
    },
    {
      feature: 'KRA eTIMS Tax Compliance',
      legacy: 'Additional charges for tax module updates',
      soko: 'Built-in 16% VAT, Zero, and Exempt receipt breakdowns',
      winner: 'soko'
    }
  ];

  return (
    <section id="pricing-comparison" className="w-full py-12 px-4 sm:px-6 bg-slate-900/40 border-t border-slate-800/80 relative">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            Why Modern Stores are Switching from Legacy POS
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            See how SokoPoS eliminates the unnecessary capital expenditure and technician delays of legacy desktop vendors like SimbaPOS.
          </p>
        </div>

        {/* Comparison Table - Translucent white background with black text */}
        <div className="overflow-x-auto rounded-3xl border border-white/60 bg-white/90 backdrop-blur-md shadow-2xl text-black">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-100">
                <th className="py-4 px-5 text-xs font-black uppercase tracking-wider text-black w-2/5">
                  Comparison Metric
                </th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-neutral-600 w-[30%]">
                  Traditional Legacy POS (e.g. SimbaPOS)
                </th>
                <th className="py-4 px-5 text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50/70 border-l border-blue-200 w-[30%]">
                  SokoPoS Cloud Terminal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80 text-xs">
              {comparisons.map((row, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/80 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-black flex items-center gap-2">
                    <span>{row.feature}</span>
                  </td>
                  <td className="py-3.5 px-4 text-neutral-700">
                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{row.legacy}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-neutral-900 bg-blue-50/40 border-l border-blue-200 font-semibold">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{row.soko}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
