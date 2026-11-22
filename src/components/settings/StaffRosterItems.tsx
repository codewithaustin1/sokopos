import React from 'react';
import { Edit2, Trash2, Lock } from 'lucide-react';
import { Cashier } from '../../types';

interface StaffItemProps {
  user: Cashier;
  branchName: string | null;
  isSelf: boolean;
  onEdit: (user: Cashier) => void;
  onRequestDelete: (user: Cashier) => void;
}

const getRoleStyle = (role: Cashier['role']) => {
  switch (role) {
    case 'business_owner':
      return { label: 'Business Owner', textClass: 'text-purple-700 dark:text-purple-400' };
    case 'manager':
      return { label: 'Store Manager', textClass: 'text-blue-700 dark:text-blue-400' };
    case 'supervisor':
      return { label: 'Supervisor', textClass: 'text-amber-700 dark:text-amber-400' };
    case 'inventory_clerk':
      return { label: 'Inventory Clerk', textClass: 'text-slate-700 dark:text-slate-300' };
    default:
      return { label: 'Cashier', textClass: 'text-emerald-700 dark:text-emerald-400' };
  }
};

export const StaffRosterRow: React.FC<StaffItemProps> = React.memo(
  ({ user, branchName, isSelf, onEdit, onRequestDelete }) => {
    const roleMeta = getRoleStyle(user.role);

    return (
      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              aria-hidden="true"
              className={`w-8 h-8 rounded-lg text-white font-semibold flex items-center justify-center text-xs shrink-0 ${
                user.avatarColor || 'bg-slate-700'
              }`}
            >
              {user.initials || user.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                <span className="truncate">{user.name}</span>
                {isSelf && (
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium shrink-0">
                    · You
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {user.code}
              </div>
            </div>
          </div>
        </td>
        <td className="py-2.5 px-3 whitespace-nowrap">
          <span className={`text-xs font-medium ${roleMeta.textClass}`}>
            {roleMeta.label}
          </span>
        </td>
        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
          {user.username}
        </td>
        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
          {branchName ? (
            <span className="font-medium text-slate-800 dark:text-slate-200">{branchName}</span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">All Branches</span>
          )}
        </td>
        <td className="py-2.5 px-3 whitespace-nowrap">
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Bcrypt Hashed</span>
          </span>
        </td>
        <td className="py-2.5 px-3 text-right">
          <div className="inline-flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onEdit(user)}
              aria-label={`Edit ${user.name}`}
              title={`Edit ${user.name}`}
              className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onRequestDelete(user)}
              disabled={isSelf}
              aria-label={isSelf ? `Cannot remove your own account (${user.name})` : `Remove ${user.name}`}
              title={isSelf ? 'Cannot delete your own account' : `Remove ${user.name}`}
              className={`min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-blue-600 ${
                isSelf
                  ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                  : 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    );
  }
);

StaffRosterRow.displayName = 'StaffRosterRow';

export const StaffMobileCard: React.FC<StaffItemProps> = React.memo(
  ({ user, branchName, isSelf, onEdit, onRequestDelete }) => {
    const roleMeta = getRoleStyle(user.role);

    return (
      <article
        aria-label={`${user.name}, ${roleMeta.label}`}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3"
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              aria-hidden="true"
              className={`w-9 h-9 rounded-lg text-white font-semibold flex items-center justify-center text-xs shrink-0 ${
                user.avatarColor || 'bg-slate-700'
              }`}
            >
              {user.initials || user.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                <span className="truncate">{user.name}</span>
                {isSelf && (
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium shrink-0">
                    · You
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span className={`font-medium ${roleMeta.textClass}`}>{roleMeta.label}</span>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                <span className="font-mono text-[11px]">{user.username}</span>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
            {user.code}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <span className="truncate">
            Branch: <strong className="font-medium text-slate-800 dark:text-slate-200">{branchName || 'All Branches'}</strong>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium shrink-0">
            <Lock className="w-3 h-3" aria-hidden="true" />
            <span>PIN Protected</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => onEdit(user)}
            aria-label={`Edit ${user.name}`}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onRequestDelete(user)}
            disabled={isSelf}
            aria-label={isSelf ? `Cannot remove your own account (${user.name})` : `Remove ${user.name}`}
            className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition focus-visible:outline-2 focus-visible:outline-blue-600 ${
              isSelf
                ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Remove</span>
          </button>
        </div>
      </article>
    );
  }
);

StaffMobileCard.displayName = 'StaffMobileCard';
