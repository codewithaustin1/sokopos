import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Cashier } from '../../types';

interface DeleteStaffConfirmModalProps {
  targetUser: Cashier | null;
  onCancel: () => void;
  onConfirm: (user: Cashier) => void;
}

export const DeleteStaffConfirmModal: React.FC<DeleteStaffConfirmModalProps> = ({
  targetUser,
  onCancel,
  onConfirm,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!targetUser) return;
    const timer = window.setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetUser, onCancel]);

  if (!targetUser) return null;

  return (
    <div
      id="delete-staff-confirm-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-staff-title"
      aria-describedby="delete-staff-description"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] p-3 sm:p-4 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="delete-staff-title"
                className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Remove Staff Account
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {targetUser.name} · @{targetUser.username}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel account removal"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p
          id="delete-staff-description"
          className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3"
        >
          Removing <strong className="text-slate-900 dark:text-slate-100">{targetUser.name}</strong> revokes their terminal PIN login immediately. Historical sales and shift records remain intact in audit logs.
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            Keep Account
          </button>
          <button
            type="button"
            onClick={() => onConfirm(targetUser)}
            className="min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition cursor-pointer"
          >
            Remove Account
          </button>
        </div>
      </div>
    </div>
  );
};
