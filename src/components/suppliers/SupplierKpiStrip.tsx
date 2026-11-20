import React from 'react';
import { Building2, Link as LinkIcon, Package, TrendingUp } from 'lucide-react';

export interface SupplierStats {
  totalSuppliers: number;
  activeVendors: number;
  totalPurchases: number;
  totalShipments: number;
  linkedProductsCount: number;
  totalCatalogCount: number;
}

interface SupplierKpiStripProps {
  stats: SupplierStats;
  currency: string;
}

export const SupplierKpiStrip: React.FC<SupplierKpiStripProps> = React.memo(({ stats, currency }) => {
  return (
    <section
      aria-label="Supplier procurement summary"
      className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 shrink-0"
    >
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-600">Active Suppliers</div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
            {stats.activeVendors}{' '}
            <span className="text-xs text-slate-600 font-semibold">/ {stats.totalSuppliers}</span>
          </div>
          <div className="text-xs text-slate-600 mt-0.5 truncate">Contracted distributors</div>
        </div>
        <div
          className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <Building2 className="w-4 h-4" />
        </div>
      </div>

      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-600">Linked Inventory</div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-indigo-700 mt-0.5">
            {stats.linkedProductsCount}{' '}
            <span className="text-xs text-slate-600 font-semibold">/ {stats.totalCatalogCount}</span>
          </div>
          <div className="text-xs text-slate-600 mt-0.5 truncate">Catalog items tracked</div>
        </div>
        <div
          className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <LinkIcon className="w-4 h-4" />
        </div>
      </div>

      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-600">Total Procurement</div>
          <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-emerald-700 mt-0.5 truncate">
            {currency} {stats.totalPurchases.toLocaleString()}
          </div>
          <div className="text-xs text-slate-600 mt-0.5 truncate">Recorded intake value</div>
        </div>
        <div
          className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>

      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-600">Shipments Handled</div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
            {stats.totalShipments.toLocaleString()}
          </div>
          <div className="text-xs text-slate-600 mt-0.5 truncate">Recorded replenishments</div>
        </div>
        <div
          className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <Package className="w-4 h-4" />
        </div>
      </div>
    </section>
  );
});

SupplierKpiStrip.displayName = 'SupplierKpiStrip';
