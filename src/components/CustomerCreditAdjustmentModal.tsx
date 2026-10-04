import React, { useState } from 'react';
import {
  X,
  CreditCard,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  CheckCircle,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { Customer } from '../types';
import { usePos } from '../context/PosContext';

interface CustomerCreditAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const CustomerCreditAdjustmentModal: React.FC<CustomerCreditAdjustmentModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const { adjustCustomerCredit, currentLocation, showToast } = usePos();

  const [operationType, setOperationType] = useState<'repayment' | 'deposit' | 'charge'>('repayment');
  const [amount, setAmount] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !customer) return null;

  const currentBalance = customer.storeCreditBalance || 0;
  const isDebt = currentBalance < 0;
  const debtAmount = Math.abs(currentBalance);

  const parsedAmount = parseFloat(amount) || 0;
  let simulatedBalanceChange = 0;
  if (operationType === 'repayment' || operationType === 'deposit') {
    simulatedBalanceChange = parsedAmount; // increases balance (reduces debt)
  } else {
    simulatedBalanceChange = -parsedAmount; // decreases balance (adds debt)
  }
  const projectedBalance = Number((currentBalance + simulatedBalanceChange).toFixed(2));

  const handleQuickFillDebt = () => {
    if (isDebt) {
      setAmount(debtAmount.toString());
      setOperationType('repayment');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (parsedAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reasonLabel =
        operationType === 'repayment'
          ? `Debt repayment (${notes.trim() || 'Tab clearance'})`
          : operationType === 'deposit'
          ? `Store credit deposit (${notes.trim() || 'Advance funds'})`
          : `Store charge / credit advance (${notes.trim() || 'Manual adjustment'})`;

      await adjustCustomerCredit(
        customer.id,
        simulatedBalanceChange,
        reasonLabel,
        referenceId.trim() || undefined
      );

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update credit ledger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="customer-credit-adjustment-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Record Credit / Tab Payment</h2>
              <p className="text-[11px] text-slate-400">
                {customer.name} ({customer.phone})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Summary Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Current Tab Status
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-lg font-black font-mono ${
                  isDebt
                    ? 'text-red-600'
                    : currentBalance > 0
                    ? 'text-emerald-600'
                    : 'text-slate-700'
                }`}
              >
                {currentLocation.currency} {Math.abs(currentBalance).toFixed(2)}
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isDebt
                    ? 'bg-red-100 text-red-800'
                    : currentBalance > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isDebt ? 'Owed to Store' : currentBalance > 0 ? 'Prepaid Credit' : 'Zero Balance'}
              </span>
            </div>
          </div>

          {isDebt && (
            <button
              type="button"
              onClick={handleQuickFillDebt}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 transition cursor-pointer"
            >
              Pay Full Debt
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Operation Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOperationType('repayment')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  operationType === 'repayment'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <span className="text-[11px] block">Debt Repayment</span>
              </button>

              <button
                type="button"
                onClick={() => setOperationType('deposit')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  operationType === 'deposit'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <span className="text-[11px] block">Advance Deposit</span>
              </button>

              <button
                type="button"
                onClick={() => setOperationType('charge')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  operationType === 'charge'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <span className="text-[11px] block">Manual Charge</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Amount ({currentLocation.currency}) *</span>
              {parsedAmount > 0 && (
                <span className="text-[10px] text-slate-500 font-mono">
                  Projected New Balance:{' '}
                  <strong className={projectedBalance < 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {currentLocation.currency} {projectedBalance.toFixed(2)}
                  </strong>
                </span>
              )}
            </label>
            <input
              type="number"
              required
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-base font-black font-mono rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Reference / M-Pesa / Receipt Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Payment Reference (M-Pesa Code / Bank Slip / Receipt #)
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. QK89012 or BANK-TRF-091"
              className="w-full px-3 py-2 text-xs font-mono font-medium rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ledger Note / Reason
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cash received in store, full settlement of weekly grocery daftari"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || parsedAmount <= 0}
              className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm & Post to Ledger</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
