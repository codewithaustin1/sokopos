export type PaymentMethod = 'mpesa' | 'cash' | 'card' | 'split';

export type UserRole =
  | 'super_admin'
  | 'business_owner'
  | 'manager'
  | 'cashier'
  | 'inventory_clerk';

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
  cashierId: string;
  cashierName: string;
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
  receiptNumber: string;
  timestamp: string;
  locationId: string;
  locationName: string;
  terminalName: string;
  cashierId: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentDetails: {
    mpesaPhone?: string;
    mpesaCode?: string;
    cashTendered?: number;
    cashChange?: number;
    cardLast4?: string;
    cardNetwork?: string;
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
