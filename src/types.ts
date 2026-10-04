export type PaymentMethod = 'mpesa' | 'cash' | 'card' | 'split' | 'store_credit';

export interface CustomerCreditLedgerEntry {
  id: string;
  timestamp: string;
  type: 'sale_credit' | 'payment_received' | 'adjustment' | 'refund_credit';
  amount: number; // positive = credit added / payment received; negative = charged to credit tab
  balanceAfter: number;
  referenceId?: string; // transactionId or receiptNumber
  notes?: string;
  recordedByCashierId?: string;
  recordedByCashierName?: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string; // primary unique identifier (+254 7XX...)
  email?: string;
  address?: string;
  notes?: string;
  tags?: string[]; // e.g. ["VIP", "Wholesale", "Regular", "Credit Account"]
  loyaltyPoints: number; // loyalty points earned (e.g. 1 pt per KES 100 spent)
  storeCreditBalance: number; // Current balance (positive = store credit in customer's favor; negative = debt owed by customer)
  creditLimit: number; // Max debt allowed (e.g. 15,000 KES)
  isCreditAllowed: boolean; // Flag if customer is authorized to buy on store credit / "daftari"
  totalSpent: number; // Lifetime total spend in KES
  visitCount: number; // Total transactions
  firstVisitAt: string;
  lastVisitAt: string;
  ledger?: CustomerCreditLedgerEntry[];
  createdAt: string;
  updatedAt?: string;
  isPendingCloudSync?: boolean;
}

export type UserRole =
  | 'super_admin'
  | 'business_owner'
  | 'manager'
  | 'cashier'
  | 'inventory_clerk';

export interface BusinessHardwareSettings {
  autoPrintReceipt?: boolean;
  receiptFormat?: '80mm' | '58mm' | 'standard';
  printerHeaderNote?: string;
  printerFooterNote?: string;
  updatedAt?: string;
}

export interface PlatformSettings {
  id?: string;
  loginBgGraphic?: string | null;
  loginBgGraphicName?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type RetailTheme = 'classic' | 'emerald' | 'amber' | 'burgundy' | 'industrial';

export type TaxScope = 'all' | 'category' | 'region';

export interface TaxRule {
  id: string;
  name: string; // e.g. "Standard 16% VAT", "Zero-Rated Food Staples", "Coast Free Trade Zone"
  code: string; // e.g. "A", "B", "C", "VAT-16", "ZERO", "EXEMPT"
  rate: number; // e.g. 0.16 for 16%, 0 for zero-rated, 0.08 for 8%
  scope: TaxScope;
  targetCategory?: string; // e.g. "Flour & Grains", "Fresh Produce"
  targetLocationId?: string; // e.g. "loc-cbd", "loc-westlands"
  isDefault?: boolean;
  isActive: boolean;
  description?: string;
}

export interface BusinessTaxSettings {
  taxLabel: string; // "VAT", "GST", "Sales Tax"
  defaultTaxRate: number; // e.g. 0.16
  taxNumber: string; // Tax PIN / VAT Reg #
  pricingType: 'inclusive' | 'exclusive'; // Tax included in shelf price vs added at register
  enableDynamicCategoryTax: boolean;
  enableDynamicRegionalTax: boolean;
  rules: TaxRule[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface TaxBreakdownEntry {
  code: string;
  name: string;
  rate: number;
  ratePercent: number;
  taxableAmount: number;
  taxAmount: number;
  grossAmount: number;
  itemCount: number;
  items?: Array<{
    productName: string;
    quantity: number;
    subtotal: number;
  }>;
}

export interface Business {
  id: string;
  name: string;
  code: string;
  ownerEmail: string; // Google Account email
  ownerName: string;
  createdAt: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended';
  currency: string;
  taxNumber: string;
  hardwareSettings?: BusinessHardwareSettings;
  retailTheme?: RetailTheme;
  taxSettings?: BusinessTaxSettings;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  authProvider: 'google' | 'credentials' | 'firebase';
  role: UserRole;
  businessId: string | null; // null for platform super-admin
  businessName?: string;
  username?: string;
  pin?: string;
  assignedLocationId?: string;
  createdAt: string;
  // Firebase Auth Token & Session Information
  idToken?: string;
  firebaseUid?: string;
  tokenExpiresAt?: number;
  sessionStatus?: 'verified' | 'cached' | 'guest';
}

export interface Location {
  id: string;
  businessId: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  taxId: string;
  currency: string;
  isOnline: boolean;
  lastSynced: string;
  terminalName: string;
  isPendingCloudSync?: boolean;
  mpesaType?: 'buy_goods' | 'paybill';
  mpesaTill?: string;
  mpesaPaybill?: string;
  mpesaAccount?: string;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  isPendingCloudSync?: boolean;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  buyingPrice: number;
  sellingPrice: number;
  unit: string;
  taxRate: number; // e.g. 0.16 for 16%
  stockByLocation: Record<string, number>; // locationId -> count
  reorderPoint: number;
  description?: string;
  isPendingCloudSync?: boolean;
}

export interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  unitPrice: number;
  quantity: number;
  discountPercent: number;
  discountAmount?: number; // Flat discount amount in currency
  discountType?: 'percentage' | 'flat';
  discountReason?: string;
  discountAuthorizedBy?: string;
  authorizingSupervisorId?: string;
  authorizingSupervisorName?: string;
  authorizingSupervisorRole?: string;
  performingOperatorId?: string;
  performingOperatorName?: string;
  taxRate: number;
}

export interface RefundItem {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  refundUnitAmount: number;
  refundTotalAmount: number;
  restockToInventory: boolean;
  restockLocationId: string;
  reason: string;
}

export interface RefundRecord {
  id: string;
  refundNumber: string;
  transactionId: string;
  receiptNumber: string;
  timestamp: string;
  shiftId?: string;
  cashierId: string; // Performing operator
  cashierName: string; // Performing operator
  authorizingSupervisorId?: string; // Distinct audit field
  authorizingSupervisorName?: string; // Distinct audit field
  authorizingSupervisorRole?: string;
  isSupervisorOverride?: boolean;
  supervisorOverrideReason?: string;
  locationId: string;
  locationName: string;
  refundMethod: 'original' | 'cash' | 'mpesa' | 'card' | 'store_credit';
  refundReason: string;
  refundNote?: string;
  items: RefundItem[];
  subtotalRefund: number;
  taxRefund: number;
  totalRefund: number;
  customerName?: string;
  customerPhone?: string;
}

export interface Transaction {
  id: string;
  businessId: string;
  shiftId?: string;
  receiptNumber: string;
  timestamp: string;
  locationId: string;
  locationName: string;
  terminalName: string;
  cashierId: string; // Performing operator
  cashierName: string; // Performing operator
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  storeCreditUsed?: number;
  newStoreCreditBalance?: number;
  authorizingSupervisorId?: string; // Distinct audit field if override occurred
  authorizingSupervisorName?: string; // Distinct audit field if override occurred
  overrideType?: 'discount' | 'refund' | 'void';
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  taxLabel?: string;
  taxBreakdown?: TaxBreakdownEntry[];
  pricingType?: 'inclusive' | 'exclusive';
  discountAmount: number;
  total: number;
  rawTotal?: number;
  roundingAmount?: number;
  paymentMethod: PaymentMethod;
  paymentDetails: {
    mpesaPhone?: string;
    mpesaCode?: string;
    cashTendered?: number;
    cashChange?: number;
    cardLast4?: string;
    cardNetwork?: string;
    roundingDifference?: number;
    notes?: string;
  };
  status: 'completed' | 'refunded' | 'partially_refunded';
  refunds?: RefundRecord[];
  totalRefunded?: number;
  syncedToCloud: boolean;
  syncTimestamp?: string;
}

export interface Cashier {
  id: string;
  businessId: string;
  name: string;
  initials: string;
  code: string;
  pin: string; // Stores cryptographic Bcrypt hash ($2b$10$...)
  username?: string;
  role: 'business_owner' | 'manager' | 'cashier' | 'supervisor' | 'inventory_clerk';
  avatarColor: string;
  shiftStartedAt: string;
  assignedLocationId?: string;
  isPendingCloudSync?: boolean;
  canApplyDiscount?: boolean; // Permission to apply discounts without manager override
  maxDiscountPercent?: number; // Optional limit (e.g. max 15%)
  maxDiscountAmount?: number; // Optional flat limit (e.g. max KES 100)
}

export interface SyncLogEvent {
  id: string;
  businessId: string;
  timestamp: string;
  locationId: string;
  locationName: string;
  type: 'sale_sync' | 'stock_adjustment' | 'branch_transfer' | 'catalog_sync' | 'heartbeat' | 'refund_sync';
  recordsAffected: number;
  status: 'success' | 'queued' | 'syncing';
  details: string;
}

export interface StockTransfer {
  id: string;
  businessId: string;
  timestamp: string;
  productId: string;
  productName: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  initiatedBy: string;
  status: 'in_transit' | 'completed';
}

export interface SuperAdminAuditEntry {
  id: string;
  timestamp: string;
  adminEmail: string;
  businessId: string;
  businessName: string;
  action: 'create' | 'update' | 'delete' | 'switch_tenant' | 'provision_business';
  recordType: 'product' | 'transaction' | 'user' | 'location' | 'business' | 'stock';
  recordId: string;
  description: string;
  beforeValue: unknown;
  afterValue: unknown;
}

export interface DestructiveActionRequest {
  id: string;
  title: string;
  description: string;
  warningNote: string;
  recordType: string;
  recordId: string;
  businessId: string;
  onConfirm: () => void;
}

export interface StoreSalesBackup {
  id: string;
  businessId: string;
  businessName: string;
  createdAt: string;
  purgedByEmail: string;
  purgedByName: string;
  purgedByRole: string;
  transactionCount: number;
  grossSales: number;
  totalRefunded: number;
  netSales: number;
  currency: string;
  transactions: Transaction[];
  metadata?: {
    systemVersion?: string;
    reason?: string;
    timestamp?: number;
  };
}

export type ExpenseCategory =
  | 'supplies'
  | 'logistics'
  | 'meals'
  | 'utilities'
  | 'repairs'
  | 'inventory_cod'
  | 'other';

export interface ShiftExpense {
  id: string;
  shiftId: string;
  businessId: string;
  locationId: string;
  timestamp: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  payee: string;
  approvedBy: string;
  cashierId: string;
  cashierName: string;
  receiptRef?: string;
}

export interface CashDrop {
  id: string;
  shiftId: string;
  businessId: string;
  locationId: string;
  timestamp: string;
  amount: number;
  reason: string;
  cashierId: string;
  cashierName: string;
  authorizedBy: string;
  envelopeNumber?: string;
}

export interface ShiftSession {
  id: string;
  shiftNumber: string;
  businessId: string;
  locationId: string;
  locationName: string;
  terminalName: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  openingFloat: number;
  openingFloatDenominations?: Record<string, number>;
  openingNotes?: string;
  status: 'open' | 'closed' | 'interrupted';
  interruptedAt?: string;
  interruptionReason?: 'timeout' | 'admin_action' | 'system_restart';
  interruptedByAdminEmail?: string;
  interruptionNote?: string;
  closedAt?: string;
  closedByCashierId?: string;
  closedByCashierName?: string;
  closingCountedCash?: number;
  closingDenominations?: Record<string, number>;
  expectedCash?: number;
  cashVariance?: number; // closingCountedCash - expectedCash (negative = short, positive = over)
  closingNotes?: string;
  handoverToCashierId?: string;
  handoverToCashierName?: string;
  cashDrops: CashDrop[];
  expenses: ShiftExpense[];
  cashSales: number;
  cashRefunds: number;
  mpesaSales: number;
  cardSales: number;
  totalSales: number;
  transactionCount: number;
  isPendingCloudSync?: boolean;
}

export interface VoidRecord {
  id: string;
  timestamp: string;
  businessId: string;
  locationId: string;
  locationName: string;
  shiftId?: string;
  voidType: 'line_item' | 'cart_void';
  performingOperatorId: string;
  performingOperatorName: string;
  performingOperatorRole: string;
  authorizingSupervisorId?: string;
  authorizingSupervisorName?: string;
  authorizingSupervisorRole?: string;
  reason: string;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totalVoidAmount: number;
}

export interface SupervisorOverrideAuditEntry {
  id: string;
  businessId: string;
  timestamp: string;
  locationId: string;
  locationName: string;
  shiftId?: string;
  overrideType: 'discount' | 'refund' | 'void';
  performingOperatorId: string;
  performingOperatorName: string;
  performingOperatorRole: string;
  authorizingSupervisorId: string;
  authorizingSupervisorName: string;
  authorizingSupervisorRole: string;
  transactionId?: string;
  receiptNumber?: string;
  refundNumber?: string;
  reason: string;
  details: {
    amount?: number;
    originalAmount?: number;
    discountPercent?: number;
    discountType?: 'percentage' | 'flat';
    productId?: string;
    productName?: string;
    items?: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }>;
    notes?: string;
  };
}

export type AdminActivityCategory =
  | 'catalog'
  | 'inventory'
  | 'staff'
  | 'business_settings'
  | 'branch'
  | 'security'
  | 'data_management'
  | 'customer'
  | 'tenant';

export interface AdminActivityEntry {
  id: string;
  businessId: string;
  businessName: string;
  timestamp: string;
  category: AdminActivityCategory;
  action: string;
  description: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  adminRole: string;
  recordType: string;
  recordId: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  isAdministrative: true;
}
