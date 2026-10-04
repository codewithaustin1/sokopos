import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  CreditCard,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Customer } from '../types';
import { usePos } from '../context/PosContext';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomer?: Customer | null;
  onSuccess?: (customer: Customer) => void;
}

const PRESET_TAGS = ['VIP', 'Wholesale', 'Regular', 'Credit Account', 'Corporate', 'Government', 'Staff'];

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  initialCustomer,
  onSuccess,
}) => {
  const { addCustomer, updateCustomer, currentLocation, showToast } = usePos();

  const isEditing = Boolean(initialCustomer);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isCreditAllowed, setIsCreditAllowed] = useState(true);
  const [creditLimit, setCreditLimit] = useState('10000');
  const [storeCreditBalance, setStoreCreditBalance] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialCustomer) {
      setName(initialCustomer.name || '');
      setPhone(initialCustomer.phone || '');
      setEmail(initialCustomer.email || '');
      setAddress(initialCustomer.address || '');
      setNotes(initialCustomer.notes || '');
      setTags(initialCustomer.tags || []);
      setIsCreditAllowed(initialCustomer.isCreditAllowed ?? true);
      setCreditLimit(String(initialCustomer.creditLimit ?? 10000));
      setStoreCreditBalance(String(initialCustomer.storeCreditBalance ?? 0));
    } else {
      setName('');
      setPhone('+254 ');
      setEmail('');
      setAddress('');
      setNotes('');
      setTags(['Regular']);
      setIsCreditAllowed(true);
      setCreditLimit('10000');
      setStoreCreditBalance('0');
    }
    setErrorMessage('');
  }, [initialCustomer, isOpen]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setCustomTagInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Customer name is required.');
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage('Please provide a valid phone number (at least 9 digits).');
      return;
    }

    const parsedCreditLimit = parseFloat(creditLimit) || 0;
    const parsedStoreCreditBalance = parseFloat(storeCreditBalance) || 0;

    setIsSubmitting(true);
    try {
      if (isEditing && initialCustomer) {
        await updateCustomer(initialCustomer.id, {
          name: name.trim(),
          phone: cleanPhone,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          tags,
          isCreditAllowed,
          creditLimit: Math.max(0, parsedCreditLimit),
          storeCreditBalance: parsedStoreCreditBalance,
        });
        const updated: Customer = {
          ...initialCustomer,
          name: name.trim(),
          phone: cleanPhone,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          tags,
          isCreditAllowed,
          creditLimit: Math.max(0, parsedCreditLimit),
          storeCreditBalance: parsedStoreCreditBalance,
        };
        onSuccess?.(updated);
      } else {
        const created = await addCustomer({
          name: name.trim(),
          phone: cleanPhone,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          tags,
          isCreditAllowed,
          creditLimit: Math.max(0, parsedCreditLimit),
          loyaltyPoints: 0,
          storeCreditBalance: parsedStoreCreditBalance,
        });
        onSuccess?.(created);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save customer profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="customer-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {isEditing ? 'Edit Customer Profile' : 'Add New Customer Profile'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Client details, store credit limits & loyalty directory
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grace Wanjiku"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Phone Number *</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
                className="w-full px-3 py-2 text-xs font-mono font-medium rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Email & Physical Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Email Address (Optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Address / Neighborhood</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Kilimani, Argwings Kodhek"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-600" />
              <span>Customer Classification Tags</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_TAGS.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {tag}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="Add custom tag (press Enter)..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Store Credit / Daftari Terms Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Store Credit / "Daftari" Tab Authorization
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Allow client to ring up sales on credit and settle later
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isCreditAllowed}
                onChange={(e) => setIsCreditAllowed(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {isCreditAllowed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Credit Limit ({currentLocation.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    Maximum debt allowed before credit sales are blocked
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Current Balance ({currentLocation.currency})
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={storeCreditBalance}
                    onChange={(e) => setStoreCreditBalance(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    Negative = debt owed; Positive = prepaid credit deposit
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes / Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Internal Notes / Credit Settlement Terms</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Settles credit every Friday afternoon via M-Pesa. Primary contact for wholesale orders."
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
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Save Changes' : 'Create Profile'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
