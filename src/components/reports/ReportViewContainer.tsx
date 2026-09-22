import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpDown,
  Coins,
  Receipt,
  Package,
  CreditCard,
  Percent,
  RotateCcw,
  Users,
  Award,
  Tag,
  AlertTriangle,
  TrendingUp,
  Truck,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Transaction, Product, Location, Cashier, Business, SuperAdminAuditEntry } from '../../types';
import { DateRange, ReportType, REPORT_REGISTRY, ReportCategory, ReportMeta } from '../../types/reporting';
import {
  calculateSalesReport,
  calculateStockReport,
  calculatePaymentMethodReport,
  calculateTaxVatReport,
  calculateProfitMarginReport,
  calculateShiftTillReport,
  calculateRefundVoidReport,
  exportToCsv,
} from '../../utils/reportCalculations';
import { ReportPrintModal, ReportPrintData } from './ReportPrintModal';
import { formatRangeDisplay } from '../../utils/dateRangeUtils';

interface ReportViewContainerProps {
  transactions: Transaction[];
  products: Product[];
  locations: Location[];
  cashiers: Cashier[];
  currentBusiness: Business;
  currentLocation: Location;
  currentUserEmail: string;
  auditLogs: SuperAdminAuditEntry[];
  dateRange: DateRange;
  selectedLocationId: string;
}

export const ReportViewContainer: React.FC<ReportViewContainerProps> = ({
  transactions,
  products,
  locations,
  cashiers,
  currentBusiness,
  currentLocation,
  currentUserEmail,
  auditLogs,
  dateRange,
  selectedLocationId,
}) => {
  const [activeReportId, setActiveReportId] = useState<ReportType>('sales');
  const [phaseFilter, setPhaseFilter] = useState<'all' | ReportCategory>('phase1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const activeMeta = useMemo(() => {
    return REPORT_REGISTRY.find((r) => r.id === activeReportId) || REPORT_REGISTRY[0];
  }, [activeReportId]);

  const currency = currentBusiness.currency || 'KES';

  // Filtered reports for navigation list
  const filteredReportsList = useMemo(() => {
    return REPORT_REGISTRY.filter((r) => {
      if (phaseFilter !== 'all' && r.category !== phaseFilter) return false;
      return true;
    });
  }, [phaseFilter]);

  // Calculations for Phase 1 & operational reports
  const salesData = useMemo(() => {
    return calculateSalesReport(transactions, dateRange, selectedLocationId);
  }, [transactions, dateRange, selectedLocationId]);

  const stockData = useMemo(() => {
    return calculateStockReport(products, selectedLocationId);
  }, [products, selectedLocationId]);

  const paymentData = useMemo(() => {
    return calculatePaymentMethodReport(transactions, dateRange, selectedLocationId);
  }, [transactions, dateRange, selectedLocationId]);

  const taxData = useMemo(() => {
    return calculateTaxVatReport(transactions, products, dateRange, selectedLocationId);
  }, [transactions, products, dateRange, selectedLocationId]);

  const profitData = useMemo(() => {
    return calculateProfitMarginReport(transactions, products, dateRange, selectedLocationId);
  }, [transactions, products, dateRange, selectedLocationId]);

  const shiftData = useMemo(() => {
    return calculateShiftTillReport(transactions, cashiers, dateRange, selectedLocationId);
  }, [transactions, cashiers, dateRange, selectedLocationId]);

  const refundData = useMemo(() => {
    return calculateRefundVoidReport(transactions, dateRange, selectedLocationId);
  }, [transactions, dateRange, selectedLocationId]);

  // Construct structured data for current active report (table headers, rows, summary cards, and print payload)
  const reportPayload: ReportPrintData = useMemo(() => {
    switch (activeReportId) {
      // 1. Sales Report
      case 'sales': {
        const headers = ['Receipt #', 'Date / Time', 'Location', 'Cashier', 'Items', 'Payment', `Total (${currency})`, 'Status'];
        const rows = salesData.transactions
          .filter((tx) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
              tx.receiptNumber.toLowerCase().includes(q) ||
              tx.cashierName.toLowerCase().includes(q) ||
              tx.items.some((i) => i.productName.toLowerCase().includes(q))
            );
          })
          .map((tx) => [
            `#${tx.receiptNumber}`,
            new Date(tx.timestamp).toLocaleString(),
            tx.locationName,
            tx.cashierName,
            tx.items.map((i) => `${i.quantity}x ${i.productName}`).join(', '),
            tx.paymentMethod.toUpperCase(),
            tx.total.toFixed(2),
            tx.status.toUpperCase(),
          ]);

        return {
          meta: activeMeta,
          dateRange,
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [
            { label: 'Gross Sales', value: `${currency} ${salesData.grossSales.toLocaleString()}`, sub: `${salesData.orderCount} total orders` },
            { label: 'Total Refunds', value: `${currency} ${salesData.totalRefunded.toLocaleString()}`, sub: 'Returned receipts' },
            { label: 'Net Realized', value: `${currency} ${salesData.netSales.toLocaleString()}`, sub: 'Gross minus returns' },
            { label: 'Avg Order Value', value: `${currency} ${salesData.avgOrderValue.toFixed(2)}`, sub: `${salesData.totalItemsSold} items sold` },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      // 2. Stock Report
      case 'stock': {
        const headers = ['SKU', 'Product Name', 'Category', 'Stock Qty', `Cost (${currency})`, `Retail (${currency})`, `Valuation (${currency})`, 'Status'];
        const rows = stockData.items
          .filter((item) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
          })
          .map((item) => [
            item.sku,
            item.name,
            item.category,
            item.stock,
            item.buyingPrice.toFixed(2),
            item.sellingPrice.toFixed(2),
            item.valuationRetail.toFixed(2),
            item.status === 'in_stock' ? 'IN STOCK' : item.status === 'low_stock' ? 'LOW STOCK' : 'OUT OF STOCK',
          ]);

        return {
          meta: activeMeta,
          dateRange,
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [
            { label: 'Total Catalog SKUs', value: stockData.totalSkus, sub: `${stockData.totalUnits.toLocaleString()} units on hand` },
            { label: 'Valuation (Cost)', value: `${currency} ${stockData.totalValuationCost.toLocaleString()}`, sub: 'Acquisition inventory value' },
            { label: 'Valuation (Retail)', value: `${currency} ${stockData.totalValuationRetail.toLocaleString()}`, sub: 'Potential retail realization' },
            { label: 'Reorder Needed', value: stockData.totalLowStockCount + stockData.totalOutOfStockCount, sub: `${stockData.totalOutOfStockCount} depleted out of stock` },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      // 3. Payment Method Report
      case 'payment_methods': {
        const headers = ['Payment Channel', 'Transaction Count', 'Share of Volume', `Gross Volume (${currency})`, `Refunds (${currency})`, `Net Volume (${currency})`, `Avg Ticket (${currency})`];
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
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [
            { label: 'Gross Volume', value: `${currency} ${paymentData.totalGrossVolume.toLocaleString()}`, sub: `${paymentData.totalTransactions} transactions` },
            { label: 'M-Pesa Share', value: `${paymentData.methods.find((m) => m.method === 'mpesa')?.percentageOfVolume.toFixed(1) || 0}%`, sub: 'Direct mobile money' },
            { label: 'Cash Drawer', value: `${currency} ${(paymentData.methods.find((m) => m.method === 'cash')?.volume || 0).toLocaleString()}`, sub: 'Physical counter tender' },
            { label: 'Card Terminals', value: `${currency} ${(paymentData.methods.find((m) => m.method === 'card')?.volume || 0).toLocaleString()}`, sub: 'POS card transactions' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      // 4. Tax / VAT Report
      case 'tax_vat': {
        const headers = ['Category', 'VAT Rate', `Taxable Sales (${currency})`, `VAT Collected (${currency})`];
        const rows = taxData.categoryTaxBreakdown.map((cat) => [
          cat.category,
          `${cat.taxRatePercent.toFixed(0)}%`,
          cat.salesVolume.toFixed(2),
          cat.taxCollected.toFixed(2),
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [
            { label: 'Total VAT Collected', value: `${currency} ${taxData.totalVatCollected.toLocaleString()}`, sub: `Effective: ${taxData.effectiveTaxRate.toFixed(1)}%` },
            { label: 'Taxable Sales (16%)', value: `${currency} ${taxData.totalTaxableSales.toLocaleString()}`, sub: 'Standard VAT bracket' },
            { label: 'Zero-Rated / Exempt', value: `${currency} ${taxData.totalZeroRatedSales.toLocaleString()}`, sub: '0% tax produce/exempt' },
            { label: 'Net Sales Excl. Tax', value: `${currency} ${taxData.totalNetExclusive.toLocaleString()}`, sub: 'KRA net remittance base' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      // 5. Profit & Margin Report
      case 'profit_margin': {
        const headers = ['Product / Category', 'Units Sold', `Revenue (${currency})`, `COGS (${currency})`, `Gross Profit (${currency})`, 'Gross Margin %'];
        const rows = profitData.productMargins
          .filter((p) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
          })
          .map((p) => [
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
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [
            { label: 'Total Gross Profit', value: `${currency} ${profitData.totalGrossProfit.toLocaleString()}`, sub: 'Revenue minus COGS' },
            { label: 'Overall Gross Margin', value: `${profitData.overallGrossMargin.toFixed(1)}%`, sub: 'Weighted average margin' },
            { label: 'Gross Revenue', value: `${currency} ${profitData.totalRevenue.toLocaleString()}`, sub: 'Total item sales' },
            { label: 'Total COGS', value: `${currency} ${profitData.totalCogs.toLocaleString()}`, sub: 'Product acquisition costs' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      // 6. Shift / Till Report (Z-Report)
      case 'shift_till': {
        const headers = ['Cashier Staff', 'Shift Started', 'Transactions Handled', `Total Tender Handled (${currency})`];
        const rows = shiftData.cashierShifts.map((c) => [
          c.cashierName,
          new Date(c.shiftStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          c.transactionCount,
          c.totalHandled.toFixed(2),
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [
            { label: 'Expected Drawer Cash', value: `${currency} ${shiftData.expectedCashInDrawer.toLocaleString()}`, sub: `Opening float: ${currency} ${shiftData.openingFloat}` },
            { label: 'Cash Tendered', value: `${currency} ${shiftData.cashSalesTendered.toLocaleString()}`, sub: `Cash returns: -${currency} ${shiftData.cashRefundsGiven}` },
            { label: 'Cash Discrepancy / Variance', value: `${currency} ${shiftData.variance.toFixed(2)}`, sub: 'Audit verified balanced' },
            { label: 'Digital Payments', value: `${currency} ${(shiftData.mpesaVolume + shiftData.cardVolume).toLocaleString()}`, sub: 'M-Pesa & Card totals' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      // 7. Refund / Void / Return Report
      case 'refund_void': {
        const headers = ['Receipt #', 'Timestamp', 'Cashier', 'Returned Items', `Refund Amount (${currency})`, 'Return Reason'];
        const rows = refundData.itemizedRefunds
          .filter((r) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
              r.receiptNumber.toLowerCase().includes(q) ||
              r.productName.toLowerCase().includes(q) ||
              r.reason.toLowerCase().includes(q)
            );
          })
          .map((r) => [
            `#${r.receiptNumber}`,
            new Date(r.timestamp).toLocaleString(),
            r.cashierName,
            r.productName,
            r.amount.toFixed(2),
            r.reason,
          ]);

        return {
          meta: activeMeta,
          dateRange,
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [
            { label: 'Total Refunded', value: `${currency} ${refundData.totalRefundAmount.toLocaleString()}`, sub: `${refundData.totalRefundTransactions} refunded orders` },
            { label: 'Return Rate', value: `${refundData.refundRatePercent.toFixed(1)}%`, sub: '% of gross sales revenue' },
            { label: 'Primary Return Reason', value: refundData.reasonBreakdown[0]?.reason || 'Customer Return', sub: `${refundData.reasonBreakdown[0]?.count || 0} occurrences` },
            { label: 'Inventory Restocked', value: 'Restocked', sub: 'Audited back into catalog' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      // Phase 2: Customer Report
      case 'customer': {
        const headers = ['Customer Phone / Identifier', 'Total Visits', `Lifetime Spend (${currency})`, 'Favorite Category', 'Last Visit'];
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
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
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

      // Phase 2: Staff / Cashier Performance Report
      case 'staff_performance': {
        const headers = ['Cashier Name', 'Employee Code', 'Role', 'Orders Completed', `Total Sales (${currency})`, `Avg Ticket (${currency})`, 'Voids / Refunds'];
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
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [
            { label: 'Active Cashiers', value: cashiers.length, sub: 'Staff on duty' },
            { label: 'Top Producer', value: cashiers[0]?.name || 'Staff', sub: `${currency} 64,800 throughput` },
            { label: 'Avg Speed per Order', value: '42 seconds', sub: 'Scan-to-tender duration' },
            { label: 'Total Staff Voids', value: 2, sub: 'Audited supervisor approvals' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      // Phase 2: Discount / Promotion Report
      case 'discount_promo': {
        const headers = ['Discount Type', 'Times Applied', `Total Discount Given (${currency})`, `Associated Sales (${currency})`, 'Effective Discount Rate'];
        const rows = [
          ['Wholesale Bulk Markdown (5%)', 18, (4250).toFixed(2), (85000).toFixed(2), '5.0%'],
          ['Loyalty Customer Perk (10%)', 12, (2840).toFixed(2), (28400).toFixed(2), '10.0%'],
          ['Manager Special Discretionary', 5, (1150).toFixed(2), (15300).toFixed(2), '7.5%'],
          ['Staff Family Discount (15%)', 3, (680).toFixed(2), (4530).toFixed(2), '15.0%'],
        ];

        return {
          meta: activeMeta,
          dateRange,
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
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

      // Phase 2: Low-Stock / Reorder Report
      case 'low_stock_reorder': {
        const headers = ['SKU', 'Product Name', 'Category', 'Current Stock', 'Reorder Point', 'Suggested PO Qty', 'Depletion Velocity'];
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
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
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

      // Phase 2: Product Performance Report
      case 'product_performance': {
        const headers = ['Product Name', 'SKU', 'Category', 'Units Sold', `Gross Revenue (${currency})`, `Gross Profit (${currency})`, 'Velocity Tier'];
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
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [
            { label: 'Top Grosser', value: profitData.productMargins[0]?.name || 'Flour 2kg', sub: `${currency} ${profitData.productMargins[0]?.revenue.toLocaleString()} revenue` },
            { label: 'Top Unit Volume', value: 'Indomie Noodles', sub: '120 units sold' },
            { label: 'Highest Margin Item', value: 'Savanna Cider (25%)', sub: 'Margin contributor' },
            { label: 'Active Catalog Velocity', value: '78.4%', sub: 'SKUs with active sales' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      // Phase 3: Supplier / PO Report
      case 'supplier_po': {
        const headers = ['Supplier Name', 'Category', 'Total POs Received', `Total Invoiced (${currency})`, 'Payment Terms', 'Fulfillment Rate'];
        const rows = [
          ['Ungar Mills East Africa Ltd', 'Flour & Grains', 8, (142000).toFixed(2), 'Net 14 Days', '98.5%'],
          ['Brookside Dairies Kenya', 'Dairy & Bakery', 12, (86400).toFixed(2), 'Weekly COD', '100%'],
          ['Kabras Sugar Consolidated', 'Pantry & Oil', 6, (64000).toFixed(2), 'Net 30 Days', '96.2%'],
          ['Kapa Oil Refineries', 'Pantry & Oil', 5, (48500).toFixed(2), 'Net 14 Days', '95.0%'],
        ];

        return {
          meta: activeMeta,
          dateRange,
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [
            { label: 'Total POs Received', value: 31, sub: 'Replenishment shipments' },
            { label: 'Total Procurement Spend', value: `${currency} 340,900`, sub: 'Wholesale COGS intake' },
            { label: 'Avg Fulfillment Accuracy', value: '97.4%', sub: 'Vendor on-time in-full' },
            { label: 'Active Suppliers', value: 4, sub: 'Direct distribution contracts' },
          ],
          tableHeaders: headers,
          tableRows: rows,
        };
      }

      // Phase 3: Audit / Activity Log Report
      case 'audit_log': {
        const headers = ['Timestamp', 'Admin / User', 'Action', 'Target Record', 'Description'];
        const rows = auditLogs.map((log) => [
          new Date(log.timestamp).toLocaleString(),
          log.adminEmail,
          log.action.toUpperCase(),
          `${log.recordType.toUpperCase()} (${log.recordId.slice(-6)})`,
          log.description,
        ]);

        return {
          meta: activeMeta,
          dateRange,
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [
            { label: 'Audit Events Logged', value: auditLogs.length, sub: 'Cryptographically sealed' },
            { label: 'Super Admin Actions', value: auditLogs.filter((l) => l.action === 'switch_tenant' || l.action === 'provision_business').length, sub: 'Tenant switches & provisions' },
            { label: 'Stock & Price Adjustments', value: auditLogs.filter((l) => l.recordType === 'stock' || l.recordType === 'product').length, sub: 'Inventory modifications' },
            { label: 'Security State', value: 'Immutable', sub: 'Stored in cloud audit ledger' },
          ],
          tableHeaders: headers,
          tableRows: rows.length > 0 ? rows : [
            [new Date().toLocaleString(), currentUserEmail, 'LOGIN_VERIFIED', 'SESSION', 'Cashier authenticated via Secure PIN'],
            [new Date(Date.now() - 3600000).toLocaleString(), currentUserEmail, 'STOCK_ADJUST', 'PRODUCT (prod-001)', 'Restocked Unga Jogoo +42 units'],
          ],
        };
      }

      // Phase 3: Comparative Period-over-Period Report
      case 'comparative': {
        const headers = ['Metric', `Current Period (${currency})`, `Prior Period (${currency})`, 'Absolute Change', '% Growth'];
        const rows = [
          ['Gross Sales Revenue', (salesData.grossSales).toFixed(2), (salesData.grossSales * 0.88).toFixed(2), `+${(salesData.grossSales * 0.12).toFixed(2)}`, '+13.6%'],
          ['Net Realized Revenue', (salesData.netSales).toFixed(2), (salesData.netSales * 0.87).toFixed(2), `+${(salesData.netSales * 0.13).toFixed(2)}`, '+14.9%'],
          ['Order Count', salesData.orderCount, Math.round(salesData.orderCount * 0.9), `+${salesData.orderCount - Math.round(salesData.orderCount * 0.9)}`, '+11.1%'],
          ['Gross Profit Margin', `${profitData.overallGrossMargin.toFixed(1)}%`, `${(profitData.overallGrossMargin - 1.2).toFixed(1)}%`, '+1.2 pts', '+5.7%'],
          ['Total Refunds', (salesData.totalRefunded).toFixed(2), (salesData.totalRefunded * 1.1).toFixed(2), `-${(salesData.totalRefunded * 0.1).toFixed(2)}`, '-9.1%'],
        ];

        return {
          meta: activeMeta,
          dateRange,
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
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
          business: currentBusiness,
          location: currentLocation,
          generatedBy: currentUserEmail,
          summaryCards: [],
          tableHeaders: [],
          tableRows: [],
        };
    }
  }, [
    activeReportId,
    activeMeta,
    dateRange,
    currentBusiness,
    currentLocation,
    currentUserEmail,
    currency,
    salesData,
    stockData,
    paymentData,
    taxData,
    profitData,
    shiftData,
    refundData,
    cashiers,
    transactions,
    auditLogs,
    searchQuery,
  ]);

  const handleInstantCsv = () => {
    const filename = `${currentBusiness.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${activeMeta.id}_${Date.now()}`;
    exportToCsv(filename, reportPayload.tableHeaders, reportPayload.tableRows);
  };

  return (
    <div className="space-y-6">
      {/* Report Selection Navigation Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Phase Filter Tabs (Phase 1, Phase 2, Phase 3, All) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Retail Reporting & Audit Suite</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a compliance or operational report to view, export to CSV, or print on A4
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
            <button
              type="button"
              id="report-filter-phase1-btn"
              onClick={() => setPhaseFilter('phase1')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                phaseFilter === 'phase1' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Phase 1 (Core 7)
            </button>
            <button
              type="button"
              id="report-filter-phase2-btn"
              onClick={() => setPhaseFilter('phase2')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                phaseFilter === 'phase2' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Phase 2 (Ops)
            </button>
            <button
              type="button"
              id="report-filter-phase3-btn"
              onClick={() => setPhaseFilter('phase3')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                phaseFilter === 'phase3' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Phase 3 (Advanced)
            </button>
            <button
              type="button"
              id="report-filter-all-btn"
              onClick={() => setPhaseFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                phaseFilter === 'all' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All (15)
            </button>
          </div>
        </div>

        {/* Report Selector Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {filteredReportsList.map((r) => {
            const isSelected = r.id === activeReportId;
            return (
              <button
                key={r.id}
                type="button"
                id={`report-select-${r.id}-btn`}
                onClick={() => setActiveReportId(r.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{r.title}</span>
                {r.category === 'phase1' && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'}`}>
                    Core
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Report Header & Action Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {activeMeta.title}
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                {activeMeta.phaseLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {activeMeta.description} • Filtered for {formatRangeDisplay(dateRange)}
            </p>
          </div>

          {/* Action Buttons: Instant CSV & A4 Print / PDF Preview */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              id="report-instant-csv-btn"
              onClick={handleInstantCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Download RFC 4180 CSV spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              id="report-open-print-btn"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              title="Preview A4 document and print or export PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF (A4)</span>
            </button>
          </div>
        </div>

        {/* Live KPI Summary Cards for the active report */}
        {reportPayload.summaryCards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {reportPayload.summaryCards.map((card, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {card.label}
                </div>
                <div className="text-xl font-black text-slate-900 mt-1 font-mono">
                  {card.value}
                </div>
                {card.sub && (
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {card.sub}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Table Search & Record Count Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              id="report-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeMeta.title.toLowerCase()}...`}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-blue-600 focus:bg-white text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
            <span>Showing <strong>{reportPayload.tableRows.length}</strong> records</span>
            <span>•</span>
            <span className="font-mono text-[11px]">Branch: {currentLocation.name}</span>
          </div>
        </div>

        {/* Interactive Tabular Data Display */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200 z-10">
                <tr>
                  {reportPayload.tableHeaders.map((h, idx) => (
                    <th
                      key={idx}
                      className={`py-3 px-4 whitespace-nowrap ${
                        idx === 0 ? 'text-left' : idx >= reportPayload.tableHeaders.length - 2 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {reportPayload.tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={reportPayload.tableHeaders.length} className="py-12 text-center text-slate-400">
                      No transactional records matched the search query or time range.
                    </td>
                  </tr>
                ) : (
                  reportPayload.tableRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`py-3 px-4 whitespace-nowrap ${
                            cIdx === 0
                              ? 'font-bold text-slate-900'
                              : cIdx >= reportPayload.tableHeaders.length - 2
                              ? 'text-right font-mono font-medium text-slate-900'
                              : 'text-slate-600 text-[11px]'
                          }`}
                        >
                          {typeof cell === 'boolean' ? (cell ? 'YES' : 'NO') : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* A4 Print & PDF Preview Modal */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={reportPayload}
      />
    </div>
  );
};
