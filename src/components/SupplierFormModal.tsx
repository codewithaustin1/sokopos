import React, { useState, useEffect, useRef, useId } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Supplier, SupplierPaymentTerms } from '../types';
import { usePos } from '../context/PosContext';
import { validateKraPinStrict } from '../utils/privacyAndKraSecurity';

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

  const prevOpenRef = useRef(false);
  const prevSupplierIdRef = useRef<string | null | undefined>(undefined);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Unique IDs for WCAG explicit label bindings
  const titleId = useId();
  const nameId = useId();
  const statusId = useId();
  const contactId = useId();
  const categoryId = useId();
  const phoneId = useId();
  const emailId = useId();
  const addressId = useId();
  const cityId = useId();
  const termsId = useId();
  const leadTimeId = useId();
  const kraPinId = useId();
  const mpesaId = useId();
  const bankNameId = useId();
  const bankAccountId = useId();
  const notesId = useId();

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
        setLeadTimeDays(
          supplierToEdit.leadTimeDays !== undefined ? supplierToEdit.leadTimeDays.toString() : '2'
        );
        setStatus(supplierToEdit.status || 'active');
        setNotes(supplierToEdit.notes || '');
        setHasDraftLoaded(false);
      } else {
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
            setHasDraftLoaded(
              Boolean(parsed.name || parsed.phone !== '+254 ' || parsed.contactPerson)
            );
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
      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
    }

    prevOpenRef.current = isNowOpen;
    prevSupplierIdRef.current = currentTargetId;
  }, [isOpen, supplierToEdit, categories, draftStorageKey]);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Persist draft automatically as user types when onboarding a new supplier
  useEffect(() => {
    if (!isOpen || supplierToEdit) return;

    const hasMeaningfulContent =
      name.trim().length > 0 ||
      contactPerson.trim().length > 0 ||
      (phone.trim().length > 0 && phone !== '+254 ') ||
      email.trim().length > 0 ||
      address.trim().length > 0 ||
      kraPin.trim().length > 0 ||
      notes.trim().length > 0 ||
      bankName.trim().length > 0 ||
      bankAccount.trim().length > 0 ||
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

    const pinCheck = validateKraPinStrict(kraPin, {
      required: false,
      allowPlaceholderInSandbox: false,
    });
    if (!pinCheck.isValid) {
      setErrorMessage(pinCheck.reason || 'Invalid Supplier KRA PIN format.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedLead = parseInt(leadTimeDays, 10);
      const leadDays = Number.isFinite(parsedLead) && parsedLead >= 0 ? parsedLead : 2;

      const payload = {
        name: trimmedName,
        contactPerson: contactPerson.trim() || undefined,
        phone: trimmedPhone,
        email: email.trim() || undefined,
        category: category.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        kraPin: pinCheck.normalized,
        paymentTerms,
        bankName: bankName.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        mpesaPaybillOrTill: mpesaPaybillOrTill.trim() || undefined,
        leadTimeDays: leadDays,
        status,
        notes: notes.trim() || undefined,
      };

      if (supplierToEdit) {
        await updateSupplier(supplierToEdit.id, payload);
      } else {
        await addSupplier(payload);
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
      setErrorMessage(
        err?.message || 'Failed to save supplier. Please verify details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="supplier-form-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px] p-2 sm:p-4"
    >
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0"
              aria-hidden="true"
            >
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 id={titleId} className="font-bold text-sm sm:text-base text-white truncate">
                  {supplierToEdit ? 'Edit Supplier Profile' : 'Register New Supplier'}
                </h3>
                {!supplierToEdit && hasDraftLoaded && (
                  <span className="inline-flex items-center gap-1 text-emerald-300 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Draft saved</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 truncate">
                Vendor accounts, KRA compliance &amp; supply terms
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close supplier form"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-900"
        >
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="bg-red-50 border border-red-200 text-red-900 rounded-lg p-3 flex items-center gap-2 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Company Name & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor={nameId} className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Vendor Name *
              </label>
              <input
                ref={nameInputRef}
                id={nameId}
                type="text"
                required
                aria-required="true"
                placeholder="e.g. Unga Mills East Africa Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
              />
            </div>

            <div>
              <label htmlFor={statusId} className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                id={statusId}
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <option value="active">Active Vendor</option>
                <option value="inactive">Inactive / On-Hold</option>
              </select>
            </div>
          </div>

          {/* Contact Person & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={contactId}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Sales Rep / Contact Person
              </label>
              <input
                id={contactId}
                type="text"
                placeholder="e.g. David Kilonzo"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor={categoryId}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Supply Category
              </label>
              <input
                id={categoryId}
                type="text"
                placeholder="e.g. Flour & Grains, Dairy, Beverages"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={phoneId} className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone
                  className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id={phoneId}
                  type="tel"
                  required
                  aria-required="true"
                  placeholder="+254 7XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm font-mono font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor={emailId} className="block text-xs font-semibold text-slate-700 mb-1">
                Orders / Invoicing Email
              </label>
              <div className="relative">
                <Mail
                  className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id={emailId}
                  type="email"
                  placeholder="orders@supplier.co.ke"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Physical Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label
                htmlFor={addressId}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Depot / Warehouse Address
              </label>
              <div className="relative">
                <MapPin
                  className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id={addressId}
                  type="text"
                  placeholder="e.g. Commercial St, Industrial Area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor={cityId} className="block text-xs font-semibold text-slate-700 mb-1">
                City / Region
              </label>
              <input
                id={cityId}
                type="text"
                placeholder="Nairobi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
              />
            </div>
          </div>

          {/* Settlement & Compliance Section (Divider-separated, not nested cards) */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">
              Payment Terms &amp; Settlement Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor={termsId} className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Terms
                </label>
                <select
                  id={termsId}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value as SupplierPaymentTerms)}
                  className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-blue-800 focus:outline-none focus:border-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <option value="cod">Cash on Delivery (COD)</option>
                  <option value="net_7">Net 7 Days</option>
                  <option value="net_14">Net 14 Days</option>
                  <option value="net_30">Net 30 Days</option>
                  <option value="prepaid">Prepaid / Advance</option>
                  <option value="consignment">Consignment Stock</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={leadTimeId}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Lead Time (Days)
                </label>
                <div className="relative">
                  <Clock
                    className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id={leadTimeId}
                    type="number"
                    min="0"
                    placeholder="2"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                    className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm font-mono tabular-nums font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={kraPinId}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  KRA PIN Number
                </label>
                <div className="relative">
                  <FileText
                    className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id={kraPinId}
                    type="text"
                    maxLength={11}
                    placeholder="A011001890C"
                    value={kraPin}
                    onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                    className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm font-mono font-semibold uppercase text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
                  />
                </div>
                {kraPin.trim() && (() => {
                  const check = validateKraPinStrict(kraPin, { required: false, allowPlaceholderInSandbox: false });
                  return !check.isValid ? (
                    <p className="mt-1 text-[11px] text-red-600 font-medium">{check.reason}</p>
                  ) : null;
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor={mpesaId} className="block text-xs font-semibold text-slate-700 mb-1">
                  M-Pesa Paybill / Till
                </label>
                <input
                  id={mpesaId}
                  type="text"
                  placeholder="e.g. Paybill 247247"
                  value={mpesaPaybillOrTill}
                  onChange={(e) => setMpesaPaybillOrTill(e.target.value)}
                  className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor={bankNameId}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Bank Name
                </label>
                <input
                  id={bankNameId}
                  type="text"
                  placeholder="e.g. Co-operative Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor={bankAccountId}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Bank Account No.
                </label>
                <input
                  id={bankAccountId}
                  type="text"
                  placeholder="e.g. 0180293847291"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor={notesId} className="block text-xs font-semibold text-slate-700 mb-1">
              Supply Notes &amp; Delivery Schedules
            </label>
            <textarea
              id={notesId}
              rows={2}
              placeholder="e.g. Route drops every Tuesday and Friday morning. Minimum order KES 20,000."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white resize-none focus-visible:outline-2 focus-visible:outline-blue-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div>
              {!supplierToEdit && hasDraftLoaded && (
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="min-h-[40px] text-xs font-semibold text-red-700 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition cursor-pointer focus-visible:outline-2 focus-visible:outline-red-600"
                >
                  Clear Draft
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[42px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" aria-hidden="true" />
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
