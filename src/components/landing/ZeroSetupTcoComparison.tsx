import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileSpreadsheet, Loader2, Zap } from 'lucide-react';
import { DEFAULT_PRICING_TIERS, PricingTier } from '../../types/pricing';
import { usePos } from '../../context/PosContext';

type ScenarioId = 'starter' | 'business' | 'premium';

interface ComparisonRow {
  label: string;
  sokoposValue: string;
  sokoposStatus: 'included' | 'zero';
  legacyValue: string;
}

interface ScenarioConfig {
  id: ScenarioId;
  tabLabel: string;
  branchScope: string;
  planName: string;
  monthlyKes: number;
  annualKes: number;
  legacyTierLabel: string;
  legacySetupRange: string;
  legacyRenewalRange: string;
  legacyYear1Min: number;
  legacyYear1Max: number;
  legacyHasExtraBranchFees?: boolean;
  rows: ComparisonRow[];
}

interface ZeroSetupTcoComparisonProps {
  pricingTiers?: PricingTier[];
  onLaunchDemo?: () => void;
  onCreateAccount?: () => void;
  onViewPricing?: () => void;
  variant?: 'landing' | 'pricing';
}

const fmt = new Intl.NumberFormat('en-KE');

export const ZeroSetupTcoComparison: React.FC<ZeroSetupTcoComparisonProps> = ({
  pricingTiers,
  onLaunchDemo,
  onCreateAccount,
  onViewPricing,
  variant = 'landing',
}) => {
  const { showToast } = usePos();
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>('business');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const scenarios = useMemo<Record<ScenarioId, ScenarioConfig>>(() => {
    const source = pricingTiers && pricingTiers.length > 0 ? pricingTiers : DEFAULT_PRICING_TIERS;
    const starterTier = source.find((t) => t.id === 'starter') || DEFAULT_PRICING_TIERS[1];
    const businessTier = source.find((t) => t.id === 'business') || DEFAULT_PRICING_TIERS[2];
    const premiumTier = source.find((t) => t.id === 'premium') || DEFAULT_PRICING_TIERS[3];

    return {
      starter: {
        id: 'starter',
        tabLabel: '1 Branch · Starter',
        branchScope: 'Solo shop, kiosk, or single till',
        planName: `SokoPoS ${starterTier.name}`,
        monthlyKes: starterTier.monthlyPrice,
        annualKes: starterTier.annualPrice,
        legacyTierLabel: 'Legacy Local ERP (Entry)',
        legacySetupRange: 'Ksh 29,999 – 45,000',
        legacyRenewalRange: 'Ksh 6,500 – 13,500 / yr',
        legacyYear1Min: 36499,
        legacyYear1Max: 58500,
        rows: [
          {
            label: 'One-Time Implementation & Setup Fee',
            sokoposValue: 'Ksh 0 (Self-serve in 5 min)',
            sokoposStatus: 'zero',
            legacyValue: 'Ksh 29,999 – 45,000 upfront',
          },
          {
            label: 'Annual Software License',
            sokoposValue: `Ksh ${fmt.format(starterTier.annualPrice)} / yr (or Ksh ${fmt.format(starterTier.monthlyPrice)}/mo)`,
            sokoposStatus: 'included',
            legacyValue: 'Ksh 6,500 – 13,500 / yr',
          },
          {
            label: 'M-Pesa STK & Till Reconciliation',
            sokoposValue: 'Included from Day 1',
            sokoposStatus: 'included',
            legacyValue: 'Requires Ksh 45,000 setup tier',
          },
          {
            label: 'Offline Checkout + Auto Cloud Sync',
            sokoposValue: 'Included on all tiers',
            sokoposStatus: 'included',
            legacyValue: 'Not included (Ksh 80k+ tier only)',
          },
          {
            label: 'Hardware & Browser Freedom',
            sokoposValue: 'Phone, tablet, laptop + 58/80mm',
            sokoposStatus: 'included',
            legacyValue: 'Desktop machine + locked install',
          },
          {
            label: 'Staff Logins Included',
            sokoposValue: 'Up to 2 cashier PIN logins',
            sokoposStatus: 'included',
            legacyValue: 'Capped at 2–4 seats',
          },
        ],
      },
      business: {
        id: 'business',
        tabLabel: '2–3 Branches · Business',
        branchScope: 'Mini-marts, agrovets, bars & growing shops',
        planName: `SokoPoS ${businessTier.name}`,
        monthlyKes: businessTier.monthlyPrice,
        annualKes: businessTier.annualPrice,
        legacyTierLabel: 'Legacy Local ERP (Mid-Tier)',
        legacySetupRange: 'Ksh 80,000 – 100,000',
        legacyRenewalRange: 'Ksh 18,500 – 25,500 / yr',
        legacyYear1Min: 80000,
        legacyYear1Max: 125500,
        legacyHasExtraBranchFees: true,
        rows: [
          {
            label: 'One-Time Implementation & Setup Fee',
            sokoposValue: 'Ksh 0 (Zero setup fee)',
            sokoposStatus: 'zero',
            legacyValue: 'Ksh 80,000 – 100,000 upfront',
          },
          {
            label: 'Annual Software License',
            sokoposValue: `Ksh ${fmt.format(businessTier.annualPrice)} / yr (or Ksh ${fmt.format(businessTier.monthlyPrice)}/mo)`,
            sokoposStatus: 'included',
            legacyValue: 'Ksh 18,500 – 25,500 / yr',
          },
          {
            label: 'M-Pesa STK Push & Split Payments',
            sokoposValue: 'Built in (auto-reconciled)',
            sokoposStatus: 'included',
            legacyValue: 'Manual SMS check or add-on',
          },
          {
            label: 'KRA eTIMS & VAT Breakdown Reports',
            sokoposValue: 'Included (15+ KRA reports)',
            sokoposStatus: 'included',
            legacyValue: 'Locked to Ksh 100,000+ tier',
          },
          {
            label: 'Offline POS + Cloud Branch Sync',
            sokoposValue: 'Included + instant remote view',
            sokoposStatus: 'included',
            legacyValue: 'Locked to Ksh 80,000+ tier',
          },
          {
            label: 'Multi-Branch & Staff Allowance',
            sokoposValue: 'Up to 3 branches · 10 staff PINs',
            sokoposStatus: 'included',
            legacyValue: 'Extra per-branch quote fees',
          },
        ],
      },
      premium: {
        id: 'premium',
        tabLabel: '4+ Branches · Premium',
        branchScope: 'Supermarkets, pharmacies & wholesale hubs',
        planName: `SokoPoS ${premiumTier.name}`,
        monthlyKes: premiumTier.monthlyPrice,
        annualKes: premiumTier.annualPrice,
        legacyTierLabel: 'Legacy Local ERP (Enterprise)',
        legacySetupRange: 'Ksh 250,000',
        legacyRenewalRange: 'Ksh 60,500 / yr',
        legacyYear1Min: 250000,
        legacyYear1Max: 310500,
        rows: [
          {
            label: 'One-Time Implementation & Setup Fee',
            sokoposValue: 'Ksh 0 (Instant provisioning)',
            sokoposStatus: 'zero',
            legacyValue: 'Ksh 250,000 upfront CapEx',
          },
          {
            label: 'Annual Software License',
            sokoposValue: `Ksh ${fmt.format(premiumTier.annualPrice)} / yr (or Ksh ${fmt.format(premiumTier.monthlyPrice)}/mo)`,
            sokoposStatus: 'included',
            legacyValue: 'Ksh 60,500 / yr mandatory renewal',
          },
          {
            label: 'Branches & Staff Accounts',
            sokoposValue: 'Unlimited branches & staff logins',
            sokoposStatus: 'included',
            legacyValue: 'Capped at 40 users; quote extra',
          },
          {
            label: 'Batch Numbering & Expiry Alerts',
            sokoposValue: 'Included (30/60/90-day alerts)',
            sokoposStatus: 'included',
            legacyValue: 'Custom module quotation',
          },
          {
            label: 'Role Permissions & Audit Logs',
            sokoposValue: 'Granular RBAC + blind cash counts',
            sokoposStatus: 'included',
            legacyValue: 'Enterprise tier only',
          },
          {
            label: 'KRA eTIMS & Multi-Warehouse Sync',
            sokoposValue: 'Included across every hub',
            sokoposStatus: 'included',
            legacyValue: 'Custom integration project',
          },
        ],
      },
    };
  }, [pricingTiers]);

  const active = scenarios[selectedScenario];
  const minSavings = Math.max(0, active.legacyYear1Min - active.annualKes);
  const maxSavings = Math.max(0, active.legacyYear1Max - active.annualKes);

  const handleCopySalesSummary = async () => {
    const summaryLines = [
      `SokoPoS Zero-Setup Year-1 Cost Comparison (${active.tabLabel})`,
      `--------------------------------------------------`,
      `• ${active.planName}: Ksh 0 setup + Ksh ${fmt.format(active.annualKes)}/yr = Ksh ${fmt.format(active.annualKes)} Year-1 Total`,
      `• ${active.legacyTierLabel}: ${active.legacySetupRange} setup + ${active.legacyRenewalRange} = Ksh ${fmt.format(active.legacyYear1Min)}–${fmt.format(active.legacyYear1Max)}${active.legacyHasExtraBranchFees ? '+' : ''} Year-1 Total`,
      `• Working Capital Saved in Year 1: Ksh ${fmt.format(minSavings)}–${fmt.format(maxSavings)}${active.legacyHasExtraBranchFees ? '+' : ''}`,
      ``,
      `Included on SokoPoS:`,
      ...active.rows.map((r) => `- ${r.label}: ${r.sokoposValue}`),
      ``,
      `Optional 1-on-1 Printer Pairing & CSV Stock Upload: Ksh 1,999 one-time.`,
      `Try Test Mode free or sign up at https://sokopos.co.ke`,
    ];

    try {
      await navigator.clipboard.writeText(summaryLines.join('\n'));
      setCopiedSummary(true);
      showToast('Year-1 TCO sales comparison copied to clipboard.', 'success');
      setTimeout(() => setCopiedSummary(false), 2400);
    } catch {
      showToast('Unable to access clipboard. Use Download Sales Sheet PDF instead.', 'info');
    }
  };

  const handleDownloadSalesSheetPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 18;

      // Clean Header Strip
      doc.setFillColor(9, 13, 22);
      doc.rect(0, 0, pageWidth, 34, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('SokoPoS — Zero Setup Fee Sales Sheet', 14, 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(167, 243, 208);
      doc.text('Year-1 Total Cost of Ownership (TCO): Modern Cloud POS vs. Legacy Local ERP', 14, 23);
      doc.setTextColor(203, 213, 225);
      doc.text('WhatsApp Setup Desk: +254 740 463 021  |  Self-Serve Demo & Activation', 14, 29);

      y = 44;

      // Headline Callout Box
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(14, y, pageWidth - 28, 24, 3, 3, 'FD');
      doc.setTextColor(6, 95, 70);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(
        `Benchmark (${active.tabLabel}): ${active.planName} Ksh ${fmt.format(active.annualKes)}/yr vs. Legacy ERP Ksh ${fmt.format(active.legacyYear1Min)}–${fmt.format(active.legacyYear1Max)} Year 1`,
        18,
        y + 9
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Keep Ksh ${fmt.format(minSavings)} to Ksh ${fmt.format(maxSavings)}${active.legacyHasExtraBranchFees ? '+' : ''} in shop stock instead of paying upfront ERP implementation fees.`,
        18,
        y + 17
      );

      y += 32;

      // Table Column Headers
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, y, pageWidth - 28, 9, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text('Cost / Operational Factor', 17, y + 6);
      doc.text(active.planName, 86, y + 6);
      doc.text(active.legacyTierLabel, 138, y + 6);
      y += 9;

      // Rows
      doc.setFont('helvetica', 'normal');
      active.rows.forEach((row, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, pageWidth - 28, 10, 'F');
        }
        doc.setDrawColor(226, 232, 240);
        doc.line(14, y + 10, pageWidth - 14, y + 10);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(row.label, 17, y + 6.5, { maxWidth: 65 });

        doc.setTextColor(21, 128, 61);
        doc.text(row.sokoposValue, 86, y + 6.5, { maxWidth: 49 });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(row.legacyValue, 138, y + 6.5, { maxWidth: 55 });
        y += 10;
      });

      // Year-1 Total Row
      doc.setFillColor(9, 13, 22);
      doc.rect(14, y, pageWidth - 28, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL YEAR-1 CASH OUTLAY', 17, y + 7.5);
      doc.setTextColor(110, 231, 183);
      doc.text(`Ksh ${fmt.format(active.annualKes)} / yr`, 86, y + 7.5);
      doc.setTextColor(253, 186, 116);
      doc.text(
        `Ksh ${fmt.format(active.legacyYear1Min)} – ${fmt.format(active.legacyYear1Max)}${active.legacyHasExtraBranchFees ? '+' : ''}`,
        138,
        y + 7.5
      );

      y += 22;

      // All 3 Tiers Quick Matrix
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('All SokoPoS Zero-Setup Plans vs. Legacy ERP Benchmarks', 14, y);
      y += 6;

      (['starter', 'business', 'premium'] as ScenarioId[]).forEach((key) => {
        const sc = scenarios[key];
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(`${sc.tabLabel} — ${sc.branchScope}`, 18, y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(21, 128, 61);
        doc.text(
          `${sc.planName}: Ksh ${fmt.format(sc.annualKes)}/yr (Ksh ${fmt.format(sc.monthlyKes)}/mo, Ksh 0 setup)`,
          18,
          y + 11
        );
        doc.setTextColor(71, 85, 105);
        doc.text(
          `vs. Legacy: Ksh ${fmt.format(sc.legacyYear1Min)}–${fmt.format(sc.legacyYear1Max)} Year 1`,
          128,
          y + 11
        );
        y += 17;
      });

      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        'Optional 1-on-1 Guided Store Setup (Bluetooth/USB thermal printer pairing, bulk CSV inventory migration & KRA tax mapping): Ksh 1,999 one-time.',
        14,
        y,
        { maxWidth: pageWidth - 28 }
      );

      doc.save(`SokoPoS-Zero-Setup-Sales-Sheet-${active.id}.pdf`);
      showToast('Downloaded SokoPoS Zero Setup Fee Sales Sheet (PDF).', 'success');
    } catch (err) {
      console.error('Failed generating sales sheet PDF:', err);
      showToast('Could not generate PDF sales sheet. Please try copying the summary instead.', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section Header + Headline Year-1 Comparison Anchor */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <p className="text-xs font-semibold text-[#28a745] tracking-tight">
            Zero Setup Fee · Transparent Year-1 Cost Breakdown
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.45rem] font-extrabold tracking-tight leading-[1.1] text-[#090d16] text-balance">
            Legacy Local ERP: <span className="text-[#475569]">Ksh 80,000–125,000 Year 1</span>{' '}
            vs. <span className="text-[#28a745]">SokoPoS Business: Ksh 12,990/yr</span>
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
            Traditional Kenyan POS and ERP vendors charge Ksh 30,000 to Ksh 250,000 upfront before you ring up your first sale—plus extra fees for M-Pesa, offline sync, eTIMS, and extra branches. Start on SokoPoS with Ksh 0 setup fees.
          </p>
        </div>

        {/* Sales Sheet Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            id={`tco-download-sales-sheet-${variant}`}
            onClick={handleDownloadSalesSheetPdf}
            disabled={isDownloadingPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#090d16] hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Download className="w-4 h-4 shrink-0" />
            )}
            <span>Download Sales Sheet (PDF)</span>
          </button>

          <button
            type="button"
            id={`tco-copy-summary-${variant}`}
            onClick={handleCopySalesSummary}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white hover:bg-slate-50 text-[#090d16] border border-[#cbd5e1] hover:border-[#090d16] text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedSummary ? (
              <Check className="w-4 h-4 text-[#28a745] shrink-0" />
            ) : (
              <Copy className="w-4 h-4 shrink-0" />
            )}
            <span>{copiedSummary ? 'Copied Summary' : 'Copy Quote Summary'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Branch Scenario Switcher + Savings Proof Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div
          role="group"
          aria-label="Select shop size for Year-1 comparison"
          className="inline-flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-white border border-[#e2e8f0]"
        >
          {(['starter', 'business', 'premium'] as ScenarioId[]).map((key) => {
            const sc = scenarios[key];
            const isSelected = selectedScenario === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedScenario(key)}
                className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-[#090d16] text-white'
                    : 'text-[#475569] hover:text-[#090d16] hover:bg-[#f8fafc]'
                }`}
              >
                {sc.tabLabel}
              </button>
            );
          })}
        </div>

        <div className="text-xs sm:text-sm text-[#475569] font-medium">
          <span>{active.branchScope}</span>
          <span aria-hidden="true" className="mx-2">·</span>
          <span className="font-bold text-[#28a745] font-mono tabular-nums">
            Save Ksh {fmt.format(minSavings)}–{fmt.format(maxSavings)}
            {active.legacyHasExtraBranchFees ? '+' : ''} in Year 1
          </span>
        </div>
      </div>

      {/* Side-by-Side Year-1 TCO Comparison Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              <th scope="col" className="py-4 px-5 text-xs font-bold text-[#475569] w-[36%]">
                Year-1 Expense &amp; Capability
              </th>
              <th scope="col" className="py-4 px-5 text-xs font-bold text-[#090d16] bg-emerald-50/70 w-[32%]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#28a745] font-extrabold">{active.planName}</span>
                  <span className="font-mono tabular-nums text-[#090d16]">Ksh 0 setup</span>
                </div>
              </th>
              <th scope="col" className="py-4 px-5 text-xs font-bold text-[#475569] w-[32%]">
                {active.legacyTierLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {active.rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-[#e2e8f0] last:border-b-0 hover:bg-slate-50/60 transition-colors"
              >
                <td className="py-3.5 px-5 font-semibold text-[#090d16]">{row.label}</td>
                <td className="py-3.5 px-5 bg-emerald-50/40 font-semibold text-[#065f46] font-mono tabular-nums text-xs sm:text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#28a745] shrink-0" aria-hidden="true" />
                    <span>{row.sokoposValue}</span>
                  </span>
                </td>
                <td className="py-3.5 px-5 text-[#475569] font-mono tabular-nums text-xs sm:text-sm">
                  {row.legacyValue}
                </td>
              </tr>
            ))}

            {/* Total Year-1 Outlay Summary Row */}
            <tr className="bg-[#090d16] text-white">
              <td className="py-4 px-5 font-extrabold text-sm">
                Total Year-1 Cash Outlay
                <span className="block text-xs font-normal text-slate-300 mt-0.5">
                  Setup cost + 12 months software access
                </span>
              </td>
              <td className="py-4 px-5 font-mono tabular-nums">
                <strong className="block text-lg sm:text-xl font-extrabold text-emerald-300">
                  Ksh {fmt.format(active.annualKes)} / yr
                </strong>
                <span className="block text-xs text-slate-300 mt-0.5">
                  Or Ksh {fmt.format(active.monthlyKes)}/month · cancel anytime
                </span>
              </td>
              <td className="py-4 px-5 font-mono tabular-nums">
                <strong className="block text-lg sm:text-xl font-extrabold text-amber-200">
                  Ksh {fmt.format(active.legacyYear1Min)}–{fmt.format(active.legacyYear1Max)}
                  {active.legacyHasExtraBranchFees ? '+' : ''}
                </strong>
                <span className="block text-xs text-slate-300 mt-0.5">
                  Locked annual contract + branch fees
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Guidance & Action Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#475569] max-w-2xl">
          <FileSpreadsheet className="w-4 h-4 text-[#28a745] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong className="text-[#090d16]">Switching from a legacy ERP?</strong> Import your existing SKU catalog via CSV in minutes, or book optional 1-on-1 printer pairing and KRA tax mapping for a flat <span className="font-mono font-bold text-[#090d16] tabular-nums">Ksh 1,999</span> one-time session.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onLaunchDemo && (
            <button
              type="button"
              onClick={onLaunchDemo}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-full bg-[#28a745] hover:bg-[#218838] text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
              <span>Test Free in Demo</span>
            </button>
          )}
          {onCreateAccount && (
            <button
              type="button"
              onClick={onCreateAccount}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-full bg-white hover:bg-[#f8fafc] text-[#090d16] border border-[#090d16] text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Start Free (Ksh 0 Setup)</span>
            </button>
          )}
          {variant === 'landing' && onViewPricing && (
            <button
              type="button"
              onClick={onViewPricing}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[42px] text-xs font-bold text-[#0284c7] hover:text-[#0369a1] underline underline-offset-4 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>See all 4 plans</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
