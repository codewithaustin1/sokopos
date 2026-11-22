import React, { useState, useEffect, useRef } from 'react';
import { Users, X, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { Cashier, Location } from '../../types';

interface StaffAccountModalProps {
  isOpen: boolean;
  editingUser: Cashier | null;
  locations: Location[];
  allSystemUsers: Cashier[];
  isSuperAdmin: boolean;
  onClose: () => void;
  onCreateUser: (user: Omit<Cashier, 'id' | 'businessId'>) => Promise<boolean>;
  onUpdateUser: (id: string, updates: Partial<Cashier>) => Promise<boolean>;
}

const PROHIBITED_GENERIC_LOGINS = new Set([
  'cashier',
  'shared',
  'pos',
  'terminal',
  'till',
  'store',
  'user',
  'staff',
  'counter',
  'operator',
  'guest',
  'general',
]);

export const StaffAccountModal: React.FC<StaffAccountModalProps> = ({
  isOpen,
  editingUser,
  locations,
  allSystemUsers,
  isSuperAdmin,
  onClose,
  onCreateUser,
  onUpdateUser,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Cashier['role']>('cashier');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [assignedLocationId, setAssignedLocationId] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingUser) {
      setName(editingUser.name || '');
      setRole(editingUser.role || 'cashier');
      setUsername(editingUser.username || '');
      setPin('');
      setAssignedLocationId(editingUser.assignedLocationId || '');
    } else {
      setName('');
      setRole('cashier');
      setUsername('');
      setPin('');
      setAssignedLocationId('');
    }
    setShowPin(false);
    setErrorMsg(null);
    setIsSubmitting(false);

    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [isOpen, editingUser]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Full name is required.');
      nameInputRef.current?.focus();
      return;
    }

    const cleanUsername = (
      username.trim() || trimmedName.toLowerCase().replace(/\s+/g, '.')
    ).toLowerCase();

    if (
      PROHIBITED_GENERIC_LOGINS.has(cleanUsername) ||
      PROHIBITED_GENERIC_LOGINS.has(trimmedName.toLowerCase())
    ) {
      setErrorMsg(
        `Shared generic identity "${cleanUsername}" is not allowed. Assign an individual operator name and username.`
      );
      return;
    }

    const duplicateUsername = allSystemUsers.find(
      (u) =>
        (!editingUser || u.id !== editingUser.id) &&
        u.username?.trim().toLowerCase() === cleanUsername
    );
    if (duplicateUsername) {
      setErrorMsg(
        `Username "${cleanUsername}" is already assigned to ${duplicateUsername.name}.`
      );
      return;
    }

    const trimmedPin = pin.trim();
    if (!editingUser && trimmedPin.length < 4) {
      setErrorMsg('Terminal PIN must be at least 4 digits.');
      return;
    }
    if (editingUser && trimmedPin.length > 0 && trimmedPin.length < 4) {
      setErrorMsg('New PIN must be at least 4 digits, or leave blank to keep current PIN.');
      return;
    }

    const initials = trimmedName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'ST';

    setIsSubmitting(true);
    try {
      let ok = false;
      if (editingUser) {
        const updates: Partial<Cashier> = {
          name: trimmedName,
          initials,
          role,
          username: cleanUsername,
          assignedLocationId: assignedLocationId || undefined,
        };
        if (trimmedPin) {
          updates.pin = trimmedPin;
        }
        ok = await onUpdateUser(editingUser.id, updates);
      } else {
        ok = await onCreateUser({
          name: trimmedName,
          initials,
          code: `#${Math.floor(1000 + Math.random() * 9000)}`,
          username: cleanUsername,
          pin: trimmedPin,
          role,
          avatarColor: 'bg-blue-600',
          shiftStartedAt: new Date().toISOString(),
          assignedLocationId: assignedLocationId || undefined,
        });
      }
      if (ok) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="staff-account-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-account-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] p-3 sm:p-4 flex items-center justify-center overflow-y-auto"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-5 sm:p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="staff-account-modal-title"
                className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight"
              >
                {editingUser ? 'Edit Staff Account' : 'Provision New Staff Account'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {editingUser
                  ? `Update role, branch access, or PIN for ${editingUser.name}.`
                  : 'Create an individual operator login and terminal PIN.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close staff account dialog"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          {errorMsg && (
            <div
              id="staff-form-error"
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="user-input-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Full Name <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="user-input-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Jane Wanjiku"
                aria-required="true"
                aria-invalid={Boolean(errorMsg && !name.trim())}
                className="w-full min-h-[42px] px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="user-select-role"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Role <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <select
                id="user-select-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Cashier['role'])}
                className="w-full min-h-[42px] px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cashier">Cashier</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Store Manager</option>
                <option value="inventory_clerk">Inventory Clerk</option>
                {(isSuperAdmin || editingUser?.role === 'business_owner') && (
                  <option value="business_owner">Business Owner</option>
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="user-input-username"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Login Username
              </label>
              <input
                id="user-input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., jwanjiku"
                autoComplete="off"
                aria-describedby="user-username-hint"
                className="w-full min-h-[42px] px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
              />
              <p id="user-username-hint" className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Defaults from full name if left blank.
              </p>
            </div>

            <div>
              <label
                htmlFor="user-input-pin"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {editingUser ? 'New PIN (optional)' : 'Terminal PIN (4–6 digits)'}{' '}
                {!editingUser && <span className="text-red-600" aria-hidden="true">*</span>}
              </label>
              <div className="relative">
                <input
                  id="user-input-pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={editingUser ? 'Keep current' : '••••'}
                  autoComplete="new-password"
                  aria-required={!editingUser}
                  aria-describedby="user-pin-hint"
                  className="w-full min-h-[42px] pl-3 pr-10 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((prev) => !prev)}
                  aria-label={showPin ? 'Hide PIN digits' : 'Show PIN digits'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p id="user-pin-hint" className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {editingUser
                  ? 'Leave blank to keep existing bcrypt PIN.'
                  : 'Used to sign in or unlock registers.'}
              </p>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="user-select-branch"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Assigned Branch
              </label>
              <select
                id="user-select-branch"
                value={assignedLocationId}
                onChange={(e) => setAssignedLocationId(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Branches (Roaming Access)</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="btn-submit-save-user"
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] sm:min-h-[38px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingUser ? 'Save Account Changes' : 'Provision Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
