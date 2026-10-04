import React, { useState, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  CreditCard,
  ShoppingCart,
  Calendar,
  Clock,
  Star,
  Receipt,
  FileText,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Award,
  Wallet,
  CheckCircle,
  ExternalLink,
  Edit2,
  Trash2,
  Plus,
} from 'lucide-react';
import { Customer, Transaction } from '../types';
import { usePos } from '../context/PosContext';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onEditCustomer: (customer: Customer) => void;
  onOpenCreditAdjustment: (customer: Customer) => void;
  onAssignToCart: (customer: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  onEditCustomer,
  onOpenCreditAdjustment,
  onAssignToCart,
}) => {
  const {
    transactions,
    currentLocation,
    setActiveReceipt,
    redeemCustomerLoyaltyPoints,
    showToast,
    soundFx,
    deleteCustomer,
    isSuperAdmin,
    currentUser,
  } = usePos();

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'ledger'>('overview');
  const [pointsToRedeemInput, setPointsToRedeemInput] = useState('');
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Filter transactions for this customer
  const customerTransactions = useMemo(() => {
    if (!customer) return [];
    return transactions.filter(
      (tx) => tx.customerId === customer.id || (tx.customerPhone && tx.customerPhone === customer.phone)
    );
  }, [transactions, customer]);

  if (!isOpen || !customer) return null;

  const currentBalance = customer.storeCreditBalance || 0;
  const isDebt = currentBalance < 0;
  const creditLimit = customer.creditLimit || 0;
  const availableCredit = Math.max(0, creditLimit + currentBalance);

  // Average basket value
  const avgBasket = customer.visitCount > 0 ? customer.totalSpent / customer.visitCount : 0;

  const handleRedeemPoints = async () => {
    const pts = parseInt(pointsToRedeemInput, 10);
    if (!pts || pts <= 0) {
      showToast('Please enter a valid number of loyalty points to redeem', 'warning');
      return;
    }
    if (pts > (customer.loyaltyPoints || 0)) {
      showToast(`Cannot redeem more than current balance (${customer.loyaltyPoints} points)`, 'error');
      return;
    }

    setIsRedeemingPoints(true);
    const success = await redeemCustomerLoyaltyPoints(customer.id, pts);
    setIsRedeemingPoints(false);
    if (success) {
      setPointsToRedeemInput('');
      showToast(
        `Successfully redeemed ${pts} loyalty points (${currentLocation.currency} ${pts} value)`,
        'success'
      );
    }
  };

  const handleDelete = async () => {
    const ok = await deleteCustomer(customer.id);
    if (ok) {
      onClose();
    }
  };

  return (
    <div
      id="customer-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0">
                {customer.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight">{customer.name}</h2>
                  {customer.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-300 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    {customer.phone}
                  </span>
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {customer.email}
                    </span>
                  )}
                  {customer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      {customer.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => onAssignToCart(customer)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Assign this customer to current cart and open register"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Ring Up Sale</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenCreditAdjustment(customer)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Record debt payment or credit advance"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>

              <button
                type="button"
                onClick={() => onEditCustomer(customer)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
                title="Edit Customer Profile"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Purchase History</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
              {customerTransactions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Store Credit ("Daftari") Ledger</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
              {customer.ledger?.length || 0}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-blue-600" />
                    <span>Lifetime Spend</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-1">
                    {currentLocation.currency} {customer.totalSpent.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Avg {currentLocation.currency} {avgBasket.toFixed(2)} / visit
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3 text-purple-600" />
                    <span>Visit Count</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                    {customer.visitCount} orders
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {customer.lastVisitAt
                      ? `Last: ${new Date(customer.lastVisitAt).toLocaleDateString()}`
                      : 'Never'}
                  </div>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>Loyalty Points</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-amber-900 font-mono mt-1">
                    {customer.loyaltyPoints || 0} pts
                  </div>
                  <div className="text-[10px] text-amber-700 mt-0.5">
                    Value: {currentLocation.currency} {(customer.loyaltyPoints || 0).toFixed(2)}
                  </div>
                </div>

                <div
                  className={`border rounded-xl p-3.5 ${
                    isDebt
                      ? 'bg-red-50/60 border-red-200'
                      : currentBalance > 0
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-indigo-600" />
                    <span>Tab / Store Credit</span>
                  </div>
                  <div
                    className={`text-base sm:text-lg font-black font-mono mt-1 ${
                      isDebt
                        ? 'text-red-700'
                        : currentBalance > 0
                        ? 'text-emerald-700'
                        : 'text-slate-800'
                    }`}
                  >
                    {isDebt ? '-' : '+'}
                    {currentLocation.currency} {Math.abs(currentBalance).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    {isDebt ? 'Customer owes store' : currentBalance > 0 ? 'Store credit balance' : 'Zero balance'}
                  </div>
                </div>
              </div>

              {/* Store Credit / Daftari Terms Box */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Store Credit & "Daftari" Credit Facility
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      customer.isCreditAllowed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {customer.isCreditAllowed ? 'Credit Authorized' : 'Cash / Digital Only'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Approved Credit Limit</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {currentLocation.currency} {creditLimit.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Current Tab / Debt</span>
                    <span
                      className={`font-bold font-mono ${
                        isDebt ? 'text-red-600 font-black' : 'text-slate-700'
                      }`}
                    >
                      {currentLocation.currency} {isDebt ? Math.abs(currentBalance).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Remaining Purchasing Power</span>
                    <span className="font-bold text-emerald-600 font-mono">
                      {currentLocation.currency} {availableCredit.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Credit Limit utilization bar */}
                {creditLimit > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                      <span>Limit Utilization</span>
                      <span>
                        {isDebt
                          ? `${Math.min(100, Math.round((Math.abs(currentBalance) / creditLimit) * 100))}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          Math.abs(currentBalance) >= creditLimit
                            ? 'bg-red-600'
                            : Math.abs(currentBalance) > creditLimit * 0.7
                            ? 'bg-amber-500'
                            : 'bg-blue-600'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            isDebt ? (Math.abs(currentBalance) / creditLimit) * 100 : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Loyalty Points Redemption Box */}
              <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Customer Loyalty Rewards Program
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    1 Point = {currentLocation.currency} 1.00 Discount
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-600 font-medium">
                      Available Points: <strong className="text-slate-900 font-black">{customer.loyaltyPoints || 0} pts</strong>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Earns 1 point per {currentLocation.currency} 100 spent automatically on checkout.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={customer.loyaltyPoints || 0}
                      value={pointsToRedeemInput}
                      onChange={(e) => setPointsToRedeemInput(e.target.value)}
                      placeholder="Pts to redeem"
                      className="w-32 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-amber-300 bg-white focus:outline-none focus:border-amber-600"
                    />
                    <button
                      type="button"
                      disabled={
                        isRedeemingPoints ||
                        !customer.loyaltyPoints ||
                        customer.loyaltyPoints <= 0 ||
                        !pointsToRedeemInput
                      }
                      onClick={handleRedeemPoints}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Redeem
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes & Client Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Special Notes & Terms</span>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">
                    {customer.notes || 'No special notes recorded.'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Relationship Timeline</span>
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">First Visit:</span>
                      <span className="font-mono">
                        {customer.firstVisitAt
                          ? new Date(customer.firstVisitAt).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Active:</span>
                      <span className="font-mono">
                        {customer.lastVisitAt
                          ? new Date(customer.lastVisitAt).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Profile Created:</span>
                      <span className="font-mono">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete Safeguard */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Client ID: {customer.id}</span>
                {!isConfirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Profile</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-bold">Confirm removal?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2.5 py-1 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
                    >
                      Yes, Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Purchase History */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {customerTransactions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Receipt className="w-10 h-10 mx-auto text-slate-300" />
                  <div className="text-xs font-bold text-slate-600">No Sales Assigned Yet</div>
                  <p className="text-[11px] max-w-xs mx-auto">
                    Sales assigned to {customer.name} during checkout will appear here with item breakdowns and thermal receipts.
                  </p>
                  <button
                    type="button"
                    onClick={() => onAssignToCart(customer)}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                  >
                    Start First Sale
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {customerTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 px-2 rounded-xl transition"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black font-mono text-slate-800">
                            #{tx.receiptNumber}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                            {tx.paymentMethod.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(tx.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {tx.items.length} item{tx.items.length > 1 ? 's' : ''}:{' '}
                          <span className="text-slate-700 font-medium">
                            {tx.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Cashier: {tx.cashierName} • Branch: {tx.locationName}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900 font-mono">
                            {currentLocation.currency} {tx.total.toFixed(2)}
                          </div>
                          {tx.loyaltyPointsEarned && tx.loyaltyPointsEarned > 0 && (
                            <span className="text-[10px] font-bold text-amber-700 block">
                              +{tx.loyaltyPointsEarned} pts earned
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveReceipt(tx)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                          title="View thermal printable receipt"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Store Credit / Daftari Ledger */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Chronological Credit & Repayment Ledger
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Audited record of all tab sales, M-Pesa/cash repayments, and manual adjustments
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCreditAdjustment(customer)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Entry</span>
                </button>
              </div>

              {!customer.ledger || customer.ledger.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
                  <div className="text-xs font-bold text-slate-600">Ledger is Empty</div>
                  <p className="text-[11px] max-w-xs mx-auto">
                    Transactions charged to Store Credit and repayments will be logged here chronologically.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Entry Type</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-right">Balance After</th>
                        <th className="py-2.5 px-3">Reference / Receipt</th>
                        <th className="py-2.5 px-3">Cashier</th>
                        <th className="py-2.5 px-3">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customer.ledger.map((entry) => {
                        const isCreditInflow = entry.amount >= 0;
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                              {new Date(entry.timestamp).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  entry.type === 'payment_received'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : entry.type === 'sale_credit'
                                    ? 'bg-red-100 text-red-800'
                                    : entry.type === 'refund_credit'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {entry.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-black font-mono ${
                                isCreditInflow ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {isCreditInflow ? '+' : ''}
                              {currentLocation.currency} {entry.amount.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-800">
                              {currentLocation.currency} {entry.balanceAfter.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                              {entry.referenceId || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {entry.recordedByCashierName || 'System'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={entry.notes}>
                              {entry.notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
