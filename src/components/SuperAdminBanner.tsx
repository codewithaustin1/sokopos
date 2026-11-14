import React from 'react';
import {
  Building2,
  FileText,
  PlusCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { usePos } from '../context/PosContext';

interface SuperAdminBannerProps {
  onOpenAuditLog: () => void;
  onOpenProvisionModal: () => void;
  onOpenBrandingModal?: () => void;
}

export const SuperAdminBanner: React.FC<SuperAdminBannerProps> = ({
  onOpenAuditLog,
  onOpenProvisionModal,
  onOpenBrandingModal,
}) => {
  const {
    isSuperAdmin,
    businesses,
    activeBusinessId,
    setActiveBusinessId,
    superAdminAuditLogs,
    loginBgGraphic,
  } = usePos();

  if (!isSuperAdmin) return null;

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 sm:px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0 z-40">
      {/* Left: Cross-Tenant Switcher */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition max-w-full">
          <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <label
            htmlFor="superadmin-banner-tenant-select"
            className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0"
          >
            Tenant Scope:
          </label>
          <select
            id="superadmin-banner-tenant-select"
            value={activeBusinessId}
            onChange={(e) => setActiveBusinessId(e.target.value)}
            className="bg-transparent font-semibold cursor-pointer focus:outline-none text-xs text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs"
          >
            {businesses.map((biz) => (
              <option
                key={biz.id}
                value={biz.id}
                className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
              >
                {biz.name} ({biz.code}){biz.status === 'suspended' ? ' [Suspended]' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Tenant Management Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onOpenAuditLog}
          className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border border-slate-200 dark:border-slate-700 cursor-pointer whitespace-nowrap shrink-0"
        >
          <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Audit Log</span>
          <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500">
            ({superAdminAuditLogs.length})
          </span>
        </button>

        {onOpenBrandingModal && (
          <button
            type="button"
            onClick={onOpenBrandingModal}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border border-slate-200 dark:border-slate-700 cursor-pointer whitespace-nowrap shrink-0"
            title="Configure POS terminal login background graphic"
          >
            <ImageIcon
              className={`w-3.5 h-3.5 ${
                loginBgGraphic ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            />
            <span>Login Graphic</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenProvisionModal}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Provision Tenant</span>
        </button>
      </div>
    </div>
  );
};
