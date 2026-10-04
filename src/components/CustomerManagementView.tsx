import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  Phone,
  Mail,
  MapPin,
  Tag,
  CreditCard,
  ShoppingCart,
  Star,
  ArrowUpDown,
  Download,
  AlertCircle,
  CheckCircle2,
  Wallet,
  TrendingUp,
  Receipt,
  Eye,
  Edit2,
  Building2,
  BadgePercent,
  Clock,
} from 'lucide-react';
import { Customer } from '../types';
import { usePos } from '../context/PosContext';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerCreditAdjustmentModal } from './CustomerCreditAdjustmentModal';
import { CustomerDetailModal } from './CustomerDetailModal';

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
  } = usePos();

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

  // Extract all unique tags
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    customerList.forEach((c) => {
      (c.tags || []).forEach((t) => set.add(t));
    });
    return Array.from(set);
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

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Name',
      'Phone',
      'Email',
      'Address',
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

    const rows = customers.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${(c.tags || []).join(', ')}"`,
      c.isCreditAllowed ? 'Yes' : 'No',
      c.creditLimit || 0,
      c.storeCreditBalance || 0,
      c.loyaltyPoints || 0,
      c.totalSpent || 0,
      c.visitCount || 0,
      c.firstVisitAt || '',
      c.lastVisitAt || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customers_directory_${currentBusiness.code || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Customer directory exported to CSV', 'success');
  };

  return (
    <div
      id="customer-management-view"
      className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 select-none"
    >
      {/* Top Banner & Control Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-200 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Customer Management & Credit Directory
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {currentBusiness.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Client accounts, store credit / "daftari" ledger, loyalty points & purchase histories
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
              title="Download customer database as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCustomerToEdit(null);
                setIsFormModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Aggregates Dashboard Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Total Customers</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {stats.totalCustomers}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Across all business locations
            </div>
          </div>

          <div className="bg-red-50/50 border border-red-200 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-red-600" />
              <span>Outstanding Daftari Debt</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-red-700 font-mono mt-1">
              {currentLocation.currency} {stats.totalDebt.toFixed(2)}
            </div>
            <div className="text-[10px] text-red-600/90 mt-0.5 font-medium">
              Owed by {stats.debtCustomerCount} client{stats.debtCustomerCount !== 1 ? 's' : ''} on tab
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Prepaid Store Credit</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-800 font-mono mt-1">
              {currentLocation.currency} {stats.totalPrepaid.toFixed(2)}
            </div>
            <div className="text-[10px] text-emerald-700/90 mt-0.5">
              In customer favour / deposit
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Loyalty Points Active</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-900 font-mono mt-1">
              {stats.totalPoints} pts
            </div>
            <div className="text-[10px] text-amber-700/90 mt-0.5">
              Value: {currentLocation.currency} {stats.totalPoints.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone (+254...), email, or tag..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-slate-50/60"
          />
        </div>

        {/* Filter Pills and Sort Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setSelectedTagFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                selectedTagFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('has_debt')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                selectedTagFilter === 'has_debt'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-red-700 hover:bg-red-50'
              }`}
            >
              <span>Has Debt</span>
              {stats.debtCustomerCount > 0 && (
                <span className="text-[10px] px-1 py-0.2 rounded-full bg-white/20">
                  {stats.debtCustomerCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('prepaid_credit')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                selectedTagFilter === 'prepaid_credit'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Prepaid Credit
            </button>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('credit_allowed')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                selectedTagFilter === 'credit_allowed'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Credit Authorized
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 py-1 px-2 focus:outline-none focus:border-blue-600"
            >
              <option value="debt_desc">Highest Debt First</option>
              <option value="spend_desc">Highest Spend First</option>
              <option value="visits_desc">Most Visits</option>
              <option value="points_desc">Most Loyalty Points</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="recent">Recently Active</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Customer List Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filteredCustomers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <Users className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
            <div className="text-sm font-bold text-slate-700">No Customers Found</div>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery || selectedTagFilter !== 'all'
                ? 'No client profiles matched your search criteria or tag filters.'
                : 'No customer profiles have been added to this business directory yet.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedTagFilter('all');
                setIsFormModalOpen(true);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
            >
              Add First Customer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredCustomers.map((cust) => {
              const balance = cust.storeCreditBalance || 0;
              const hasDebt = balance < 0;
              const isSelected = selectedCustomer?.id === cust.id;
              const creditLimit = cust.creditLimit || 0;

              return (
                <div
                  key={cust.id}
                  className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between group ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : hasDebt
                      ? 'border-red-200/90 hover:border-red-300'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Top Row: Avatar, Name, and Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center shrink-0 shadow-2xs ${
                            hasDebt
                              ? 'bg-red-100 text-red-800'
                              : balance > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {cust.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <h3
                            onClick={() => {
                              setCustomerForDetail(cust);
                              setIsDetailModalOpen(true);
                            }}
                            className="text-xs font-black text-slate-900 truncate hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {cust.name}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {cust.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Store Credit Balance Pill */}
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full font-mono ${
                            hasDebt
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : balance > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {hasDebt
                            ? `Owes ${currentLocation.currency} ${Math.abs(balance).toFixed(2)}`
                            : balance > 0
                            ? `+${currentLocation.currency} ${balance.toFixed(2)} Credit`
                            : 'Clear Tab'}
                        </span>
                      </div>
                    </div>

                    {/* Tags row */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                      {cust.tags && cust.tags.length > 0 ? (
                        cust.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">No tags</span>
                      )}
                      {cust.isCreditAllowed ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Credit Allowed
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-400">
                          Cash Only
                        </span>
                      )}
                    </div>

                    {/* Metrics Bar */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">
                          Lifetime
                        </span>
                        <span className="font-bold text-slate-800 font-mono">
                          {currentLocation.currency} {cust.totalSpent.toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">
                          Visits
                        </span>
                        <span className="font-bold text-slate-800">
                          {cust.visitCount} orders
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-400 block flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                          <span>Loyalty</span>
                        </span>
                        <span className="font-bold text-amber-700 font-mono">
                          {cust.loyaltyPoints || 0} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    {/* Ring Up / Assign Cart */}
                    <button
                      type="button"
                      onClick={() => handleAssignAndCheckout(cust)}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80'
                      }`}
                      title="Assign customer to cart and open checkout"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Active in Cart' : 'Assign to Cart'}</span>
                    </button>

                    {/* Pay / Credit Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerForCreditAdjustment(cust);
                        setIsCreditAdjustmentModalOpen(true);
                      }}
                      className="p-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 transition cursor-pointer"
                      title="Record payment or adjust credit ledger"
                    >
                      <Wallet className="w-4 h-4" />
                    </button>

                    {/* View Details */}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerForDetail(cust);
                        setIsDetailModalOpen(true);
                      }}
                      className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                      title="View Profile & Purchase History"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Edit Profile */}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerToEdit(cust);
                        setIsFormModalOpen(true);
                      }}
                      className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                      title="Edit Customer Profile"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
