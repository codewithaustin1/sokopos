import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Clock,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Supplier, SupplierPaymentTerms } from '../types';
import { usePos } from '../context/PosContext';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit?: Supplier | null;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
}) => {
  const { addSupplier, updateSupplier, categories, currentBusiness, showToast } = usePos();

  const draftStorageKey = `sokopos_draft_new_supplier_${currentBusiness?.id || 'default'}`;

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('+254 ');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Nairobi');
  const [kraPin, setKraPin] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<SupplierPaymentTerms>('net_14');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [mpesaPaybillOrTill, setMpesaPaybillOrTill] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('2');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasDraftLoaded, setHasDraftLoaded] = useState(false);

  // Track previous open state and target supplier ID so inputs are NOT wiped on background sync/re-renders
  const prevOpenRef = useRef(false);
  const prevSupplierIdRef = useRef<string | null | undefined>(undefined);

  // Synchronize state strictly when modal opens or when editing target changes
  useEffect(() => {
    const isNowOpen = isOpen;
    const currentTargetId = supplierToEdit?.id ?? null;
    const didOpenJustNow = isNowOpen && !prevOpenRef.current;
    const didTargetChange = currentTargetId !== prevSupplierIdRef.current;

    if (isNowOpen && (didOpenJustNow || didTargetChange)) {
      if (supplierToEdit) {
        setName(supplierToEdit.name || '');
        setContactPerson(supplierToEdit.contactPerson || '');
        setPhone(supplierToEdit.phone || '');
        setEmail(supplierToEdit.email || '');
        setCategory(supplierToEdit.category || '');
        setAddress(supplierToEdit.address || '');
        setCity(supplierToEdit.city || 'Nairobi');
        setKraPin(supplierToEdit.kraPin || '');
        setPaymentTerms(supplierToEdit.paymentTerms || 'net_14');
        setBankName(supplierToEdit.bankName || '');
        setBankAccount(supplierToEdit.bankAccount || '');
        setMpesaPaybillOrTill(supplierToEdit.mpesaPaybillOrTill || '');
        setLeadTimeDays(supplierToEdit.leadTimeDays ? supplierToEdit.leadTimeDays.toString() : '2');
        setStatus(supplierToEdit.status || 'active');
        setNotes(supplierToEdit.notes || '');
        setHasDraftLoaded(false);
      } else {
        // When onboarding a new supplier, check for persistent draft to prevent accidental input loss
        try {
          const rawDraft = localStorage.getItem(draftStorageKey);
          if (rawDraft) {
            const parsed = JSON.parse(rawDraft);
            setName(parsed.name || '');
            setContactPerson(parsed.contactPerson || '');
            setPhone(parsed.phone || '+254 ');
            setEmail(parsed.email || '');
            setCategory(parsed.category || categories[0] || 'Flour & Grains');
            setAddress(parsed.address || '');
            setCity(parsed.city || 'Nairobi');
            setKraPin(parsed.kraPin || '');
            setPaymentTerms(parsed.paymentTerms || 'net_14');
            setBankName(parsed.bankName || '');
            setBankAccount(parsed.bankAccount || '');
            setMpesaPaybillOrTill(parsed.mpesaPaybillOrTill || '');
            setLeadTimeDays(parsed.leadTimeDays || '2');
            setStatus(parsed.status || 'active');
            setNotes(parsed.notes || '');
            setHasDraftLoaded(Boolean(parsed.name || parsed.phone !== '+254 ' || parsed.contactPerson));
          } else {
            setName('');
            setContactPerson('');
            setPhone('+254 ');
            setEmail('');
            setCategory(categories[0] || 'Flour & Grains');
            setAddress('');
            setCity('Nairobi');
            setKraPin('');
            setPaymentTerms('net_14');
            setBankName('');
            setBankAccount('');
            setMpesaPaybillOrTill('');
            setLeadTimeDays('2');
            setStatus('active');
            setNotes('');
            setHasDraftLoaded(false);
          }
        } catch {
          // Fallback to blank fields
          setName('');
          setContactPerson('');
          setPhone('+254 ');
          setEmail('');
          setCategory(categories[0] || 'Flour & Grains');
          setAddress('');
          setCity('Nairobi');
          setKraPin('');
          setPaymentTerms('net_14');
          setBankName('');
          setBankAccount('');
          setMpesaPaybillOrTill('');
          setLeadTimeDays('2');
          setStatus('active');
          setNotes('');
          setHasDraftLoaded(false);
        }
      }
      setErrorMessage('');
    }

    prevOpenRef.current = isNowOpen;
    prevSupplierIdRef.current = currentTargetId;
  }, [isOpen, supplierToEdit, categories, draftStorageKey]);

  // Persist draft automatically as user types when onboarding a new supplier
  useEffect(() => {
    if (!isOpen || supplierToEdit) return;

    // Only save draft if user has entered non-default data
    const hasMeaningfulContent =
      name.trim().length > 0 ||
      contactPerson.trim().length > 0 ||
      (phone.trim().length > 0 && phone !== '+254 ') ||
      email.trim().length > 0 ||
      address.trim().length > 0 ||
      kraPin.trim().length > 0 ||
      notes.trim().length > 0 ||
      bankName.trim().length > 0 ||
      mpesaPaybillOrTill.trim().length > 0;

    if (hasMeaningfulContent) {
      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            name,
            contactPerson,
            phone,
            email,
            category,
            address,
            city,
            kraPin,
            paymentTerms,
            bankName,
            bankAccount,
            mpesaPaybillOrTill,
            leadTimeDays,
            status,
            notes,
            lastSavedAt: new Date().toISOString(),
          })
        );
        setHasDraftLoaded(true);
      } catch (err) {
        console.warn('Could not save supplier draft:', err);
      }
    }
  }, [
    isOpen,
    supplierToEdit,
    draftStorageKey,
    name,
    contactPerson,
    phone,
    email,
    category,
    address,
    city,
    kraPin,
    paymentTerms,
    bankName,
    bankAccount,
    mpesaPaybillOrTill,
    leadTimeDays,
    status,
    notes,
  ]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {
      // ignore
    }
    setName('');
    setContactPerson('');
    setPhone('+254 ');
    setEmail('');
    setCategory(categories[0] || 'Flour & Grains');
    setAddress('');
    setCity('Nairobi');
    setKraPin('');
    setPaymentTerms('net_14');
    setBankName('');
    setBankAccount('');
    setMpesaPaybillOrTill('');
    setLeadTimeDays('2');
    setStatus('active');
    setNotes('');
    setHasDraftLoaded(false);
    setErrorMessage('');
    showToast('Supplier draft cleared', 'info');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setErrorMessage('Company / Vendor Name is required.');
      return;
    }

    if (!trimmedPhone || trimmedPhone === '+254') {
      setErrorMessage('A valid supplier contact phone number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const leadDays = parseInt(leadTimeDays, 10) || 1;

      if (supplierToEdit) {
        await updateSupplier(supplierToEdit.id, {
          name: trimmedName,
          contactPerson: contactPerson.trim() || undefined,
          phone: trimmedPhone,
          email: email.trim() || undefined,
          category: category.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          kraPin: kraPin.trim() || undefined,
          paymentTerms,
          bankName: bankName.trim() || undefined,
          bankAccount: bankAccount.trim() || undefined,
          mpesaPaybillOrTill: mpesaPaybillOrTill.trim() || undefined,
          leadTimeDays: leadDays,
          status,
          notes: notes.trim() || undefined,
        });
      } else {
        await addSupplier({
          name: trimmedName,
          contactPerson: contactPerson.trim() || undefined,
          phone: trimmedPhone,
          email: email.trim() || undefined,
          category: category.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          kraPin: kraPin.trim() || undefined,
          paymentTerms,
          bankName: bankName.trim() || undefined,
          bankAccount: bankAccount.trim() || undefined,
          mpesaPaybillOrTill: mpesaPaybillOrTill.trim() || undefined,
          leadTimeDays: leadDays,
          status,
          notes: notes.trim() || undefined,
        });

        // Supplier successfully created: clear draft from persistent storage
        try {
          localStorage.removeItem(draftStorageKey);
        } catch {
          // ignore
        }
        setHasDraftLoaded(false);
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to save supplier:', err);
      setErrorMessage(err?.message || 'Failed to save supplier. Please verify details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="supplier-form-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[96vh] sm:max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">
                  {supplierToEdit ? 'Edit Supplier Profile' : 'Register New Supplier'}
                </h3>
                {!supplierToEdit && hasDraftLoaded && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Draft auto-saved
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Vendor accounts, KRA compliance & supply terms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800">
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Company Name & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company / Vendor Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ungar Mills East Africa Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold"
              >
                <option value="active">Active Vendor</option>
                <option value="inactive">Inactive / On-Hold</option>
              </select>
            </div>
          </div>

          {/* Contact Person & Primary Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sales Rep / Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. David Kilonzo"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supply Category
              </label>
              <input
                type="text"
                placeholder="e.g. Flour & Grains, Dairy, Beverages..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="+254 7XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Orders / Invoicing Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="orders@supplier.co.ke"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Physical Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Depot / Warehouse Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Commercial St, Industrial Area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                />
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City / Region</label>
              <input
                type="text"
                placeholder="Nairobi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Terms & Compliance Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Payment Terms & Settlement Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value as SupplierPaymentTerms)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-blue-700"
                >
                  <option value="cod">Weekly / Instant COD (Cash on Delivery)</option>
                  <option value="net_7">Net 7 Days</option>
                  <option value="net_14">Net 14 Days (Standard Trade)</option>
                  <option value="net_30">Net 30 Days (Wholesale Credit)</option>
                  <option value="prepaid">Prepaid / Proforma Advance</option>
                  <option value="consignment">Consignment Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lead Time (Days)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="2"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs font-mono font-bold"
                  />
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  KRA PIN Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="P051234567X"
                    value={kraPin}
                    onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs font-mono font-bold uppercase"
                  />
                  <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Banking / M-Pesa Remittance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  M-Pesa Paybill / Till Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paybill: 247247 (Acc: 0180293847291)"
                  value={mpesaPaybillOrTill}
                  onChange={(e) => setMpesaPaybillOrTill(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Bank & Account Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. Equity Bank - 0180293847291"
                  value={bankName ? `${bankName} - ${bankAccount}` : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes('-')) {
                      const [b, a] = val.split('-');
                      setBankName(b.trim());
                      setBankAccount(a.trim());
                    } else {
                      setBankName(val.trim());
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Supply Notes & Delivery Route Schedules
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Route drops every Tuesday and Friday morning. Minimum order KES 20,000 for free delivery."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-blue-600 focus:bg-white resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between gap-2.5">
            <div>
              {!supplierToEdit && hasDraftLoaded && (
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                >
                  Clear Form Draft
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{supplierToEdit ? 'Save Changes' : 'Create Supplier'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
