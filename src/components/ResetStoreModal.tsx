import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Download,
  Trash2,
  Archive,
  RotateCcw,
  Check,
  X,
  Lock,
  FileText,
  Clock,
  Building2,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { StoreSalesBackup } from '../types';

interface ResetStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId?: string;
}

export const ResetStoreModal: React.FC<ResetStoreModalProps> = ({
  isOpen,
  onClose,
  businessId,
}) => {
  const {
    currentBusiness,
    businesses,
    transactions,
    resetStoreSalesToZero,
    downloadSalesBackup,
    canResetStore,
    currentUser,
    isSuperAdmin,
  } = usePos();

  const targetBizId = businessId || currentBusiness?.id || '';
  const targetBiz = useMemo(() => {
    return businesses.find((b) => b.id === targetBizId) || currentBusiness;
  }, [businesses, targetBizId, currentBusiness]);

  const tenantTransactions = useMemo(() => {
    return (transactions || []).filter((tx) => tx.businessId === targetBizId);
  }, [transactions, targetBizId]);

  const totalGross = useMemo(() => {
    return tenantTransactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
  }, [tenantTransactions]);

  const totalRefunded = useMemo(() => {
    return tenantTransactions.reduce((sum, tx) => sum + (tx.totalRefunded || 0), 0);
  }, [tenantTransactions]);

  const totalNet = totalGross - totalRefunded;

  const [confirmInput, setConfirmInput] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [completedBackup, setCompletedBackup] = useState<StoreSalesBackup | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const REQUIRED_PHRASE = 'RESET ZERO';
  const isMatch = confirmInput.trim().toUpperCase() === REQUIRED_PHRASE;

  const authStatus = canResetStore(targetBizId);

  if (!isOpen) return null;

  const handleExecuteReset = async () => {
    if (!isMatch || isPurging || !authStatus.allowed) return;

    setIsPurging(true);
    setErrorMessage(null);

    try {
      const result = await resetStoreSalesToZero(
        targetBizId,
        'Merchant pre-production go-live reset to clean zero'
      );

      if (result.success && result.backup) {
        setCompletedBackup(result.backup);
      } else if (!result.success) {
        setErrorMessage(result.error || 'Failed to complete reset.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(msg);
    } finally {
      setIsPurging(false);
    }
  };

  const handleClose = () => {
    setConfirmInput('');
    setCompletedBackup(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      id="reset-store-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
    >
      <div
        id="reset-store-modal-dialog"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-6 transition-all transform animate-scaleUp"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 px-6 py-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-200 border border-rose-400/30">
                  Destructive Action
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-200">
                  Store Go-Live
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Reset Store to Clean Zero
              </h3>
            </div>
          </div>
          <button
            id="close-reset-store-modal-btn"
            onClick={handleClose}
            disabled={isPurging}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Post-Purge Success View */}
          {completedBackup ? (
            <div className="text-center py-4 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-50">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900">
                  Store Successfully Reset to Clean Zero!
                </h4>
                <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">
                  All test transactions have been purged. Your sales reports, shift records, and
                  dashboards are now at clean zero, ready for live customer transactions.
                </p>
              </div>

              {/* Backup details banner */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-blue-600" />
                    Archive Snapshot Preserved
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {completedBackup.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200">
                  <div>
                    Purged Sales Volume: <strong className="text-slate-900">{completedBackup.currency} {completedBackup.grossSales.toLocaleString()}</strong>
                  </div>
                  <div>
                    Transactions Archived: <strong className="text-slate-900">{completedBackup.transactionCount} orders</strong>
                  </div>
                  <div>
                    Archived By: <strong className="text-slate-900">{completedBackup.purgedByName}</strong>
                  </div>
                  <div>
                    Timestamp: <strong className="text-slate-900">{new Date(completedBackup.createdAt).toLocaleTimeString()}</strong>
                  </div>
                </div>
              </div>

              {/* Download JSON Button */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  id="download-backup-after-purge-btn"
                  onClick={() => downloadSalesBackup(completedBackup.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup Archive (.json)</span>
                </button>
                <button
                  id="done-reset-store-modal-btn"
                  onClick={handleClose}
                  className="py-3 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : !authStatus.allowed ? (
            /* Unauthorized Screen */
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Restricted Authorization</h4>
              <p className="text-sm text-slate-600 max-w-sm mx-auto">
                {authStatus.reason ||
                  'Only the registered Business Owner of this store or a Platform Super-Admin has permission to reset store sales.'}
              </p>
              <button
                onClick={handleClose}
                className="mt-2 py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
              >
                Close
              </button>
            </div>
          ) : (
            /* Active Reset Form */
            <>
              {/* Business Name and Warning intro */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Target Store: </span>
                  <span className="font-extrabold underline">{targetBiz?.name || 'Current Business'}</span>
                  <span className="block text-rose-700 mt-0.5">
                    This will permanently clear all recorded test orders and reset revenue reports to 0.00.
                  </span>
                </div>
              </div>

              {/* Impact Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Orders
                  </div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">
                    {tenantTransactions.length}
                  </div>
                  <div className="text-[10px] text-slate-400">Transactions</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Gross Volume
                  </div>
                  <div className="text-lg font-black text-slate-800 mt-0.5 truncate">
                    {targetBiz?.currency || 'KES'} {totalGross.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Total Sales</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Net Impact
                  </div>
                  <div className="text-lg font-black text-slate-800 mt-0.5 truncate">
                    {targetBiz?.currency || 'KES'} {totalNet.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Net Revenue</div>
                </div>
              </div>

              {/* What is Protected & Kept Safe */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Your Catalog & Business Configuration are 100% Preserved:</span>
                </div>
                <ul className="text-xs text-emerald-800 space-y-1 pl-5 list-disc marker:text-emerald-500">
                  <li><strong>Products & Barcodes:</strong> All SKU catalog items and prices remain intact.</li>
                  <li><strong>Current Stock Counts:</strong> Inventory levels at all branches remain unchanged.</li>
                  <li><strong>Branches & Locations:</strong> Store addresses, tax PIN, and registers are saved.</li>
                  <li><strong>Staff & Cashier Logins:</strong> Cashier accounts and PIN credentials remain active.</li>
                </ul>
              </div>

              {/* Automatic Soft-Delete Backup Notice */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                <Archive className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Automated Snapshot Backup: </span>
                  A complete, timestamped JSON archive of these {tenantTransactions.length} transactions
                  will be created before the purge and saved to your backup repository.
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              {/* Type-To-Confirm Input */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label
                  htmlFor="confirm-reset-input"
                  className="block text-xs font-bold text-slate-700"
                >
                  To confirm, type <span className="font-mono bg-slate-100 text-rose-700 px-1.5 py-0.5 rounded border border-slate-300 font-extrabold">{REQUIRED_PHRASE}</span> below:
                </label>
                <div className="relative">
                  <input
                    id="confirm-reset-input"
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Type RESET ZERO to unlock"
                    disabled={isPurging}
                    className={`w-full py-2.5 px-3.5 pr-10 rounded-xl border text-sm font-mono tracking-wider focus:outline-none transition ${
                      isMatch
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900 focus:ring-2 focus:ring-emerald-400'
                        : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-rose-400'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isMatch ? (
                      <Check className="w-4 h-4 text-emerald-600 font-black" />
                    ) : confirmInput.length > 0 ? (
                      <X className="w-4 h-4 text-rose-400" />
                    ) : null}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Authorized Operator: {currentUser?.name || currentUser?.email}</span>
                  <span className="font-medium text-slate-400">
                    Role: {isSuperAdmin ? 'Platform Super-Admin' : currentUser?.role}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  id="cancel-reset-store-btn"
                  type="button"
                  onClick={handleClose}
                  disabled={isPurging}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  Cancel & Keep Sales
                </button>
                <button
                  id="execute-reset-store-btn"
                  type="button"
                  onClick={handleExecuteReset}
                  disabled={!isMatch || isPurging}
                  className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition cursor-pointer ${
                    isMatch && !isPurging
                      ? 'bg-rose-600 hover:bg-rose-700 active:scale-[0.98]'
                      : 'bg-slate-300 cursor-not-allowed text-slate-500 opacity-70'
                  }`}
                >
                  {isPurging ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Purging & Archiving...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Purge Test Sales & Reset to Zero</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
