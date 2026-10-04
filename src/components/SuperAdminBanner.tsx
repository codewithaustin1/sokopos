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
    <div className="bg-slate-900 text-slate-200 px-3 sm:px-4 py-1.5 text-xs font-medium flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 shadow-xs shrink-0 z-40">
      {/* Left: Cross-Tenant Switcher */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700/80 transition">
          <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-[11px] font-bold text-slate-300">Tenant Scope:</span>
          <select
            value={activeBusinessId}
            onChange={(e) => setActiveBusinessId(e.target.value)}
            className="bg-transparent font-bold cursor-pointer focus:outline-none text-xs text-white"
          >
            {businesses.map((biz) => (
              <option key={biz.id} value={biz.id} className="text-slate-900 bg-white">
                {biz.name} ({biz.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Tenant Management Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Write Audit Log Button */}
        <button
          type="button"
          onClick={onOpenAuditLog}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition border border-slate-700/80 shadow-2xs cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>Write Audit Log ({superAdminAuditLogs.length})</span>
        </button>

        {/* Login Graphic Branding Button */}
        {onOpenBrandingModal && (
          <button
            type="button"
            onClick={onOpenBrandingModal}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition border border-slate-700/80 shadow-2xs cursor-pointer"
            title="Configure POS terminal login background graphic"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Login Graphic</span>
            {loginBgGraphic && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Custom Graphic Active" />
            )}
          </button>
        )}

        {/* Provision Business Button */}
        <button
          type="button"
          onClick={onOpenProvisionModal}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Provision Tenant</span>
        </button>
      </div>
    </div>
  );
};
