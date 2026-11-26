import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  CreditCard,
  ShoppingCart,
  Star,
  ArrowUpDown,
  Download,
  Wallet,
  Eye,
  EyeOff,
  Edit2,
  RefreshCw,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { Customer } from '../types';
import { usePos } from '../context/PosContext';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerCreditAdjustmentModal } from './CustomerCreditAdjustmentModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import {
  canViewUnmaskedCustomerPii,
  isCustomerAnonymized,
  maskPhoneNumber,
  maskEmailAddress,
  maskAddress,
  maskKraPin,
} from '../utils/privacyAndKraSecurity';

interface CustomerManagementViewProps {
  onAssignCustomerToCart?: (customer: Customer) => void;
}

export const CustomerManagementView: React.FC<CustomerManagementViewProps> = ({
  onAssignCustomerToCart,
}) => {
  const {
    customers,
    currentBusiness,
    currentLocation,
    setSelectedCustomer,
    selectedCustomer,
    showToast,
    openBusinessSettings,
    refreshTenantCustomers,
    isCustomersLoading,
    entitlements,
    isSuperAdmin,
    currentUser,
    logAdminActivity,
    requireCapability,
  } = usePos();

  const hasLoyaltyAndCredit = isSuperAdmin || entitlements.capabilities.loyaltyAndStoreCredit;
  const canRevealPii = canViewUnmaskedCustomerPii(currentUser?.role, isSuperAdmin);
  const [showUnmaskedContacts, setShowUnmaskedContacts] = useState(false);
  const isPiiRevealed = canRevealPii && showUnmaskedContacts;

  useEffect(() => {
    refreshTenantCustomers(false).catch(() => {});
  }, [refreshTenantCustomers]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'debt_desc' | 'spend_desc' | 'visits_desc' | 'points_desc' | 'name_asc' | 'recent'
  >('debt_desc');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isCreditAdjustmentModalOpen, setIsCreditAdjustmentModalOpen] = useState(false);
  const [customerForCreditAdjustment, setCustomerForCreditAdjustment] = useState<Customer | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [customerForDetail, setCustomerForDetail] = useState<Customer | null>(null);

  const customerList = customers || [];

  // Always resolve latest customer data from list so modals stay in sync after actions
  const activeCustomerForDetail = useMemo(() => {
    if (!customerForDetail) return null;
    return customerList.find((c) => c.id === customerForDetail.id) || customerForDetail;
  }, [customerForDetail, customerList]);

  const activeCustomerForCreditAdjustment = useMemo(() => {
    if (!customerForCreditAdjustment) return null;
    return customerList.find((c) => c.id === customerForCreditAdjustment.id) || customerForCreditAdjustment;
  }, [customerForCreditAdjustment, customerList]);

  // Compute directory aggregates
  const stats = useMemo(() => {
    let totalDebt = 0;
    let totalPrepaid = 0;
    let debtCustomerCount = 0;
    let totalPoints = 0;
    let totalSpent = 0;

    customerList.forEach((c) => {
      const bal = c.storeCreditBalance || 0;
      if (bal < 0) {
        totalDebt += Math.abs(bal);
        debtCustomerCount += 1;
      } else if (bal > 0) {
        totalPrepaid += bal;
      }
      totalPoints += c.loyaltyPoints || 0;
      totalSpent += c.totalSpent || 0;
    });

    return {
      totalCustomers: customerList.length,
      totalDebt,
      debtCustomerCount,
      totalPrepaid,
      totalPoints,
      totalSpent,
    };
  }, [customerList]);

  // Filter & sort
  const filteredCustomers = useMemo(() => {
    return customerList
      .filter((c) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = c.name.toLowerCase().includes(q);
          const matchPhone = c.phone.toLowerCase().includes(q);
          const matchEmail = (c.email || '').toLowerCase().includes(q);
          const matchAddress = (c.address || '').toLowerCase().includes(q);
          const matchTag = (c.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!matchName && !matchPhone && !matchEmail && !matchAddress && !matchTag) {
            return false;
          }
        }

        // Tag filter
        if (selectedTagFilter === 'has_debt') {
          return (c.storeCreditBalance || 0) < 0;
        }
        if (selectedTagFilter === 'prepaid_credit') {
          return (c.storeCreditBalance || 0) > 0;
        }
        if (selectedTagFilter === 'credit_allowed') {
          return c.isCreditAllowed;
        }
        if (selectedTagFilter !== 'all') {
          return (c.tags || []).includes(selectedTagFilter);
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'debt_desc': {
            // Debt is negative storeCreditBalance; the more negative, the more owed
            const aDebt = (a.storeCreditBalance || 0) < 0 ? Math.abs(a.storeCreditBalance || 0) : -1;
            const bDebt = (b.storeCreditBalance || 0) < 0 ? Math.abs(b.storeCreditBalance || 0) : -1;
            return bDebt - aDebt;
          }
          case 'spend_desc':
            return b.totalSpent - a.totalSpent;
          case 'visits_desc':
            return b.visitCount - a.visitCount;
          case 'points_desc':
            return (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0);
          case 'name_asc':
            return a.name.localeCompare(b.name);
          case 'recent':
            return new Date(b.lastVisitAt || 0).getTime() - new Date(a.lastVisitAt || 0).getTime();
          default:
            return 0;
        }
      });
  }, [customers, searchQuery, selectedTagFilter, sortBy]);

  const handleAssignAndCheckout = (cust: Customer) => {
    setSelectedCustomer(cust);
    showToast(`Assigned ${cust.name} to checkout`, 'info');
    onAssignCustomerToCart?.(cust);
  };

  const handleToggleContactReveal = () => {
    if (!canRevealPii) return;
    const next = !showUnmaskedContacts;
    setShowUnmaskedContacts(next);
    if (next) {
      logAdminActivity({
        category: 'customer',
        action: 'reveal_customer_pii',
        description: 'Revealed unmasked customer contacts in customer directory',
        recordType: 'customer_directory',
        recordId: currentBusiness?.id || 'directory',
      });
    }
  };

  const handleExportCsv = () => {
    const canExportUnmasked = isSuperAdmin || currentUser?.role === 'business_owner';
    const headers = [
      'ID',
      'Name',
      'Phone',
      'Email',
      'Address',
      'KRA PIN',
      'DPA Status',
      'Tags',
      'Credit Allowed',
      'Credit Limit',
      'Store Credit Balance',
      'Loyalty Points',
      'Total Spent',
      'Visit Count',
      'First Visit',
      'Last Visit',
    ];

    const rows = customerList.map((c) => {
      const anonymized = isCustomerAnonymized(c);
      const exportPhone = anonymized
        ? c.phone
        : canExportUnmasked
        ? c.phone
        : maskPhoneNumber(c.phone);
      const exportEmail = anonymized
        ? ''
        : canExportUnmasked
        ? c.email || ''
        : maskEmailAddress(c.email);
      const exportAddress = anonymized
        ? ''
        : canExportUnmasked
        ? c.address || ''
        : maskAddress(c.address);
      const exportKraPin = anonymized
        ? ''
        : canExportUnmasked
        ? c.kraPin || ''
        : maskKraPin(c.kraPin);

      return [
        c.id,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${exportPhone.replace(/"/g, '""')}"`,
        `"${exportEmail.replace(/"/g, '""')}"`,
        `"${exportAddress.replace(/"/g, '""')}"`,
        `"${exportKraPin.replace(/"/g, '""')}"`,
        anonymized ? 'Anonymized (DPA 2019)' : 'Active',
        `"${(c.tags || []).join(', ')}"`,
        c.isCreditAllowed ? 'Yes' : 'No',
        c.creditLimit || 0,
        c.storeCreditBalance || 0,
        c.loyaltyPoints || 0,
        c.totalSpent || 0,
        c.visitCount || 0,
        c.firstVisitAt || '',
        c.lastVisitAt || '',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customers_directory_${currentBusiness.code || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logAdminActivity({
      category: 'customer',
      action: 'export_customers_csv',
      description: canExportUnmasked
        ? 'Exported customer directory CSV (owner full access)'
        : 'Exported customer directory CSV (PII masked)',
      recordType: 'customer_directory',
      recordId: currentBusiness?.id || 'directory',
    });
    showToast(
      canExportUnmasked
        ? 'Customer directory exported to CSV'
        : 'Customer directory exported to CSV (PII masked)',
      'success'
    );
  };

  return (
    <div
      id="customer-management-view"
      className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 select-none"
    >
      {/* Top Banner & Control Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              Customer &amp; Daftari Credit Directory
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {currentBusiness.name} · Store credit ledger, loyalty points &amp; purchase history
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => refreshTenantCustomers(true)}
              disabled={isCustomersLoading}
              aria-label="Refresh customers from cloud"
              className="min-w-[40px] min-h-[40px] px-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 transition inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
              title="Refresh customers from cloud"
            >
              <RefreshCw className={`w-4 h-4 ${isCustomersLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              type="button"
              id="customer-view-loyalty-settings-btn"
              onClick={() => {
                if (!requireCapability('loyaltyAndStoreCredit')) return;
                openBusinessSettings('loyalty');
              }}
              className="min-h-[40px] px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Configure Loyalty Points Earning & Redemption Values"
            >
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">Loyalty Rules</span>
              {!hasLoyaltyAndCredit && <Lock className="w-3 h-3 text-slate-400 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[40px] px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Download customer database as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCustomerToEdit(null);
                setIsFormModalOpen(true);
              }}
              className="min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Aggregates Dashboard Cards (Single-elevation flat 1px surfaces, sentence-case) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-3.5">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-600">Total Customers</div>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {stats.totalCustomers}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">All branch profiles</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-600">Outstanding Tab Debt</div>
              <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-red-700 mt-0.5 truncate">
                {currentLocation.currency} {stats.totalDebt.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {stats.debtCustomerCount} client{stats.debtCustomerCount !== 1 ? 's' : ''} on tab
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-600">Prepaid Store Credit</div>
              <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-emerald-700 mt-0.5 truncate">
                {currentLocation.currency} {stats.totalPrepaid.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">Customer deposits</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-600">Active Loyalty Points</div>
              <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-amber-800 mt-0.5 truncate">
                {stats.totalPoints} pts
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate font-mono tabular-nums">
                Value: {currentLocation.currency} {stats.totalPoints.toFixed(2)}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <Star className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone (+254...), email, or tag..."
            className="w-full min-h-[40px] pl-9 pr-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-slate-50 focus:bg-white text-slate-900"
          />
        </div>

        {/* Segmented Filter Tabs & Sort Selector (Zero Pill Badges, Zero Shadow-2xs) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 overflow-x-auto">
          <div className="inline-flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setSelectedTagFilter('all')}
              className={`min-h-[34px] px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap tabular-nums ${
                selectedTagFilter === 'all'
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('has_debt')}
              className={`min-h-[34px] px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap tabular-nums ${
                selectedTagFilter === 'has_debt'
                  ? 'bg-white text-red-700 border border-slate-200'
                  : 'text-slate-600 hover:text-red-700 border border-transparent'
              }`}
            >
              Has Debt{stats.debtCustomerCount > 0 ? ` (${stats.debtCustomerCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('prepaid_credit')}
              className={`min-h-[34px] px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                selectedTagFilter === 'prepaid_credit'
                  ? 'bg-white text-emerald-700 border border-slate-200'
                  : 'text-slate-600 hover:text-emerald-700 border border-transparent'
              }`}
            >
              Prepaid
            </button>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('credit_allowed')}
              className={`min-h-[34px] px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                selectedTagFilter === 'credit_allowed'
                  ? 'bg-white text-indigo-700 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              Credit Authorized
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 shrink-0 sm:pl-2 sm:border-l sm:border-slate-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort customers"
              className="min-h-[40px] bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 py-1.5 px-2.5 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="debt_desc">Highest Debt First</option>
              <option value="spend_desc">Highest Spend First</option>
              <option value="visits_desc">Most Visits</option>
              <option value="points_desc">Most Loyalty Points</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="recent">Recently Active</option>
            </select>
          </div>

          {canRevealPii && (
            <button
              type="button"
              onClick={handleToggleContactReveal}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap ${
                isPiiRevealed
                  ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title={
                isPiiRevealed
                  ? 'Mask customer phone numbers and contact details'
                  : 'Reveal full customer phone numbers (audited action)'
              }
            >
              {isPiiRevealed ? <EyeOff className="w-3.5 h-3.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 shrink-0" />}
              <span>{isPiiRevealed ? 'Hide Contacts' : 'Show Contacts'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Directory Customer List Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-24 lg:pb-8">
        {filteredCustomers.length === 0 ? (
          <div className="h-full min-h-[280px] bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <Users className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
            <div className="text-sm font-bold text-slate-700">No Customers Found</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {searchQuery || selectedTagFilter !== 'all'
                ? 'No client profiles matched your search criteria or filters.'
                : 'No customer profiles have been added to this business directory yet.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedTagFilter('all');
                setIsFormModalOpen(true);
              }}
              className="mt-4 min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Add First Customer
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Directory Table (md and up) */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto max-h-[62vh]">
                <table className="w-full text-left border-collapse min-w-[880px]">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-xs font-semibold text-slate-600">
                    <tr>
                      <th scope="col" className="py-2.5 pl-5 pr-3">
                        <button
                          type="button"
                          onClick={() => setSortBy('name_asc')}
                          className={`inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ${
                            sortBy === 'name_asc' ? 'text-blue-700' : ''
                          }`}
                        >
                          <span>Customer</span>
                        </button>
                      </th>
                      <th scope="col" className="py-2.5 px-3">Phone</th>
                      <th scope="col" className="py-2.5 px-3">Credit Terms</th>
                      <th scope="col" className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSortBy('debt_desc')}
                          className={`inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ml-auto ${
                            sortBy === 'debt_desc' ? 'text-blue-700' : ''
                          }`}
                        >
                          <span>Tab / Balance</span>
                        </button>
                      </th>
                      <th scope="col" className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSortBy('points_desc')}
                          className={`inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ml-auto ${
                            sortBy === 'points_desc' ? 'text-blue-700' : ''
                          }`}
                        >
                          <span>Loyalty</span>
                        </button>
                      </th>
                      <th scope="col" className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSortBy('spend_desc')}
                          className={`inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ml-auto ${
                            sortBy === 'spend_desc' ? 'text-blue-700' : ''
                          }`}
                        >
                          <span>Lifetime Spend</span>
                        </button>
                      </th>
                      <th scope="col" className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSortBy('visits_desc')}
                          className={`inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ml-auto ${
                            sortBy === 'visits_desc' ? 'text-blue-700' : ''
                          }`}
                        >
                          <span>Orders</span>
                        </button>
                      </th>
                      <th scope="col" className="py-2.5 pl-3 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
                    {filteredCustomers.map((cust) => {
                      const balance = cust.storeCreditBalance || 0;
                      const hasDebt = balance < 0;
                      const isSelected = selectedCustomer?.id === cust.id;
                      const creditLimit = cust.creditLimit || 0;
                      const anonymized = isCustomerAnonymized(cust);
                      const displayPhone = anonymized
                        ? cust.phone
                        : isPiiRevealed
                        ? cust.phone
                        : maskPhoneNumber(cust.phone);

                      return (
                        <tr
                          key={cust.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/90'
                          }`}
                        >
                          <td className="py-2.5 pl-5 pr-3 align-middle">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerForDetail(cust);
                                  setIsDetailModalOpen(true);
                                }}
                                className="font-semibold text-slate-900 hover:text-blue-700 hover:underline text-left cursor-pointer"
                              >
                                {cust.name}
                              </button>
                              {anonymized && (
                                <span className="text-[11px] font-medium text-slate-500 inline-flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-slate-400" />
                                  Anonymized (DPA 2019)
                                </span>
                              )}
                            </div>
                            {cust.tags && cust.tags.length > 0 && (
                              <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
                                {cust.tags.join(' · ')}
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 align-middle font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {displayPhone}
                          </td>

                          <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                            {cust.isCreditAllowed ? (
                              <span className="text-indigo-700 font-medium font-mono tabular-nums">
                                Limit {currentLocation.currency} {creditLimit.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-500">Cash only</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                            {hasDebt ? (
                              <span className="text-red-700">
                                Owes {currentLocation.currency} {Math.abs(balance).toFixed(2)}
                              </span>
                            ) : balance > 0 ? (
                              <span className="text-emerald-700">
                                +{currentLocation.currency} {balance.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-500 font-medium">Clear</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-amber-800 font-medium whitespace-nowrap">
                            {cust.loyaltyPoints || 0} pts
                          </td>

                          <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                            {currentLocation.currency} {cust.totalSpent.toFixed(2)}
                          </td>

                          <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            {cust.visitCount}
                          </td>

                          <td className="py-2.5 pl-3 pr-5 align-middle text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              {!anonymized && (
                                <button
                                  type="button"
                                  onClick={() => handleAssignAndCheckout(cust)}
                                  className={`min-h-[34px] px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white'
                                      : 'text-blue-700 hover:bg-blue-50'
                                  }`}
                                  title="Assign customer to cart and open checkout"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                                  <span>{isSelected ? 'Active' : 'Assign'}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (!requireCapability('loyaltyAndStoreCredit')) return;
                                  setCustomerForCreditAdjustment(cust);
                                  setIsCreditAdjustmentModalOpen(true);
                                }}
                                className="min-w-[34px] min-h-[34px] inline-flex items-center justify-center rounded-md text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                                title="Record payment or adjust credit ledger"
                                aria-label={`Adjust credit ledger for ${cust.name}`}
                              >
                                {!hasLoyaltyAndCredit ? <Lock className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerForDetail(cust);
                                  setIsDetailModalOpen(true);
                                }}
                                className="min-w-[34px] min-h-[34px] inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                title="View Profile & Purchase History"
                                aria-label={`View profile for ${cust.name}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {!anonymized && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomerToEdit(cust);
                                    setIsFormModalOpen(true);
                                  }}
                                  className="min-w-[34px] min-h-[34px] inline-flex items-center justify-center rounded-md text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                                  title="Edit Customer Profile"
                                  aria-label={`Edit ${cust.name}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
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

            {/* Mobile Cards (< md): Clean Hairline Layout with >=44px Touch Targets */}
            <div className="md:hidden space-y-2.5">
              {filteredCustomers.map((cust) => {
                const balance = cust.storeCreditBalance || 0;
                const hasDebt = balance < 0;
                const isSelected = selectedCustomer?.id === cust.id;
                const creditLimit = cust.creditLimit || 0;
                const anonymized = isCustomerAnonymized(cust);
                const displayPhone = anonymized
                  ? cust.phone
                  : isPiiRevealed
                  ? cust.phone
                  : maskPhoneNumber(cust.phone);

                return (
                  <article
                    key={cust.id}
                    className={`bg-white border rounded-xl p-3.5 space-y-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerForDetail(cust);
                              setIsDetailModalOpen(true);
                            }}
                            className="text-sm font-bold text-slate-900 hover:text-blue-700 text-left cursor-pointer"
                          >
                            {cust.name}
                          </button>
                          {anonymized && (
                            <span className="text-[11px] font-medium text-slate-500 inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-slate-400" />
                              Anonymized (DPA 2019)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                          <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700">
                            <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                            {displayPhone}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {cust.isCreditAllowed
                              ? `Credit limit ${currentLocation.currency} ${creditLimit.toLocaleString()}`
                              : 'Cash only'}
                          </span>
                        </div>
                        {cust.tags && cust.tags.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            {cust.tags.join(' · ')}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 font-mono tabular-nums text-xs font-bold">
                        {hasDebt ? (
                          <span className="text-red-700">
                            Owes {currentLocation.currency} {Math.abs(balance).toFixed(2)}
                          </span>
                        ) : balance > 0 ? (
                          <span className="text-emerald-700">
                            +{currentLocation.currency} {balance.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">Clear tab</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Lifetime</span>
                        <span className="font-semibold text-slate-900 font-mono tabular-nums">
                          {currentLocation.currency} {cust.totalSpent.toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Orders</span>
                        <span className="font-semibold text-slate-900 font-mono tabular-nums">
                          {cust.visitCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Loyalty</span>
                        <span className="font-semibold text-amber-800 font-mono tabular-nums">
                          {cust.loyaltyPoints || 0} pts
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                      {!anonymized && (
                        <button
                          type="button"
                          onClick={() => handleAssignAndCheckout(cust)}
                          className={`flex-1 min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                          <span>{isSelected ? 'Active in Cart' : 'Assign'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (!requireCapability('loyaltyAndStoreCredit')) return;
                          setCustomerForCreditAdjustment(cust);
                          setIsCreditAdjustmentModalOpen(true);
                        }}
                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 inline-flex items-center justify-center transition cursor-pointer"
                        title="Record payment or adjust credit ledger"
                        aria-label={`Adjust credit ledger for ${cust.name}`}
                      >
                        {!hasLoyaltyAndCredit ? <Lock className="w-4 h-4 text-slate-400" /> : <Wallet className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCustomerForDetail(cust);
                          setIsDetailModalOpen(true);
                        }}
                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 inline-flex items-center justify-center transition cursor-pointer"
                        title="View Profile & Purchase History"
                        aria-label={`View profile for ${cust.name}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {!anonymized && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerToEdit(cust);
                            setIsFormModalOpen(true);
                          }}
                          className="min-w-[44px] min-h-[44px] rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 inline-flex items-center justify-center transition cursor-pointer"
                          title="Edit Customer Profile"
                          aria-label={`Edit ${cust.name}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Form Modal (Add / Edit) */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setCustomerToEdit(null);
        }}
        initialCustomer={customerToEdit}
      />

      {/* Credit / Tab Adjustment Modal */}
      <CustomerCreditAdjustmentModal
        isOpen={isCreditAdjustmentModalOpen}
        onClose={() => {
          setIsCreditAdjustmentModalOpen(false);
          setCustomerForCreditAdjustment(null);
        }}
        customer={activeCustomerForCreditAdjustment}
      />

      {/* Full Customer Profile & History Modal */}
      <CustomerDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setCustomerForDetail(null);
        }}
        customer={activeCustomerForDetail}
        onEditCustomer={(cust) => {
          setIsDetailModalOpen(false);
          setCustomerToEdit(cust);
          setIsFormModalOpen(true);
        }}
        onOpenCreditAdjustment={(cust) => {
          if (!requireCapability('loyaltyAndStoreCredit')) return;
          setCustomerForCreditAdjustment(cust);
          setIsCreditAdjustmentModalOpen(true);
        }}
        onAssignToCart={(cust) => {
          setIsDetailModalOpen(false);
          handleAssignAndCheckout(cust);
        }}
      />
    </div>
  );
};
