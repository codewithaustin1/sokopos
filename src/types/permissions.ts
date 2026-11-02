export type PermissionKey =
  // Sales & POS
  | 'sell'
  | 'applyDiscounts'
  | 'voidTransactions'
  | 'processRefunds'
  | 'openCashDrawer'
  | 'customItemEntry'
  // Inventory & Purchasing
  | 'viewInventory'
  | 'manageInventory'
  | 'viewCostPrice'
  | 'manageSuppliers'
  | 'stockTransfers'
  // Shift & Cash Management
  | 'openShift'
  | 'closeShiftReconciliation'
  | 'viewShiftTotals'
  // Customers & Store Credit
  | 'viewCustomers'
  | 'manageCustomers'
  | 'manageStoreCredit'
  | 'manageLoyalty'
  // Reports & Analytics
  | 'viewReports'
  | 'viewAnalytics'
  | 'exportReports'
  // Administration
  | 'manageStaff'
  | 'manageStoreSettings';

export type PermissionCategory =
  | 'pos'
  | 'inventory'
  | 'shifts'
  | 'customers'
  | 'reports'
  | 'admin';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  category: PermissionCategory;
  categoryLabel: string;
  badge?: string;
  riskLevel?: 'low' | 'medium' | 'high';
}

export type ConfigurableStaffRole = 'manager' | 'supervisor' | 'cashier' | 'inventory_clerk';

export type RolePermissionsMap = Record<
  ConfigurableStaffRole,
  Record<PermissionKey, boolean>
>;

export const PERMISSION_CATEGORIES: { id: PermissionCategory; label: string; icon: string; description: string }[] = [
  {
    id: 'pos',
    label: 'POS & Sales Tendering',
    icon: 'ShoppingCart',
    description: 'Cash register actions, discounts, voiding, refunds, and cash drawer kicking.',
  },
  {
    id: 'inventory',
    label: 'Inventory & Stock Control',
    icon: 'Package',
    description: 'Product catalog access, price modifications, wholesale cost visibility, and suppliers.',
  },
  {
    id: 'shifts',
    label: 'Shifts & Till Reconciliation',
    icon: 'Clock',
    description: 'Opening register float, cash counting, blind till audit, and X/Z-reports.',
  },
  {
    id: 'customers',
    label: 'Customers & Store Credit',
    icon: 'Users',
    description: 'Customer contact books, Daftari store credit limits, and loyalty points.',
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: 'BarChart3',
    description: 'Financial summaries, gross profit analytics, and accounting CSV exports.',
  },
  {
    id: 'admin',
    label: 'Store Administration',
    icon: 'Shield',
    description: 'Staff account provisioning, PIN resets, and company profile configurations.',
  },
];

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // POS
  {
    key: 'sell',
    label: 'Ring up & Tender Sales',
    description: 'Scan barcodes, add items to cart, and tender Cash, M-Pesa, Card, and Store Credit sales.',
    category: 'pos',
    categoryLabel: 'POS & Sales Tendering',
    riskLevel: 'low',
  },
  {
    key: 'applyDiscounts',
    label: 'Apply Discounts',
    description: 'Apply line-item or cart-wide flat/percentage discounts directly without manager PIN override.',
    category: 'pos',
    categoryLabel: 'POS & Sales Tendering',
    badge: 'Override Protected',
    riskLevel: 'medium',
  },
  {
    key: 'voidTransactions',
    label: 'Void Active Transactions',
    description: 'Cancel sales in progress, void line items, or clear cart without supervisor approval.',
    category: 'pos',
    categoryLabel: 'POS & Sales Tendering',
    badge: 'Override Protected',
    riskLevel: 'medium',
  },
  {
    key: 'processRefunds',
    label: 'Process Returns & Refunds',
    description: 'Accept returned products, issue cash/credit refunds, and print KRA credit notes.',
    category: 'pos',
    categoryLabel: 'POS & Sales Tendering',
    badge: 'High Value',
    riskLevel: 'high',
  },
  {
    key: 'openCashDrawer',
    label: 'Manual Cash Drawer Kick',
    description: 'Open physical cash drawer without an active sale ("No-Sale" till kick).',
    category: 'pos',
    categoryLabel: 'POS & Sales Tendering',
    riskLevel: 'medium',
  },
  {
    key: 'customItemEntry',
    label: 'Custom Items & Price Overrides',
    description: 'Key in custom ad-hoc prices and one-off non-barcoded merchandise at register.',
    category: 'pos',
    categoryLabel: 'POS & Sales Tendering',
    riskLevel: 'medium',
  },

  // Inventory
  {
    key: 'viewInventory',
    label: 'View Product Inventory',
    description: 'Search product catalog, look up barcodes, check retail prices and real-time stock levels.',
    category: 'inventory',
    categoryLabel: 'Inventory & Stock Control',
    riskLevel: 'low',
  },
  {
    key: 'manageInventory',
    label: 'Create, Edit & Adjust Products',
    description: 'Add new inventory SKUs, update retail selling prices, adjust stock levels and reorder limits.',
    category: 'inventory',
    categoryLabel: 'Inventory & Stock Control',
    riskLevel: 'high',
  },
  {
    key: 'viewCostPrice',
    label: 'View Wholesale Cost & Margins',
    description: 'See product buying cost prices, gross profit margins, and markups on product cards.',
    category: 'inventory',
    categoryLabel: 'Inventory & Stock Control',
    badge: 'Confidential',
    riskLevel: 'medium',
  },
  {
    key: 'manageSuppliers',
    label: 'Suppliers & Purchase Invoices',
    description: 'Create supplier records, issue purchase orders, and receive supplier shipments into stock.',
    category: 'inventory',
    categoryLabel: 'Inventory & Stock Control',
    riskLevel: 'medium',
  },
  {
    key: 'stockTransfers',
    label: 'Inter-Branch Stock Transfers',
    description: 'Initiate and receive inventory stock transfers between store locations.',
    category: 'inventory',
    categoryLabel: 'Inventory & Stock Control',
    riskLevel: 'medium',
  },

  // Shifts
  {
    key: 'openShift',
    label: 'Open Register Shift',
    description: 'Open a new till shift, record opening cash float, and assign cashier drawer.',
    category: 'shifts',
    categoryLabel: 'Shifts & Till Reconciliation',
    riskLevel: 'low',
  },
  {
    key: 'closeShiftReconciliation',
    label: 'Close Shift & Cash Audit',
    description: 'Perform blind till cash counts, record drawer drops, and close active cashier shift.',
    category: 'shifts',
    categoryLabel: 'Shifts & Till Reconciliation',
    riskLevel: 'medium',
  },
  {
    key: 'viewShiftTotals',
    label: 'Live Drawer Totals Before Close',
    description: 'View expected cash, M-Pesa totals, and current till balance prior to closing cash audit.',
    category: 'shifts',
    categoryLabel: 'Shifts & Till Reconciliation',
    badge: 'Shrinkage Shield',
    riskLevel: 'medium',
  },

  // Customers
  {
    key: 'viewCustomers',
    label: 'View Customer Directory',
    description: 'Look up customer profiles, phone numbers, total spend, and purchase history.',
    category: 'customers',
    categoryLabel: 'Customers & Store Credit',
    riskLevel: 'low',
  },
  {
    key: 'manageCustomers',
    label: 'Create & Edit Customers',
    description: 'Register new customers, edit names, phone numbers, and KRA Tax PINs.',
    category: 'customers',
    categoryLabel: 'Customers & Store Credit',
    riskLevel: 'low',
  },
  {
    key: 'manageStoreCredit',
    label: 'Approve Store Credit ("Daftari")',
    description: 'Approve sales on store credit / ledger tab and record credit repayments.',
    category: 'customers',
    categoryLabel: 'Customers & Store Credit',
    badge: 'Debt Risk',
    riskLevel: 'high',
  },
  {
    key: 'manageLoyalty',
    label: 'Redeem Loyalty Points',
    description: 'Redeem customer loyalty points for discounts during checkout.',
    category: 'customers',
    categoryLabel: 'Customers & Store Credit',
    riskLevel: 'low',
  },

  // Reports
  {
    key: 'viewReports',
    label: 'View End-of-Day Sales Reports',
    description: 'Access daily sales totals, eTIMS tax summary reports, category breakdowns, and audit slips.',
    category: 'reports',
    categoryLabel: 'Reports & Analytics',
    riskLevel: 'medium',
  },
  {
    key: 'viewAnalytics',
    label: 'View Executive Analytics & Margins',
    description: 'Access sales revenue trends, peak trading hours, profit margins, and inventory velocity.',
    category: 'reports',
    categoryLabel: 'Reports & Analytics',
    badge: 'Owner Insights',
    riskLevel: 'high',
  },
  {
    key: 'exportReports',
    label: 'Export Accounting CSV & PDF',
    description: 'Download raw financial transactions, audit logs, and tax data for accountants.',
    category: 'reports',
    categoryLabel: 'Reports & Analytics',
    riskLevel: 'medium',
  },

  // Administration
  {
    key: 'manageStaff',
    label: 'Manage Staff Accounts & PINs',
    description: 'Create system users, assign login usernames, and update 4-digit staff PINs.',
    category: 'admin',
    categoryLabel: 'Store Administration',
    badge: 'Admin Only',
    riskLevel: 'high',
  },
  {
    key: 'manageStoreSettings',
    label: 'Edit Store Settings & Tax',
    description: 'Update business profile, branch locations, receipt headers, and KRA eTIMS tax PIN.',
    category: 'admin',
    categoryLabel: 'Store Administration',
    badge: 'Admin Only',
    riskLevel: 'high',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  manager: {
    sell: true,
    applyDiscounts: true,
    voidTransactions: true,
    processRefunds: true,
    openCashDrawer: true,
    customItemEntry: true,
    viewInventory: true,
    manageInventory: true,
    viewCostPrice: true,
    manageSuppliers: true,
    stockTransfers: true,
    openShift: true,
    closeShiftReconciliation: true,
    viewShiftTotals: true,
    viewCustomers: true,
    manageCustomers: true,
    manageStoreCredit: true,
    manageLoyalty: true,
    viewReports: true,
    viewAnalytics: true,
    exportReports: true,
    manageStaff: true,
    manageStoreSettings: false,
  },
  supervisor: {
    sell: true,
    applyDiscounts: true,
    voidTransactions: true,
    processRefunds: true,
    openCashDrawer: true,
    customItemEntry: true,
    viewInventory: true,
    manageInventory: false,
    viewCostPrice: false,
    manageSuppliers: false,
    stockTransfers: true,
    openShift: true,
    closeShiftReconciliation: true,
    viewShiftTotals: true,
    viewCustomers: true,
    manageCustomers: true,
    manageStoreCredit: true,
    manageLoyalty: true,
    viewReports: true,
    viewAnalytics: false,
    exportReports: false,
    manageStaff: false,
    manageStoreSettings: false,
  },
  cashier: {
    sell: true,
    applyDiscounts: false,
    voidTransactions: false,
    processRefunds: false,
    openCashDrawer: false,
    customItemEntry: false,
    viewInventory: true,
    manageInventory: false,
    viewCostPrice: false,
    manageSuppliers: false,
    stockTransfers: false,
    openShift: true,
    closeShiftReconciliation: true,
    viewShiftTotals: false,
    viewCustomers: true,
    manageCustomers: true,
    manageStoreCredit: false,
    manageLoyalty: true,
    viewReports: false,
    viewAnalytics: false,
    exportReports: false,
    manageStaff: false,
    manageStoreSettings: false,
  },
  inventory_clerk: {
    sell: false,
    applyDiscounts: false,
    voidTransactions: false,
    processRefunds: false,
    openCashDrawer: false,
    customItemEntry: false,
    viewInventory: true,
    manageInventory: true,
    viewCostPrice: true,
    manageSuppliers: true,
    stockTransfers: true,
    openShift: false,
    closeShiftReconciliation: false,
    viewShiftTotals: false,
    viewCustomers: false,
    manageCustomers: false,
    manageStoreCredit: false,
    manageLoyalty: false,
    viewReports: false,
    viewAnalytics: false,
    exportReports: false,
    manageStaff: false,
    manageStoreSettings: false,
  },
};

export const ROLE_CONFIG_META: Record<
  ConfigurableStaffRole,
  { label: string; alias: string; color: string; badgeBg: string; description: string }
> = {
  manager: {
    label: 'Store Manager',
    alias: 'Full Floor Authority',
    color: 'text-purple-700 border-purple-200 bg-purple-50',
    badgeBg: 'bg-purple-600 text-white',
    description: 'Branch leadership with operational, reporting, and staff oversight privileges.',
  },
  supervisor: {
    label: 'Supervisor',
    alias: 'Floor Override Authority',
    color: 'text-blue-700 border-blue-200 bg-blue-50',
    badgeBg: 'bg-blue-600 text-white',
    description: 'Authorizes cashier overrides for discounts, voids, and shift reconciliations.',
  },
  cashier: {
    label: 'Cashier',
    alias: 'Front-Line Till Operator',
    color: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    badgeBg: 'bg-emerald-600 text-white',
    description: 'Point-of-sale operator responsible for ringing up sales and receiving payments.',
  },
  inventory_clerk: {
    label: 'Inventory Clerk',
    alias: 'Stockroom & Warehouse',
    color: 'text-amber-700 border-amber-200 bg-amber-50',
    badgeBg: 'bg-amber-600 text-white',
    description: 'Manages receiving stock, purchase orders, counting, and barcode audits.',
  },
};
