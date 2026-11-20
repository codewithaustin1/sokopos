import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  AlertCircle,
  Loader2,
  LogOut,
  Check,
  ChevronDown,
  ChevronUp,
  WifiOff,
  Scale,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import {
  LEGAL_ENTITY,
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
  OWNERSHIP_IP_SECTIONS,
  LegalClauseSection,
} from '../data/legalContent';
import { auth } from '../lib/firebase';

export interface LegalConsentModalProps {
  isOpen: boolean;
  onRequestSignOut?: () => void;
}

type LegalDocTab = 'terms' | 'privacy' | 'ip';

export const LegalConsentModal: React.FC<LegalConsentModalProps> = ({
  isOpen,
  onRequestSignOut,
}) => {
  const {
    currentBusiness,
    currentUser,
    isOnline,
    recordMerchantLegalConsent,
    soundFx,
  } = usePos();

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [acknowledgedAsIs, setAcknowledgedAsIs] = useState(false);
  const [acceptedOperationalRisks, setAcceptedOperationalRisks] = useState(false);

  const [activeDocTab, setActiveDocTab] = useState<LegalDocTab>('terms');
  const [isReaderExpanded, setIsReaderExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset checkboxes when switching to a different pending business
  useEffect(() => {
    setAgreedTerms(false);
    setAcknowledgedAsIs(false);
    setAcceptedOperationalRisks(false);
    setErrorMessage(null);
  }, [currentBusiness?.id, isOpen]);

  if (!isOpen || !currentBusiness) return null;

  const hasFirebaseUser = Boolean(auth.currentUser);
  const isOwnerEmailVerified = Boolean(auth.currentUser?.emailVerified);
  const allChecked = agreedTerms && acknowledgedAsIs && acceptedOperationalRisks;
  const canPersistToCloud = isOnline && hasFirebaseUser && isOwnerEmailVerified;

  const activeSections: LegalClauseSection[] =
    activeDocTab === 'terms'
      ? TERMS_SECTIONS
      : activeDocTab === 'privacy'
      ? PRIVACY_SECTIONS
      : OWNERSHIP_IP_SECTIONS;

  const handleConfirmConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!allChecked) {
      soundFx?.playError?.();
      setErrorMessage(
        'Please review and check all three legal acknowledgements above before unlocking POS access.'
      );
      return;
    }

    if (!isOnline) {
      soundFx?.playError?.();
      setErrorMessage(
        'Internet connection required: Your consent must be recorded in Firestore before POS access can be unlocked.'
      );
      return;
    }

    if (!hasFirebaseUser) {
      soundFx?.playError?.();
      setErrorMessage(
        `Business owner cloud authentication required: Please sign in with ${currentBusiness.ownerEmail} to record initial legal consent.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await recordMerchantLegalConsent();
    } catch (err: any) {
      soundFx?.playError?.();
      const rawMsg = err?.message || 'Could not save your legal consent to Firestore. Please try again.';
      let friendlyMsg = rawMsg;
      if (rawMsg.startsWith('{')) {
        try {
          const parsed = JSON.parse(rawMsg);
          friendlyMsg =
            parsed?.error ||
            'Cloud permission denied while recording legal consent. Ensure you are signed in as the verified business owner.';
        } catch {
          friendlyMsg = rawMsg;
        }
      }
      setErrorMessage(friendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-consent-modal-title"
      aria-describedby="legal-consent-modal-desc"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[#28a745]/10 border border-[#28a745]/25 text-[#28a745] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#28a745]">
                  Initial Business Setup · {LEGAL_ENTITY.companyName}
                </p>
                <h2
                  id="legal-consent-modal-title"
                  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5"
                >
                  Review &amp; Accept Merchant Terms
                </h2>
                <p
                  id="legal-consent-modal-desc"
                  className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed"
                >
                  Before operating the POS terminal for{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {currentBusiness.name}
                  </span>{' '}
                  ({currentBusiness.code}), acknowledge the updated {LEGAL_ENTITY.lastRevised} Terms of
                  Service and Privacy Policy under {LEGAL_ENTITY.companyName}.
                </p>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end shrink-0 text-right font-mono tabular-nums">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                POS Locked
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Rev. {LEGAL_ENTITY.lastRevised}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleConfirmConsent} className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {/* Summary Key Terms Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-[#28a745] shrink-0" />
                Liability Cap
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                Capped at preceding 12 months of fees paid (or KES 5,000 for free accounts).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#28a745] shrink-0" />
                Warranty Basis
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                Software &amp; AI tools provided “AS IS” and “AS AVAILABLE”; merchant owns shop data.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#28a745] shrink-0" />
                Strict No-Sale Privacy
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                {LEGAL_ENTITY.companyName} never sells your retail sales, stock, or customer data.
              </p>
            </div>
          </div>

          {/* Inline Legal Document Reader */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950/60">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1" role="tablist" aria-label="Legal agreement documents">
                {(
                  [
                    { id: 'terms', label: 'Terms of Service' },
                    { id: 'privacy', label: 'Privacy Policy' },
                    { id: 'ip', label: 'IP & Ownership' },
                  ] as const
                ).map((tab) => {
                  const active = activeDocTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveDocTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        active
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setIsReaderExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#28a745] hover:text-[#218838] px-2 py-1 rounded-md cursor-pointer"
              >
                {isReaderExpanded ? (
                  <>
                    Compact View <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Expand Full Text <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            <div
              className={`px-4 py-3 overflow-y-auto space-y-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed transition-all ${
                isReaderExpanded ? 'max-h-80' : 'max-h-44'
              }`}
            >
              {activeSections.map((sec) => (
                <div key={`${activeDocTab}-${sec.number}`} className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {sec.number}. {sec.title}
                  </h3>
                  {sec.paragraphs.map((p, idx) => (
                    <p key={idx} className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {p}
                    </p>
                  ))}
                  {sec.bullets && sec.bullets.length > 0 && (
                    <ul className="space-y-1.5 pl-3.5 list-disc text-[11px] text-slate-600 dark:text-slate-400">
                      {sec.bullets.map((b, bIdx) => (
                        <li key={bIdx}>
                          {b.label && (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {b.label}:{' '}
                            </span>
                          )}
                          {b.text}
                        </li>
                      ))}
                    </ul>
                  )}
                  {sec.callout && (
                    <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      {sec.callout}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Three Mandatory Consent Checkboxes */}
          <div className="space-y-2.5" role="group" aria-label="Required legal consent acknowledgements">
            <label
              htmlFor="consent-checkbox-tos"
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none min-h-[44px] ${
                agreedTerms
                  ? 'bg-[#28a745]/5 border-[#28a745]/40 dark:bg-[#28a745]/10'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                id="consent-checkbox-tos"
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => {
                  setAgreedTerms(e.target.checked);
                  setErrorMessage(null);
                }}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                  agreedTerms
                    ? 'bg-[#28a745] border-[#28a745] text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                }`}
              >
                {agreedTerms && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  I agree to the Terms of Service
                </span>
                <span className="block text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Including the {LEGAL_ENTITY.companyName} Privacy Policy, IP ownership protections,
                  and 12-month subscription fee liability cap under Kenyan law.
                </span>
              </span>
            </label>

            <label
              htmlFor="consent-checkbox-asis"
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none min-h-[44px] ${
                acknowledgedAsIs
                  ? 'bg-[#28a745]/5 border-[#28a745]/40 dark:bg-[#28a745]/10'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                id="consent-checkbox-asis"
                type="checkbox"
                checked={acknowledgedAsIs}
                onChange={(e) => {
                  setAcknowledgedAsIs(e.target.checked);
                  setErrorMessage(null);
                }}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                  acknowledgedAsIs
                    ? 'bg-[#28a745] border-[#28a745] text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                }`}
              >
                {acknowledgedAsIs && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  I acknowledge the AS-IS warranty disclaimer
                </span>
                <span className="block text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  SokoPoS™ and assistive Vision AI/hardware guides are provided “AS IS” and “AS
                  AVAILABLE” without implied warranties of merchantability or error-free uptime.
                </span>
              </span>
            </label>

            <label
              htmlFor="consent-checkbox-risks"
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none min-h-[44px] ${
                acceptedOperationalRisks
                  ? 'bg-[#28a745]/5 border-[#28a745]/40 dark:bg-[#28a745]/10'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                id="consent-checkbox-risks"
                type="checkbox"
                checked={acceptedOperationalRisks}
                onChange={(e) => {
                  setAcceptedOperationalRisks(e.target.checked);
                  setErrorMessage(null);
                }}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                  acceptedOperationalRisks
                    ? 'bg-[#28a745] border-[#28a745] text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                }`}
              >
                {acceptedOperationalRisks && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  I accept the operational risk disclaimers for M-Pesa, eTIMS, and offline sync
                </span>
                <span className="block text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Payment settlement verification, KRA eTIMS tax filings, and syncing offline browser
                  queues within 7 days remain the merchant’s operational responsibility.
                </span>
              </span>
            </label>
          </div>

          {/* Connectivity / Auth Prerequisites Banner */}
          {!isOnline && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                You are currently offline. Reconnect to the internet so your consent record can be
                stored in Firestore and POS access can be activated.
              </span>
            </div>
          )}

          {isOnline && !hasFirebaseUser && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Signed in as{' '}
                <strong className="font-semibold">{currentUser?.name || 'Terminal Staff'}</strong>.
                Initial legal consent must be recorded by the business owner (
                <span className="font-mono">{currentBusiness.ownerEmail}</span>) using their
                Google or verified email account.
              </span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {onRequestSignOut ? (
              <button
                type="button"
                onClick={onRequestSignOut}
                disabled={isSubmitting}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                Sign Out / Switch Account
              </button>
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={!allChecked || !canPersistToCloud || isSubmitting}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#28a745] hover:bg-[#218838] text-white text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording Consent in Firestore...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Confirm &amp; Activate POS Access
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LegalConsentModal;
