import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Landmark,
  Link2,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlink,
} from 'lucide-react';
import { Business } from '../../types';
import { auth } from '../../lib/firebase';
import { usePos } from '../../context/PosContext';
import {
  fetchPaystackSettlementBanks,
  manageBusinessPaystackSubaccount,
  SettlementBankOption,
} from '../../lib/paymentService';
import { SettingsSectionHeader } from './SettingsSectionHeader';

interface PaystackSubaccountPanelProps {
  targetBusiness: Business;
  onUpdated?: () => void;
}

export const PaystackSubaccountPanel: React.FC<PaystackSubaccountPanelProps> = ({
  targetBusiness,
  onUpdated,
}) => {
  const { applyBusinessLocalUpdate, showToast, currentUser } = usePos();

  const isDemoBiz = targetBusiness.id === 'biz-demo';
  const hasSubaccount = Boolean(targetBusiness.paystackSubaccountCode?.startsWith('ACCT_'));
  const isVerified = Boolean(hasSubaccount && targetBusiness.paystackSubaccountStatus === 'verified');

  const [mode, setMode] = useState<'paste' | 'create'>('paste');
  const [subaccountInput, setSubaccountInput] = useState(targetBusiness.paystackSubaccountCode || '');

  const [banks, setBanks] = useState<SettlementBankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [settlementBizName, setSettlementBizName] = useState(targetBusiness.name || '');
  const [contactEmail, setContactEmail] = useState(targetBusiness.ownerEmail || '');
  const [contactPhone, setContactPhone] = useState(targetBusiness.phone || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingUnlink, setIsConfirmingUnlink] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setSubaccountInput(targetBusiness.paystackSubaccountCode || '');
    setSettlementBizName(targetBusiness.name || '');
    setContactEmail(targetBusiness.ownerEmail || '');
    setContactPhone(targetBusiness.phone || '');
    setErrorMsg(null);
    setStatusMsg(null);
    setIsConfirmingUnlink(false);
  }, [targetBusiness.id, targetBusiness.paystackSubaccountCode, targetBusiness.name, targetBusiness.ownerEmail, targetBusiness.phone]);

  useEffect(() => {
    if (mode !== 'create' || banks.length > 0 || banksLoading) return;
    let cancelled = false;
    setBanksLoading(true);
    setBanksError(null);
    fetchPaystackSettlementBanks()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.banks.length > 0) {
          setBanks(res.banks);
          setSelectedBankCode((prev) => prev || res.banks[0].code);
        } else {
          setBanksError(res.error || 'Could not load Paystack Kenya settlement institutions.');
        }
      })
      .finally(() => {
        if (!cancelled) setBanksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, banks.length, banksLoading]);

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter(
      (b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
    );
  }, [banks, bankSearch]);

  const selectedBank = useMemo(
    () => banks.find((b) => b.code === selectedBankCode) || null,
    [banks, selectedBankCode]
  );

  const getFirebaseBearerToken = async (): Promise<string | null> => {
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken();
      } catch {
        // fallback below
      }
    }
    if (currentUser?.idToken) {
      return currentUser.idToken;
    }
    return null;
  };

  const handleVerifyExisting = async (e?: React.FormEvent, codeOverride?: string) => {
    e?.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const cleanCode = (codeOverride ?? subaccountInput).trim();
    if (!cleanCode.startsWith('ACCT_')) {
      setErrorMsg('Enter a valid Paystack subaccount code starting with ACCT_.');
      return;
    }

    const token = await getFirebaseBearerToken();
    if (!token) {
      setErrorMsg('Please sign in with a verified Business Owner or Platform Support Google account to link a subaccount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await manageBusinessPaystackSubaccount(
        {
          action: 'verify_existing',
          businessId: targetBusiness.id,
          subaccountCode: cleanCode,
        },
        token
      );
      if (!res.success || !res.settlement) {
        setErrorMsg(res.error || 'Could not verify Paystack subaccount.');
        return;
      }

      applyBusinessLocalUpdate(targetBusiness.id, res.settlement, !res.persistedToFirestore);
      setSubaccountInput(res.settlement.paystackSubaccountCode);
      setStatusMsg(
        `Verified ${res.settlement.paystackSubaccountCode} · ${res.settlement.paystackSettlementBank} (${res.settlement.paystackSettlementAccountMask})`
      );
      showToast(`Paystack subaccount verified for ${targetBusiness.name}`, 'success');
      onUpdated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubaccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    if (!settlementBizName.trim()) {
      setErrorMsg('Settlement business name is required.');
      return;
    }
    if (!selectedBankCode) {
      setErrorMsg('Select a settlement bank or mobile money provider.');
      return;
    }
    if (!accountNumber.trim()) {
      setErrorMsg('Enter the destination bank account or mobile money settlement number.');
      return;
    }

    const token = await getFirebaseBearerToken();
    if (!token) {
      setErrorMsg('Please sign in with a verified Business Owner or Platform Support Google account to create a subaccount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await manageBusinessPaystackSubaccount(
        {
          action: 'create',
          businessId: targetBusiness.id,
          businessName: settlementBizName.trim(),
          settlementBankCode: selectedBankCode,
          settlementBankName: selectedBank?.name || selectedBankCode,
          accountNumber: accountNumber.trim(),
          primaryContactEmail: contactEmail.trim() || undefined,
          primaryContactPhone: contactPhone.trim() || undefined,
        },
        token
      );
      if (!res.success || !res.settlement) {
        setErrorMsg(res.error || 'Failed to create Paystack subaccount.');
        return;
      }

      applyBusinessLocalUpdate(targetBusiness.id, res.settlement, !res.persistedToFirestore);
      setSubaccountInput(res.settlement.paystackSubaccountCode);
      setAccountNumber('');
      setStatusMsg(
        `Created & verified ${res.settlement.paystackSubaccountCode} · ${res.settlement.paystackSettlementBank} (${res.settlement.paystackSettlementAccountMask})`
      );
      showToast(`Paystack subaccount ${res.settlement.paystackSubaccountCode} created`, 'success');
      onUpdated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    setErrorMsg(null);
    setStatusMsg(null);

    const token = await getFirebaseBearerToken();
    if (!token) {
      setErrorMsg('Please sign in with a verified Business Owner or Platform Support Google account to unlink.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await manageBusinessPaystackSubaccount(
        {
          action: 'unlink',
          businessId: targetBusiness.id,
        },
        token
      );
      if (!res.success || !res.settlement) {
        setErrorMsg(res.error || 'Failed to unlink subaccount.');
        return;
      }
      applyBusinessLocalUpdate(targetBusiness.id, res.settlement, !res.persistedToFirestore);
      setSubaccountInput('');
      setIsConfirmingUnlink(false);
      setStatusMsg('Subaccount unlinked. Live Paystack POS checkout is now paused until a verified subaccount is linked.');
      showToast('Paystack subaccount unlinked', 'info');
      onUpdated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDemoBiz) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-3">
        <SettingsSectionHeader
          title="Demo Sandbox Settlement"
          description="The public demo store runs in an isolated simulator and cannot connect to a live Paystack settlement subaccount."
          meta={<span className="text-slate-500">Sandbox Mode</span>}
        />
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <Landmark className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Sign in with a registered merchant account to link or provision a live Paystack subaccount.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-6">
      <SettingsSectionHeader
        title="Paystack Settlement Account"
        description="Route 100% of live POS M-Pesa STK and Card checkouts directly to your store payout account."
        meta={
          isVerified ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              {hasSubaccount ? 'Inactive' : 'Not Configured'}
            </span>
          )
        }
        actions={
          hasSubaccount && (
            <>
              <button
                type="button"
                onClick={() => handleVerifyExisting(undefined, targetBusiness.paystackSubaccountCode)}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>Re-verify</span>
              </button>
              {!isConfirmingUnlink ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingUnlink(true)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Unlink</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleUnlink}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    Confirm Unlink
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingUnlink(false)}
                    disabled={isSubmitting}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )
        }
      />

      {/* Active Settlement Summary Row */}
      <div className="space-y-2 text-xs">
        {hasSubaccount ? (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-700 dark:text-slate-300">
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {targetBusiness.paystackSubaccountCode}
            </span>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
            <span>{targetBusiness.paystackSettlementBank || 'Settlement Account'}</span>
            {targetBusiness.paystackSettlementAccountMask && (
              <>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{targetBusiness.paystackSettlementAccountMask}</span>
              </>
            )}
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">100% Store Settlement</span>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
            <span className="text-slate-500 dark:text-slate-400">Merchant bears Paystack fees</span>
          </div>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">
            Live M-Pesa STK Push and Card checkouts remain locked until a Paystack{' '}
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">ACCT_</span> subaccount is linked and verified.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            SaaS renewals route to the platform account; POS register sales route 100% to this store.
          </span>
          {targetBusiness.paystackSubaccountVerifiedAt && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                Verified {new Date(targetBusiness.paystackSubaccountVerifiedAt).toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Mode Switcher + Destination Configuration */}
      <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Configure Settlement Destination
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Link an existing Paystack subaccount code or provision a new one via Paystack API.
            </p>
          </div>
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setMode('paste');
                setErrorMsg(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                mode === 'paste'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link Existing ACCT_</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('create');
                setErrorMsg(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                mode === 'create'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create via API</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>{statusMsg}</span>
          </div>
        )}

        {mode === 'paste' ? (
          <form onSubmit={(e) => handleVerifyExisting(e)} className="space-y-4">
            <div className="max-w-lg">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Paystack Subaccount Code
              </label>
              <input
                type="text"
                value={subaccountInput}
                onChange={(e) => setSubaccountInput(e.target.value)}
                placeholder="ACCT_xxxxxxxxxxxx"
                className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                SokoPoS validates this code live against Paystack and stores only the masked payout account reference.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting || !subaccountInput.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-2 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying on Paystack...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify &amp; Link Subaccount</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateSubaccount} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Business Settlement Name
                </label>
                <input
                  type="text"
                  value={settlementBizName}
                  onChange={(e) => setSettlementBizName(e.target.value)}
                  placeholder="Merchant Store Ltd"
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Destination Account / M-Pesa Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Account number, Till, or 07XXXXXXXX"
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Kenyan Bank or Mobile Money Institution
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {banksLoading ? 'Loading institutions...' : `${filteredBanks.length} institutions`}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder="Filter banks or M-Pesa (e.g., Equity, KCB, M-PESA)..."
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500"
                    />
                  </div>
                  {banksError ? (
                    <p className="text-xs text-rose-600 dark:text-rose-400 self-center">{banksError}</p>
                  ) : (
                    <select
                      value={selectedBankCode}
                      onChange={(e) => setSelectedBankCode(e.target.value)}
                      disabled={banksLoading || filteredBanks.length === 0}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {filteredBanks.length === 0 ? (
                        <option value="">{banksLoading ? 'Fetching Paystack banks...' : 'No matching banks found'}</option>
                      ) : (
                        filteredBanks.map((b) => (
                          <option key={`${b.code}-${b.name}`} value={b.code}>
                            {b.name} ({b.type === 'mobile_money' ? 'Mobile Money' : b.code})
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Settlement Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="owner@store.co.ke"
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Contact Phone (Optional)
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+254712345678"
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                0% platform split · merchant pays standard Paystack transaction fees.
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !selectedBankCode || !accountNumber.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-2 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Subaccount...</span>
                  </>
                ) : (
                  <>
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Create &amp; Verify Subaccount</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

