import React from 'react';
import {
  CheckCircle2,
  Edit2,
  Eye,
  Link as LinkIcon,
  PauseCircle,
  Phone,
} from 'lucide-react';
import { Supplier } from '../../types';
import { formatPaymentTermsLabel } from './supplierConstants';

interface SupplierMobileCardProps {
  supplier: Supplier;
  linkedCount: number;
  currency: string;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onLink: (supplier: Supplier) => void;
}

const SupplierMobileCard: React.FC<SupplierMobileCardProps> = React.memo(
  ({ supplier, linkedCount, currency, onView, onEdit, onLink }) => {
    const isActive = supplier.status === 'active';

    return (
      <article className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        {/* Card Header: Vendor Name + Semantic Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onView(supplier)}
              className="text-sm font-bold text-slate-900 hover:text-blue-700 hover:underline text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
            >
              {supplier.name}
            </button>
            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span>{supplier.category || 'General'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-700">
                {formatPaymentTermsLabel(supplier.paymentTerms)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {supplier.leadTimeDays ?? 2}d lead
              </span>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
              isActive ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            {isActive ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <PauseCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{isActive ? 'Active' : 'Inactive'}</span>
          </span>
        </div>

        {/* Contact & Financial Metrics Row */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="min-w-0 space-y-0.5">
            {supplier.contactPerson && (
              <div className="text-slate-600 truncate">Rep: {supplier.contactPerson}</div>
            )}
            <a
              href={`tel:${supplier.phone}`}
              className="inline-flex items-center gap-1.5 font-mono tabular-nums font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{supplier.phone}</span>
            </a>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-slate-600">Total Invoiced</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900">
              {currency} {(supplier.totalInvoiced || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card Action Strip (>= 44px touch targets) */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onLink(supplier)}
            aria-label={`Manage ${linkedCount} linked products for ${supplier.name}`}
            className="min-h-[44px] px-2.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <LinkIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="font-mono tabular-nums">{linkedCount}</span>
            <span>Items</span>
          </button>

          <button
            type="button"
            onClick={() => onView(supplier)}
            aria-label={`View details for ${supplier.name}`}
            className="min-h-[44px] px-2.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>View</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(supplier)}
            aria-label={`Edit ${supplier.name}`}
            className="min-h-[44px] px-2.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <Edit2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Edit</span>
          </button>
        </div>
      </article>
    );
  }
);

SupplierMobileCard.displayName = 'SupplierMobileCard';

interface SupplierMobileCardListProps {
  suppliers: Supplier[];
  linkedCountMap: Map<string, number>;
  currency: string;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onLink: (supplier: Supplier) => void;
}

export const SupplierMobileCardList: React.FC<SupplierMobileCardListProps> = React.memo(
  ({ suppliers, linkedCountMap, currency, onView, onEdit, onLink }) => {
    return (
      <div className="md:hidden flex-1 overflow-y-auto min-h-[280px] max-h-[68vh] p-3 space-y-3 bg-slate-50/70">
        {suppliers.map((supp) => (
          <SupplierMobileCard
            key={supp.id}
            supplier={supp}
            linkedCount={linkedCountMap.get(supp.id) || 0}
            currency={currency}
            onView={onView}
            onEdit={onEdit}
            onLink={onLink}
          />
        ))}
      </div>
    );
  }
);

SupplierMobileCardList.displayName = 'SupplierMobileCardList';
