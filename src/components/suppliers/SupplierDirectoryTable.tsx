import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Edit2,
  Eye,
  Link as LinkIcon,
  PauseCircle,
} from 'lucide-react';
import { Supplier } from '../../types';
import {
  formatPaymentTermsLabel,
  SortDirection,
  SupplierSortKey,
} from './supplierConstants';

interface SupplierTableRowProps {
  supplier: Supplier;
  linkedCount: number;
  currency: string;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onLink: (supplier: Supplier) => void;
}

const SupplierTableRow: React.FC<SupplierTableRowProps> = React.memo(
  ({ supplier, linkedCount, currency, onView, onEdit, onLink }) => {
    const isActive = supplier.status === 'active';

    return (
      <tr className="hover:bg-slate-50/90 transition-colors">
        <td className="py-3 pl-5 pr-3 align-middle">
          <button
            type="button"
            onClick={() => onView(supplier)}
            className="font-semibold text-slate-900 hover:text-blue-700 hover:underline text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
          >
            {supplier.name}
          </button>
          {supplier.contactPerson && (
            <div className="text-xs text-slate-600 mt-0.5">Rep: {supplier.contactPerson}</div>
          )}
        </td>

        <td className="py-3 px-3 align-middle text-slate-700 font-medium">
          {supplier.category || 'General'}
        </td>

        <td className="py-3 px-3 align-middle">
          <a
            href={`tel:${supplier.phone}`}
            className="font-mono tabular-nums font-semibold text-slate-900 hover:text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
          >
            {supplier.phone}
          </a>
          {supplier.email && (
            <div className="text-xs text-slate-600 truncate max-w-[180px] mt-0.5">
              {supplier.email}
            </div>
          )}
        </td>

        <td className="py-3 px-3 align-middle font-semibold text-slate-800 whitespace-nowrap">
          {formatPaymentTermsLabel(supplier.paymentTerms)}
        </td>

        <td className="py-3 px-3 align-middle">
          <button
            type="button"
            onClick={() => onLink(supplier)}
            aria-label={`Manage ${linkedCount} linked products for ${supplier.name}`}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <LinkIcon className="w-3.5 h-3.5 text-indigo-700" aria-hidden="true" />
            <span className="font-mono tabular-nums">{linkedCount}</span>
            <span>items</span>
          </button>
        </td>

        <td className="py-3 px-3 align-middle font-mono tabular-nums text-slate-700 whitespace-nowrap">
          {supplier.leadTimeDays ?? 2} days
        </td>

        <td className="py-3 px-3 align-middle font-mono tabular-nums font-semibold text-slate-900 text-right whitespace-nowrap">
          {currency} {(supplier.totalInvoiced || 0).toLocaleString()}
        </td>

        <td className="py-3 px-3 align-middle whitespace-nowrap">
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
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
        </td>

        <td className="py-3 pl-3 pr-5 align-middle text-right whitespace-nowrap">
          <div className="inline-flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => onView(supplier)}
              aria-label={`View details for ${supplier.name}`}
              className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-slate-100 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden lg:inline">View</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(supplier)}
              aria-label={`Edit ${supplier.name}`}
              className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-blue-700 hover:bg-blue-50 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden lg:inline">Edit</span>
            </button>
          </div>
        </td>
      </tr>
    );
  }
);

SupplierTableRow.displayName = 'SupplierTableRow';

interface SupplierDirectoryTableProps {
  suppliers: Supplier[];
  linkedCountMap: Map<string, number>;
  currency: string;
  sortKey: SupplierSortKey;
  sortDirection: SortDirection;
  onSortChange: (key: SupplierSortKey) => void;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onLink: (supplier: Supplier) => void;
}

export const SupplierDirectoryTable: React.FC<SupplierDirectoryTableProps> = React.memo(
  ({
    suppliers,
    linkedCountMap,
    currency,
    sortKey,
    sortDirection,
    onSortChange,
    onView,
    onEdit,
    onLink,
  }) => {
    const renderSortHeader = (
      label: string,
      key: SupplierSortKey,
      align: 'left' | 'right' = 'left'
    ) => {
      const isSorted = sortKey === key;
      const ariaSort: 'ascending' | 'descending' | 'none' = isSorted
        ? sortDirection === 'asc'
          ? 'ascending'
          : 'descending'
        : 'none';

      return (
        <th
          scope="col"
          aria-sort={ariaSort}
          className={`py-3 px-3 ${key === 'name' ? 'pl-5' : ''} ${
            align === 'right' ? 'text-right' : 'text-left'
          }`}
        >
          <button
            type="button"
            onClick={() => onSortChange(key)}
            className={`inline-flex items-center gap-1 font-semibold text-xs text-slate-700 hover:text-slate-950 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded px-1 py-0.5 ${
              align === 'right' ? 'flex-row-reverse' : ''
            }`}
          >
            <span>{label}</span>
            {isSorted ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
              )
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            )}
          </button>
        </th>
      );
    };

    return (
      <div className="hidden md:block flex-1 overflow-x-auto overflow-y-auto min-h-[280px] max-h-[62vh]">
        <table className="w-full text-left border-collapse min-w-[880px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              {renderSortHeader('Company & Rep', 'name')}
              {renderSortHeader('Category', 'category')}
              <th scope="col" className="py-3 px-3 text-xs font-semibold text-slate-700">
                Phone & Email
              </th>
              {renderSortHeader('Terms', 'paymentTerms')}
              {renderSortHeader('Linked Items', 'linkedCount')}
              {renderSortHeader('Lead Time', 'leadTimeDays')}
              {renderSortHeader('Total Invoiced', 'totalInvoiced', 'right')}
              {renderSortHeader('Status', 'status')}
              <th scope="col" className="py-3 pl-3 pr-5 text-right text-xs font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100 text-slate-800 bg-white">
            {suppliers.map((supp) => (
              <SupplierTableRow
                key={supp.id}
                supplier={supp}
                linkedCount={linkedCountMap.get(supp.id) || 0}
                currency={currency}
                onView={onView}
                onEdit={onEdit}
                onLink={onLink}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

SupplierDirectoryTable.displayName = 'SupplierDirectoryTable';
