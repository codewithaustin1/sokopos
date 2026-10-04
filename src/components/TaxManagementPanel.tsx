import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Building2,
  Layers,
  Sparkles,
  Save,
  CheckCircle2,
  HelpCircle,
  Percent,
  Sliders,
  RotateCcw,
  Tag,
  MapPin,
  Calculator,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { TaxRule, BusinessTaxSettings, TaxScope } from '../types';
import { DEFAULT_TAX_SETTINGS, DEFAULT_TAX_RULES, resolveDynamicTaxRate } from '../utils/taxResolver';

export const TaxManagementPanel: React.FC = () => {
  const {
    currentBusiness,
    categories,
    locations,
    updateBusinessProfile,
    showToast,
    logAdminActivity,
    soundFx,
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

  const handleOpenAddRule = () => {
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
    soundFx.playBeep(700, 0.08);
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
    soundFx.playSuccess();
  };

  const handleSaveTaxSettings = async () => {
    setIsSaving(true);
    try {
      const updatedTaxSettings: BusinessTaxSettings = {
        ...taxSettings,
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

      soundFx.playSuccess();
      showToast('Tax configuration and dynamic rules updated successfully!', 'success');
    } catch (err: any) {
      console.error('Save tax settings error:', err);
      showToast(err.message || 'Failed to update tax configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="tax-management-panel" className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Tax, VAT/GST & Fiscal Rates
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Dynamic Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Define standard tax rates, category exemptions (zero-rated grains/produce), and regional branch rules applied dynamically at checkout
            </p>
          </div>
        </div>

        {/* Quick Presets Menu */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => handleApplyPresetTemplate('kra_standard')}
            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-800 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            title="Load standard KRA ETR Class A (16%) and Class B (0% Zero-Rated Staples)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>KRA ETR (16%)</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPresetTemplate('eac_standard')}
            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/50 text-slate-700 hover:text-purple-800 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            title="Load East African Community Harmonized 18% VAT Template"
          >
            <Percent className="w-3.5 h-3.5 text-purple-500" />
            <span>18% EAC VAT</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPresetTemplate('flat_gst')}
            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 text-slate-700 hover:text-blue-800 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            title="Load 10% GST Template"
          >
            <Percent className="w-3.5 h-3.5 text-blue-500" />
            <span>10% GST</span>
          </button>
        </div>
      </div>

      {/* Global Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Sliders className="w-3.5 h-3.5 text-slate-600" />
          <span>Global Tax & Registration Settings</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tax Scheme / Label
            </label>
            <select
              value={taxSettings.taxLabel}
              onChange={(e) => setTaxSettings({ ...taxSettings, taxLabel: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="VAT">VAT (Value Added Tax)</option>
              <option value="GST">GST (Goods and Services Tax)</option>
              <option value="Sales Tax">Sales Tax</option>
              <option value="Consumption Tax">Consumption Tax</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Standard Default Rate (%)
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono focus:outline-none focus:border-blue-600"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tax PIN / Fiscal Reg #
            </label>
            <input
              type="text"
              value={taxSettings.taxNumber}
              onChange={(e) => setTaxSettings({ ...taxSettings, taxNumber: e.target.value.toUpperCase() })}
              placeholder="e.g. P051234567Z"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Retail Price Structure
            </label>
            <select
              value={taxSettings.pricingType}
              onChange={(e) => setTaxSettings({ ...taxSettings, pricingType: e.target.value as any })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="inclusive">Tax Inclusive (Shelf price includes tax)</option>
              <option value="exclusive">Tax Exclusive (Tax calculated on top at till)</option>
            </select>
          </div>
        </div>

        {/* Feature Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition">
            <input
              type="checkbox"
              checked={taxSettings.enableDynamicCategoryTax}
              onChange={(e) => setTaxSettings({ ...taxSettings, enableDynamicCategoryTax: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-slate-800">
                Category-Specific Dynamic Tax Rules
              </div>
              <div className="text-[11px] text-slate-500">
                Apply special rates or zero-rated 0% tax to entire product categories (e.g. flour, grains, produce)
              </div>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition">
            <input
              type="checkbox"
              checked={taxSettings.enableDynamicRegionalTax}
              onChange={(e) => setTaxSettings({ ...taxSettings, enableDynamicRegionalTax: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-slate-800">
                Regional / Branch-Specific Tax Overrides
              </div>
              <div className="text-[11px] text-slate-500">
                Apply location overrides for duty-free export zones, coastal special economic zones, or regional rates
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Dynamic Tax Rules List Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Active Tax Rules Hierarchy ({taxSettings.rules.length})</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Rules are evaluated at checkout: Regional Overrides &gt; Category Rules &gt; Store Default
            </p>
          </div>

          <button
            type="button"
            id="btn-add-tax-rule"
            onClick={handleOpenAddRule}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Tax Rule</span>
          </button>
        </div>

        {/* Rules Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Rule Name & Code</th>
                <th className="py-2.5 px-3">Scope / Target</th>
                <th className="py-2.5 px-3 text-right">Tax Rate</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {taxSettings.rules.map((rule) => {
                const targetLocationName = locations.find((l) => l.id === rule.targetLocationId)?.name;

                return (
                  <tr key={rule.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {rule.code}
                        </span>
                        <div className="font-bold text-slate-900">
                          {rule.name}
                        </div>
                        {rule.isDefault && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700">
                            Default
                          </span>
                        )}
                      </div>
                      {rule.description && (
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {rule.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {rule.scope === 'category' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          <Tag className="w-3 h-3 text-purple-600" />
                          Category: {rule.targetCategory}
                        </span>
                      ) : rule.scope === 'region' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          <MapPin className="w-3 h-3 text-blue-600" />
                          Region: {targetLocationName || rule.targetLocationId}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          All Catalog Items
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded-full ${
                          rule.rate === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : rule.rate < 0.1
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {(rule.rate * 100).toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleRuleActive(rule.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition cursor-pointer ${
                          rule.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {rule.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRule(rule)}
                          className="p-1 text-slate-500 hover:text-blue-600 rounded transition cursor-pointer"
                          title="Edit rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!rule.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
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

      {/* Live Dynamic Tax Resolution Simulator Sandbox */}
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
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Live Dynamic Tax Resolution Simulator</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Sandbox
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Verify how your category exemptions and branch overrides resolve dynamically before customers check out
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Select Branch / Location
                </label>
                <select
                  value={simLocationId}
                  onChange={(e) => setSimLocationId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Select Product Category
                </label>
                <select
                  value={simCategory}
                  onChange={(e) => setSimCategory(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {categories.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Test Amount ({currentBusiness?.currency || 'KES'})
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Calculation Result Display */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Matched Rule</span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-700 text-slate-300 border border-slate-600">
                    {simResolved.code}
                  </span>
                  <span className="truncate">{simResolved.ruleName}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Effective Rate</span>
                <span className={`font-mono font-black text-sm mt-0.5 block ${simResolved.rate === 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {(simResolved.rate * 100).toFixed(1)}% {simResolved.rate === 0 ? '(0% Zero-Rated)' : ''}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Taxable Net Base</span>
                <span className="font-mono font-bold text-slate-200 text-sm mt-0.5 block">
                  {currentBusiness?.currency || 'KES'} {simNet.toFixed(2)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Tax ({taxSettings.taxLabel})
                </span>
                <span className="font-mono font-black text-sm text-emerald-400 mt-0.5 block">
                  {currentBusiness?.currency || 'KES'} {simTax.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 pt-1">
              <span>
                Pricing Structure: <strong className="text-white capitalize">{taxSettings.pricingType}</strong>
                {taxSettings.pricingType === 'inclusive' ? ' (Shelf price includes tax)' : ' (Tax calculated on top at checkout)'}
              </span>
              <span className="text-slate-300 font-mono">
                Total Payable: <strong className="text-white text-xs">{currentBusiness?.currency || 'KES'} {simGross.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        );
      })()}

      {/* Bottom Save Changes Bar */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-400">
          Changes will apply dynamically to all register terminals upon save.
        </p>

        <button
          type="button"
          id="btn-save-tax-settings"
          onClick={handleSaveTaxSettings}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
        >
          {isSaving ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Saving Configuration...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Tax Configuration</span>
            </>
          )}
        </button>
      </div>

      {/* Add / Edit Rule Modal */}
      {isEditingRule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>{ruleToEdit ? 'Edit Tax Rule' : 'Create New Tax Rule'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingRule(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Zero-Rated Basic Food Staples"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fiscal / ETR Code</label>
                  <input
                    type="text"
                    required
                    value={ruleCode}
                    onChange={(e) => setRuleCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A, B, E"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rate (%) *</label>
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
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono focus:outline-none focus:border-blue-600"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Application Scope *</label>
                <select
                  value={ruleScope}
                  onChange={(e) => setRuleScope(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="category">Specific Product Category (Category Zero-Rated/Special)</option>
                  <option value="region">Specific Branch / Region Override (Special Economic Zone)</option>
                  <option value="all">All Products (Store-Wide Default)</option>
                </select>
              </div>

              {ruleScope === 'category' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Product Category *</label>
                  <select
                    value={ruleTargetCategory}
                    onChange={(e) => setRuleTargetCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
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
                  <label className="block font-bold text-slate-700 mb-1">Target Branch / Location *</label>
                  <select
                    value={ruleTargetLocationId}
                    onChange={(e) => setRuleTargetLocationId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
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
                <label className="block font-bold text-slate-700 mb-1">Legal / Fiscal Description</label>
                <input
                  type="text"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="e.g. Schedule 2 Zero-rated staple grains"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-600"
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
                <label htmlFor="rule-active-checkbox" className="font-bold text-slate-700 cursor-pointer">
                  Activate this rule immediately at checkout
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingRule(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition cursor-pointer shadow-xs"
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
