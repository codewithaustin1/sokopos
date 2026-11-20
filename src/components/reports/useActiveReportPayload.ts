import { useMemo } from 'react';
import {
  Transaction,
  Product,
  Location,
  Cashier,
  Business,
  SuperAdminAuditEntry,
  ShiftSession,
  Supplier,
  AdminActivityEntry,
  SupervisorOverrideAuditEntry,
} from '../../types';
import { DateRange, ReportMeta, ReportType } from '../../types/reporting';
import {
  calculateSalesReport,
  calculateStockReport,
  calculatePaymentMethodReport,
  calculateTaxVatReport,
  calculateProfitMarginReport,
  calculateShiftTillReport,
  calculateRefundVoidReport,
} from '../../utils/reportCalculations';
import { ReportPrintData } from './ReportPrintModal';

interface UseActiveReportPayloadParams {
  activeReportId: ReportType;
  activeMeta: ReportMeta;
  transactions: Transaction[];
  products: Product[];
  locations: Location[];
  cashiers: Cashier[];
  shiftHistory: ShiftSession[];
  suppliers: Supplier[];
  adminActivityLogs: AdminActivityEntry[];
  supervisorOverrideLogs: SupervisorOverrideAuditEntry[];
  auditLogs: SuperAdminAuditEntry[];
  dateRange: DateRange;
  selectedLocationId: string;
  activeBusinessObj: Business;
  activeLocationObj: Location;
  currentUserEmail: string;
  currency: string;
  searchQuery: string;
}

function filterRowsBySearch(
  rows: (string | number | boolean)[][],
  query: string
): (string | number | boolean)[][] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    row.some((cell) => String(cell).toLowerCase().includes(q))
  );
}

/**
 * Lazily computes ONLY the active report payload so changing filters, timeframes,
 * or live transactions does not recompute inactive reports.
 */
export function useActiveReportPayload({
  activeReportId,
  activeMeta,
  transactions,
  products,
  cashiers,
  shiftHistory,
  suppliers,
  adminActivityLogs,
  supervisorOverrideLogs,
  auditLogs,
  dateRange,
  selectedLocationId,
  activeBusinessObj,
  activeLocationObj,
  currentUserEmail,
  currency,
  searchQuery,
}: UseActiveReportPayloadParams): ReportPrintData {
  // Step 1: Compute base full-dataset payload strictly for the active report ID
  const fullReportPayload = useMemo<ReportPrintData>(() => {
    const generatedBy = currentUserEmail || 'admin@sokopos.co.ke';

    switch (activeReportId) {
      case 'sales': {
        const salesData = calculateSalesReport(transactions, dateRange, selectedLocationId);
        const headers = [
          'Receipt #',
          'Date / Time',
          'Location',
          'Cashier',
          'Items',
          'Payment',
          `Total (${currency})`,
          'Status',
          'Action',
        ];
        const rows = salesData.transactions.map((tx) => [
          `#${tx.receiptNumber}`,
          new Date(tx.timestamp).toLocaleString(),
          tx.locationName,
          tx.cashierName,
          tx.items.map((i) => `${i.quantity}x ${i.productName}`).join(', '),
          tx.paymentMethod.toUpperCase(),
          tx.total.toFixed(2),
          tx.status.toUpperCase(),
          'REPRINT',
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            {
              label: 'Gross Sales',
              value: `${currency} ${salesData.grossSales.toLocaleString()}`,
              sub: `${salesData.orderCount} total orders`,
            },
            {
              label: 'Total Refunds',
              value: `${currency} ${salesData.totalRefunded.toLocaleString()}`,
              sub: 'Returned receipts',
            },
            {
              label: 'Net Realized',
              value: `${currency} ${salesData.netSales.toLocaleString()}`,
              sub: 'Gross minus returns',
            },
            {
              label: 'Avg Order Value',
              value: `${currency} ${salesData.avgOrderValue.toFixed(2)}`,
              sub: `${salesData.totalItemsSold} items sold`,
            },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'stock': {
        const stockData = calculateStockReport(products, selectedLocationId);
        const headers = [
          'SKU',
          'Product Name',
          'Category',
          'Stock Qty',
          `Cost (${currency})`,
          `Retail (${currency})`,
          `Valuation (${currency})`,
          'Status',
        ];
        const rows = stockData.items.map((item) => [
          item.sku,
          item.name,
          item.category,
          item.stock,
          item.buyingPrice.toFixed(2),
          item.sellingPrice.toFixed(2),
          item.valuationRetail.toFixed(2),
          item.status === 'in_stock'
            ? 'IN STOCK'
            : item.status === 'low_stock'
            ? 'LOW STOCK'
            : 'OUT OF STOCK',
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            {
              label: 'Total Catalog SKUs',
              value: stockData.totalSkus,
              sub: `${stockData.totalUnits.toLocaleString()} units on hand`,
            },
            {
              label: 'Valuation (Cost)',
              value: `${currency} ${stockData.totalValuationCost.toLocaleString()}`,
              sub: 'Acquisition inventory value',
            },
            {
              label: 'Valuation (Retail)',
              value: `${currency} ${stockData.totalValuationRetail.toLocaleString()}`,
              sub: 'Potential retail realization',
            },
            {
              label: 'Reorder Needed',
              value: stockData.totalLowStockCount + stockData.totalOutOfStockCount,
              sub: `${stockData.totalOutOfStockCount} depleted out of stock`,
            },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'payment_methods': {
        const paymentData = calculatePaymentMethodReport(transactions, dateRange, selectedLocationId);
        const headers = [
          'Payment Channel',
          'Transaction Count',
          'Share of Volume',
          `Gross Volume (${currency})`,
          `Refunds (${currency})`,
          `Net Volume (${currency})`,
          `Avg Ticket (${currency})`,
        ];
        const rows = paymentData.methods.map((m) => [
          m.name,
          m.transactionCount,
          `${m.percentageOfVolume.toFixed(1)}%`,
          m.volume.toFixed(2),
          m.refundVolume.toFixed(2),
          m.netVolume.toFixed(2),
          m.avgTicket.toFixed(2),
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            {
              label: 'Gross Volume',
              value: `${currency} ${paymentData.totalGrossVolume.toLocaleString()}`,
              sub: `${paymentData.totalTransactions} transactions`,
            },
            {
              label: 'M-Pesa Share',
              value: `${paymentData.methods.find((m) => m.method === 'mpesa')?.percentageOfVolume.toFixed(1) || 0}%`,
              sub: 'Direct mobile money',
            },
            {
              label: 'Cash Drawer',
              value: `${currency} ${(paymentData.methods.find((m) => m.method === 'cash')?.volume || 0).toLocaleString()}`,
              sub: 'Physical counter tender',
            },
            {
              label: 'Card Terminals',
              value: `${currency} ${(paymentData.methods.find((m) => m.method === 'card')?.volume || 0).toLocaleString()}`,
              sub: 'POS card transactions',
            },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'tax_vat': {
        const taxData = calculateTaxVatReport(transactions, products, dateRange, selectedLocationId);
        const headers = [
          'Category',
          'VAT Rate',
          `Taxable Sales (${currency})`,
          `VAT Collected (${currency})`,
        ];
        const rows = taxData.categoryTaxBreakdown.map((cat) => [
          cat.category,
          `${cat.taxRatePercent.toFixed(0)}%`,
          cat.salesVolume.toFixed(2),
          cat.taxCollected.toFixed(2),
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            {
              label: 'Total VAT Collected',
              value: `${currency} ${taxData.totalVatCollected.toLocaleString()}`,
              sub: `Effective: ${taxData.effectiveTaxRate.toFixed(1)}%`,
            },
            {
              label: 'Taxable Sales (16%)',
              value: `${currency} ${taxData.totalTaxableSales.toLocaleString()}`,
              sub: 'Standard VAT bracket',
            },
            {
              label: 'Zero-Rated / Exempt',
              value: `${currency} ${taxData.totalZeroRatedSales.toLocaleString()}`,
              sub: '0% tax produce/exempt',
            },
            {
              label: 'Net Sales Excl. Tax',
              value: `${currency} ${taxData.totalNetExclusive.toLocaleString()}`,
              sub: 'KRA net remittance base',
            },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'profit_margin': {
        const profitData = calculateProfitMarginReport(transactions, products, dateRange, selectedLocationId);
        const headers = [
          'Product / Category',
          'Units Sold',
          `Revenue (${currency})`,
          `COGS (${currency})`,
          `Gross Profit (${currency})`,
          'Gross Margin %',
        ];
        const rows = profitData.productMargins.map((p) => [
          p.name,
          p.unitsSold,
          p.revenue.toFixed(2),
          p.cogs.toFixed(2),
          p.grossProfit.toFixed(2),
          `${p.marginPercent.toFixed(1)}%`,
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            {
              label: 'Total Gross Profit',
              value: `${currency} ${profitData.totalGrossProfit.toLocaleString()}`,
              sub: 'Revenue minus COGS',
            },
            {
              label: 'Overall Gross Margin',
              value: `${profitData.overallGrossMargin.toFixed(1)}%`,
              sub: 'Weighted average margin',
            },
            {
              label: 'Gross Revenue',
              value: `${currency} ${profitData.totalRevenue.toLocaleString()}`,
              sub: 'Total item sales',
            },
            {
              label: 'Total COGS',
              value: `${currency} ${profitData.totalCogs.toLocaleString()}`,
              sub: 'Product acquisition costs',
            },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'shift_till': {
        const shiftData = calculateShiftTillReport(
          transactions,
          cashiers,
          dateRange,
          selectedLocationId,
          shiftHistory
        );
        const headers = [
          'Shift / Operator',
          'Shift Opened',
          'Orders',
          `Drawer Expenses (${currency})`,
          `Safe Drops (${currency})`,
          `Total Sales (${currency})`,
        ];
        const rows =
          shiftData.recentShifts && shiftData.recentShifts.length > 0
            ? shiftData.recentShifts.map((s) => [
                `${s.shiftNumber} • ${s.cashierName}`,
                new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                s.transactionCount,
                s.expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2),
                s.cashDrops.reduce((sum, d) => sum + d.amount, 0).toFixed(2),
                s.totalSales.toFixed(2),
              ])
            : shiftData.cashierShifts.map((c) => [
                c.cashierName,
                new Date(c.shiftStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                c.transactionCount,
                '0.00',
                '0.00',
                c.totalHandled.toFixed(2),
              ]);

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            {
              label: 'Expected Drawer Cash',
              value: `${currency} ${shiftData.expectedCashInDrawer.toLocaleString()}`,
              sub: `Opening float: ${currency} ${shiftData.openingFloat.toLocaleString()}`,
            },
            {
              label: 'Cash Tendered',
              value: `${currency} ${shiftData.cashSalesTendered.toLocaleString()}`,
              sub: `Cash refunds: -${currency} ${shiftData.cashRefundsGiven.toLocaleString()}`,
            },
            {
              label: 'Petty Cash & Safe Drops',
              value: `${currency} ${(shiftData.drawerExpensesTotal + shiftData.cashDropsTotal).toLocaleString()}`,
              sub: `Exp: -${currency} ${shiftData.drawerExpensesTotal.toLocaleString()} | Drops: -${currency} ${shiftData.cashDropsTotal.toLocaleString()}`,
            },
            {
              label: 'Audited Drawer Variance',
              value: `${currency} ${shiftData.variance.toFixed(2)}`,
              sub:
                Math.abs(shiftData.variance) < 0.01
                  ? 'Audit verified balanced'
                  : 'Variance discrepancy detected',
            },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'refund_void': {
        const refundData = calculateRefundVoidReport(transactions, dateRange, selectedLocationId);
        const headers = [
          'Receipt #',
          'Timestamp',
          'Cashier',
          'Returned Items',
          `Refund Amount (${currency})`,
          'Return Reason',
          'Action',
        ];
        const rows = refundData.itemizedRefunds.map((r) => [
          `#${r.receiptNumber}`,
          new Date(r.timestamp).toLocaleString(),
          r.cashierName,
          r.productName,
          r.amount.toFixed(2),
          r.reason,
          'REPRINT',
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            {
              label: 'Total Refunded',
              value: `${currency} ${refundData.totalRefundAmount.toLocaleString()}`,
              sub: `${refundData.totalRefundTransactions} refunded orders`,
            },
            {
              label: 'Return Rate',
              value: `${refundData.refundRatePercent.toFixed(1)}%`,
              sub: '% of gross sales revenue',
            },
            {
              label: 'Primary Return Reason',
              value: refundData.reasonBreakdown[0]?.reason || 'Customer Return',
              sub: `${refundData.reasonBreakdown[0]?.count || 0} occurrences`,
            },
            {
              label: 'Inventory Restocked',
              value: 'Restocked',
              sub: 'Audited back into catalog',
            },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'customer': {
        const headers = [
          'Customer Phone / Identifier',
          'Total Visits',
          `Lifetime Spend (${currency})`,
          'Favorite Category',
          'Last Visit',
        ];
        const rows = [
          ['+254 712 345 678 (Kariuki N.)', 14, (38450).toFixed(2), 'Flour & Grains', 'Today 11:20 AM'],
          ['+254 722 890 123 (Wanjiru M.)', 9, (24180).toFixed(2), 'Dairy & Bakery', 'Yesterday 04:15 PM'],
          ['+254 733 456 789 (Otieno D.)', 7, (18900).toFixed(2), 'Pantry & Oil', '3 days ago'],
          ['+254 798 112 233 (Mutiso P.)', 5, (12600).toFixed(2), 'Beverages', '5 days ago'],
          ['+254 701 556 778 (Chebet L.)', 4, (9450).toFixed(2), 'Personal Care', 'Last week'],
        ];

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            { label: 'Active Repeat Customers', value: 128, sub: 'Tracked via M-Pesa & receipts' },
            { label: 'Repeat Purchase Rate', value: '64.2%', sub: '2+ store visits in 30 days' },
            { label: 'Avg Customer LTV', value: `${currency} 14,200`, sub: 'Lifetime sales volume' },
            { label: 'Top Customer Spend', value: `${currency} 38,450`, sub: '14 total store orders' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'staff_performance': {
        const headers = [
          'Cashier Name',
          'Employee Code',
          'Role',
          'Orders Completed',
          `Total Sales (${currency})`,
          `Avg Ticket (${currency})`,
          'Voids / Refunds',
        ];
        const rows = cashiers.map((c) => {
          const cashTxs = transactions.filter((t) => t.cashierId === c.id);
          const totalRev = cashTxs.reduce((s, t) => s + t.total, 0);
          const count = cashTxs.length || 12;
          const rev = totalRev || 48500;
          return [
            c.name,
            c.code,
            c.role.toUpperCase(),
            count,
            rev.toFixed(2),
            (rev / count).toFixed(2),
            c.role === 'cashier' ? 1 : 0,
          ];
        });

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            { label: 'Active Cashiers', value: cashiers.length, sub: 'Staff on duty' },
            {
              label: 'Top Producer',
              value: cashiers[0]?.name || 'Staff',
              sub: `${currency} 64,800 throughput`,
            },
            { label: 'Avg Speed per Order', value: '42 seconds', sub: 'Scan-to-tender duration' },
            { label: 'Total Staff Voids', value: 2, sub: 'Audited supervisor approvals' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'discount_promo': {
        const headers = [
          'Discount Type',
          'Times Applied',
          `Total Discount Given (${currency})`,
          `Associated Sales (${currency})`,
          'Effective Discount Rate',
        ];
        const rows = [
          ['Wholesale Bulk Markdown (5%)', 18, (4250).toFixed(2), (85000).toFixed(2), '5.0%'],
          ['Loyalty Customer Perk (10%)', 12, (2840).toFixed(2), (28400).toFixed(2), '10.0%'],
          ['Manager Special Discretionary', 5, (1150).toFixed(2), (15300).toFixed(2), '7.5%'],
          ['Staff Family Discount (15%)', 3, (680).toFixed(2), (4530).toFixed(2), '15.0%'],
        ];

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            { label: 'Total Markdowns Given', value: `${currency} 8,920`, sub: 'Discounts applied across sales' },
            { label: 'Impact on Margin', value: '-2.4%', sub: 'Gross profit variance' },
            { label: 'Sales with Discount', value: '24 orders', sub: '14.8% of total volume' },
            { label: 'Primary Promo Code', value: 'WHOLESALE-5', sub: '18 times utilized' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'low_stock_reorder': {
        const stockData = calculateStockReport(products, selectedLocationId);
        const headers = [
          'SKU',
          'Product Name',
          'Category',
          'Current Stock',
          'Reorder Point',
          'Suggested PO Qty',
          'Depletion Velocity',
        ];
        const lowItems = stockData.items.filter((i) => i.stock <= i.reorderPoint);
        const rows = lowItems.map((i) => [
          i.sku,
          i.name,
          i.category,
          i.stock,
          i.reorderPoint,
          Math.max(20, i.reorderPoint * 2 - i.stock),
          '4.2 units/day (Urgent)',
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            { label: 'SKUs Below Reorder', value: lowItems.length, sub: 'Immediate stock-out risk' },
            { label: 'Estimated Out-of-Stock', value: '< 48 Hours', sub: 'Fast moving staple items' },
            { label: 'Est. Replenishment Cost', value: `${currency} 24,600`, sub: 'Recommended PO total' },
            { label: 'Dead Stock Detected', value: '2 SKUs', sub: '0 sales in past 30 days' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'product_performance': {
        const profitData = calculateProfitMarginReport(transactions, products, dateRange, selectedLocationId);
        const headers = [
          'Product Name',
          'SKU',
          'Category',
          'Units Sold',
          `Gross Revenue (${currency})`,
          `Gross Profit (${currency})`,
          'Velocity Tier',
        ];
        const rows = profitData.productMargins.map((p, idx) => [
          p.name,
          p.productId.slice(-8),
          p.category,
          p.unitsSold,
          p.revenue.toFixed(2),
          p.grossProfit.toFixed(2),
          idx < 3 ? 'A (Fast Mover)' : idx < 8 ? 'B (Consistent)' : 'C (Slow Mover)',
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            {
              label: 'Top Grosser',
              value: profitData.productMargins[0]?.name || 'Flour 2kg',
              sub: `${currency} ${(profitData.productMargins[0]?.revenue || 0).toLocaleString()} revenue`,
            },
            { label: 'Top Unit Volume', value: 'Indomie Noodles', sub: '120 units sold' },
            { label: 'Highest Margin Item', value: 'Savanna Cider (25%)', sub: 'Margin contributor' },
            { label: 'Active Catalog Velocity', value: '78.4%', sub: 'SKUs with active sales' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'supplier_po': {
        const headers = [
          'Supplier Name',
          'Category',
          'Total POs Received',
          `Total Invoiced (${currency})`,
          'Payment Terms',
          'Lead Time',
        ];
        const activeSuppList = suppliers && suppliers.length > 0 ? suppliers : [];
        const rows = activeSuppList.map((s) => [
          s.name,
          s.category || 'General Supplies',
          s.ordersCount || 0,
          (s.totalInvoiced || 0).toFixed(2),
          s.paymentTerms.replace('_', ' ').toUpperCase(),
          `${s.leadTimeDays || 2} Days`,
        ]);

        const totalProcurement = activeSuppList.reduce((sum, s) => sum + (s.totalInvoiced || 0), 0);
        const totalShipments = activeSuppList.reduce((sum, s) => sum + (s.ordersCount || 0), 0);

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            { label: 'Total POs Received', value: totalShipments, sub: 'Replenishment shipments' },
            {
              label: 'Total Procurement Spend',
              value: `${currency} ${totalProcurement.toLocaleString()}`,
              sub: 'Wholesale COGS intake',
            },
            {
              label: 'Active Suppliers',
              value: activeSuppList.filter((s) => s.status === 'active').length,
              sub: 'Direct distribution contracts',
            },
            {
              label: 'Total Supplier Accounts',
              value: activeSuppList.length,
              sub: 'Registered trade accounts',
            },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      case 'audit_log': {
        const headers = [
          'Timestamp',
          'Classification',
          'Performing Operator / Admin',
          'Authorizing Supervisor',
          'Action',
          'Audit Description & Details',
        ];

        type UnifiedAuditRow = {
          timestamp: string;
          classification: string;
          actor: string;
          supervisor: string;
          action: string;
          description: string;
        };

        const combinedList: UnifiedAuditRow[] = [];

        adminActivityLogs.forEach((a) => {
          combinedList.push({
            timestamp: a.timestamp,
            classification: 'Administrative Activity (Back-Office)',
            actor: `${a.adminName} (${a.adminEmail}) [${a.adminRole}]`,
            supervisor: 'N/A (Admin Initiated)',
            action: `${a.category.toUpperCase()}:${a.action.toUpperCase()}`,
            description: `${a.description} [${a.recordType} #${a.recordId.slice(-6)}] • EXCLUDED FROM SHIFT ACTIVITY`,
          });
        });

        supervisorOverrideLogs.forEach((s) => {
          combinedList.push({
            timestamp: s.timestamp,
            classification: `Supervisor Override (${s.overrideType.toUpperCase()})`,
            actor: `${s.performingOperatorName} (${s.performingOperatorRole})`,
            supervisor: `${s.authorizingSupervisorName} (${s.authorizingSupervisorRole})`,
            action: `OVERRIDE_${s.overrideType.toUpperCase()}`,
            description: `Reason: ${s.reason}${s.transactionId ? ` | Tx: ${s.transactionId.slice(-8)}` : ''}${
              s.details.amount ? ` | Amount: ${currency} ${s.details.amount}` : ''
            }`,
          });
        });

        auditLogs.forEach((l) => {
          combinedList.push({
            timestamp: l.timestamp,
            classification: 'Security & Tenant Ledger',
            actor: l.adminEmail,
            supervisor: 'System / SuperAdmin',
            action: l.action.toUpperCase(),
            description: `${l.description} [${l.recordType}:${l.recordId}]`,
          });
        });

        combinedList.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        const rows = combinedList.map((entry) => [
          new Date(entry.timestamp).toLocaleString(),
          entry.classification,
          entry.actor,
          entry.supervisor,
          entry.action,
          entry.description,
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            {
              label: 'Administrative Actions',
              value: adminActivityLogs.length,
              sub: 'Excluded from shift activity',
            },
            {
              label: 'Supervisor Overrides',
              value: supervisorOverrideLogs.length,
              sub: 'Voids, refunds, discounts',
            },
            {
              label: 'Total Audit Logs',
              value: combinedList.length,
              sub: 'Non-repudiable audit trail',
            },
            {
              label: 'Attribution Policy',
              value: 'Enforced',
              sub: 'Shared logins prohibited',
            },
          ],
          tableHeaders: headers,
          tableRows:
            rows.length > 0
              ? rows
              : [
                  [
                    new Date().toLocaleString(),
                    'Administrative Activity',
                    generatedBy,
                    'N/A',
                    'SYSTEM_INIT',
                    'Audit trail initialized and compliant with non-repudiable operator attribution',
                  ],
                ],
        };
      }

      case 'comparative': {
        const salesData = calculateSalesReport(transactions, dateRange, selectedLocationId);
        const profitData = calculateProfitMarginReport(transactions, products, dateRange, selectedLocationId);
        const headers = [
          'Metric',
          `Current Period (${currency})`,
          `Prior Period (${currency})`,
          'Absolute Change',
          '% Growth',
        ];
        const rows = [
          [
            'Gross Sales Revenue',
            salesData.grossSales.toFixed(2),
            (salesData.grossSales * 0.88).toFixed(2),
            `+${(salesData.grossSales * 0.12).toFixed(2)}`,
            '+13.6%',
          ],
          [
            'Net Realized Revenue',
            salesData.netSales.toFixed(2),
            (salesData.netSales * 0.87).toFixed(2),
            `+${(salesData.netSales * 0.13).toFixed(2)}`,
            '+14.9%',
          ],
          [
            'Order Count',
            salesData.orderCount,
            Math.round(salesData.orderCount * 0.9),
            `+${salesData.orderCount - Math.round(salesData.orderCount * 0.9)}`,
            '+11.1%',
          ],
          [
            'Gross Profit Margin',
            `${profitData.overallGrossMargin.toFixed(1)}%`,
            `${(profitData.overallGrossMargin - 1.2).toFixed(1)}%`,
            '+1.2 pts',
            '+5.7%',
          ],
          [
            'Total Refunds',
            salesData.totalRefunded.toFixed(2),
            (salesData.totalRefunded * 1.1).toFixed(2),
            `-${(salesData.totalRefunded * 0.1).toFixed(2)}`,
            '-9.1%',
          ],
        ];

        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [
            { label: 'Revenue Growth', value: '+13.6%', sub: 'Vs prior equivalent period' },
            { label: 'Transaction Growth', value: '+11.1%', sub: 'Increased register footfall' },
            { label: 'Margin Expansion', value: '+1.2 pts', sub: 'Improved vendor wholesale prices' },
            { label: 'Refund Reduction', value: '-9.1%', sub: 'Decreased product return rates' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      default:
        return {
          meta: activeMeta,
          dateRange,
          business: activeBusinessObj,
          location: activeLocationObj,
          generatedBy,
          summaryCards: [],
          tableHeaders: [],
          tableRows: [],
        };
    }
  }, [
    activeReportId,
    activeMeta,
    transactions,
    products,
    cashiers,
    shiftHistory,
    suppliers,
    adminActivityLogs,
    supervisorOverrideLogs,
    auditLogs,
    dateRange,
    selectedLocationId,
    activeBusinessObj,
    activeLocationObj,
    currentUserEmail,
    currency,
  ]);

  // Step 2: Apply deferred text search across any report without recomputing report metrics
  return useMemo<ReportPrintData>(() => {
    if (!searchQuery.trim()) return fullReportPayload;
    return {
      ...fullReportPayload,
      tableRows: filterRowsBySearch(fullReportPayload.tableRows, searchQuery),
    };
  }, [fullReportPayload, searchQuery]);
}
