import React, { useEffect, useMemo } from 'react';
import {
  X,
  Package,
  Layers,
  RotateCcw,
  Printer,
  ArrowUpRight,
  Lock,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { usePos } from '../../context/PosContext';
import {
  BiInspectorTarget,
  CategoryProfitabilityRow,
  DateRange,
  SkuProfitabilityRow,
} from '../../types/reporting';
import { Product, Transaction } from '../../types';
import { computeTransactionFinancials, resolveItemUnitCost } from '../../utils/biEngine';

interface BiInspectorDrawerProps {
  target: BiInspectorTarget;
  onClose: () => void;
  onSelectTarget: (next: BiInspectorTarget) => void;
  skuRows: SkuProfitabilityRow[];
  categoryRows: CategoryProfitabilityRow[];
  transactions: Transaction[];
  currency: string;
  dateRange: DateRange;
  selectedLocationId: string;
  onNavigateToInventory?: () => void;
}

export const BiInspectorDrawer: React.FC<BiInspectorDrawerProps> = ({
  target,
  onClose,
  onSelectTarget,
  skuRows,
  categoryRows,
  transactions,
  currency,
  dateRange,
  selectedLocationId,
  onNavigateToInventory,
}) => {
  const {
    products,
    locations,
    can,
    setActiveReceipt,
    openReturnsModal,
  } = usePos();

  const canViewCost = can('viewCostPrice');
  const canProcessReturns = can('processRefunds');

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  if (!target) return null;

  const fmtMoney = (n: number) =>
    `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderSkuInspector = (productId: string) => {
    const row = skuRows.find((r) => r.productId === productId);
    const prod = productMap.get(productId);
    if (!row && !prod) return null;

    const title = row?.name || prod?.name || 'Product';
    const sku = row?.sku || prod?.sku || '—';
    const category = row?.category || prod?.category || 'Uncategorized';
    const unit = row?.unit || prod?.unit || 'piece';

    const recentTxs = transactions
      .filter((tx) => tx.items.some((it) => it.productId === productId))
      .slice(0, 6);

    return (
      <>
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700 tabular-nums">{sku}</span>
              <span aria-hidden="true">·</span>
              <span>{category}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{unit}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug break-words">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* P&L Strip */}
          <div className="grid grid-cols-3 divide-x divide-slate-200 border border-slate-200 rounded-lg bg-slate-50/70">
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500">Net Revenue</p>
              <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {fmtMoney(row?.netRevenue || 0)}
              </p>
            </div>
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500">Gross Profit</p>
              <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {canViewCost ? (
                  fmtMoney(row?.grossProfit || 0)
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Lock className="w-3 h-3" /> ••••
                  </span>
                )}
              </p>
            </div>
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500">Margin %</p>
              <p
                className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
                  !canViewCost
                    ? 'text-slate-400'
                    : (row?.marginPct || 0) >= 25
                    ? 'text-emerald-700'
                    : (row?.marginPct || 0) >= 12
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {canViewCost ? `${(row?.marginPct || 0).toFixed(1)}%` : 'Restricted'}
              </p>
            </div>
          </div>

          {canViewCost && row && !row.hasCostData && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Missing Buying Price</p>
                <p className="text-amber-700 mt-0.5">
                  This SKU has no cost basis configured in Inventory, so COGS is recorded as 0. Update Buying Price in Inventory for accurate profit margins.
                </p>
              </div>
            </div>
          )}

          {/* Breakdown Rows */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Period Breakdown · {dateRange.label}</h4>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-600">Units Sold (Gross / Net)</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {row?.unitsSold || 0} / {row?.netUnitsSold || 0}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-600">Gross Revenue</span>
                <span className="font-mono tabular-nums text-slate-900">{fmtMoney(row?.grossRevenue || 0)}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-600">Discounts Granted</span>
                <span className="font-mono tabular-nums text-amber-700">
                  -{fmtMoney(row?.discountsGiven || 0)}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-600">Refunds Issued ({row?.unitsRefunded || 0} units)</span>
                <span className="font-mono tabular-nums text-rose-700">
                  -{fmtMoney(row?.refundAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-600">Cost of Goods Sold (COGS)</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {canViewCost ? fmtMoney(row?.cogsTotal || 0) : '••••'}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-600">Current Unit Cost / Sell Price</span>
                <span className="font-mono tabular-nums text-slate-900">
                  {canViewCost ? fmtMoney(row?.currentUnitCost ?? prod?.buyingPrice ?? 0) : '••••'} /{' '}
                  {fmtMoney(row?.currentSellingPrice ?? prod?.sellingPrice ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Branch Stock Context */}
          {prod && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-700">Inventory Coverage</h4>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {row?.daysOfCover !== null && row?.daysOfCover !== undefined
                    ? `~${row.daysOfCover}d cover`
                    : 'No velocity baseline'}
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                {locations
                  .filter((l) => selectedLocationId === 'all' || l.id === selectedLocationId)
                  .map((loc) => {
                    const qty = prod.stockByLocation?.[loc.id] ?? 0;
                    const isLow = qty <= (prod.reorderPoint ?? 10);
                    return (
                      <div key={loc.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-700 truncate">{loc.name}</span>
                        </div>
                        <span
                          className={`font-mono tabular-nums font-semibold ${
                            qty <= 0 ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-900'
                          }`}
                        >
                          {qty} {unit}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Recent Receipts containing SKU */}
          {recentTxs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">Recent Receipts</h4>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                {recentTxs.map((tx) => {
                  const line = tx.items.find((i) => i.productId === productId);
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => onSelectTarget({ type: 'transaction', transactionId: tx.id })}
                      className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                          {tx.receiptNumber}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(tx.timestamp).toLocaleString()} · Qty {line?.quantity || 0}
                        </p>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-blue-600 inline-flex items-center gap-1">
                        {fmtMoney((line?.unitPrice || 0) * (line?.quantity || 0))}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Package className="w-3.5 h-3.5" />
            <span>Reorder point: {prod?.reorderPoint ?? row?.reorderPoint ?? 10}</span>
          </div>
          {onNavigateToInventory && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToInventory();
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              Open Inventory
            </button>
          )}
        </div>
      </>
    );
  };

  const renderCategoryInspector = (category: string) => {
    const row = categoryRows.find((r) => r.category === category);
    const matchingSkus = skuRows
      .filter((s) => s.category === category)
      .sort((a, b) => b.netRevenue - a.netRevenue);

    return (
      <>
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Category P&L</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{row?.skuCount || matchingSkus.length} SKUs</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{(row?.revenueSharePct || 0).toFixed(1)}% share</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug break-words">
              {category}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="grid grid-cols-3 divide-x divide-slate-200 border border-slate-200 rounded-lg bg-slate-50/70">
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500">Net Revenue</p>
              <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {fmtMoney(row?.netRevenue || 0)}
              </p>
            </div>
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500">Gross Profit</p>
              <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {canViewCost ? fmtMoney(row?.grossProfit || 0) : '••••'}
              </p>
            </div>
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500">Margin %</p>
              <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {canViewCost ? `${(row?.marginPct || 0).toFixed(1)}%` : 'Restricted'}
              </p>
            </div>
          </div>

          {canViewCost && (row?.uncostedRevenue || 0) > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <p>
                <span className="font-semibold">{fmtMoney(row?.uncostedRevenue || 0)}</span> in this category comes from SKUs without buying prices recorded.
              </p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2">
              SKU Contributors ({matchingSkus.length})
            </h4>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {matchingSkus.length === 0 ? (
                <p className="p-3 text-xs text-slate-500">No SKU line activity in this period.</p>
              ) : (
                matchingSkus.map((sku) => (
                  <button
                    key={sku.productId}
                    type="button"
                    onClick={() => onSelectTarget({ type: 'sku', productId: sku.productId })}
                    className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{sku.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {sku.sku} · {sku.netUnitsSold} units
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                        {fmtMoney(sku.netRevenue)}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                        {canViewCost ? `${sku.marginPct.toFixed(1)}% margin` : '—'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Click any SKU to inspect cost & stock
          </span>
        </div>
      </>
    );
  };

  const renderTransactionInspector = (transactionId: string) => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) return null;
    const fin = computeTransactionFinancials(tx, productMap);

    return (
      <>
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700 tabular-nums">{tx.receiptNumber}</span>
              <span aria-hidden="true">·</span>
              <span>{tx.locationName}</span>
              <span aria-hidden="true">·</span>
              <span className="uppercase">{tx.paymentMethod.replace('_', ' ')}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">
              Receipt Audit
            </h3>
            <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
              {new Date(tx.timestamp).toLocaleString()} · Cashier: {tx.cashierName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="grid grid-cols-3 divide-x divide-slate-200 border border-slate-200 rounded-lg bg-slate-50/70">
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500">Net Total</p>
              <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {fmtMoney(fin.netSales)}
              </p>
            </div>
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500">Est. COGS</p>
              <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {canViewCost ? fmtMoney(fin.cogsTotal) : '••••'}
              </p>
            </div>
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500">Gross Profit</p>
              <p className="text-sm font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
                {canViewCost ? fmtMoney(fin.grossProfit) : '••••'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2">
              Line Items ({tx.items.length})
            </h4>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {tx.items.map((item, idx) => {
                const { unitCost, hasCostData } = resolveItemUnitCost(item, productMap);
                const lineGross = item.unitPrice * item.quantity;
                const lineDisc =
                  item.discountType === 'flat' && typeof item.discountAmount === 'number'
                    ? item.discountAmount
                    : (lineGross * (item.discountPercent || 0)) / 100;
                const lineNet = Math.max(0, lineGross - lineDisc);
                const lineCogs = unitCost * item.quantity;

                return (
                  <button
                    key={`${item.productId}-${idx}`}
                    type="button"
                    onClick={() => onSelectTarget({ type: 'sku', productId: item.productId })}
                    className="w-full px-3 py-2.5 flex items-start justify-between gap-2 text-left hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.productName}</p>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {item.quantity} × {fmtMoney(item.unitPrice)}
                        {lineDisc > 0 ? ` (-${fmtMoney(lineDisc)})` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                        {fmtMoney(lineNet)}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                        {canViewCost
                          ? hasCostData
                            ? `COGS ${fmtMoney(lineCogs)}`
                            : 'No cost set'
                          : '••••'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
            <div className="flex justify-between px-3 py-2">
              <span className="text-slate-600">Tax ({tx.taxLabel || 'VAT'})</span>
              <span className="font-mono tabular-nums text-slate-900">{fmtMoney(tx.taxAmount || 0)}</span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-slate-600">Discounts</span>
              <span className="font-mono tabular-nums text-amber-700">-{fmtMoney(fin.discountsTotal)}</span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-slate-600">Refunds Issued</span>
              <span className="font-mono tabular-nums text-rose-700">-{fmtMoney(fin.refundsTotal)}</span>
            </div>
            {tx.etimsData?.cuInvoiceNumber && (
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-600">KRA eTIMS Invoice #</span>
                <span className="font-mono tabular-nums text-slate-900">{tx.etimsData.cuInvoiceNumber}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveReceipt(tx)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Reprint Receipt
          </button>
          {canProcessReturns && tx.status !== 'refunded' && (
            <button
              type="button"
              onClick={() => openReturnsModal(tx)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Process Return
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label="Business Intelligence Inspector"
        className="relative z-10 w-full max-w-[460px] bg-white h-full border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-150"
      >
        {target.type === 'sku' && renderSkuInspector(target.productId)}
        {target.type === 'category' && renderCategoryInspector(target.category)}
        {target.type === 'transaction' && renderTransactionInspector(target.transactionId)}
      </aside>
    </div>
  );
};
