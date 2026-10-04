import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  User,
  UserPlus,
  Phone,
  Star,
  CreditCard,
  Check,
  Building2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { Customer } from '../types';
import { usePos } from '../context/PosContext';
import { CustomerFormModal } from './CustomerFormModal';

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer | null) => void;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
}) => {
  const { customers, selectedCustomer, currentLocation, showToast } = usePos();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) {
      return customers;
    }
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [customers, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      id="customer-select-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Assign Customer to Sale
              </h2>
              <p className="text-[11px] text-slate-400">
                Track client purchase history, reward loyalty & enable store credit
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

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone (+254...), email..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            {selectedCustomer ? (
              <button
                type="button"
                onClick={() => {
                  onSelectCustomer(null);
                  showToast('Removed customer assignment (Walk-in)', 'info');
                  onClose();
                }}
                className="text-xs text-red-600 hover:text-red-700 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition cursor-pointer"
              >
                Clear Customer (Walk-in Sale)
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 italic">
                Currently ringing up as Walk-in Customer
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer ml-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ New Customer</span>
            </button>
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <User className="w-8 h-8 mx-auto text-slate-300" />
              <div className="text-xs font-bold text-slate-600">No Customers Found</div>
              <p className="text-[11px] max-w-xs mx-auto">
                No customer profiles matched "{searchQuery}". You can quickly register a new client profile below.
              </p>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl"
              >
                Register New Customer
              </button>
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const isAssigned = selectedCustomer?.id === c.id;
              const balance = c.storeCreditBalance || 0;
              const hasDebt = balance < 0;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCustomer(c);
                    showToast(`Assigned ${c.name} to checkout`, 'success');
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer group ${
                    isAssigned
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                        isAssigned
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                      }`}
                    >
                      {c.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {c.name}
                        </span>
                        {c.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {c.phone}
                        </span>
                        {c.loyaltyPoints !== undefined && (
                          <span className="flex items-center gap-1 text-amber-700 font-bold">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            {c.loyaltyPoints} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full font-mono block ${
                          hasDebt
                            ? 'bg-red-100 text-red-800'
                            : balance > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {hasDebt
                          ? `Tab: -${currentLocation.currency} ${Math.abs(balance).toFixed(0)}`
                          : balance > 0
                          ? `+${currentLocation.currency} ${balance.toFixed(0)} Credit`
                          : 'Clear'}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-0.5 block">
                        Limit: {currentLocation.currency} {c.creditLimit || 0}
                      </span>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition ${
                        isAssigned
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 text-transparent group-hover:border-slate-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      <CustomerFormModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSuccess={(newCust) => {
          setIsAddCustomerOpen(false);
          onSelectCustomer(newCust);
          showToast(`Created & assigned customer: ${newCust.name}`, 'success');
          onClose();
        }}
      />
    </div>
  );
};
