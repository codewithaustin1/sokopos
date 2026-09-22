import React, { useState } from 'react';
import {
  ShieldAlert,
  Building2,
  FileText,
  PlusCircle,
  ChevronDown,
  AlertTriangle,
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
    currentUser,
    businesses,
    activeBusinessId,
    setActiveBusinessId,
    superAdminAuditLogs,
    loginBgGraphic,
  } = usePos();

  if (!isSuperAdmin) return null;

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex flex-col md:flex-row items-center justify-between gap-2 border-b-2 border-amber-600 shadow-sm shrink-0 z-40">
      {/* Left: Persistent Warning Badge & Identity */}
      <div className="flex items-center gap-2">
        <div className="bg-slate-950 text-amber-400 p-1 rounded-md">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <span className="font-black uppercase tracking-wider text-[11px] bg-slate-900 text-white px-1.5 py-0.5 rounded mr-1.5">
            Super-Admin Mode
          </span>
          <span className="font-bold">
            Operating with cross-tenant privileges as{' '}
            <span className="underline decoration-slate-950 font-black">{currentUser.email}</span>
          </span>
        </div>
      </div>

      {/* Center & Right: Cross-Tenant Switcher & Safeguard Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Business Tenant Switcher */}
        <div className="flex items-center gap-1.5 bg-amber-400/80 hover:bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg border border-amber-600">
          <Building2 className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold">Tenant Scope:</span>
          <select
            value={activeBusinessId}
            onChange={(e) => setActiveBusinessId(e.target.value)}
            className="bg-transparent font-black cursor-pointer focus:outline-none text-xs"
          >
            {businesses.map((biz) => (
              <option key={biz.id} value={biz.id} className="text-slate-900 bg-white">
                {biz.name} ({biz.code})
              </option>
            ))}
          </select>
        </div>

        {/* Audit Log Button */}
        <button
          onClick={onOpenAuditLog}
          className="flex items-center gap-1 bg-slate-900 text-amber-400 hover:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Write Audit Log ({superAdminAuditLogs.length})</span>
        </button>

        {/* Login Graphic Branding Button */}
        {onOpenBrandingModal && (
          <button
            onClick={onOpenBrandingModal}
            className="flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer border border-amber-600/40"
            title="Configure POS terminal login background graphic"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Login Graphic</span>
            {loginBgGraphic && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Custom Graphic Active" />
            )}
          </button>
        )}

        {/* Provision Business Button */}
        <button
          onClick={onOpenProvisionModal}
          className="flex items-center gap-1 bg-white text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-bold transition border border-amber-600 shadow-2xs cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>Provision Tenant</span>
        </button>
      </div>
    </div>
  );
};
