import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Save,
  CheckCircle2,
  Sliders,
  RotateCcw,
  FileCheck,
  Zap,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { TaxRule, BusinessTaxSettings, TaxScope } from '../types';
import { DEFAULT_TAX_SETTINGS, DEFAULT_TAX_RULES, resolveDynamicTaxRate } from '../utils/taxResolver';
import {
  digitaxService,
  DigitaxApiError,
  DigitaxSaleResponse,
  DigitaxEtimsInfo,
} from '../services/digitaxService';
import { SettingsSectionHeader } from './common/SettingsSectionHeader';

export const TaxManagementPanel: React.FC = () => {
  const {
    currentBusiness,
    categories,
    locations,
    updateBusinessProfile,
    showToast,
    logAdminActivity,
    soundFx,
    requireCapability,
  } = usePos();

  // Current settings with safe defaults
  const initialSettings: BusinessTaxSettings = currentBusiness?.taxSettings || {
    ...DEFAULT_TAX_SETTINGS,
    taxNumber: currentBusiness?.taxNumber || DEFAULT_TAX_SETTINGS.taxNumber,
  };

  const [taxSettings, setTaxSettings] = useState<BusinessTaxSettings>(initialSettings);
  const [isEditingRule, setIsEditingRule] = useState<boolean>(false);
  const [ruleToEdit, setRuleToEdit] = useState<TaxRule | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Rule Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleCode, setRuleCode] = useState('A');
  const [ruleRate, setRuleRate] = useState('16');
  const [ruleScope, setRuleScope] = useState<TaxScope>('category');
  const [ruleTargetCategory, setRuleTargetCategory] = useState(categories[0] || 'Flour & Grains');
  const [ruleTargetLocationId, setRuleTargetLocationId] = useState(locations[0]?.id || '');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleIsActive, setRuleIsActive] = useState(true);

  // Simulator State
  const [simLocationId, setSimLocationId] = useState(locations[0]?.id || '');
  const [simCategory, setSimCategory] = useState(categories.find((c) => c !== 'All') || 'Flour & Grains');
  const [simAmount, setSimAmount] = useState('1000');

  // Digitax KRA eTIMS Fiscal Engine State
  const [digitaxEnv, setDigitaxEnv] = useState<'sandbox' | 'production'>(
    initialSettings.digitaxEnvironment || 'sandbox'
  );
  const [isTestingDigitax, setIsTestingDigitax] = useState(false);
  const [isTransmittingTestSale, setIsTransmittingTestSale] = useState(false);
  const [etimsInfo, setEtimsInfo] = useState<DigitaxEtimsInfo | null>(null);
  const [recentDigitaxSales, setRecentDigitaxSales] = useState<DigitaxSaleResponse[]>([]);
  const [digitaxStatus, setDigitaxStatus] = useState<
    'checking' | 'connected' | 'unconfigured' | 'error'
  >('checking');
  const [digitaxError, setDigitaxError] = useState<string | null>(null);

  const [digitaxTestResult, setDigitaxTestResult] = useState<{
    status: 'connected' | 'error';
    cuSerial?: string;
    sequenceNo?: string;
    timestamp: string;
    endpoint: string;
    taxPin?: string;
  } | null>(null);
  const [autoTransmitEtims, setAutoTransmitEtims] = useState(
    initialSettings.autoTransmitEtims !== false
  );
  const [generateKraQr, setGenerateKraQr] = useState(true);

  // Sync local digitax/tax form defaults when active tenant switches
  React.useEffect(() => {
    const nextSettings: BusinessTaxSettings = currentBusiness?.taxSettings || {
      ...DEFAULT_TAX_SETTINGS,
      taxNumber: currentBusiness?.taxNumber || DEFAULT_TAX_SETTINGS.taxNumber,
    };
    setTaxSettings(nextSettings);
    setDigitaxEnv(nextSettings.digitaxEnvironment || 'sandbox');
    setAutoTransmitEtims(nextSettings.autoTransmitEtims !== false);
  }, [currentBusiness?.id]);

  // Auto-fetch honest eTIMS connection state for selected environment
  React.useEffect(() => {
    let isMounted = true;
    setDigitaxStatus('checking');
    setDigitaxError(null);

    Promise.allSettled([
      digitaxService.getEtimsInfo(digitaxEnv),
      digitaxService.getSales(digitaxEnv),
    ]).then(([infoRes, salesRes]) => {
      if (!isMounted) return;

      if (infoRes.status === 'fulfilled' && infoRes.value) {
        const info = infoRes.value;
        const sales = salesRes.status === 'fulfilled' && Array.isArray(salesRes.value) ? salesRes.value : [];
        setEtimsInfo(info);
        setRecentDigitaxSales(sales.slice(0, 5));
        setDigitaxStatus('connected');
        setDigitaxError(null);
        setDigitaxTestResult({
          status: 'connected',
          cuSerial: sales[0]?.serial_number,
          sequenceNo: sales[0]?.invoice_number ? String(sales[0].invoice_number) : undefined,
          timestamp: new Date().toISOString(),
          endpoint: '/api/digitax/etims-info',
          taxPin: info.tax_pin,
        });
      } else {
        const reason = infoRes.status === 'rejected' ? infoRes.reason : null;
        const isNotConfigured =
          (reason instanceof DigitaxApiError &&
            (reason.code === 'DIGITAX_NOT_CONFIGURED' || reason.status === 503)) ||
          String(reason?.message || '').toLowerCase().includes('not configured');

        setEtimsInfo(null);
        setRecentDigitaxSales([]);
        setDigitaxTestResult(null);
        setDigitaxStatus(isNotConfigured ? 'unconfigured' : 'error');
        setDigitaxError(
          reason?.message || 'Unable to verify Digitax eTIMS connection with backend gateway.'
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, [digitaxEnv]);

  const handleTestDigitaxPing = async () => {
    setIsTestingDigitax(true);
    soundFx.playBarcodeBeep();
    try {
      const info = await digitaxService.getEtimsInfo(digitaxEnv);
      setEtimsInfo(info);
      const sales = await digitaxService.getSales(digitaxEnv);
      setRecentDigitaxSales(sales.slice(0, 5));

      const activeSeq = sales[0]?.invoice_number ? String(sales[0].invoice_number) : undefined;
      const activeSerial = sales[0]?.serial_number || undefined;

      setDigitaxStatus('connected');
      setDigitaxError(null);
      setDigitaxTestResult({
        status: 'connected',
        cuSerial: activeSerial,
        sequenceNo: activeSeq,
        timestamp: new Date().toISOString(),
        endpoint: '/api/digitax/etims-info',
        taxPin: info.tax_pin,
      });
      soundFx.playSuccess();
      showToast(
        `Digitax eTIMS Online (${digitaxEnv}): PIN ${info.tax_pin} · Branch ${info.branch_office_id}`,
        'success'
      );
    } catch (err: any) {
      soundFx.playError();
      const isNotConfigured =
        (err instanceof DigitaxApiError &&
          (err.code === 'DIGITAX_NOT_CONFIGURED' || err.status === 503)) ||
        String(err?.message || '').toLowerCase().includes('not configured');
      setDigitaxStatus(isNotConfigured ? 'unconfigured' : 'error');
      setDigitaxError(err?.message || 'Handshake error');
      setDigitaxTestResult(null);
      showToast(`Digitax eTIMS notice: ${err?.message || 'Handshake error'}`, 'error');
    } finally {
      setIsTestingDigitax(false);
    }
  };

  const handleTransmitTestSale = async () => {
    setIsTransmittingTestSale(true);
    soundFx.playBarcodeBeep();
    try {
      // Dynamically lookup or register a 16% VAT diagnostic item (never hardcode external IDs)
      const catalogItems = await digitaxService.getItems(digitaxEnv);
      let diagItem = catalogItems.find(
        (it) =>
          it.tax_type_code === 'B' &&
          it.item_name.trim().toLowerCase() === 'diagnostic test item (16% vat)'
      );
      if (!diagItem) {
        diagItem = await digitaxService.registerItem(
          {
            item_name: 'Diagnostic Test Item (16% VAT)',
            tax_type_code: 'B',
            default_unit_price: 350,
            is_stock_item: false,
            package_unit_code: 'CT',
            quantity_unit_code: 'U',
            sku: 'DIAG-VAT-16',
          },
          digitaxEnv
        );
      }

      const today = new Date().toISOString().split('T')[0];
      const invNum = `SOKO-TEST-${Date.now().toString().slice(-6)}`;
      const payload = {
        sale_date: today,
        trader_invoice_number: invNum,
        payment_type_code: '04' as const, // M-Pesa
        invoice_status_code: '02',
        customer_name: 'Walk-in Diagnostic Verification',
        pricing_type: 'inclusive' as const,
        expected_total: 350,
        items: [
          {
            id: diagItem.id,
            sku: 'DIAG-VAT-16',
            name: 'Diagnostic Test Item (16% VAT)',
            quantity: 1,
            unit_price: 350,
            total_amount: 350,
            tax_type_code: 'B' as const,
            tax_rate: 0.16,
            taxable_amount: 301.72,
            tax_amount: 48.28,
            discount_rate: 0,
            discount_amount: 0,
          },
        ],
      };

      const sale = await digitaxService.createSale(payload, {
        environment: digitaxEnv,
        expectedTaxPin: taxSettings.taxNumber,
      });
      showToast(`Sale transmitted (${sale.trader_invoice_number}). Awaiting KRA signature...`, 'info');

      const finalSale = await digitaxService.pollSaleCompletion(sale.id, 6, 1200, digitaxEnv);
      soundFx.playSuccess();
      showToast(
        `KRA eTIMS Verified! CU Serial: ${finalSale.serial_number} • Invoice #${finalSale.invoice_number}`,
        'success'
      );

      // Refresh recent sales
      const sales = await digitaxService.getSales(digitaxEnv);
      setRecentDigitaxSales(sales.slice(0, 5));
      if (sales[0]) {
        setDigitaxTestResult({
          status: 'connected',
          cuSerial: sales[0].serial_number,
          sequenceNo: sales[0].invoice_number ? String(sales[0].invoice_number) : undefined,
          timestamp: new Date().toISOString(),
          endpoint: '/api/digitax/sales',
          taxPin: etimsInfo?.tax_pin || taxSettings.taxNumber,
        });
      }
    } catch (err: any) {
      soundFx.playError();
      showToast(`Failed to transmit test sale: ${err?.message || 'Transmission error'}`, 'error');
    } finally {
      setIsTransmittingTestSale(false);
    }
  };

  const handleOpenAddRule = () => {
    if (!requireCapability('advancedTaxRules')) return;
    setRuleToEdit(null);
    setRuleName('');
    setRuleCode('B');
    setRuleRate('0');
    setRuleScope('category');
    setRuleTargetCategory(categories.find((c) => c !== 'All') || 'Flour & Grains');
    setRuleTargetLocationId(locations[0]?.id || '');
    setRuleDescription('');
    setRuleIsActive(true);
    setIsEditingRule(true);
  };

  const handleOpenEditRule = (rule: TaxRule) => {
    if (!requireCapability('advancedTaxRules')) return;
    setRuleToEdit(rule);
    setRuleName(rule.name);
    setRuleCode(rule.code);
    setRuleRate((rule.rate * 100).toString());
    setRuleScope(rule.scope);
    setRuleTargetCategory(rule.targetCategory || categories[0] || 'Flour & Grains');
    setRuleTargetLocationId(rule.targetLocationId || locations[0]?.id || '');
    setRuleDescription(rule.description || '');
    setRuleIsActive(rule.isActive);
    setIsEditingRule(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      showToast('Rule name is required', 'error');
      return;
    }

    const rateNum = (parseFloat(ruleRate) || 0) / 100;
    const newRule: TaxRule = {
      id: ruleToEdit ? ruleToEdit.id : `tax-rule-${Date.now()}`,
      name: ruleName.trim(),
      code: ruleCode.trim().toUpperCase(),
      rate: rateNum,
      scope: ruleScope,
      targetCategory: ruleScope === 'category' ? ruleTargetCategory : undefined,
      targetLocationId: ruleScope === 'region' ? ruleTargetLocationId : undefined,
      isDefault: ruleToEdit ? ruleToEdit.isDefault : false,
      isActive: ruleIsActive,
      description: ruleDescription.trim(),
    };

    let updatedRules: TaxRule[];
    if (ruleToEdit) {
      updatedRules = taxSettings.rules.map((r) => (r.id === ruleToEdit.id ? newRule : r));
    } else {
      updatedRules = [...taxSettings.rules, newRule];
    }

    setTaxSettings({
      ...taxSettings,
      rules: updatedRules,
    });

    setIsEditingRule(false);
    setRuleToEdit(null);
    soundFx?.playBeep?.(700, 0.08);
    showToast(`Tax rule "${newRule.name}" saved!`, 'success');
  };

  const handleDeleteRule = (ruleId: string) => {
    const rule = taxSettings.rules.find((r) => r.id === ruleId);
    if (rule?.isDefault) {
      showToast('Cannot delete the default standard tax rule', 'error');
      return;
    }

    setTaxSettings({
      ...taxSettings,
      rules: taxSettings.rules.filter((r) => r.id !== ruleId),
    });
    showToast('Tax rule removed', 'info');
  };

  const handleToggleRuleActive = (ruleId: string) => {
    setTaxSettings({
      ...taxSettings,
      rules: taxSettings.rules.map((r) => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r)),
    });
  };

  const handleApplyPresetTemplate = (type: 'kra_standard' | 'flat_gst' | 'eac_standard') => {
    if (!requireCapability('advancedTaxRules')) return;
    if (type === 'kra_standard') {
      setTaxSettings({
        ...taxSettings,
        taxLabel: 'VAT',
        defaultTaxRate: 0.16,
        pricingType: 'inclusive',
        enableDynamicCategoryTax: true,
        enableDynamicRegionalTax: true,
        rules: DEFAULT_TAX_RULES,
      });
      showToast('Applied Kenya KRA Standard VAT Template (16% standard, 0% zero-rated food staples)', 'success');
    } else if (type === 'eac_standard') {
      setTaxSettings({
        ...taxSettings,
        taxLabel: 'VAT',
        defaultTaxRate: 0.18,
        pricingType: 'inclusive',
        enableDynamicCategoryTax: true,
        enableDynamicRegionalTax: true,
        rules: [
          {
            id: 'rule-eac-std',
            name: 'Standard VAT (18%)',
            code: 'A',
            rate: 0.18,
            scope: 'all',
            isDefault: true,
            isActive: true,
            description: 'East African Community Harmonized Standard VAT (18%)',
          },
          {
            id: 'rule-eac-grains',
            name: 'Zero-Rated Grains & Flour (0%)',
            code: 'B',
            rate: 0.0,
            scope: 'category',
            targetCategory: 'Flour & Grains',
            isDefault: false,
            isActive: true,
            description: 'Unprocessed grains, maize meal, wheat flour, basic cereals',
          },
          {
            id: 'rule-eac-produce',
            name: 'Zero-Rated Farm Produce (0%)',
            code: 'B',
            rate: 0.0,
            scope: 'category',
            targetCategory: 'Fresh Produce',
            isDefault: false,
            isActive: true,
            description: 'Unprocessed agricultural fresh vegetables and fruits',
          },
          {
            id: 'rule-eac-export',
            name: 'Free Trade Zone Export (0%)',
            code: 'E',
            rate: 0.0,
            scope: 'region',
            targetLocationId: locations[0]?.id || 'loc-msa',
            isDefault: false,
            isActive: false,
            description: 'Duty-free export processing zone and bonded warehouse supplies',
          },
        ],
      });
      showToast('Applied East Africa Harmonized 18% VAT Template', 'success');
    } else {
      setTaxSettings({
        ...taxSettings,
        taxLabel: 'GST',
        defaultTaxRate: 0.10,
        pricingType: 'inclusive',
        enableDynamicCategoryTax: true,
        enableDynamicRegionalTax: false,
        rules: [
          {
            id: 'rule-gst-std',
            name: 'Standard GST (10%)',
            code: 'GST-10',
            rate: 0.10,
            scope: 'all',
            isDefault: true,
            isActive: true,
            description: 'Flat 10% Goods and Services Tax',
          },
          {
            id: 'rule-gst-fresh',
            name: 'Fresh Food & Groceries (0% GST-Free)',
            code: 'FREE',
            rate: 0.0,
            scope: 'category',
            targetCategory: 'Fresh Produce',
            isDefault: false,
            isActive: true,
            description: 'Basic unprocessed human food exempt from GST',
          },
        ],
      });
      showToast('Applied 10% Flat GST Template', 'success');
    }
    soundFx?.playSuccess?.();
  };

  const handleSaveTaxSettings = async () => {
    setIsSaving(true);
    try {
      const updatedTaxSettings: BusinessTaxSettings = {
        ...taxSettings,
        digitaxEnvironment: digitaxEnv,
        autoTransmitEtims,
        updatedAt: new Date().toISOString(),
      };

      await updateBusinessProfile({
        taxSettings: updatedTaxSettings,
        taxNumber: taxSettings.taxNumber,
      });

      logAdminActivity({
        category: 'business_profile',
        action: 'update_tax_settings',
        description: `Updated tax and fiscal configuration: ${taxSettings.taxLabel} standard rate ${(taxSettings.defaultTaxRate * 100).toFixed(0)}%, ${taxSettings.rules.filter((r) => r.isActive).length} active dynamic rules`,
        recordType: 'business',
        recordId: currentBusiness?.id || 'biz-1',
        beforeValue: currentBusiness?.taxSettings || null,
        afterValue: updatedTaxSettings,
      });

      soundFx?.playSuccess?.();
      showToast('Tax configuration and dynamic rules updated successfully!', 'success');
    } catch (err: any) {
      console.error('Save tax settings error:', err);
      showToast(err.message || 'Failed to update tax configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const activeRuleCount = taxSettings.rules.filter((r) => r.isActive).length;

  return (
    <div
      id="tax-management-panel"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-6"
    >
      <SettingsSectionHeader
        title="Taxes, VAT & KRA eTIMS"
        description="Configure standard tax rates, category exemptions, regional overrides, and automated KRA eTIMS invoice signing via Digitax."
        meta={
          <span className="tabular-nums">
            {taxSettings.taxLabel} {(taxSettings.defaultTaxRate * 100).toFixed(1)}% · {activeRuleCount} active rules
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyPresetTemplate('kra_standard')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition cursor-pointer whitespace-nowrap"
              title="Load standard KRA ETR Class A (16%) and Class B (0% Zero-Rated Staples)"
            >
              KRA ETR (16%)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetTemplate('eac_standard')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition cursor-pointer whitespace-nowrap"
              title="Load East African Community Harmonized 18% VAT Template"
            >
              18% EAC VAT
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetTemplate('flat_gst')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition cursor-pointer whitespace-nowrap"
              title="Load 10% GST Template"
            >
              10% GST
            </button>
          </div>
        }
      />

      {/* Global Tax & Registration Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Global Tax & Registration
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Tax Scheme
            </label>
            <select
              value={taxSettings.taxLabel}
              onChange={(e) => setTaxSettings({ ...taxSettings, taxLabel: e.target.value })}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="VAT">VAT (Value Added Tax)</option>
              <option value="GST">GST (Goods and Services Tax)</option>
              <option value="Sales Tax">Sales Tax</option>
              <option value="Consumption Tax">Consumption Tax</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Default Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={(taxSettings.defaultTaxRate * 100).toString()}
                onChange={(e) =>
                  setTaxSettings({
                    ...taxSettings,
                    defaultTaxRate: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              KRA Tax PIN / Fiscal Reg #
            </label>
            <input
              type="text"
              value={taxSettings.taxNumber}
              onChange={(e) => setTaxSettings({ ...taxSettings, taxNumber: e.target.value.toUpperCase() })}
              placeholder="e.g. P051234567Z"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Price Structure
            </label>
            <select
              value={taxSettings.pricingType}
              onChange={(e) => setTaxSettings({ ...taxSettings, pricingType: e.target.value as any })}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="inclusive">Tax Inclusive (Shelf price includes tax)</option>
              <option value="exclusive">Tax Exclusive (Added at till)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition">
            <input
              type="checkbox"
              checked={taxSettings.enableDynamicCategoryTax}
              onChange={(e) => {
                if (e.target.checked && !requireCapability('advancedTaxRules')) return;
                setTaxSettings({ ...taxSettings, enableDynamicCategoryTax: e.target.checked });
              }}
              className="w-4 h-4 mt-0.5 text-blue-600 rounded cursor-pointer"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Category-Specific Dynamic Rules
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Apply special or zero-rated (0%) rates to entire product categories.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition">
            <input
              type="checkbox"
              checked={taxSettings.enableDynamicRegionalTax}
              onChange={(e) => {
                if (e.target.checked && !requireCapability('advancedTaxRules')) return;
                setTaxSettings({ ...taxSettings, enableDynamicRegionalTax: e.target.checked });
              }}
              className="w-4 h-4 mt-0.5 text-blue-600 rounded cursor-pointer"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Branch / Regional Overrides
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Apply branch-level rates for special economic or export zones.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* KRA eTIMS Integration Section */}
      <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                KRA eTIMS Fiscal Engine
              </h4>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-600 dark:text-slate-400">Digitax Partner Integration</span>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
              {digitaxStatus === 'connected' ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Gateway Connected</span>
                </span>
              ) : digitaxStatus === 'checking' ? (
                <span className="text-slate-500 dark:text-slate-400 font-medium inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Checking Gateway...</span>
                </span>
              ) : digitaxStatus === 'unconfigured' ? (
                <span className="text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>API Key Not Configured</span>
                </span>
              ) : (
                <span className="text-rose-700 dark:text-rose-400 font-medium inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Gateway Offline</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automated Control Unit (CU) invoice signing and KRA verification QR generation via Digitax.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              id="test-digitax-ping-btn"
              disabled={isTestingDigitax}
              onClick={handleTestDigitaxPing}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 font-medium text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Ping Digitax eTIMS server to verify KRA gateway connection"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingDigitax ? 'animate-spin' : ''}`} />
              <span>{isTestingDigitax ? 'Testing Ping...' : 'Test Digitax Ping'}</span>
            </button>

            <button
              type="button"
              id="transmit-digitax-test-sale-btn"
              disabled={isTransmittingTestSale || digitaxStatus === 'unconfigured'}
              onClick={handleTransmitTestSale}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Transmit a live compliant test sale to KRA eTIMS via Digitax"
            >
              <Zap className={`w-3.5 h-3.5 ${isTransmittingTestSale ? 'animate-spin' : ''}`} />
              <span>{isTransmittingTestSale ? 'Signing with KRA...' : 'Transmit Test Sale'}</span>
            </button>
          </div>
        </div>

        {/* Clean Key-Value Integration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/70 dark:bg-slate-950/50 text-xs">
          <div className="p-3.5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Integration Partner</div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">Digitax Technologies</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">KRA Certified Integrator</div>
          </div>

          <div className="p-3.5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Environment</div>
            <div className="inline-flex bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => setDigitaxEnv('sandbox')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  digitaxEnv === 'sandbox'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Sandbox
              </button>
              <button
                type="button"
                onClick={() => setDigitaxEnv('production')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  digitaxEnv === 'production'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Live
              </button>
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Virtual CU Serial</div>
            <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {digitaxTestResult?.cuSerial || 'Awaiting CU sync'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {digitaxTestResult?.cuSerial ? 'Certified Device Unit' : 'Run ping or sale to fetch'}
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Registered Tax PIN</div>
            <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {etimsInfo?.tax_pin || taxSettings.taxNumber || 'Not configured'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {etimsInfo?.branch_office_id
                ? `Branch ${etimsInfo.branch_office_id} · Active`
                : digitaxStatus === 'unconfigured'
                ? 'Gateway offline'
                : 'Tenant PIN profile'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 cursor-pointer">
            <input
              type="checkbox"
              checked={autoTransmitEtims}
              onChange={(e) => setAutoTransmitEtims(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-blue-600 rounded cursor-pointer"
            />
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Auto-Transmit Sales & Credit Notes via Digitax API
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Submits signed itemized fiscal invoices & refund Credit Notes upon completion.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 cursor-pointer">
            <input
              type="checkbox"
              checked={generateKraQr}
              onChange={(e) => setGenerateKraQr(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-blue-600 rounded cursor-pointer"
            />
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Embed KRA Verification QR Codes
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Prints verifiable KRA QR code and CU sequence on receipts once signed.
              </div>
            </div>
          </label>
        </div>

        {digitaxStatus === 'connected' && digitaxTestResult && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Digitax Handshake 200 OK ·{' '}
              {digitaxTestResult.sequenceNo
                ? `Latest CU Invoice ${digitaxTestResult.sequenceNo}`
                : 'Ready to fiscalize sales'}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {new Date(digitaxTestResult.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}

        {(digitaxStatus === 'unconfigured' || digitaxStatus === 'error') && digitaxError && (
          <div
            className={`flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg border ${
              digitaxStatus === 'unconfigured'
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300'
                : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">
                {digitaxStatus === 'unconfigured'
                  ? 'Digitax Server Credentials Required'
                  : 'Digitax Connection Notice'}
              </div>
              <p className="text-[11px] mt-0.5 opacity-90">{digitaxError}</p>
            </div>
          </div>
        )}

        {recentDigitaxSales.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                Recent Transmitted eTIMS Invoices ({recentDigitaxSales.length})
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                KRA Verified
              </span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg max-h-44 overflow-y-auto">
              {recentDigitaxSales.map((sale) => (
                <div
                  key={sale.id}
                  className="px-3 py-2.5 flex items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {sale.trader_invoice_number}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">
                        CU #{sale.invoice_number}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        {sale.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      Serial {sale.serial_number} · {sale.date} {sale.time}
                      {sale.customer_tin ? ` · Buyer ${sale.customer_tin}` : ''}
                    </div>
                  </div>
                  {sale.etims_url && (
                    <a
                      href={sale.etims_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0 whitespace-nowrap"
                    >
                      <span>Verify</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Tax Rules Hierarchy Table */}
      <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              Tax Rules Hierarchy ({taxSettings.rules.length})
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated in order: Regional Overrides &rarr; Category Rules &rarr; Store Default.
            </p>
          </div>

          <button
            type="button"
            id="btn-add-tax-rule"
            onClick={handleOpenAddRule}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Tax Rule</span>
          </button>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-950 text-[11px] font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Code &amp; Rule</th>
                <th className="py-2.5 px-3">Scope / Target</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {taxSettings.rules.map((rule) => {
                const targetLocationName = locations.find((l) => l.id === rule.targetLocationId)?.name;

                return (
                  <tr key={rule.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {rule.code}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {rule.name}
                        </span>
                        {rule.isDefault && (
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            · Default
                          </span>
                        )}
                      </div>
                      {rule.description && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {rule.description}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {rule.scope === 'category'
                        ? `Category: ${rule.targetCategory}`
                        : rule.scope === 'region'
                        ? `Branch: ${targetLocationName || rule.targetLocationId}`
                        : 'All Catalog Items'}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {(rule.rate * 100).toFixed(1)}%
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleRuleActive(rule.id)}
                        className={`text-xs font-medium transition cursor-pointer ${
                          rule.isActive
                            ? 'text-emerald-700 dark:text-emerald-400 hover:underline'
                            : 'text-slate-400 dark:text-slate-500 hover:underline'
                        }`}
                      >
                        {rule.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRule(rule)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition cursor-pointer"
                          title="Edit rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!rule.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition cursor-pointer"
                            title="Delete rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Tax Resolution Simulator */}
      {(() => {
        const simResolved = resolveDynamicTaxRate(
          { category: simCategory },
          simLocationId,
          taxSettings
        );
        const simAmountNum = Math.max(0, parseFloat(simAmount) || 0);
        const isSimExclusive = taxSettings.pricingType === 'exclusive';
        let simNet = 0;
        let simTax = 0;
        let simGross = 0;

        if (isSimExclusive) {
          simNet = simAmountNum;
          simTax = simNet * simResolved.rate;
          simGross = simNet + simTax;
        } else {
          simGross = simAmountNum;
          simNet = simGross / (1 + simResolved.rate);
          simTax = simGross - simNet;
        }

        return (
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Tax Resolution Simulator
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preview how branch overrides and category exemptions calculate at checkout.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Branch / Location
                </label>
                <select
                  value={simLocationId}
                  onChange={(e) => setSimLocationId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Product Category
                </label>
                <select
                  value={simCategory}
                  onChange={(e) => setSimCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {categories.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sample Amount ({currentBusiness?.currency || 'KES'})
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/70 dark:bg-slate-950/50 text-xs">
              <div className="p-3">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Matched Rule</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block truncate">
                  {simResolved.code} · {simResolved.ruleName}
                </span>
              </div>
              <div className="p-3">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Effective Rate</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {(simResolved.rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Taxable Net Base</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {currentBusiness?.currency || 'KES'} {simNet.toFixed(2)}
                </span>
              </div>
              <div className="p-3">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Tax ({taxSettings.taxLabel}) · Total
                </span>
                <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                  {simTax.toFixed(2)} · {simGross.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bottom Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Updates apply to all active POS terminals across your branches immediately upon save.
        </p>

        <button
          type="button"
          id="btn-save-tax-settings"
          onClick={handleSaveTaxSettings}
          disabled={isSaving}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          {isSaving ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Tax Configuration</span>
            </>
          )}
        </button>
      </div>

      {/* Add / Edit Rule Modal */}
      {isEditingRule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {ruleToEdit ? 'Edit Tax Rule' : 'Create Tax Rule'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingRule(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Zero-Rated Basic Food Staples"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Fiscal / ETR Code</label>
                  <input
                    type="text"
                    required
                    value={ruleCode}
                    onChange={(e) => setRuleCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A, B, E"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Rate (%) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={ruleRate}
                      onChange={(e) => setRuleRate(e.target.value)}
                      placeholder="e.g. 16 or 0"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Application Scope *</label>
                <select
                  value={ruleScope}
                  onChange={(e) => setRuleScope(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="category">Specific Product Category</option>
                  <option value="region">Specific Branch / Region Override</option>
                  <option value="all">All Products (Store-Wide Default)</option>
                </select>
              </div>

              {ruleScope === 'category' && (
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Product Category *</label>
                  <select
                    value={ruleTargetCategory}
                    onChange={(e) => setRuleTargetCategory(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {categories
                      .filter((c) => c !== 'All')
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {ruleScope === 'region' && (
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Branch / Location *</label>
                  <select
                    value={ruleTargetLocationId}
                    onChange={(e) => setRuleTargetLocationId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Legal / Fiscal Description</label>
                <input
                  type="text"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="e.g. Schedule 2 Zero-rated staple grains"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rule-active-checkbox"
                  checked={ruleIsActive}
                  onChange={(e) => setRuleIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="rule-active-checkbox" className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Activate this rule immediately at checkout
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingRule(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer"
                >
                  {ruleToEdit ? 'Save Changes' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

