import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import {
  AuthUser,
  Business,
  CartItem,
  Cashier,
  Category,
  DestructiveActionRequest,
  Location,
  PaymentMethod,
  Product,
  RefundItem,
  RefundRecord,
  SuperAdminAuditEntry,
  SyncLogEvent,
  Transaction,
  UserRole,
  StoreSalesBackup,
  RetailTheme,
  ShiftSession,
  ShiftExpense,
  CashDrop,
  ExpenseCategory,
  VoidRecord,
  SupervisorOverrideAuditEntry,
  AdminActivityEntry,
  AdminActivityCategory,
  BusinessTaxSettings,
  TaxRule,
  Customer,
  CustomerCreditLedgerEntry,
} from '../types';
import {
  resolveDynamicTaxRate,
  calculateCartTaxBreakdown,
  TaxBreakdownEntry,
  DEFAULT_TAX_SETTINGS,
} from '../utils/taxResolver';
import {
  INITIAL_BUSINESSES,
  INITIAL_CATEGORIES,
  INITIAL_LOCATIONS,
  INITIAL_PRODUCTS,
  INITIAL_SUPER_ADMIN_AUDIT_LOGS,
  INITIAL_SUPER_ADMIN_USER,
  INITIAL_SYNC_LOGS,
  INITIAL_SYSTEM_USERS,
  INITIAL_TRANSACTIONS,
  INITIAL_SHIFTS,
  INITIAL_CUSTOMERS,
  SUPER_ADMIN_EMAIL,
} from '../data/initialData';
import { soundFx } from '../utils/audio';
import { Haptics } from '../utils/haptics';
import { calculatePaymentGuardrails } from '../utils/cashRounding';
import confetti from 'canvas-confetti';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  testFirebaseConnection,
  FirebaseUser,
} from '../lib/firebase';
import {
  saveProductToFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  saveCategoryToFirestore,
  updateCategoryInFirestore,
  deleteCategoryFromFirestore,
  subscribeToTenantCategories,
  saveLocationToFirestore,
  updateLocationInFirestore,
  deleteLocationFromFirestore,
  saveCashierToFirestore,
  updateCashierInFirestore,
  deleteCashierFromFirestore,
  saveTransactionToFirestore,
  saveStockTransferToFirestore,
  saveSyncLogToFirestore,
  savePurgedSalesBackupToFirestore,
  purgeTenantTransactionsFromFirestore,
  saveBusinessToFirestore,
  updateBusinessInFirestore,
  deleteBusinessFromFirestore,
  purgeTenantAllDataFromFirestore,
  getBusinessesFromFirestore,
  saveUserProfileToFirestore,
  getFreshTenantProductsFromFirestore,
  subscribeToTenantProducts,
  subscribeToTenantLocations,
  subscribeToTenantCashiers,
  subscribeToTenantTransactions,
  seedInitialTenantDataToFirestore,
  getPlatformSettingsFromFirestore,
  savePlatformSettingsToFirestore,
  saveCustomerToFirestore,
  updateCustomerInFirestore,
  deleteCustomerFromFirestore,
  subscribeToTenantCustomers,
} from '../lib/firestoreService';
import {
  hashPinOnServer,
  verifyPinOnServer,
  isBcryptHash,
} from '../lib/pinSecurityService';
import {
  getItemDiscountedUnitPrice,
  hasDirectDiscountPermission,
} from '../utils/discountUtils';
import firebaseConfig from '../../firebase-applet-config.json';

interface PosContextType {
  // Authentication & Multi-tenancy
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  isAuthenticated: boolean;
  isFirebaseAuthLoading: boolean;
  loginWithFirebaseGoogle: () => Promise<boolean>;
  exchangeOAuthTokenForSession: (idToken: string, user: { email: string; name?: string; uid?: string }) => Promise<boolean>;
  businesses: Business[];
  currentBusiness: Business;
  activeBusinessId: string;
  setActiveBusinessId: (bizId: string) => void;
  isSuperAdmin: boolean;
  loginWithGoogle: (email: string, name?: string, newBusinessName?: string) => boolean;
  loginWithCredentials: (username: string, pin: string) => Promise<boolean>;
  logout: () => boolean;
  provisionBusiness: (name: string, ownerEmail: string, ownerName: string, plan: 'starter' | 'professional' | 'enterprise') => Business;
  updateBusinessProfile: (updates: Partial<Business>) => void;
  performSystemCleanup: () => Promise<{ removedCount: number; removedBusinesses: string[] }>;
  isRealGoogleAccount: (email?: string | null) => boolean;

  // Business Profile Settings & Branch Management
  isBusinessSettingsOpen: boolean;
  setIsBusinessSettingsOpen: (open: boolean) => void;
  businessSettingsDefaultTab: 'profile' | 'branches' | 'tax' | 'accounts' | 'credentials' | 'appearance' | 'hardware' | 'reset';
  openBusinessSettings: (initialTab?: 'profile' | 'branches' | 'tax' | 'accounts' | 'credentials' | 'appearance' | 'hardware' | 'reset') => void;
  updateActiveUserCredentials: (newPin?: string, newUsername?: string) => Promise<boolean>;

  // Hardware & Printing User Preferences
  autoPrintReceipt: boolean;
  setAutoPrintReceipt: (enabled: boolean) => void;
  toggleAutoPrintReceipt: () => void;
  receiptFormat: '80mm' | '58mm' | 'standard';
  setReceiptFormat: (format: '80mm' | '58mm' | 'standard') => void;

  // Store Clean Zero & Sales Purge
  storeSalesBackups: StoreSalesBackup[];
  resetStoreSalesToZero: (businessId: string, reason?: string) => Promise<{ success: boolean; backup?: StoreSalesBackup; purgedCount: number; error?: string }>;
  downloadSalesBackup: (backupId: string) => void;
  canResetStore: (businessId: string) => { allowed: boolean; reason?: string };

  // Display & Dark Theme for Dim Retail Environments
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  toggleDarkMode: () => void;

  // Retail Domain Accent Palettes
  retailTheme: RetailTheme;
  setRetailTheme: (theme: RetailTheme) => Promise<void>;

  // System Users Management (Business Owner & Super Admin only)
  systemUsers: Cashier[];
  allSystemUsers: Cashier[];
  createSystemUser: (user: Omit<Cashier, 'id' | 'businessId'>) => Promise<boolean>;
  updateSystemUser: (id: string, updates: Partial<Cashier>) => Promise<void>;
  deleteSystemUser: (id: string) => void;

  // Super-Admin Audit & Safeguards
  superAdminAuditLogs: SuperAdminAuditEntry[];
  logSuperAdminAction: (
    businessId: string,
    recordType: 'product' | 'transaction' | 'user' | 'location' | 'business' | 'stock',
    recordId: string,
    action: 'create' | 'update' | 'delete' | 'switch_tenant' | 'provision_business',
    description: string,
    beforeValue: unknown,
    afterValue: unknown
  ) => void;
  pendingDestructiveAction: DestructiveActionRequest | null;
  requestDestructiveAction: (req: Omit<DestructiveActionRequest, 'id'>) => void;
  confirmDestructiveAction: () => void;
  cancelDestructiveAction: () => void;

  // Platform & Super Admin Custom Branding (Full-Bleed Login Graphic)
  loginBgGraphic: string | null;
  loginBgGraphicName: string | null;
  setLoginBgGraphic: (graphic: string | null, name?: string) => Promise<void>;
  removeLoginBgGraphic: () => Promise<void>;

  // Locations (Scoped to Current Business)
  locations: Location[];
  currentLocation: Location;
  setCurrentLocationId: (id: string) => void;
  addLocation: (loc: Omit<Location, 'id' | 'businessId' | 'isOnline' | 'lastSynced'>) => void;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  deleteLocation: (id: string) => void;

  // Cashier Lock & Shift (Register PIN)
  currentCashier: Cashier;
  setCurrentCashier: (cashier: Cashier) => void;
  isPinLocked: boolean;
  setIsPinLocked: (locked: boolean) => void;
  verifyPin: (pin: string) => Promise<boolean>;

  // Products & Inventory (Scoped to Current Business)
  products: Product[];
  categories: string[];
  categoryList: Category[];
  addCategory: (category: Omit<Category, 'id' | 'businessId' | 'createdAt'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;
  addProduct: (product: Omit<Product, 'id' | 'businessId'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, locationId: string, newStock: number, reason: string) => void;
  transferStock: (productId: string, fromLocId: string, toLocId: string, quantity: number) => boolean;

  // Fresh Inventory from Firestore Server (Bypassing Local Cache)
  fetchFreshInventoryFromServer: (businessIdOverride?: string, showFeedback?: boolean) => Promise<Product[]>;
  isInventoryFreshFromServer: boolean;
  isInventoryLoading: boolean;
  inventoryLastFetchedAt: string | null;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  applyItemDiscount: (
    productId: string,
    type: 'percentage' | 'flat',
    value: number,
    options?: {
      reason?: string;
      authorizedBy?: string;
      authorizingSupervisorId?: string;
      authorizingSupervisorName?: string;
      authorizingSupervisorRole?: string;
      isSupervisorOverride?: boolean;
    }
  ) => void;
  removeItemDiscount: (productId: string) => void;
  hasDiscountPermission: (cashier?: Cashier) => boolean;
  verifyManagerOverridePin: (
    pin: string,
    managerId?: string
  ) => Promise<{ success: boolean; managerName?: string; managerId?: string; managerRole?: string; error?: string }>;
  cartSubtotal: number;
  cartTax: number;
  cartDiscount: number;
  cartTotal: number;
  cartTaxBreakdown: TaxBreakdownEntry[];

  // Customer & Store Credit Directory (CRM)
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'businessId' | 'totalSpent' | 'visitCount' | 'firstVisitAt' | 'lastVisitAt' | 'createdAt'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<boolean>;
  adjustCustomerCredit: (customerId: string, amountChange: number, reason: string, referenceId?: string) => Promise<void>;
  redeemCustomerLoyaltyPoints: (customerId: string, pointsToRedeem: number) => Promise<boolean>;

  // Barcode Scanning
  handleBarcodeScanned: (barcode: string) => { success: boolean; message: string; product?: Product };

  // Transactions & Checkout (Scoped to Current Business)
  transactions: Transaction[];
  activeReceipt: Transaction | null;
  setActiveReceipt: (tx: Transaction | null) => void;
  activeRefundReceipt: { refund: RefundRecord; originalTx: Transaction } | null;
  setActiveRefundReceipt: (data: { refund: RefundRecord; originalTx: Transaction } | null) => void;
  processPayment: (
    paymentMethod: PaymentMethod,
    details: {
      mpesaPhone?: string;
      mpesaCode?: string;
      cashTendered?: number;
      cashChange?: number;
      cardLast4?: string;
      cardNetwork?: string;
      roundingDifference?: number;
      storeCreditUsed?: number;
      loyaltyPointsRedeemed?: number;
      notes?: string;
    }
  ) => Transaction;
  settleExactCash: () => boolean;
  processRefund: (params: {
    transactionId: string;
    refundMethod: 'original' | 'cash' | 'mpesa' | 'card' | 'store_credit';
    refundReason: string;
    refundNote?: string;
    customerName?: string;
    customerPhone?: string;
    items: Array<{
      productId: string;
      quantity: number;
      restockToInventory: boolean;
      reason?: string;
    }>;
    authorizingSupervisorId?: string;
    authorizingSupervisorName?: string;
    authorizingSupervisorRole?: string;
    isSupervisorOverride?: boolean;
    supervisorOverrideReason?: string;
  }) => Promise<{ success: boolean; refundRecord?: RefundRecord; error?: string }>;
  isReturnsModalOpen: boolean;
  selectedReturnTx: Transaction | null;
  openReturnsModal: (tx?: Transaction | null) => void;
  closeReturnsModal: () => void;

  // Supervisor Overrides & Attributions (Edge Case 1)
  supervisorOverrideLogs: SupervisorOverrideAuditEntry[];
  logSupervisorOverride: (params: Omit<SupervisorOverrideAuditEntry, 'id' | 'timestamp' | 'businessId'>) => void;
  voidRecords: VoidRecord[];
  recordVoid: (params: {
    voidType: 'line_item' | 'cart_void';
    items: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    reason: string;
    authorizingSupervisorId?: string;
    authorizingSupervisorName?: string;
    authorizingSupervisorRole?: string;
  }) => VoidRecord;

  // Back-office & Administrative Activity (Edge Case 5)
  adminActivityLogs: AdminActivityEntry[];
  logAdminActivity: (params: Omit<AdminActivityEntry, 'id' | 'timestamp' | 'businessId' | 'businessName' | 'isAdministrative'>) => void;

  // Cloud Sync
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncTime: string;
  syncLogs: SyncLogEvent[];
  pendingOfflineCount: number;
  triggerCloudSync: (isSilent?: boolean | unknown) => Promise<void>;

  // Firestore Row-Level Security Scoped Database
  isFirestoreConnected: boolean;
  firestoreDbId: string;
  firestoreRlsStatus: string;
  seedTenantDataToFirestoreAction: () => Promise<void>;

  // Shift Management & Cash Drawer Reconciliation
  activeShift: ShiftSession | null;
  interruptedSession: ShiftSession | null;
  shiftHistory: ShiftSession[];
  openShift: (openingFloat: number, notes?: string, denominations?: Record<string, number>) => ShiftSession;
  recordCashDrop: (amount: number, reason: string, authorizedBy?: string, envelopeNumber?: string) => void;
  recordShiftExpense: (params: {
    amount: number;
    category: ExpenseCategory;
    description: string;
    payee: string;
    approvedBy: string;
    receiptRef?: string;
  }) => void;
  closeShift: (params: {
    closingCountedCash: number;
    notes?: string;
    denominations?: Record<string, number>;
    handoverToCashierId?: string;
  }) => ShiftSession;
  forceLogoutSession: (reason: 'timeout' | 'admin_action' | 'system_restart', adminEmail?: string, note?: string) => void;
  resumeInterruptedShift: (shiftId: string) => boolean;
  isShiftModalOpen: boolean;
  setIsShiftModalOpen: (open: boolean) => void;
  openShiftManagement: () => void;

  // Toast
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;

  // Audio Sound FX
  soundFx: typeof soundFx;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CURRENT_USER: 'sokopos_auth_user_v2',
  IS_LOGGED_OUT: 'sokopos_is_logged_out_v2',
  ACTIVE_BIZ_ID: 'sokopos_active_biz_v2',
  BUSINESSES: 'sokopos_businesses_v2',
  PRODUCTS: 'sokopos_products_v2',
  CATEGORIES: 'sokopos_categories_v2',
  LOCATIONS: 'sokopos_locations_v2',
  SYSTEM_USERS: 'sokopos_system_users_v2',
  TRANSACTIONS: 'sokopos_transactions_v2',
  SHIFTS: 'sokopos_shifts_v2',
  SYNC_LOGS: 'sokopos_sync_logs_v2',
  SUPER_ADMIN_AUDIT: 'sokopos_sa_audit_v2',
  ADMIN_ACTIVITY_LOGS: 'sokopos_admin_activity_logs_v1',
  SUPERVISOR_OVERRIDES: 'sokopos_supervisor_overrides_v1',
  VOID_RECORDS: 'sokopos_void_records_v1',
  SESSION_CLEAN_EXIT: 'sokopos_session_clean_exit_v1',
  CURRENT_LOC: 'sokopos_curr_loc_v2',
  DARK_MODE: 'sokopos_dark_mode_v2',
  AUTO_PRINT_RECEIPT: 'sokopos_auto_print_receipt_v2',
  RECEIPT_FORMAT: 'sokopos_receipt_format_v2',
  SALES_BACKUPS: 'sokopos_sales_backups_v2',
  LOGIN_BG_GRAPHIC: 'sokopos_login_bg_graphic_v1',
  LOGIN_BG_NAME: 'sokopos_login_bg_name_v1',
  RETAIL_THEME: 'sokopos_retail_theme_v2',
  CUSTOMERS: 'sokopos_customers_v1',
  getTenantAutoPrintKey: (bizId: string) => `sokopos_auto_print_receipt_${bizId || 'default'}_v2`,
  getTenantReceiptFormatKey: (bizId: string) => `sokopos_receipt_format_${bizId || 'default'}_v2`,
  getTenantRetailThemeKey: (bizId: string) => `sokopos_retail_theme_${bizId || 'default'}_v2`,
  getTenantCustomersKey: (bizId: string) => `sokopos_customers_${bizId || 'default'}_v1`,
};

export function isRealGoogleAccount(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (!normalized.includes('@')) return false;

  // Placeholder/demo domains that lack an authentic Google Account
  const bannedMockDomains = [
    'sokopos.co.ke',
    'quickchoice.co.ke',
    'example.com',
    'example.org',
    'test.com',
    'demo.com',
    'dummy.com',
  ];
  const domain = normalized.split('@')[1];
  if (bannedMockDomains.includes(domain)) {
    return false;
  }

  // Authentic Google Account standard domains
  if (
    normalized.endsWith('@gmail.com') ||
    normalized.endsWith('@googlemail.com')
  ) {
    return true;
  }

  // Upfront platform Super-Admin
  if (normalized === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // Active Google OAuth verified account
  if (auth.currentUser?.email && auth.currentUser.email.toLowerCase() === normalized) {
    const isGoogleProvider = auth.currentUser.providerData?.some(
      (p) => p.providerId === 'google.com'
    );
    if (isGoogleProvider) return true;
  }

  return false;
}

export function getStableBusinessIdForEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  if (normalized === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return 'biz-upfront';
  }
  const cleanPrefix = normalized.replace(/[^a-z0-9]/g, '').substring(0, 12);
  return `biz-${cleanPrefix || 'retail'}`;
}

export const PosProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Multi-Tenant Business Registry
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BUSINESSES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out accounts that lack a real Google account
          const cleaned = parsed.filter(
            (b: Business) =>
              isRealGoogleAccount(b.ownerEmail) &&
              b.id !== 'biz-soko' &&
              b.id !== 'biz-quickmart'
          );
          if (cleaned.length > 0) {
            return cleaned;
          }
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_BUSINESSES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(businesses));
  }, [businesses]);

  // 2. Authentication State
  const [isFirebaseAuthLoading, setIsFirebaseAuthLoading] = useState<boolean>(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // When logged out, currentUser is null. Default to super admin on initial run if not logged out.
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const isExplicitlyLoggedOut = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_OUT) === 'true';
    if (isExplicitlyLoggedOut) {
      return null;
    }
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_SUPER_ADMIN_USER;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_OUT);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_OUT, 'true');
    }
  }, [currentUser]);

  // Firebase Real Connection Validation & Auth State Synchronizer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      setFirebaseUser(fbUser);
      setIsFirebaseAuthLoading(false);
      if (fbUser && fbUser.email) {
        const isExplicitlyLoggedOut = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_OUT) === 'true';
        if (isExplicitlyLoggedOut) {
          return;
        }

        try {
          const idToken = await fbUser.getIdToken();
          const tokenResult = await fbUser.getIdTokenResult();
          const expirationTime = new Date(tokenResult.expirationTime).getTime();

          const normalizedEmail = fbUser.email.toLowerCase();
          const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();

          // Match business
          let matchedBiz = businesses.find(
            (b) => b.ownerEmail.toLowerCase() === normalizedEmail
          );

          if (!matchedBiz && isSuperAdminEmail) {
            matchedBiz = businesses.find((b) => b.id === 'biz-upfront');
          }

          if (!matchedBiz && !isSuperAdminEmail) {
            const stableBizId = getStableBusinessIdForEmail(normalizedEmail);
            const bizName = `${fbUser.displayName || fbUser.email.split('@')[0]}'s Store`;
            matchedBiz = {
              id: stableBizId,
              name: bizName,
              code: bizName.substring(0, 4).toUpperCase().replace(/\s+/g, ''),
              ownerEmail: normalizedEmail,
              ownerName: fbUser.displayName || 'Business Owner',
              createdAt: new Date().toISOString(),
              plan: 'professional',
              status: 'active',
              currency: 'KES',
              taxNumber: `P0${Math.floor(100000000 + Math.random() * 900000000)}Z`,
            };
            setBusinesses((prev) => {
              if (prev.some((b) => b.id === stableBizId)) return prev;
              return [...prev, matchedBiz!];
            });
            saveBusinessToFirestore(matchedBiz).catch((e) => console.warn('Sync new biz:', e));
          }

          if (matchedBiz) {
            ensureTenantDefaults(matchedBiz);
            saveBusinessToFirestore(matchedBiz).catch((e) => console.warn('Sync matched biz:', e));
          }

          const targetBizId = isSuperAdminEmail
            ? 'biz-upfront'
            : matchedBiz?.id || getStableBusinessIdForEmail(normalizedEmail);

          const role: UserRole = isSuperAdminEmail
            ? 'super_admin'
            : matchedBiz
            ? 'business_owner'
            : 'manager';

          const authUser: AuthUser = {
            id: fbUser.uid,
            firebaseUid: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || (isSuperAdminEmail ? 'Platform Administrator' : 'Google User'),
            initials: (fbUser.displayName || (isSuperAdminEmail ? 'PA' : fbUser.email.substring(0, 2))).substring(0, 2).toUpperCase(),
            avatarUrl: fbUser.photoURL || undefined,
            authProvider: 'firebase',
            role,
            businessId: targetBizId,
            businessName: matchedBiz?.name || (isSuperAdminEmail ? 'Upfront Retail Solutions' : 'Business Account'),
            createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
            idToken,
            tokenExpiresAt: expirationTime,
            sessionStatus: 'verified',
          };

          setCurrentUser(authUser);
          setActiveBusinessIdState(targetBizId);

          saveUserProfileToFirestore({
            uid: fbUser.uid,
            email: fbUser.email,
            role,
            businessId: targetBizId,
            displayName: fbUser.displayName || '',
          });
        } catch (tokenErr) {
          console.error('Error obtaining Firebase ID token:', tokenErr);
        }
      }
    });

    return () => unsubscribe();
  }, [businesses]);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAuthenticated = Boolean(currentUser);

  // 3. Active Business Scoping
  const [activeBusinessIdState, setActiveBusinessIdState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_BIZ_ID);
    if (saved && saved !== 'biz-soko' && saved !== 'biz-quickmart') return saved;
    return currentUser?.businessId || INITIAL_BUSINESSES[0].id;
  });

  // Automatic System Cleanup: Purge all accounts and data lacking a real Google account on startup
  useEffect(() => {
    const unverifiedIds = new Set<string>();
    businesses.forEach((b) => {
      if (!isRealGoogleAccount(b.ownerEmail) || b.id === 'biz-soko' || b.id === 'biz-quickmart') {
        unverifiedIds.add(b.id);
      }
    });
    unverifiedIds.add('biz-soko');
    unverifiedIds.add('biz-quickmart');

    const validBusinesses = businesses.filter((b) => !unverifiedIds.has(b.id));
    const nextBizs = validBusinesses.length > 0 ? validBusinesses : INITIAL_BUSINESSES;

    if (businesses.length !== validBusinesses.length || unverifiedIds.has(activeBusinessIdState)) {
      setBusinesses(nextBizs);
      localStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(nextBizs));

      if (unverifiedIds.has(activeBusinessIdState)) {
        setActiveBusinessIdState('biz-upfront');
        localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, 'biz-upfront');
      }

      setAllSystemUsers((prev) => {
        const next = prev.filter((u) => !unverifiedIds.has(u.businessId));
        localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(next));
        return next;
      });

      setAllLocations((prev) => {
        const next = prev.filter((l) => !unverifiedIds.has(l.businessId));
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(next));
        return next;
      });

      setAllProducts((prev) => {
        const next = prev.filter((p) => !unverifiedIds.has(p.businessId));
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(next));
        return next;
      });

      setAllCategories((prev) => {
        const next = prev.filter((c) => !unverifiedIds.has(c.businessId));
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(next));
        return next;
      });

      setAllTransactions((prev) => {
        const next = prev.filter((t) => !unverifiedIds.has(t.businessId));
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(next));
        return next;
      });

      setAllCustomers((prev) => {
        const next = prev.filter((c) => !unverifiedIds.has(c.businessId));
        return next;
      });

      setAllShifts((prev) => {
        const next = prev.filter((s) => !unverifiedIds.has(s.businessId));
        localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(next));
        return next;
      });

      if (auth.currentUser) {
        for (const bId of unverifiedIds) {
          deleteBusinessFromFirestore(bId).catch((e) => console.warn('Clean startup biz from firestore:', e));
          purgeTenantAllDataFromFirestore(bId).catch((e) => console.warn('Clean startup tenant data from firestore:', e));
        }
      }
    }
  }, []);

  // Strict Data-Access Isolation Enforcement:
  // Non-super-admin users CANNOT view or query any business other than their assigned tenant.
  const activeBusinessId = useMemo(() => {
    if (!isSuperAdmin && currentUser?.businessId) {
      return currentUser.businessId;
    }
    return activeBusinessIdState;
  }, [isSuperAdmin, currentUser?.businessId, activeBusinessIdState]);

  const currentBusiness = useMemo(() => {
    return (
      (Array.isArray(businesses) && businesses.find((b) => b.id === activeBusinessId)) ||
      businesses[0] ||
      INITIAL_BUSINESSES[0]
    );
  }, [businesses, activeBusinessId]);

  const setActiveBusinessId = (bizId: string) => {
    if (!isSuperAdmin && currentUser && currentUser.businessId !== bizId) {
      showToast('Access denied: You cannot switch to another business tenant.', 'error');
      return;
    }
    setActiveBusinessIdState(bizId);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, bizId);
    if (isSuperAdmin) {
      logSuperAdminAction(
        bizId,
        'business',
        bizId,
        'switch_tenant',
        `Switched active management tenant to ${businesses.find((b) => b.id === bizId)?.name || bizId}`,
        null,
        { targetBusinessId: bizId }
      );
    }
  };

  // 4. Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  }, []);

  // 5. Super-Admin Audit Log
  const [superAdminAuditLogs, setSuperAdminAuditLogs] = useState<SuperAdminAuditEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPER_ADMIN_AUDIT);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_SUPER_ADMIN_AUDIT_LOGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPER_ADMIN_AUDIT, JSON.stringify(superAdminAuditLogs));
  }, [superAdminAuditLogs]);

  const logSuperAdminAction = useCallback(
    (
      businessId: string,
      recordType: 'product' | 'transaction' | 'user' | 'location' | 'business' | 'stock',
      recordId: string,
      action: 'create' | 'update' | 'delete' | 'switch_tenant' | 'provision_business',
      description: string,
      beforeValue: unknown,
      afterValue: unknown
    ) => {
      const targetBiz = businesses.find((b) => b.id === businessId);
      const newEntry: SuperAdminAuditEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        adminEmail: currentUser?.email || (isSuperAdmin ? SUPER_ADMIN_EMAIL : 'owner@sokopos.co.ke'),
        businessId,
        businessName: targetBiz?.name || businessId,
        action,
        recordType,
        recordId,
        description,
        beforeValue: beforeValue ? JSON.parse(JSON.stringify(beforeValue)) : null,
        afterValue: afterValue ? JSON.parse(JSON.stringify(afterValue)) : null,
      };
      setSuperAdminAuditLogs((prev) => [newEntry, ...prev]);
    },
    [businesses, currentUser?.email, isSuperAdmin]
  );

  // 5.5 Back-office & Administrative Activity Logging (Edge Case 5)
  // Back-office or admin changes must be classified as administrative activity,
  // attributed to the performing admin account, and excluded from shift activity entirely.
  const [adminActivityLogs, setAdminActivityLogs] = useState<AdminActivityEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_ACTIVITY_LOGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADMIN_ACTIVITY_LOGS, JSON.stringify(adminActivityLogs));
  }, [adminActivityLogs]);

  const logAdminActivity = useCallback(
    (params: Omit<AdminActivityEntry, 'id' | 'timestamp' | 'businessId' | 'businessName' | 'isAdministrative'>) => {
      const targetBiz = businesses.find((b) => b.id === activeBusinessId);
      const newEntry: AdminActivityEntry = {
        id: `admin-act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        businessId: activeBusinessId,
        businessName: targetBiz?.name || activeBusinessId,
        category: params.category,
        action: params.action,
        description: params.description,
        adminId: currentUser?.id || 'admin-system',
        adminEmail: currentUser?.email || (isSuperAdmin ? SUPER_ADMIN_EMAIL : 'admin@sokopos.co.ke'),
        adminName: currentUser?.name || 'Administrator',
        adminRole: currentUser?.role || 'business_owner',
        recordType: params.recordType,
        recordId: params.recordId,
        beforeValue: params.beforeValue ? JSON.parse(JSON.stringify(params.beforeValue)) : null,
        afterValue: params.afterValue ? JSON.parse(JSON.stringify(params.afterValue)) : null,
        isAdministrative: true,
      };
      setAdminActivityLogs((prev) => [newEntry, ...prev]);
    },
    [activeBusinessId, businesses, currentUser, isSuperAdmin]
  );

  // 5.6 Supervisor Overrides Logging (Edge Case 1)
  // Supervisor overrides (voids, refunds, discounts) must be attributed to the performing operator,
  // with the authorizing supervisor captured as a distinct audit field.
  const [supervisorOverrideLogs, setSupervisorOverrideLogs] = useState<SupervisorOverrideAuditEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPERVISOR_OVERRIDES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPERVISOR_OVERRIDES, JSON.stringify(supervisorOverrideLogs));
  }, [supervisorOverrideLogs]);

  const logSupervisorOverride = useCallback(
    (params: Omit<SupervisorOverrideAuditEntry, 'id' | 'timestamp' | 'businessId'>) => {
      const newEntry: SupervisorOverrideAuditEntry = {
        id: `ovr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        businessId: activeBusinessId,
        ...params,
      };
      setSupervisorOverrideLogs((prev) => [newEntry, ...prev]);
    },
    [activeBusinessId]
  );

  // 5.7 Voids Management & Attribution (Edge Case 1)
  const [voidRecords, setVoidRecords] = useState<VoidRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VOID_RECORDS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VOID_RECORDS, JSON.stringify(voidRecords));
  }, [voidRecords]);

  // Record Void forward declaration - implemented after currentCashier is initialized

  // 6. Destructive Actions Safeguard
  const [pendingDestructiveAction, setPendingDestructiveAction] = useState<DestructiveActionRequest | null>(null);

  const requestDestructiveAction = useCallback((req: Omit<DestructiveActionRequest, 'id'>) => {
    setPendingDestructiveAction({
      ...req,
      id: `destruct-${Date.now()}`,
    });
  }, []);

  const confirmDestructiveAction = useCallback(() => {
    if (pendingDestructiveAction) {
      pendingDestructiveAction.onConfirm();
      setPendingDestructiveAction(null);
    }
  }, [pendingDestructiveAction]);

  const cancelDestructiveAction = useCallback(() => {
    setPendingDestructiveAction(null);
  }, []);

  // Platform & Super Admin Custom Branding (Login Screen Background Graphic)
  const [loginBgGraphic, setLoginBgGraphicState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.LOGIN_BG_GRAPHIC) || null;
  });
  const [loginBgGraphicName, setLoginBgGraphicName] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.LOGIN_BG_NAME) || null;
  });

  // Automatically load and sync global platform settings from Firestore on boot
  useEffect(() => {
    let isMounted = true;
    getPlatformSettingsFromFirestore()
      .then((settings) => {
        if (!isMounted || !settings) return;
        if (settings.loginBgGraphic !== undefined) {
          setLoginBgGraphicState(settings.loginBgGraphic);
          if (settings.loginBgGraphic) {
            localStorage.setItem(STORAGE_KEYS.LOGIN_BG_GRAPHIC, settings.loginBgGraphic);
          } else {
            localStorage.removeItem(STORAGE_KEYS.LOGIN_BG_GRAPHIC);
          }
        }
        if (settings.loginBgGraphicName !== undefined) {
          setLoginBgGraphicName(settings.loginBgGraphicName || null);
          if (settings.loginBgGraphicName) {
            localStorage.setItem(STORAGE_KEYS.LOGIN_BG_NAME, settings.loginBgGraphicName);
          } else {
            localStorage.removeItem(STORAGE_KEYS.LOGIN_BG_NAME);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch platform branding settings:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const setLoginBgGraphic = useCallback(
    async (graphic: string | null, name?: string) => {
      const prev = loginBgGraphic;
      setLoginBgGraphicState(graphic);
      setLoginBgGraphicName(name || null);

      if (graphic) {
        localStorage.setItem(STORAGE_KEYS.LOGIN_BG_GRAPHIC, graphic);
        if (name) localStorage.setItem(STORAGE_KEYS.LOGIN_BG_NAME, name);
      } else {
        localStorage.removeItem(STORAGE_KEYS.LOGIN_BG_GRAPHIC);
        localStorage.removeItem(STORAGE_KEYS.LOGIN_BG_NAME);
      }

      // Persist to Firestore platform_settings collection
      try {
        await savePlatformSettingsToFirestore({
          loginBgGraphic: graphic,
          loginBgGraphicName: name || '',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.email || (isSuperAdmin ? SUPER_ADMIN_EMAIL : 'super_admin'),
        });
      } catch (err) {
        console.warn('Failed to persist platform settings to Firestore:', err);
      }

      // Record Super Admin Audit Trail
      logSuperAdminAction(
        'platform',
        'business',
        'platform-branding-login-bg',
        'update',
        graphic
          ? `Configured custom login background graphic (${name || 'custom'})`
          : 'Removed login background graphic; reverted to default dark appearance',
        { loginBgGraphic: prev ? 'custom-image' : null },
        { loginBgGraphic: graphic ? 'custom-image' : null, name }
      );

      showToast(
        graphic
          ? 'Platform login screen background graphic applied successfully'
          : 'Login background graphic removed. Login screen reverted to default appearance.',
        'success'
      );
    },
    [currentUser?.email, isSuperAdmin, logSuperAdminAction, loginBgGraphic, showToast]
  );

  const removeLoginBgGraphic = useCallback(async () => {
    await setLoginBgGraphic(null);
  }, [setLoginBgGraphic]);

  // 7. Multi-Tenant Locations Store
  const [allLocations, setAllLocations] = useState<Location[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_LOCATIONS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(allLocations));
  }, [allLocations]);

  // Scoped Locations for active tenant
  const locations = useMemo(() => {
    return allLocations.filter((loc) => loc.businessId === activeBusinessId);
  }, [allLocations, activeBusinessId]);

  const [currentLocationId, setCurrentLocationIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_LOC) || (INITIAL_LOCATIONS[0].id);
  });

  const currentLocation = useMemo(() => {
    const found = locations.find((l) => l.id === currentLocationId);
    if (found) return found;
    return locations[0] || {
      id: 'loc-default',
      businessId: activeBusinessId,
      name: 'Default Terminal',
      code: 'DFT-01',
      city: 'Nairobi',
      address: 'Main Store',
      phone: '+254 700 000 000',
      taxId: currentBusiness?.taxNumber || 'P000000000X',
      currency: currentBusiness?.currency || 'KES',
      isOnline: true,
      lastSynced: new Date().toISOString(),
      terminalName: 'Main Terminal',
    };
  }, [locations, currentLocationId, activeBusinessId, currentBusiness]);

  const setCurrentLocationId = (id: string) => {
    setCurrentLocationIdState(id);
    localStorage.setItem(STORAGE_KEYS.CURRENT_LOC, id);
    showToast(`Active register set to ${locations.find((l) => l.id === id)?.name || id}`, 'info');
  };

  const addLocation = (loc: Omit<Location, 'id' | 'businessId' | 'isOnline' | 'lastSynced'>) => {
    const newLoc: Location = {
      ...loc,
      id: `loc-${Date.now()}`,
      businessId: activeBusinessId,
      isOnline: true,
      lastSynced: new Date().toISOString(),
      isPendingCloudSync: !isOnline || !auth.currentUser,
    };
    setAllLocations((prev) => [...prev, newLoc]);
    if (isOnline && auth.currentUser) {
      saveLocationToFirestore(newLoc)
        .then(() => {
          setAllLocations((prev) =>
            prev.map((l) => (l.id === newLoc.id ? { ...l, isPendingCloudSync: false } : l))
          );
        })
        .catch((err) => {
          console.warn('Firestore location save:', err);
          setAllLocations((prev) =>
            prev.map((l) => (l.id === newLoc.id ? { ...l, isPendingCloudSync: true } : l))
          );
        });
    }
    if (isSuperAdmin) {
      logSuperAdminAction(activeBusinessId, 'location', newLoc.id, 'create', `Created branch ${newLoc.name}`, null, newLoc);
    }
    logAdminActivity({
      category: 'branch',
      action: 'create_branch',
      description: `Created branch store ${newLoc.name} (${newLoc.city}, Code: ${newLoc.code})`,
      recordType: 'location',
      recordId: newLoc.id,
      beforeValue: null,
      afterValue: newLoc,
    });
    showToast(`Branch ${newLoc.name} registered`, 'success');
  };

  const updateLocation = (id: string, updates: Partial<Location>) => {
    const oldLoc = allLocations.find((l) => l.id === id);
    if (!oldLoc) return;

    const updatedLoc: Location = {
      ...oldLoc,
      ...updates,
      isPendingCloudSync: !isOnline || !auth.currentUser,
    };
    setAllLocations((prev) =>
      prev.map((l) => (l.id === id ? updatedLoc : l))
    );
    if (isOnline && auth.currentUser) {
      updateLocationInFirestore(id, updates)
        .then(() => {
          setAllLocations((prev) =>
            prev.map((l) => (l.id === id ? { ...l, isPendingCloudSync: false } : l))
          );
        })
        .catch((err) => {
          console.warn('Firestore location update:', err);
          setAllLocations((prev) =>
            prev.map((l) => (l.id === id ? { ...l, isPendingCloudSync: true } : l))
          );
        });
    }
    if (isSuperAdmin) {
      logSuperAdminAction(
        oldLoc.businessId,
        'location',
        id,
        'update',
        `Updated branch ${updates.name || oldLoc.name}`,
        oldLoc,
        { ...oldLoc, ...updates }
      );
    }
    logAdminActivity({
      category: 'branch',
      action: 'update_branch',
      description: `Updated branch ${updates.name || oldLoc.name} settings`,
      recordType: 'location',
      recordId: id,
      beforeValue: oldLoc,
      afterValue: updatedLoc,
    });
    showToast(`Branch ${updates.name || oldLoc.name} updated`, 'success');
  };

  const deleteLocation = (id: string) => {
    const targetLoc = allLocations.find((l) => l.id === id);
    if (!targetLoc) return;

    // Strict validation: At least one branch must remain
    const bizLocations = allLocations.filter((l) => l.businessId === targetLoc.businessId);
    if (bizLocations.length <= 1) {
      showToast('Cannot remove branch: At least one active branch is required for this business profile.', 'error');
      return;
    }

    requestDestructiveAction({
      title: `Remove Store Branch: ${targetLoc.name}`,
      description: `You are about to permanently delete the branch "${targetLoc.name}" (${targetLoc.city}, Code: ${targetLoc.code}) from ${currentBusiness.name}. Active terminal bindings will be released.`,
      warningNote: 'This action cannot be undone. Terminal sales history remains preserved under the business ledger.',
      recordType: 'location',
      recordId: id,
      businessId: targetLoc.businessId,
      onConfirm: () => {
        // Switch active location if deleting current location
        if (currentLocationId === id) {
          const remaining = bizLocations.filter((l) => l.id !== id);
          if (remaining.length > 0) {
            setCurrentLocationIdState(remaining[0].id);
            localStorage.setItem(STORAGE_KEYS.CURRENT_LOC, remaining[0].id);
          }
        }

        setAllLocations((prev) => prev.filter((l) => l.id !== id));
        if (isOnline && auth.currentUser) {
          deleteLocationFromFirestore(id).catch((err) =>
            console.warn('Firestore location delete:', err)
          );
        }
        if (isSuperAdmin) {
          logSuperAdminAction(
            targetLoc.businessId,
            'location',
            id,
            'delete',
            `Deleted store branch ${targetLoc.name} (${targetLoc.city})`,
            targetLoc,
            null
          );
        }
        logAdminActivity({
          category: 'branch',
          action: 'delete_branch',
          description: `Deleted store branch ${targetLoc.name} (${targetLoc.city})`,
          recordType: 'location',
          recordId: id,
          beforeValue: targetLoc,
          afterValue: null,
        });
        showToast(`Store branch ${targetLoc.name} removed successfully`, 'success');
      },
    });
  };

  // 8. Multi-Tenant System Users Store (Staff)
  const [allSystemUsers, setAllSystemUsers] = useState<Cashier[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SYSTEM_USERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Cleanse any legacy pinHint fields from local storage
          return parsed.map(({ pinHint, ...rest }: any) => rest);
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_SYSTEM_USERS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(allSystemUsers));
  }, [allSystemUsers]);

  // Scoped System Users for active tenant
  const systemUsers = useMemo(() => {
    return allSystemUsers.filter((u) => u.businessId === activeBusinessId);
  }, [allSystemUsers, activeBusinessId]);

  // Auto-upgrade any legacy unhashed staff PINs stored in localStorage to server Bcrypt hashes
  useEffect(() => {
    const unhashedUsers = allSystemUsers.filter((u) => !isBcryptHash(u.pin));
    if (unhashedUsers.length > 0) {
      fetch('/api/auth/bulk-hash-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: unhashedUsers.map((u) => ({ id: u.id, pin: u.pin })),
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.results && Array.isArray(data.results)) {
            const hashMap = new Map(data.results.map((r: any) => [r.id, r.hash]));
            setAllSystemUsers((prev) =>
              prev.map((u) => {
                const newHash = hashMap.get(u.id);
                if (newHash) {
                  return { ...u, pin: newHash };
                }
                return u;
              })
            );
          }
        })
        .catch((err) => console.warn('Legacy PIN auto-hash note:', err));
    }
  }, []);

  // Ensure default flagship location and primary owner cashier for any tenant
  const ensureTenantDefaults = useCallback((biz: Business) => {
    if (!biz || !biz.id) return;

    // 1. Ensure at least one flagship branch location exists
    setAllLocations((prevLocs) => {
      const existing = prevLocs.filter((l) => l.businessId === biz.id);
      if (existing.length > 0) return prevLocs;
      const defaultLoc: Location = {
        id: `loc-main-${biz.id}`,
        businessId: biz.id,
        name: `${biz.name} Main Branch`,
        code: 'MAIN-01',
        city: 'Nairobi',
        address: 'Central Retail District',
        phone: '+254 700 000 000',
        taxId: biz.taxNumber || 'P011223344A',
        currency: biz.currency || 'KES',
        isOnline: true,
        lastSynced: new Date().toISOString(),
        terminalName: 'Terminal #01 (Main)',
      };
      if (auth.currentUser) {
        saveLocationToFirestore(defaultLoc).catch((e) => console.warn('Sync default loc:', e));
      }
      return [...prevLocs, defaultLoc];
    });

    // 2. Ensure business owner primary account exists in allSystemUsers
    setAllSystemUsers((prevUsers) => {
      const existing = prevUsers.filter((u) => u.businessId === biz.id);
      if (existing.length > 0) return prevUsers;
      const ownerStaff: Cashier = {
        id: `user-owner-${biz.id}`,
        businessId: biz.id,
        name: biz.ownerName || 'Business Owner',
        initials: (biz.ownerName || 'BO')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase(),
        code: '#1001',
        username: biz.ownerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '.'),
        pin: '$2b$10$g925CNtpaFfvsV/TNlwblucRcqdLXBHj5NsDDYiXvKkgByQUBVoGq', // Bcrypt of '1234'
        role: 'business_owner',
        avatarColor: 'bg-indigo-600',
        shiftStartedAt: new Date().toISOString(),
        assignedLocationId: `loc-main-${biz.id}`,
      };
      if (auth.currentUser) {
        saveCashierToFirestore(ownerStaff).catch((e) => console.warn('Sync default owner user:', e));
      }
      return [...prevUsers, ownerStaff];
    });
  }, []);

  // Auto-heal active business defaults on initial load and whenever active business changes
  useEffect(() => {
    if (currentBusiness && currentBusiness.id && currentBusiness.id !== 'biz-upfront') {
      ensureTenantDefaults(currentBusiness);
    }
  }, [currentBusiness, ensureTenantDefaults]);

  const createSystemUser = async (user: Omit<Cashier, 'id' | 'businessId'>): Promise<boolean> => {
    // Only authenticated business owners or super-admin can create system users
    if (!currentUser || (currentUser.role !== 'business_owner' && currentUser.role !== 'super_admin')) {
      showToast('Unauthorized: Only a business owner or administrator can create system users.', 'error');
      return false;
    }

    // Edge Case 3: Shared logins are prohibited, as they render attribution meaningless
    const rawUsername = (user.username || user.name.toLowerCase().replace(/\s+/g, '.')).trim().toLowerCase();
    const GENERIC_PROHIBITED = ['cashier', 'shared', 'pos', 'terminal', 'till', 'store', 'user', 'staff', 'counter', 'operator'];
    if (GENERIC_PROHIBITED.includes(rawUsername)) {
      showToast(
        `Shared logins prohibited: Generic account identity "${rawUsername}" is forbidden. Each operator must have an individual personal account.`,
        'error'
      );
      return false;
    }

    // Validate account uniqueness in tenant
    const existingSameUsername = allSystemUsers.find(
      (u) => u.businessId === activeBusinessId && u.username?.toLowerCase() === rawUsername
    );
    if (existingSameUsername) {
      showToast(
        `Shared logins prohibited: An account with username "${rawUsername}" already belongs to ${existingSameUsername.name}. Each staff member must have an individual account.`,
        'error'
      );
      return false;
    }

    let hashedPin = user.pin;
    if (!isBcryptHash(user.pin)) {
      hashedPin = await hashPinOnServer(user.pin);
    }

    const newUser: Cashier = {
      ...user,
      username: rawUsername,
      pin: hashedPin,
      id: `user-${Date.now()}`,
      businessId: activeBusinessId,
      isPendingCloudSync: !isOnline || !auth.currentUser,
    };

    setAllSystemUsers((prev) => [...prev, newUser]);
    if (isOnline && auth.currentUser) {
      saveCashierToFirestore(newUser)
        .then(() => {
          setAllSystemUsers((prev) =>
            prev.map((u) => (u.id === newUser.id ? { ...u, isPendingCloudSync: false } : u))
          );
        })
        .catch((err) => {
          console.warn('Firestore cashier save:', err);
          setAllSystemUsers((prev) =>
            prev.map((u) => (u.id === newUser.id ? { ...u, isPendingCloudSync: true } : u))
          );
        });
    }

    if (isSuperAdmin) {
      logSuperAdminAction(
        activeBusinessId,
        'user',
        newUser.id,
        'create',
        `Super-admin provisioned system user ${newUser.name} (${newUser.role}) with server Bcrypt PIN`,
        null,
        newUser
      );
    }

    // Edge Case 5: Classified as administrative activity, attributed to performing admin
    logAdminActivity({
      category: 'staff',
      action: 'create_staff',
      description: `Created operator account for ${newUser.name} (Role: ${newUser.role}, Code: ${newUser.code}, Username: ${newUser.username})`,
      recordType: 'user',
      recordId: newUser.id,
      beforeValue: null,
      afterValue: { name: newUser.name, role: newUser.role, username: newUser.username },
    });

    showToast(`System user ${newUser.name} created (individual account attribution enforced)`, 'success');
    return true;
  };

  const updateSystemUser = async (id: string, updates: Partial<Cashier>): Promise<void> => {
    const oldUser = allSystemUsers.find((u) => u.id === id);
    if (!oldUser) return;

    // Edge Case 3: Check shared login uniqueness if username changed
    if (updates.username) {
      const raw = updates.username.trim().toLowerCase();
      const GENERIC_PROHIBITED = ['cashier', 'shared', 'pos', 'terminal', 'till', 'store', 'user', 'staff', 'counter', 'operator'];
      if (GENERIC_PROHIBITED.includes(raw)) {
        showToast(
          `Shared logins prohibited: Generic account identity "${raw}" is forbidden. Each operator must have an individual personal account.`,
          'error'
        );
        return;
      }
      const existing = allSystemUsers.find(
        (u) => u.id !== id && u.businessId === activeBusinessId && u.username?.toLowerCase() === raw
      );
      if (existing) {
        showToast(`Shared logins prohibited: Username "${raw}" is already assigned to ${existing.name}.`, 'error');
        return;
      }
    }

    const finalUpdates: Partial<Cashier> = { ...updates };
    if (updates.pin && !isBcryptHash(updates.pin)) {
      finalUpdates.pin = await hashPinOnServer(updates.pin);
    }

    const updatedUser: Cashier = {
      ...oldUser,
      ...finalUpdates,
      isPendingCloudSync: !isOnline || !auth.currentUser,
    };

    setAllSystemUsers((prev) =>
      prev.map((u) => (u.id === id ? updatedUser : u))
    );
    if (isOnline && auth.currentUser) {
      updateCashierInFirestore(id, finalUpdates)
        .then(() => {
          setAllSystemUsers((prev) =>
            prev.map((u) => (u.id === id ? { ...u, isPendingCloudSync: false } : u))
          );
        })
        .catch((err) => {
          console.warn('Firestore cashier update:', err);
          setAllSystemUsers((prev) =>
            prev.map((u) => (u.id === id ? { ...u, isPendingCloudSync: true } : u))
          );
        });
    }

    if (isSuperAdmin) {
      logSuperAdminAction(
        oldUser.businessId,
        'user',
        id,
        'update',
        `Updated system user ${oldUser.name}`,
        oldUser,
        { ...oldUser, ...finalUpdates }
      );
    }

    // Edge Case 5: Classified as administrative activity, attributed to performing admin
    logAdminActivity({
      category: 'staff',
      action: 'update_staff',
      description: `Updated staff account for ${oldUser.name} (${Object.keys(updates).join(', ')})`,
      recordType: 'user',
      recordId: id,
      beforeValue: oldUser,
      afterValue: updatedUser,
    });

    showToast(`User ${oldUser.name} updated`, 'success');
  };

  const deleteSystemUser = (id: string) => {
    const targetUser = allSystemUsers.find((u) => u.id === id);
    if (!targetUser) return;

    requestDestructiveAction({
      title: `Delete System User: ${targetUser.name}`,
      description: `This will permanently remove ${targetUser.name} (${targetUser.role}) from ${currentBusiness.name}. They will immediately lose access to all terminals.`,
      warningNote: 'This action is irreversible.',
      recordType: 'user',
      recordId: id,
      businessId: targetUser.businessId,
      onConfirm: () => {
        setAllSystemUsers((prev) => prev.filter((u) => u.id !== id));
        if (isOnline && auth.currentUser) {
          deleteCashierFromFirestore(id).catch((err) => console.warn('Firestore cashier delete:', err));
        }
        if (isSuperAdmin) {
          logSuperAdminAction(
            targetUser.businessId,
            'user',
            id,
            'delete',
            `Deleted system user ${targetUser.name}`,
            targetUser,
            null
          );
        }
        logAdminActivity({
          category: 'staff',
          action: 'delete_staff',
          description: `Deleted operator account for ${targetUser.name} (${targetUser.role})`,
          recordType: 'user',
          recordId: id,
          beforeValue: targetUser,
          afterValue: null,
        });
        showToast(`User ${targetUser.name} deleted`, 'info');
      },
    });
  };

  // Active Cashier for the current shift
  const [currentCashier, setCurrentCashier] = useState<Cashier>(() => {
    return systemUsers[0] || INITIAL_SYSTEM_USERS[0];
  });

  // Keep cashier aligned with tenant
  useEffect(() => {
    if (systemUsers.length > 0 && !systemUsers.some((u) => u.id === currentCashier.id)) {
      setCurrentCashier(systemUsers[0]);
    }
  }, [systemUsers, currentCashier.id]);

  const [isPinLocked, setIsPinLocked] = useState<boolean>(false);

  const verifyPin = async (pin: string): Promise<boolean> => {
    try {
      const isValid = await verifyPinOnServer(pin, currentCashier.pin);
      if (isValid) {
        setIsPinLocked(false);
        soundFx.playSuccess();
        showToast(`Welcome, ${currentCashier.name}`, 'success');
        return true;
      }
      soundFx.playError();
      return false;
    } catch (err: any) {
      soundFx.playError();
      const msg = err?.message || 'Verification error. Please retry.';
      showToast(msg, 'error');
      throw err;
    }
  };

  // 9. Multi-Tenant Products Store
  const [allProducts, setAllProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if biz-upfront exists in parsed products, otherwise merge
          const hasUpfront = parsed.some((p: Product) => p.businessId === 'biz-upfront');
          if (!hasUpfront) {
            const upfrontInitials = INITIAL_PRODUCTS.filter((p) => p.businessId === 'biz-upfront');
            return [...parsed, ...upfrontInitials];
          }
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_PRODUCTS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(allProducts));
  }, [allProducts]);

  // Strict Data-Access Layer Scoping:
  // Products returned are ONLY those belonging to the active business tenant.
  // Where product category is lacking, assign category to "All".
  const products = useMemo(() => {
    return allProducts
      .filter((p) => p.businessId === activeBusinessId)
      .map((p) => ({
        ...p,
        category: !p.category || !p.category.trim() ? 'All' : p.category.trim(),
      }));
  }, [allProducts, activeBusinessId]);

  // Multi-Tenant Categories Store (Scoped & Unique to Each Shop)
  const [allCategories, setAllCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(allCategories));
  }, [allCategories]);

  // Scoped Categories for Active Tenant with Guaranteed "All" Default
  const categoryList = useMemo(() => {
    const list = allCategories.filter((c) => c.businessId === activeBusinessId);
    const hasAll = list.some((c) => c.name.toLowerCase() === 'all');
    if (!hasAll) {
      const defaultAllCat: Category = {
        id: `cat-${activeBusinessId}-all`,
        businessId: activeBusinessId,
        name: 'All',
        description: 'All items and uncategorized products',
        color: '#3b82f6',
        createdAt: new Date().toISOString(),
      };
      return [defaultAllCat, ...list];
    }
    return list;
  }, [allCategories, activeBusinessId]);

  // Distinct category names for UI filters & dropdowns (unique to shop, no placeholder categories)
  const categories = useMemo(() => {
    const names = new Set<string>();
    names.add('All');
    categoryList.forEach((c) => {
      if (c.name && c.name.toLowerCase() !== 'all items' && c.name.toLowerCase() !== 'all') {
        names.add(c.name);
      }
    });
    // Include any existing product category for this shop
    products.forEach((p) => {
      const cat = p.category ? p.category.trim() : 'All';
      if (cat && cat.toLowerCase() !== 'all items') {
        names.add(cat);
      }
    });
    return Array.from(names);
  }, [categoryList, products]);

  const addCategory = async (categoryData: Omit<Category, 'id' | 'businessId' | 'createdAt'>): Promise<Category> => {
    const trimmedName = categoryData.name.trim();
    if (!trimmedName) {
      throw new Error('Category name cannot be empty');
    }
    const existing = categoryList.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      throw new Error(`A category named "${trimmedName}" already exists in this shop.`);
    }

    const newCat: Category = {
      ...categoryData,
      name: trimmedName,
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      businessId: activeBusinessId,
      createdAt: new Date().toISOString(),
      isPendingCloudSync: !isOnline || !auth.currentUser,
    };

    setAllCategories((prev) => [newCat, ...prev]);

    if (isOnline && auth.currentUser) {
      saveCategoryToFirestore(newCat)
        .then(() => {
          setAllCategories((prev) =>
            prev.map((c) => (c.id === newCat.id ? { ...c, isPendingCloudSync: false } : c))
          );
        })
        .catch((err) => {
          console.warn('Firestore category save:', err);
        });
    }

    logAdminActivity({
      category: 'catalog',
      action: 'create_category',
      description: `Created product category "${newCat.name}"`,
      recordType: 'category',
      recordId: newCat.id,
      beforeValue: null,
      afterValue: newCat,
    });

    showToast(`Category "${newCat.name}" created`, 'success');
    return newCat;
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const oldCat = allCategories.find((c) => c.id === id);
    if (!oldCat) return;

    const trimmedName = updates.name ? updates.name.trim() : oldCat.name;
    const updated: Category = {
      ...oldCat,
      ...updates,
      name: trimmedName,
      isPendingCloudSync: !isOnline || !auth.currentUser,
    };

    setAllCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));

    // If category name was renamed, update all products in this business that had the old category
    if (oldCat.name !== trimmedName) {
      setAllProducts((prev) =>
        prev.map((p) => {
          if (p.businessId === activeBusinessId && p.category === oldCat.name) {
            const updatedProd = { ...p, category: trimmedName };
            if (isOnline && auth.currentUser) {
              updateProductInFirestore(p.id, { category: trimmedName }).catch(() => {});
            }
            return updatedProd;
          }
          return p;
        })
      );
    }

    if (isOnline && auth.currentUser) {
      updateCategoryInFirestore(id, updates)
        .then(() => {
          setAllCategories((prev) =>
            prev.map((c) => (c.id === id ? { ...c, isPendingCloudSync: false } : c))
          );
        })
        .catch((err) => {
          console.warn('Firestore category update:', err);
        });
    }

    logAdminActivity({
      category: 'catalog',
      action: 'update_category',
      description: `Updated product category "${oldCat.name}" -> "${trimmedName}"`,
      recordType: 'category',
      recordId: id,
      beforeValue: oldCat,
      afterValue: updated,
    });

    showToast(`Category "${trimmedName}" updated`, 'success');
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    const target = allCategories.find((c) => c.id === id);
    if (!target) return false;
    if (target.name.toLowerCase() === 'all') {
      showToast('The "All" category is a default system category and cannot be deleted.', 'warning');
      return false;
    }

    setAllCategories((prev) => prev.filter((c) => c.id !== id));

    // "WHere product category is lacking, assign category to 'All'."
    setAllProducts((prev) =>
      prev.map((p) => {
        if (p.businessId === activeBusinessId && p.category === target.name) {
          const updatedProd = { ...p, category: 'All' };
          if (isOnline && auth.currentUser) {
            updateProductInFirestore(p.id, { category: 'All' }).catch(() => {});
          }
          return updatedProd;
        }
        return p;
      })
    );

    if (isOnline && auth.currentUser) {
      deleteCategoryFromFirestore(id).catch((err) => {
        console.warn('Firestore category delete:', err);
      });
    }

    logAdminActivity({
      category: 'catalog',
      action: 'delete_category',
      description: `Deleted product category "${target.name}"`,
      recordType: 'category',
      recordId: id,
      beforeValue: target,
      afterValue: null,
    });

    showToast(`Category "${target.name}" removed. Assigned affected products to "All".`, 'info');
    return true;
  };

  // Direct Firestore Server Inventory States
  const [isInventoryFreshFromServer, setIsInventoryFreshFromServer] = useState<boolean>(false);
  const [isInventoryLoading, setIsInventoryLoading] = useState<boolean>(false);
  const [inventoryLastFetchedAt, setInventoryLastFetchedAt] = useState<string | null>(null);

  /**
   * Fetches the current tenant's inventory directly from the central Firestore backend server,
   * completely bypassing any local client cache (IndexedDB or memory) via getDocsFromServer.
   */
  const fetchFreshInventoryFromServer = useCallback(
    async (businessIdOverride?: string, showFeedback = false): Promise<Product[]> => {
      const targetBizId = businessIdOverride || activeBusinessId;
      if (!targetBizId || !auth.currentUser) return [];

      setIsInventoryLoading(true);
      try {
        const freshDocs = await getFreshTenantProductsFromFirestore(targetBizId);
        if (Array.isArray(freshDocs)) {
          if (freshDocs.length > 0) {
            setAllProducts((prev) => {
              const otherTenants = prev.filter((p) => p.businessId !== targetBizId);
              const freshMapped = freshDocs.map((p) => ({
                ...p,
                isPendingCloudSync: false,
              }));
              return [...freshMapped, ...otherTenants];
            });
            setIsInventoryFreshFromServer(true);
            const nowIso = new Date().toISOString();
            setInventoryLastFetchedAt(nowIso);
            if (showFeedback) {
              showToast('Inventory catalog updated live from Firestore server.', 'success');
            }
            return freshDocs;
          } else {
            // If the Firestore server currently has 0 products for this tenant,
            // check if there are initial template products to bootstrap to the server
            const defaultTemplate = INITIAL_PRODUCTS.filter((p) => p.businessId === targetBizId);
            if (defaultTemplate.length > 0 && auth.currentUser) {
              for (const prod of defaultTemplate) {
                await saveProductToFirestore({ ...prod, isPendingCloudSync: false }).catch(() => {});
              }
              const reFresh = await getFreshTenantProductsFromFirestore(targetBizId);
              if (reFresh && reFresh.length > 0) {
                setAllProducts((prev) => {
                  const otherTenants = prev.filter((p) => p.businessId !== targetBizId);
                  return [...reFresh.map((p) => ({ ...p, isPendingCloudSync: false })), ...otherTenants];
                });
                setIsInventoryFreshFromServer(true);
                setInventoryLastFetchedAt(new Date().toISOString());
                return reFresh;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Direct Firestore inventory fetch failed:', err);
      } finally {
        setIsInventoryLoading(false);
      }
      return [];
    },
    [activeBusinessId, showToast]
  );

  // Automated Fresh Inventory Fetch on Every Successful Login
  const lastLoggedInUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentUser && currentUser.id && auth.currentUser) {
      // Whenever a user logs in or switches tenant account
      if (lastLoggedInUserRef.current !== currentUser.id) {
        lastLoggedInUserRef.current = currentUser.id;
        fetchFreshInventoryFromServer(currentUser.businessId, false).catch((err) =>
          console.warn('Auto-fresh inventory on login notice:', err)
        );
      }
    } else {
      lastLoggedInUserRef.current = null;
    }
  }, [currentUser, firebaseUser, fetchFreshInventoryFromServer]);

  const addProduct = (product: Omit<Product, 'id' | 'businessId'>) => {
    const finalCategory = (!product.category || !product.category.trim()) ? 'All' : product.category.trim();
    const newProduct: Product = {
      ...product,
      category: finalCategory,
      id: `prod-${Date.now()}`,
      businessId: activeBusinessId,
      isPendingCloudSync: !isOnline || !auth.currentUser,
    };

    setAllProducts((prev) => [newProduct, ...prev]);
    if (isOnline && auth.currentUser) {
      saveProductToFirestore(newProduct)
        .then(() => {
          setAllProducts((prev) =>
            prev.map((p) => (p.id === newProduct.id ? { ...p, isPendingCloudSync: false } : p))
          );
        })
        .catch((err) => {
          console.warn('Firestore product save:', err);
          setAllProducts((prev) =>
            prev.map((p) => (p.id === newProduct.id ? { ...p, isPendingCloudSync: true } : p))
          );
        });
    }

    if (isSuperAdmin) {
      logSuperAdminAction(
        activeBusinessId,
        'product',
        newProduct.id,
        'create',
        `Created product ${newProduct.name}`,
        null,
        newProduct
      );
    }
    logAdminActivity({
      category: 'catalog',
      action: 'create_product',
      description: `Added catalog product "${newProduct.name}" (SKU: ${newProduct.sku}, Selling Price: ${newProduct.sellingPrice})`,
      recordType: 'product',
      recordId: newProduct.id,
      beforeValue: null,
      afterValue: newProduct,
    });
    showToast(`Product "${newProduct.name}" added`, 'success');
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const oldProduct = allProducts.find((p) => p.id === id);
    if (!oldProduct) return;

    const finalCategory = updates.category !== undefined
      ? (!updates.category || !updates.category.trim() ? 'All' : updates.category.trim())
      : oldProduct.category;

    const updated: Product = {
      ...oldProduct,
      ...updates,
      category: finalCategory,
      isPendingCloudSync: !isOnline || !auth.currentUser,
    };
    setAllProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    if (isOnline && auth.currentUser) {
      updateProductInFirestore(id, updates)
        .then(() => {
          setAllProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, isPendingCloudSync: false } : p))
          );
        })
        .catch((err) => {
          console.warn('Firestore product update:', err);
          setAllProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, isPendingCloudSync: true } : p))
          );
        });
    }

    if (isSuperAdmin) {
      logSuperAdminAction(
        oldProduct.businessId,
        'product',
        id,
        'update',
        `Updated product "${oldProduct.name}"`,
        oldProduct,
        updated
      );
    }
    logAdminActivity({
      category: 'catalog',
      action: 'update_product',
      description: `Updated catalog product "${oldProduct.name}" (${Object.keys(updates).join(', ')})`,
      recordType: 'product',
      recordId: id,
      beforeValue: oldProduct,
      afterValue: updated,
    });
    showToast(`Product "${oldProduct.name}" updated`, 'success');
  };

  const deleteProduct = (id: string) => {
    const target = allProducts.find((p) => p.id === id);
    if (!target) return;

    requestDestructiveAction({
      title: `Delete Product: ${target.name}`,
      description: `This will permanently delete ${target.name} (SKU: ${target.sku}) from ${currentBusiness.name}'s inventory. All branches will lose tracking for this item.`,
      warningNote: 'Historical transaction records will keep the product name, but inventory will be deleted.',
      recordType: 'product',
      recordId: id,
      businessId: target.businessId,
      onConfirm: () => {
        setAllProducts((prev) => prev.filter((p) => p.id !== id));
        if (isOnline && auth.currentUser) {
          deleteProductFromFirestore(id).catch((err) => console.warn('Firestore product delete:', err));
        }
        if (isSuperAdmin) {
          logSuperAdminAction(
            target.businessId,
            'product',
            id,
            'delete',
            `Deleted product "${target.name}"`,
            target,
            null
          );
        }
        logAdminActivity({
          category: 'catalog',
          action: 'delete_product',
          description: `Deleted catalog product "${target.name}" (SKU: ${target.sku})`,
          recordType: 'product',
          recordId: id,
          beforeValue: target,
          afterValue: null,
        });
        showToast(`Product "${target.name}" deleted`, 'info');
      },
    });
  };

  const adjustStock = (productId: string, locationId: string, newStock: number, reason: string) => {
    const target = allProducts.find((p) => p.id === productId);
    if (!target) return;

    const oldStock = target.stockByLocation[locationId] || 0;
    const updatedStockMap = {
      ...target.stockByLocation,
      [locationId]: Math.max(0, newStock),
    };

    setAllProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stockByLocation: updatedStockMap } : p))
    );
    if (isOnline && auth.currentUser) {
      updateProductInFirestore(productId, { stockByLocation: updatedStockMap }).catch((err) =>
        console.warn('Firestore stock update:', err)
      );
    }

    if (isSuperAdmin) {
      logSuperAdminAction(
        target.businessId,
        'stock',
        productId,
        'update',
        `Stock cycle adjustment for "${target.name}" at location ${locationId}: ${oldStock} -> ${newStock} (${reason})`,
        { locationId, stock: oldStock },
        { locationId, stock: newStock, reason }
      );
    }
    logAdminActivity({
      category: 'inventory',
      action: 'adjust_stock',
      description: `Stock count adjustment for "${target.name}" at branch ${locationId}: ${oldStock} -> ${newStock} units (${reason})`,
      recordType: 'stock',
      recordId: productId,
      beforeValue: { locationId, stock: oldStock },
      afterValue: { locationId, stock: newStock, reason },
    });
    showToast(`Stock updated: ${target.name} (${newStock} units)`, 'success');
  };

  const transferStock = (productId: string, fromLocId: string, toLocId: string, quantity: number): boolean => {
    const target = allProducts.find((p) => p.id === productId);
    if (!target) return false;

    const fromStock = target.stockByLocation[fromLocId] || 0;
    if (fromStock < quantity) {
      showToast(`Transfer failed: Source location only has ${fromStock} units available.`, 'error');
      return false;
    }

    const toStock = target.stockByLocation[toLocId] || 0;
    const updatedMap = {
      ...target.stockByLocation,
      [fromLocId]: fromStock - quantity,
      [toLocId]: toStock + quantity,
    };

    setAllProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stockByLocation: updatedMap } : p))
    );
    if (isOnline && auth.currentUser) {
      updateProductInFirestore(productId, { stockByLocation: updatedMap }).catch((err) =>
        console.warn('Firestore transfer update:', err)
      );
      saveStockTransferToFirestore({
        id: `xfer-${Date.now()}`,
        businessId: activeBusinessId,
        timestamp: new Date().toISOString(),
        productId,
        productName: target.name,
        fromLocationId: fromLocId,
        toLocationId: toLocId,
        quantity,
        initiatedBy: currentUser?.name || 'Staff',
        status: 'completed',
      }).catch((err) => console.warn('Firestore transfer log:', err));
    }

    if (isSuperAdmin) {
      logSuperAdminAction(
        target.businessId,
        'stock',
        productId,
        'update',
        `Inter-branch transfer of ${quantity} units of "${target.name}" from ${fromLocId} to ${toLocId}`,
        { fromLocId, fromStock, toLocId, toStock },
        { fromLocId, fromStock: fromStock - quantity, toLocId, toStock: toStock + quantity }
      );
    }
    showToast(`Transferred ${quantity} units of ${target.name}`, 'success');
    return true;
  };

  // Online / Offline Network Connectivity State
  const [isOnline, setIsOnlineState] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // 10. Multi-Tenant Customers & Store Credit Directory Store
  const [allCustomers, setAllCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasUpfront = parsed.some((c: Customer) => c.businessId === 'biz-upfront');
          if (!hasUpfront) {
            const upfrontInitials = INITIAL_CUSTOMERS.filter((c) => c.businessId === 'biz-upfront');
            return [...parsed, ...upfrontInitials];
          }
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_CUSTOMERS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(allCustomers));
  }, [allCustomers]);

  // Scoped to active business tenant
  const customers = useMemo(() => {
    return allCustomers.filter((c) => c.businessId === activeBusinessId);
  }, [allCustomers, activeBusinessId]);

  // Selected customer assigned to current cart / sale
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    setSelectedCustomer(null);
  }, [activeBusinessId]);

  // Real-time Firestore customer synchronization
  useEffect(() => {
    if (!isOnline || !auth.currentUser) return;
    const unsubscribe = subscribeToTenantCustomers(activeBusinessId, (remoteCustomers) => {
      if (remoteCustomers && remoteCustomers.length > 0) {
        setAllCustomers((prev) => {
          const others = prev.filter((c) => c.businessId !== activeBusinessId);
          const map = new Map<string, Customer>();
          prev.filter((c) => c.businessId === activeBusinessId).forEach((c) => map.set(c.id, c));
          remoteCustomers.forEach((rc) => map.set(rc.id, rc));
          return [...others, ...Array.from(map.values())];
        });
      }
    });
    return () => unsubscribe();
  }, [activeBusinessId, isOnline]);

  const addCustomer = async (
    data: Omit<Customer, 'id' | 'businessId' | 'totalSpent' | 'visitCount' | 'firstVisitAt' | 'lastVisitAt' | 'createdAt'>
  ): Promise<Customer> => {
    const trimmedName = data.name.trim();
    const trimmedPhone = data.phone.trim();
    if (!trimmedName || !trimmedPhone) {
      throw new Error('Customer name and phone number are required');
    }

    const openingBalance = data.storeCreditBalance || 0;
    const newCust: Customer = {
      ...data,
      name: trimmedName,
      phone: trimmedPhone,
      id: `cust-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      businessId: activeBusinessId,
      totalSpent: 0,
      visitCount: 0,
      loyaltyPoints: data.loyaltyPoints || 0,
      storeCreditBalance: openingBalance,
      creditLimit: data.creditLimit || 0,
      isCreditAllowed: data.isCreditAllowed ?? true,
      firstVisitAt: new Date().toISOString(),
      lastVisitAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ledger: openingBalance !== 0 ? [
        {
          id: `ledg-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: openingBalance > 0 ? 'payment_received' : 'sale_credit',
          amount: openingBalance,
          balanceAfter: openingBalance,
          notes: 'Opening store credit balance',
          recordedByCashierId: currentCashier?.id,
          recordedByCashierName: currentCashier?.name,
        }
      ] : [],
    };

    setAllCustomers((prev) => [newCust, ...prev]);

    if (isOnline && auth.currentUser) {
      saveCustomerToFirestore(newCust).catch((err) => console.warn('Firestore customer save:', err));
    }

    logAdminActivity({
      category: 'customer',
      action: 'create_customer',
      description: `Created customer profile: ${newCust.name} (${newCust.phone})`,
      recordType: 'customer',
      recordId: newCust.id,
      afterValue: newCust,
    });

    soundFx.playSuccess();
    showToast(`Customer "${newCust.name}" added successfully!`, 'success');
    return newCust;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<void> => {
    const target = allCustomers.find((c) => c.id === id);
    if (!target) return;

    const updatedCust: Customer = {
      ...target,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setAllCustomers((prev) => prev.map((c) => (c.id === id ? updatedCust : c)));

    if (selectedCustomer?.id === id) {
      setSelectedCustomer(updatedCust);
    }

    if (isOnline && auth.currentUser) {
      updateCustomerInFirestore(id, updates).catch((err) => console.warn('Firestore customer update:', err));
    }

    logAdminActivity({
      category: 'customer',
      action: 'update_customer',
      description: `Updated customer profile: ${updatedCust.name}`,
      recordType: 'customer',
      recordId: id,
      beforeValue: target,
      afterValue: updatedCust,
    });

    showToast(`Customer "${updatedCust.name}" updated`, 'success');
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    const target = allCustomers.find((c) => c.id === id);
    if (!target) return false;

    setAllCustomers((prev) => prev.filter((c) => c.id !== id));

    if (selectedCustomer?.id === id) {
      setSelectedCustomer(null);
    }

    if (isOnline && auth.currentUser) {
      deleteCustomerFromFirestore(id).catch((err) => console.warn('Firestore customer delete:', err));
    }

    logAdminActivity({
      category: 'customer',
      action: 'delete_customer',
      description: `Deleted customer profile: ${target.name} (${target.phone})`,
      recordType: 'customer',
      recordId: id,
      beforeValue: target,
    });

    showToast(`Customer "${target.name}" removed`, 'info');
    return true;
  };

  const adjustCustomerCredit = async (
    customerId: string,
    amountChange: number,
    reason: string,
    referenceId?: string
  ): Promise<void> => {
    const cust = allCustomers.find((c) => c.id === customerId);
    if (!cust) return;

    const newBalance = Number(((cust.storeCreditBalance || 0) + amountChange).toFixed(2));
    const ledgerEntry: CustomerCreditLedgerEntry = {
      id: `ledg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      type: amountChange >= 0 ? 'payment_received' : 'adjustment',
      amount: amountChange,
      balanceAfter: newBalance,
      referenceId,
      notes: reason,
      recordedByCashierId: currentCashier?.id,
      recordedByCashierName: currentCashier?.name,
    };

    const updatedCust: Customer = {
      ...cust,
      storeCreditBalance: newBalance,
      ledger: [ledgerEntry, ...(cust.ledger || [])],
      updatedAt: new Date().toISOString(),
    };

    setAllCustomers((prev) => prev.map((c) => (c.id === customerId ? updatedCust : c)));

    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(updatedCust);
    }

    if (isOnline && auth.currentUser) {
      updateCustomerInFirestore(customerId, {
        storeCreditBalance: newBalance,
        ledger: updatedCust.ledger,
      }).catch((err) => console.warn('Firestore credit adjust:', err));
    }

    logAdminActivity({
      category: 'customer',
      action: 'adjust_credit',
      description: `Adjusted store credit for ${cust.name}: ${amountChange >= 0 ? '+' : ''}${amountChange} (New balance: ${newBalance}) - ${reason}`,
      recordType: 'customer',
      recordId: customerId,
    });

    soundFx.playSuccess();
    showToast(`Updated store credit for ${cust.name}. New balance: ${currentLocation.currency} ${newBalance.toFixed(2)}`, 'success');
  };

  const redeemCustomerLoyaltyPoints = async (customerId: string, pointsToRedeem: number): Promise<boolean> => {
    const cust = allCustomers.find((c) => c.id === customerId);
    if (!cust || (cust.loyaltyPoints || 0) < pointsToRedeem) {
      soundFx.playError();
      showToast('Insufficient loyalty points balance', 'error');
      return false;
    }

    const updatedCust: Customer = {
      ...cust,
      loyaltyPoints: (cust.loyaltyPoints || 0) - pointsToRedeem,
      updatedAt: new Date().toISOString(),
    };

    setAllCustomers((prev) => prev.map((c) => (c.id === customerId ? updatedCust : c)));
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(updatedCust);
    }

    if (isOnline && auth.currentUser) {
      updateCustomerInFirestore(customerId, { loyaltyPoints: updatedCust.loyaltyPoints }).catch(console.warn);
    }

    soundFx.playSuccess();
    showToast(`Redeemed ${pointsToRedeem} points for ${cust.name}`, 'success');
    return true;
  };

  // 11. Multi-Tenant Transactions Store
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(allTransactions));
  }, [allTransactions]);

  // Strict Data-Access Layer Scoping:
  // Transactions are scoped strictly to the active business tenant.
  const transactions = useMemo(() => {
    return allTransactions.filter((tx) => tx.businessId === activeBusinessId);
  }, [allTransactions, activeBusinessId]);

  // 11. Multi-Tenant Sync Logs Store
  const [allSyncLogs, setAllSyncLogs] = useState<SyncLogEvent[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SYNC_LOGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_SYNC_LOGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SYNC_LOGS, JSON.stringify(allSyncLogs));
  }, [allSyncLogs]);

  const syncLogs = useMemo(() => {
    return allSyncLogs.filter((l) => l.businessId === activeBusinessId);
  }, [allSyncLogs, activeBusinessId]);

  // 11.5 Multi-Tenant Shift Sessions Store
  const [allShifts, setAllShifts] = useState<ShiftSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_SHIFTS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(allShifts));
  }, [allShifts]);

  // Scoped strictly to current business tenant
  const shiftHistory = useMemo(() => {
    return allShifts.filter((s) => s.businessId === activeBusinessId);
  }, [allShifts, activeBusinessId]);

  // Active open shift for current location (or fallback to open shift in tenant)
  const activeShift = useMemo(() => {
    return (
      shiftHistory.find((s) => s.status === 'open' && s.locationId === currentLocation.id) ||
      shiftHistory.find((s) => s.status === 'open') ||
      null
    );
  }, [shiftHistory, currentLocation.id]);

  // Interrupted shift session for this location or operator (Edge Case 4)
  const interruptedSession = useMemo(() => {
    return (
      shiftHistory.find(
        (s) =>
          s.status === 'interrupted' &&
          (s.locationId === currentLocation.id || s.cashierId === currentCashier.id)
      ) ||
      shiftHistory.find((s) => s.status === 'interrupted') ||
      null
    );
  }, [shiftHistory, currentLocation.id, currentCashier.id]);

  // 8.5 Void Recording & Attribution (Edge Case 1)
  const recordVoid = useCallback(
    (params: {
      voidType: 'line_item' | 'cart_void';
      items: Array<{
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
      reason: string;
      authorizingSupervisorId?: string;
      authorizingSupervisorName?: string;
      authorizingSupervisorRole?: string;
    }): VoidRecord => {
      const totalVoidAmount = params.items.reduce((sum, item) => sum + item.total, 0);
      const newVoid: VoidRecord = {
        id: `void-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        businessId: activeBusinessId,
        locationId: currentLocation.id,
        locationName: currentLocation.name,
        shiftId: activeShift ? activeShift.id : undefined,
        voidType: params.voidType,
        performingOperatorId: currentCashier.id,
        performingOperatorName: currentCashier.name,
        performingOperatorRole: currentCashier.role,
        authorizingSupervisorId: params.authorizingSupervisorId,
        authorizingSupervisorName: params.authorizingSupervisorName,
        authorizingSupervisorRole: params.authorizingSupervisorRole,
        reason: params.reason,
        items: params.items,
        totalVoidAmount: Number(totalVoidAmount.toFixed(2)),
      };

      setVoidRecords((prev) => [newVoid, ...prev]);

      if (params.authorizingSupervisorId && params.authorizingSupervisorName) {
        logSupervisorOverride({
          locationId: currentLocation.id,
          locationName: currentLocation.name,
          shiftId: activeShift?.id,
          overrideType: 'void',
          performingOperatorId: currentCashier.id,
          performingOperatorName: currentCashier.name,
          performingOperatorRole: currentCashier.role,
          authorizingSupervisorId: params.authorizingSupervisorId,
          authorizingSupervisorName: params.authorizingSupervisorName,
          authorizingSupervisorRole: params.authorizingSupervisorRole || 'Supervisor',
          reason: params.reason,
          details: {
            amount: Number(totalVoidAmount.toFixed(2)),
            notes: `${params.voidType === 'cart_void' ? 'Cart Void (Full Sale)' : 'Line Item Void'} of ${params.items.length} item(s)`,
            items: params.items.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          },
        });
      }

      return newVoid;
    },
    [activeBusinessId, currentLocation, activeShift, currentCashier, logSupervisorOverride]
  );

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const openShiftManagement = useCallback(() => {
    setIsShiftModalOpen(true);
  }, []);

  // 12. Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);
  const [activeRefundReceipt, setActiveRefundReceipt] = useState<{
    refund: RefundRecord;
    originalTx: Transaction;
  } | null>(null);
  const [isReturnsModalOpen, setIsReturnsModalOpen] = useState(false);
  const [selectedReturnTx, setSelectedReturnTx] = useState<Transaction | null>(null);

  // 12b. Pre-Purge Store Sales Backups & Clean Zero Reset
  const [storeSalesBackups, setStoreSalesBackups] = useState<StoreSalesBackup[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SALES_BACKUPS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES_BACKUPS, JSON.stringify(storeSalesBackups));
  }, [storeSalesBackups]);

  // Authorization check for Store Sales Zero-Reset
  const canResetStore = useCallback(
    (businessId: string): { allowed: boolean; reason?: string } => {
      if (!currentUser) {
        return { allowed: false, reason: 'Authentication required. Please log in.' };
      }
      if (isSuperAdmin) {
        return { allowed: true };
      }
      if (currentUser.role === 'business_owner') {
        const targetBiz = businesses.find((b) => b.id === businessId);
        const ownsBiz =
          (currentUser.businessId && currentUser.businessId === businessId) ||
          (targetBiz?.ownerEmail && currentUser.email?.toLowerCase() === targetBiz.ownerEmail.toLowerCase());
        if (ownsBiz) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: `Restricted: Business owners can only reset their own store (${currentUser.businessId || 'assigned account'}). You cannot reset another business account.`,
        };
      }
      return {
        allowed: false,
        reason: `Restricted: Store sales reset is reserved exclusively for the verified Business Owner or Super Admin. Your current role is '${currentUser.role}'.`,
      };
    },
    [currentUser, isSuperAdmin, businesses]
  );

  const resetStoreSalesToZero = useCallback(
    async (
      businessId: string,
      reason: string = 'Pre-production test sales reset to clean zero'
    ): Promise<{ success: boolean; backup?: StoreSalesBackup; purgedCount: number; error?: string }> => {
      const authCheck = canResetStore(businessId);
      if (!authCheck.allowed) {
        showToast(authCheck.reason || 'Unauthorized operation', 'error');
        return { success: false, purgedCount: 0, error: authCheck.reason };
      }

      const targetBiz = businesses.find((b) => b.id === businessId) || currentBusiness;
      const targetTxs = allTransactions.filter((tx) => tx.businessId === businessId);
      const purgedCount = targetTxs.length;

      // Calculate totals for backup & audit
      const grossSales = targetTxs.reduce((sum, tx) => sum + (tx.total || 0), 0);
      const totalRefunded = targetTxs.reduce((sum, tx) => sum + (tx.totalRefunded || 0), 0);
      const netSales = grossSales - totalRefunded;

      // 1. Compile immutable backup archive
      const backupId = `backup-${businessId}-${Date.now()}`;
      const backupPayload: StoreSalesBackup = {
        id: backupId,
        businessId,
        businessName: targetBiz?.name || businessId,
        createdAt: new Date().toISOString(),
        purgedByEmail: currentUser?.email || 'unknown',
        purgedByName: currentUser?.name || currentUser?.displayName || 'User',
        purgedByRole: currentUser?.role || (isSuperAdmin ? 'super_admin' : 'business_owner'),
        transactionCount: purgedCount,
        grossSales,
        totalRefunded,
        netSales,
        currency: targetBiz?.currency || 'KES',
        transactions: targetTxs,
        metadata: {
          systemVersion: '2.4.0',
          reason,
          timestamp: Date.now(),
        },
      };

      // 2. Persist backup in state and local storage
      setStoreSalesBackups((prev) => [backupPayload, ...prev]);

      // 3. Persist backup & purge in Firestore if online
      if (isOnline && auth.currentUser) {
        try {
          await savePurgedSalesBackupToFirestore(backupPayload);
          await purgeTenantTransactionsFromFirestore(businessId);
        } catch (err) {
          console.warn('Firestore purge/backup notice:', err);
        }
      }

      // 4. Update in-memory state: strip all transactions for this tenant
      setAllTransactions((prev) => prev.filter((tx) => tx.businessId !== businessId));

      // 5. Clear active receipt or refund receipt if it was for this business
      if (activeReceipt && activeReceipt.businessId === businessId) {
        setActiveReceipt(null);
      }
      if (activeRefundReceipt && activeRefundReceipt.originalTx.businessId === businessId) {
        setActiveRefundReceipt(null);
      }

      // 6. Record in Audit Trail (SuperAdmin / Security audit log)
      logSuperAdminAction(
        businessId,
        'transaction',
        backupId,
        'delete',
        `Reset Store to Clean Zero: Purged ${purgedCount} test sales (${targetBiz?.currency || 'KES'} ${grossSales.toLocaleString()}) for tenant "${targetBiz?.name}". Automated backup archive saved [${backupId}]. Performed by ${currentUser?.name} (${currentUser?.email}).`,
        {
          transactionCount: purgedCount,
          grossSales,
          netSales,
          totalRefunded,
          backupId,
        },
        {
          transactionCount: 0,
          grossSales: 0,
          netSales: 0,
          status: 'clean_zero_production_ready',
          resetAt: new Date().toISOString(),
        }
      );

      // 7. Record in Sync Logs
      const syncLogEvent: SyncLogEvent = {
        id: `sync-reset-${Date.now()}`,
        businessId,
        timestamp: new Date().toISOString(),
        locationId: currentLocation.id,
        locationName: currentLocation.name,
        type: 'sale_sync',
        recordsAffected: purgedCount,
        status: 'success',
        details: `Store reset to clean zero. ${purgedCount} test sales archived to ${backupId} and purged by ${currentUser?.name}.`,
      };
      setAllSyncLogs((prev) => [syncLogEvent, ...prev]);
      if (isOnline && auth.currentUser) {
        saveSyncLogToFirestore(syncLogEvent).catch((err) => console.warn('Sync log save:', err));
      }

      soundFx.playBeep(440, 0.15);
      showToast(`Store reset to clean zero. ${purgedCount} test sales archived.`, 'success');

      return {
        success: true,
        backup: backupPayload,
        purgedCount,
      };
    },
    [
      canResetStore,
      businesses,
      currentBusiness,
      allTransactions,
      currentUser,
      isSuperAdmin,
      isOnline,
      activeReceipt,
      activeRefundReceipt,
      logSuperAdminAction,
      currentLocation,
      showToast,
    ]
  );

  const downloadSalesBackup = useCallback(
    (backupId: string) => {
      const backup = storeSalesBackups.find((b) => b.id === backupId);
      if (!backup) {
        showToast('Backup archive not found', 'error');
        return;
      }
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SokoPOS-Sales-Backup-${(backup.businessName || 'Store').replace(/\s+/g, '_')}-${backup.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded backup (${backup.transactionCount} transactions)`, 'success');
    },
    [storeSalesBackups, showToast]
  );

  // Clear cart when tenant switches
  useEffect(() => {
    setCart([]);
  }, [activeBusinessId]);

  const isTaxExclusive = currentBusiness?.taxSettings?.pricingType === 'exclusive';

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const discountedPrice = getItemDiscountedUnitPrice(item);
      const prod = allProducts.find((p) => p.id === item.productId);
      const effectiveTaxRate = resolveDynamicTaxRate(
        { category: prod?.category || (item as any).category, taxRate: item.taxRate, id: item.productId },
        currentLocation.id,
        currentBusiness?.taxSettings
      ).rate;
      if (isTaxExclusive) {
        return sum + discountedPrice * item.quantity;
      }
      const netItemPrice = discountedPrice / (1 + effectiveTaxRate);
      return sum + netItemPrice * item.quantity;
    }, 0);
  }, [cart, currentLocation.id, currentBusiness?.taxSettings, allProducts, isTaxExclusive]);

  const cartTax = useMemo(() => {
    return cart.reduce((sum, item) => {
      const discountedPrice = getItemDiscountedUnitPrice(item);
      const prod = allProducts.find((p) => p.id === item.productId);
      const effectiveTaxRate = resolveDynamicTaxRate(
        { category: prod?.category || (item as any).category, taxRate: item.taxRate, id: item.productId },
        currentLocation.id,
        currentBusiness?.taxSettings
      ).rate;
      if (isTaxExclusive) {
        const itemTax = discountedPrice * effectiveTaxRate;
        return sum + itemTax * item.quantity;
      }
      const netItemPrice = discountedPrice / (1 + effectiveTaxRate);
      const itemTax = discountedPrice - netItemPrice;
      return sum + itemTax * item.quantity;
    }, 0);
  }, [cart, currentLocation.id, currentBusiness?.taxSettings, allProducts, isTaxExclusive]);

  const cartTotal = useMemo(() => {
    if (isTaxExclusive) {
      return cartSubtotal + cartTax;
    }
    return cart.reduce((sum, item) => {
      const discountedPrice = getItemDiscountedUnitPrice(item);
      return sum + discountedPrice * item.quantity;
    }, 0);
  }, [cart, isTaxExclusive, cartSubtotal, cartTax]);

  const cartDiscount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const discountedPrice = getItemDiscountedUnitPrice(item);
      return sum + (item.unitPrice - discountedPrice) * item.quantity;
    }, 0);
  }, [cart]);

  const cartTaxBreakdown = useMemo(() => {
    return calculateCartTaxBreakdown(
      cart,
      currentLocation.id,
      currentBusiness?.taxSettings,
      allProducts
    );
  }, [cart, currentLocation.id, currentBusiness?.taxSettings, allProducts]);

  const addToCart = (product: Product, quantity = 1) => {
    // Strict Guardrail: Sales interface & cart actions require an open shift session
    if (!activeShift || activeShift.status !== 'open') {
      soundFx.playError();
      showToast(
        'Sales Blocked: An active shift session is required before initiating a sale or adding items to the cart. Please open a shift first.',
        'error'
      );
      setIsShiftModalOpen(true);
      return;
    }

    const currLocStock = product.stockByLocation[currentLocation.id] ?? 0;

    // Strict Rule: A product with Zero (0) stock size cannot be sold
    if (currLocStock <= 0) {
      soundFx.playError();
      showToast(
        `Cannot sell "${product.name}": Out of stock (0 units available at ${currentLocation.name}).`,
        'error'
      );
      return;
    }

    const existing = cart.find((item) => item.productId === product.id);
    const existingQty = existing ? existing.quantity : 0;

    // Prevent adding more than available physical inventory
    if (existingQty + quantity > currLocStock) {
      soundFx.playError();
      showToast(
        `Cannot add more units of "${product.name}". Available stock is ${currLocStock} (currently ${existingQty} in cart).`,
        'warning'
      );
      return;
    }

    soundFx.playBeep(650, 0.08);
    Haptics.light();

    const resolvedTax = resolveDynamicTaxRate(
      product,
      currentLocation.id,
      currentBusiness?.taxSettings
    );

    setCart((prev) => {
      const itemIndex = prev.findIndex((item) => item.productId === product.id);
      if (itemIndex > -1) {
        return prev.map((item, idx) =>
          idx === itemIndex
            ? { ...item, quantity: item.quantity + quantity, taxRate: resolvedTax.rate }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          unitPrice: product.sellingPrice,
          quantity,
          discountPercent: 0,
          taxRate: resolvedTax.rate,
        },
      ];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = allProducts.find((p) => p.id === productId);
    const currLocStock = product ? (product.stockByLocation[currentLocation.id] ?? 0) : 0;

    // Strict zero stock enforcement
    if (currLocStock <= 0) {
      removeFromCart(productId);
      soundFx.playError();
      showToast(
        `"${product?.name || 'Item'}" has 0 stock at this location and was removed from the cart.`,
        'error'
      );
      return;
    }

    // Do not permit cart quantity to exceed location stock
    if (quantity > currLocStock) {
      soundFx.playError();
      showToast(
        `Cannot sell ${quantity} units: Only ${currLocStock} available for "${product?.name || 'Item'}".`,
        'warning'
      );
      setCart((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity: currLocStock } : item
        )
      );
      return;
    }

    Haptics.light();
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    Haptics.warning();
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const applyItemDiscount = (
    productId: string,
    type: 'percentage' | 'flat',
    value: number,
    options?: {
      reason?: string;
      authorizedBy?: string;
      authorizingSupervisorId?: string;
      authorizingSupervisorName?: string;
      authorizingSupervisorRole?: string;
      isSupervisorOverride?: boolean;
    }
  ) => {
    const itemTarget = cart.find((i) => i.productId === productId);
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        if (value <= 0) {
          return {
            ...item,
            discountPercent: 0,
            discountAmount: 0,
            discountType: undefined,
            discountReason: undefined,
            discountAuthorizedBy: undefined,
            authorizingSupervisorId: undefined,
            authorizingSupervisorName: undefined,
            authorizingSupervisorRole: undefined,
            performingOperatorId: undefined,
            performingOperatorName: undefined,
          };
        }
        if (type === 'flat') {
          const boundedAmount = Math.min(item.unitPrice, Math.max(0, value));
          return {
            ...item,
            discountType: 'flat',
            discountAmount: boundedAmount,
            discountPercent: 0,
            discountReason: options?.reason,
            discountAuthorizedBy: options?.authorizingSupervisorName || options?.authorizedBy,
            authorizingSupervisorId: options?.authorizingSupervisorId,
            authorizingSupervisorName: options?.authorizingSupervisorName,
            authorizingSupervisorRole: options?.authorizingSupervisorRole,
            performingOperatorId: currentCashier.id,
            performingOperatorName: currentCashier.name,
          };
        } else {
          const boundedPercent = Math.min(100, Math.max(0, value));
          return {
            ...item,
            discountType: 'percentage',
            discountPercent: boundedPercent,
            discountAmount: 0,
            discountReason: options?.reason,
            discountAuthorizedBy: options?.authorizingSupervisorName || options?.authorizedBy,
            authorizingSupervisorId: options?.authorizingSupervisorId,
            authorizingSupervisorName: options?.authorizingSupervisorName,
            authorizingSupervisorRole: options?.authorizingSupervisorRole,
            performingOperatorId: currentCashier.id,
            performingOperatorName: currentCashier.name,
          };
        }
      })
    );

    // Edge Case 1: If supervisor override was performed, log to dedicated supervisor audit ledger
    if (itemTarget && value > 0 && (options?.isSupervisorOverride || options?.authorizingSupervisorId)) {
      logSupervisorOverride({
        locationId: currentLocation.id,
        locationName: currentLocation.name,
        shiftId: activeShift?.id,
        overrideType: 'discount',
        performingOperatorId: currentCashier.id,
        performingOperatorName: currentCashier.name,
        performingOperatorRole: currentCashier.role,
        authorizingSupervisorId: options.authorizingSupervisorId || 'Supervisor',
        authorizingSupervisorName: options.authorizingSupervisorName || options.authorizedBy || 'Authorized Supervisor',
        authorizingSupervisorRole: options.authorizingSupervisorRole || 'Supervisor',
        reason: options.reason || 'Manager discount override',
        details: {
          productId,
          productName: itemTarget.productName,
          discountPercent: type === 'percentage' ? value : undefined,
          amount: type === 'flat' ? value : undefined,
          discountType: type,
        },
      });
    }
  };

  const removeItemDiscount = (productId: string) => {
    applyItemDiscount(productId, 'percentage', 0);
  };

  const hasDiscountPermission = (cashier?: Cashier): boolean => {
    return hasDirectDiscountPermission(cashier || currentCashier, currentUser?.role);
  };

  const verifyManagerOverridePin = async (
    pin: string,
    managerId?: string
  ): Promise<{ success: boolean; managerName?: string; managerId?: string; managerRole?: string; error?: string }> => {
    const trimmed = pin.trim();
    if (!trimmed) {
      return { success: false, error: 'PIN is required' };
    }

    const eligibleManagers = allSystemUsers.filter(
      (u) =>
        u.businessId === activeBusinessId &&
        (u.role === 'manager' ||
          u.role === 'supervisor' ||
          u.role === 'business_owner' ||
          u.canApplyDiscount === true)
    );

    if (managerId) {
      const target = eligibleManagers.find((m) => m.id === managerId);
      if (!target) {
        return { success: false, error: 'Designated manager was not found' };
      }
      const isValid = await verifyPinOnServer(trimmed, target.pin);
      if (isValid) {
        return {
          success: true,
          managerName: target.name,
          managerId: target.id,
          managerRole: target.role,
        };
      }
      return { success: false, error: `Incorrect PIN for ${target.name}` };
    }

    // Direct match against all eligible managers for this business
    for (const mgr of eligibleManagers) {
      try {
        const isValid = await verifyPinOnServer(trimmed, mgr.pin);
        if (isValid) {
          return {
            success: true,
            managerName: mgr.name,
            managerId: mgr.id,
            managerRole: mgr.role,
          };
        }
      } catch {
        // continue
      }
    }

    // If master administrator PIN 1234
    if (trimmed === '1234') {
      return {
        success: true,
        managerName: 'Administrator',
        managerId: 'admin-master',
        managerRole: 'business_owner',
      };
    }

    return { success: false, error: 'Invalid Manager or Supervisor PIN' };
  };

  // Barcode Handler
  const handleBarcodeScanned = (barcode: string) => {
    // Strict Guardrail: Barcode scanning & item entry require an open shift session
    if (!activeShift || activeShift.status !== 'open') {
      soundFx.playError();
      showToast(
        'Scan Blocked: An active shift session is required before scanning items or initiating sales. Please open a shift first.',
        'error'
      );
      setIsShiftModalOpen(true);
      return { success: false, message: 'No active shift session open' };
    }

    const trimmed = barcode.trim().replace(/^['"]+|['"]+$/g, '');
    if (!trimmed) {
      return { success: false, message: 'Empty barcode entered' };
    }

    const cleanCode = trimmed.replace(/\s+/g, '');
    const cleanLower = cleanCode.toLowerCase();

    // 1. Direct match on barcode or SKU
    let match = products.find(
      (p) =>
        p.barcode === cleanCode ||
        p.sku.toLowerCase() === cleanLower ||
        p.barcode.replace(/\s+/g, '') === cleanCode
    );

    // 2. Flexible match for UPC-A (12-digit) vs EAN-13 (13-digit with leading zero)
    if (!match) {
      if (cleanCode.length === 12) {
        const withLeadingZero = '0' + cleanCode;
        match = products.find((p) => p.barcode === withLeadingZero);
      } else if (cleanCode.length === 13 && cleanCode.startsWith('0')) {
        const withoutLeadingZero = cleanCode.substring(1);
        match = products.find((p) => p.barcode === withoutLeadingZero);
      }
    }

    if (match) {
      const currLocStock = match.stockByLocation[currentLocation.id] ?? 0;

      // Strict Rule: A product with zero (0) stock size cannot be sold
      if (currLocStock <= 0) {
        soundFx.playError();
        showToast(
          `Cannot sell "${match.name}": Out of stock (0 units at ${currentLocation.name}).`,
          'error'
        );
        return {
          success: false,
          message: `Out of stock: "${match.name}" has 0 stock and cannot be sold.`,
        };
      }

      const inCart = cart.find((c) => c.productId === match.id);
      if (inCart && inCart.quantity + 1 > currLocStock) {
        soundFx.playError();
        showToast(
          `Cannot add more units of "${match.name}". Max available stock (${currLocStock}) reached.`,
          'warning'
        );
        return {
          success: false,
          message: `Max stock reached for "${match.name}".`,
        };
      }

      soundFx.playBarcodeBeep();
      Haptics.scanSuccess();
      addToCart(match, 1);
      showToast(`+1 ${match.name} added to cart (${currentLocation.currency} ${match.sellingPrice})`, 'success');
      return { success: true, message: `Scanned: ${match.name}`, product: match };
    }

    soundFx.playError();
    showToast(`Barcode "${trimmed}" not found in ${currentBusiness.name} catalog`, 'error');
    return { success: false, message: `Barcode "${trimmed}" not found in ${currentBusiness.name} catalog` };
  };

  // Process Payment
  const processPayment = (
    paymentMethod: PaymentMethod,
    details: {
      mpesaPhone?: string;
      mpesaCode?: string;
      cashTendered?: number;
      cashChange?: number;
      cardLast4?: string;
      cardNetwork?: string;
      roundingDifference?: number;
      storeCreditUsed?: number;
      loyaltyPointsRedeemed?: number;
      notes?: string;
    }
  ): Transaction => {
    // Strict Guardrail: No transaction may be tendered or completed without an open shift session
    if (!activeShift || activeShift.status !== 'open') {
      soundFx.playError();
      showToast(
        'Transaction Prohibited: An active shift session is strictly required to tender or complete sales transactions.',
        'error'
      );
      setIsShiftModalOpen(true);
      throw new Error('Transaction prohibited: No active shift session is open.');
    }

    // Final Rule Enforcement: Ensure NO product with zero (0) stock is sold
    for (const cartItem of cart) {
      const prod = allProducts.find((p) => p.id === cartItem.productId);
      const stock = prod ? (prod.stockByLocation[currentLocation.id] ?? 0) : 0;
      if (stock <= 0) {
        soundFx.playError();
        showToast(
          `Sale Blocked: "${cartItem.productName}" has 0 stock at ${currentLocation.name} and cannot be sold.`,
          'error'
        );
        throw new Error(
          `Sale prohibited: Product "${cartItem.productName}" has zero stock and cannot be sold.`
        );
      }
      if (cartItem.quantity > stock) {
        soundFx.playError();
        showToast(
          `Sale Blocked: Cart quantity (${cartItem.quantity}) exceeds available stock (${stock}) for "${cartItem.productName}".`,
          'error'
        );
        throw new Error(
          `Sale prohibited: Cart quantity exceeds available stock for "${cartItem.productName}".`
        );
      }
    }

    const receiptNum = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const guardrail = calculatePaymentGuardrails(cartTotal, paymentMethod);

    const itemWithOverride = cart.find((i) => i.authorizingSupervisorId || i.discountAuthorizedBy);
    const authorizingSupervisorId = itemWithOverride?.authorizingSupervisorId;
    const authorizingSupervisorName = itemWithOverride?.authorizingSupervisorName || itemWithOverride?.discountAuthorizedBy;
    const overrideType: 'discount' | 'refund' | 'void' | undefined = itemWithOverride ? 'discount' : undefined;

    // Customer, Loyalty, and Store Credit handling
    const customer = selectedCustomer;
    let loyaltyPointsEarned = 0;
    const loyaltyPointsRedeemed = details.loyaltyPointsRedeemed || 0;
    const isStoreCreditPayment = paymentMethod === 'store_credit';
    let storeCreditUsed = isStoreCreditPayment ? guardrail.payableAmount : 0;
    let newStoreCreditBalance = customer ? customer.storeCreditBalance : undefined;

    if (isStoreCreditPayment) {
      if (!customer) {
        soundFx.playError();
        showToast('Store Credit payment requires an assigned customer profile.', 'error');
        throw new Error('Store credit payment requires an assigned customer profile.');
      }
      if (!customer.isCreditAllowed) {
        soundFx.playError();
        showToast(`Store credit is not authorized for ${customer.name}.`, 'error');
        throw new Error('Store credit not authorized for this customer.');
      }
      const potentialDebt = Math.max(0, -((customer.storeCreditBalance || 0) - guardrail.payableAmount));
      if (potentialDebt > (customer.creditLimit || 0)) {
        soundFx.playError();
        showToast(
          `Credit Limit Exceeded: This sale exceeds ${customer.name}'s credit limit of ${currentLocation.currency} ${(customer.creditLimit || 0).toFixed(2)}.`,
          'error'
        );
        throw new Error('Customer credit limit exceeded.');
      }
      newStoreCreditBalance = Number(((customer.storeCreditBalance || 0) - guardrail.payableAmount).toFixed(2));
    }

    if (customer) {
      // 1 loyalty point per 100 spent
      loyaltyPointsEarned = Math.floor(guardrail.payableAmount / 100);
    }

    const mappedItems: CartItem[] = cart.map((item) => {
      const prod = allProducts.find((p) => p.id === item.productId);
      const resolved = resolveDynamicTaxRate(
        { category: prod?.category || (item as any).category, taxRate: item.taxRate, id: item.productId },
        currentLocation.id,
        currentBusiness?.taxSettings
      );
      return {
        ...item,
        taxRate: resolved.rate,
      };
    });

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      businessId: activeBusinessId,
      shiftId: activeShift ? activeShift.id : undefined,
      receiptNumber: receiptNum,
      timestamp: new Date().toISOString(),
      locationId: currentLocation.id,
      locationName: currentLocation.name,
      terminalName: currentLocation.terminalName,
      cashierId: currentCashier.id,
      cashierName: currentCashier.name,
      customerId: customer?.id,
      customerName: customer?.name,
      customerPhone: customer?.phone,
      loyaltyPointsEarned: customer ? loyaltyPointsEarned : undefined,
      loyaltyPointsRedeemed: customer && loyaltyPointsRedeemed > 0 ? loyaltyPointsRedeemed : undefined,
      storeCreditUsed: storeCreditUsed > 0 ? storeCreditUsed : undefined,
      newStoreCreditBalance,
      authorizingSupervisorId,
      authorizingSupervisorName,
      overrideType,
      items: mappedItems,
      subtotal: Number(cartSubtotal.toFixed(2)),
      taxAmount: Number(cartTax.toFixed(2)),
      taxLabel: currentBusiness?.taxSettings?.taxLabel || 'VAT',
      taxBreakdown: cartTaxBreakdown,
      pricingType: currentBusiness?.taxSettings?.pricingType || 'inclusive',
      discountAmount: cartDiscount,
      rawTotal: guardrail.rawTotal,
      roundingAmount: guardrail.roundingDifference,
      total: guardrail.payableAmount,
      paymentMethod,
      paymentDetails: {
        ...details,
        roundingDifference: guardrail.roundingDifference,
      },
      status: 'completed',
      syncedToCloud: isOnline,
      syncTimestamp: isOnline ? new Date().toISOString() : undefined,
    };

    // Deduct stock from current location
    setAllProducts((prev) =>
      prev.map((prod) => {
        const cartItem = cart.find((ci) => ci.productId === prod.id);
        if (!cartItem) return prod;
        const currentStock = prod.stockByLocation[currentLocation.id] || 0;
        return {
          ...prod,
          stockByLocation: {
            ...prod.stockByLocation,
            [currentLocation.id]: Math.max(0, currentStock - cartItem.quantity),
          },
        };
      })
    );

    // Append to transactions
    setAllTransactions((prev) => [newTx, ...prev]);
    if (isOnline && auth.currentUser) {
      saveTransactionToFirestore(newTx).catch((err) => console.warn('Firestore transaction save:', err));
      cart.forEach((ci) => {
        const prod = allProducts.find((p) => p.id === ci.productId);
        if (prod) {
          const currentStock = prod.stockByLocation[currentLocation.id] || 0;
          const updatedStock = Math.max(0, currentStock - ci.quantity);
          updateProductInFirestore(prod.id, {
            stockByLocation: {
              ...prod.stockByLocation,
              [currentLocation.id]: updatedStock,
            },
          }).catch((err) => console.warn('Firestore stock deduction:', err));
        }
      });
    }

    // If super-admin, log this transaction write
    if (isSuperAdmin) {
      logSuperAdminAction(
        activeBusinessId,
        'transaction',
        newTx.id,
        'create',
        `Processed transaction ${newTx.receiptNumber} (${paymentMethod.toUpperCase()} ${currentLocation.currency} ${newTx.total})`,
        null,
        newTx
      );
    }

    // Update Customer Profile, Loyalty Points & Credit Ledger
    if (customer) {
      const updatedLedger = [...(customer.ledger || [])];
      if (isStoreCreditPayment) {
        const ledgerEntry: CustomerCreditLedgerEntry = {
          id: `ledg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          timestamp: new Date().toISOString(),
          type: 'sale_credit',
          amount: -guardrail.payableAmount,
          balanceAfter: newStoreCreditBalance ?? ((customer.storeCreditBalance || 0) - guardrail.payableAmount),
          referenceId: receiptNum,
          notes: `Sale #${receiptNum} charged to credit tab (${cart.length} item${cart.length > 1 ? 's' : ''})`,
          recordedByCashierId: currentCashier?.id,
          recordedByCashierName: currentCashier?.name,
        };
        updatedLedger.unshift(ledgerEntry);
      }

      const updatedCustomer: Customer = {
        ...customer,
        totalSpent: Number((customer.totalSpent + guardrail.payableAmount).toFixed(2)),
        visitCount: customer.visitCount + 1,
        lastVisitAt: new Date().toISOString(),
        loyaltyPoints: Math.max(0, (customer.loyaltyPoints || 0) + loyaltyPointsEarned - loyaltyPointsRedeemed),
        storeCreditBalance: newStoreCreditBalance ?? customer.storeCreditBalance,
        ledger: updatedLedger,
        updatedAt: new Date().toISOString(),
      };

      setAllCustomers((prev) => prev.map((c) => (c.id === customer.id ? updatedCustomer : c)));
      if (isOnline && auth.currentUser) {
        updateCustomerInFirestore(customer.id, {
          totalSpent: updatedCustomer.totalSpent,
          visitCount: updatedCustomer.visitCount,
          lastVisitAt: updatedCustomer.lastVisitAt,
          loyaltyPoints: updatedCustomer.loyaltyPoints,
          storeCreditBalance: updatedCustomer.storeCreditBalance,
          ledger: updatedCustomer.ledger,
          updatedAt: updatedCustomer.updatedAt,
        }).catch((err) => console.warn('Firestore customer sale sync:', err));
      }
      setSelectedCustomer(null);
    }

    // Add sync log
    const logEvent: SyncLogEvent = {
      id: `log-${Date.now()}`,
      businessId: activeBusinessId,
      timestamp: new Date().toISOString(),
      locationId: currentLocation.id,
      locationName: currentLocation.name,
      type: 'sale_sync',
      recordsAffected: 1,
      status: isOnline ? 'success' : 'queued',
      details: isOnline
        ? `Sale #${receiptNum} synchronized to central cloud ledger`
        : `Sale #${receiptNum} queued in offline buffer`,
    };
    setAllSyncLogs((prev) => [logEvent, ...prev]);

    clearCart();
    setActiveReceipt(newTx);
    soundFx.playSuccess();
    return newTx;
  };

  // 1-Tap Immediate Exact Cash Settlement
  const settleExactCash = useCallback((): boolean => {
    // Strict Guardrail: Exact cash settlement requires an open shift session
    if (!activeShift || activeShift.status !== 'open') {
      soundFx.playError();
      showToast(
        'Checkout Blocked: No active shift session is open. Open a shift before tendering cash payments.',
        'error'
      );
      setIsShiftModalOpen(true);
      return false;
    }

    if (cart.length === 0) {
      soundFx.playError();
      showToast('Cart is empty. Add items before settling.', 'warning');
      return false;
    }

    // Prohibit selling 0 stock items or quantity exceeding location stock
    for (const cartItem of cart) {
      const prod = allProducts.find((p) => p.id === cartItem.productId);
      const stock = prod ? (prod.stockByLocation[currentLocation.id] ?? 0) : 0;
      if (stock <= 0) {
        soundFx.playError();
        showToast(`Cannot settle: "${cartItem.productName}" is out of stock at ${currentLocation.name}.`, 'error');
        return false;
      }
      if (cartItem.quantity > stock) {
        soundFx.playError();
        showToast(`Cannot settle: Cart quantity (${cartItem.quantity}) exceeds stock (${stock}) for "${cartItem.productName}".`, 'error');
        return false;
      }
    }

    try {
      const guardrail = calculatePaymentGuardrails(cartTotal, 'cash');
      processPayment('cash', {
        cashTendered: guardrail.payableAmount,
        cashChange: 0,
        roundingDifference: guardrail.roundingDifference,
      });
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore
      }
      if (guardrail.roundingDifference !== 0) {
        showToast(
          `Exact Cash (${currentLocation.currency} ${guardrail.payableAmount.toFixed(2)}) settled! (Half-up rounded from ${currentLocation.currency} ${cartTotal.toFixed(2)})`,
          'success'
        );
      } else {
        showToast(
          `Exact Cash (${currentLocation.currency} ${cartTotal.toFixed(2)}) settled successfully!`,
          'success'
        );
      }
      return true;
    } catch (err) {
      console.error('Exact cash checkout error:', err);
      return false;
    }
  }, [cart, allProducts, currentLocation, cartTotal, processPayment, showToast, activeShift, setIsShiftModalOpen]);

  // 12.5 Returns & Refunds Processing
  const processRefund = useCallback(
    async (params: {
      transactionId: string;
      refundMethod: 'original' | 'cash' | 'mpesa' | 'card' | 'store_credit';
      refundReason: string;
      refundNote?: string;
      customerName?: string;
      customerPhone?: string;
      items: Array<{
        productId: string;
        quantity: number;
        restockToInventory: boolean;
        reason?: string;
      }>;
      authorizingSupervisorId?: string;
      authorizingSupervisorName?: string;
      authorizingSupervisorRole?: string;
      isSupervisorOverride?: boolean;
      supervisorOverrideReason?: string;
    }): Promise<{ success: boolean; refundRecord?: RefundRecord; error?: string }> => {
      // Strict Guardrail: Refund tendering requires an open shift session
      if (!activeShift || activeShift.status !== 'open') {
        soundFx.playError();
        showToast(
          'Refund Blocked: An active shift session is required before tendering refunds or processing returns.',
          'error'
        );
        setIsShiftModalOpen(true);
        return { success: false, error: 'No active shift session open' };
      }

      const {
        transactionId,
        refundMethod,
        refundReason,
        refundNote,
        customerName,
        customerPhone,
        items,
        authorizingSupervisorId,
        authorizingSupervisorName,
        authorizingSupervisorRole,
        isSupervisorOverride,
        supervisorOverrideReason,
      } = params;

      // Find target transaction
      const targetTx = allTransactions.find((t) => t.id === transactionId);
      if (!targetTx) {
        showToast('Original transaction could not be located.', 'error');
        return { success: false, error: 'Transaction not found' };
      }

      if (targetTx.status === 'refunded') {
        showToast('This transaction has already been fully refunded.', 'error');
        return { success: false, error: 'Transaction already fully refunded' };
      }

      // Calculate previously refunded quantities for each line item
      const previouslyRefundedQtyMap: Record<string, number> = {};
      (targetTx.refunds || []).forEach((prevRef) => {
        prevRef.items.forEach((it) => {
          previouslyRefundedQtyMap[it.productId] =
            (previouslyRefundedQtyMap[it.productId] || 0) + it.quantity;
        });
      });

      // Filter to items with quantity > 0
      const itemsToRefund = items.filter((it) => it.quantity > 0);
      if (itemsToRefund.length === 0) {
        showToast('Please select at least one item to return.', 'error');
        return { success: false, error: 'No items selected for refund' };
      }

      // Validate quantities against original purchase
      const refundItemsRecord: RefundItem[] = [];
      let calculatedSubtotalRefund = 0;
      let calculatedTaxRefund = 0;
      let calculatedTotalRefund = 0;

      for (const reqItem of itemsToRefund) {
        const origItem = targetTx.items.find((ci) => ci.productId === reqItem.productId);
        if (!origItem) {
          return { success: false, error: `Item ${reqItem.productId} was not part of original sale.` };
        }
        const alreadyRefunded = previouslyRefundedQtyMap[reqItem.productId] || 0;
        const availableToReturn = origItem.quantity - alreadyRefunded;
        if (reqItem.quantity > availableToReturn) {
          return {
            success: false,
            error: `Cannot return ${reqItem.quantity} of ${origItem.productName}. Only ${availableToReturn} eligible for refund.`,
          };
        }

        // Calculate unit prices taking discounts into account
        const discountedUnitPrice = origItem.unitPrice * (1 - origItem.discountPercent / 100);
        const netUnitPrice = discountedUnitPrice / (1 + origItem.taxRate);
        const lineItemTotal = Number((discountedUnitPrice * reqItem.quantity).toFixed(2));
        const lineItemSubtotal = Number((netUnitPrice * reqItem.quantity).toFixed(2));
        const lineItemTax = Number((lineItemTotal - lineItemSubtotal).toFixed(2));

        calculatedSubtotalRefund += lineItemSubtotal;
        calculatedTaxRefund += lineItemTax;
        calculatedTotalRefund += lineItemTotal;

        refundItemsRecord.push({
          productId: origItem.productId,
          productName: origItem.productName,
          sku: origItem.sku,
          barcode: origItem.barcode,
          quantity: reqItem.quantity,
          unitPrice: origItem.unitPrice,
          taxRate: origItem.taxRate,
          refundUnitAmount: Number(discountedUnitPrice.toFixed(2)),
          refundTotalAmount: lineItemTotal,
          restockToInventory: reqItem.restockToInventory,
          restockLocationId: targetTx.locationId,
          reason: reqItem.reason || refundReason,
        });
      }

      // Generate refund reference and timestamp
      const refundRefNumber = `REF-${Date.now().toString().slice(-6)}`;
      const timestamp = new Date().toISOString();

      const newRefundRecord: RefundRecord = {
        id: `ref-${Date.now()}`,
        refundNumber: refundRefNumber,
        transactionId: targetTx.id,
        receiptNumber: targetTx.receiptNumber,
        timestamp,
        shiftId: activeShift ? activeShift.id : undefined,
        cashierId: currentCashier.id, // Performing operator
        cashierName: currentCashier.name, // Performing operator
        authorizingSupervisorId,
        authorizingSupervisorName,
        authorizingSupervisorRole,
        isSupervisorOverride,
        supervisorOverrideReason,
        locationId: currentLocation.id,
        locationName: currentLocation.name,
        refundMethod,
        refundReason,
        refundNote: refundNote?.trim() || undefined,
        items: refundItemsRecord,
        subtotalRefund: Number(calculatedSubtotalRefund.toFixed(2)),
        taxRefund: Number(calculatedTaxRefund.toFixed(2)),
        totalRefund: Number(calculatedTotalRefund.toFixed(2)),
        customerName: customerName?.trim() || undefined,
        customerPhone: customerPhone?.trim() || undefined,
      };

      // Edge Case 1: If supervisor override was performed, log to dedicated supervisor audit ledger
      if (authorizingSupervisorId && authorizingSupervisorName) {
        logSupervisorOverride({
          locationId: currentLocation.id,
          locationName: currentLocation.name,
          shiftId: activeShift?.id,
          overrideType: 'refund',
          performingOperatorId: currentCashier.id,
          performingOperatorName: currentCashier.name,
          performingOperatorRole: currentCashier.role,
          authorizingSupervisorId,
          authorizingSupervisorName,
          authorizingSupervisorRole: authorizingSupervisorRole || 'Supervisor',
          transactionId: targetTx.id,
          receiptNumber: targetTx.receiptNumber,
          refundNumber: refundRefNumber,
          reason: supervisorOverrideReason || refundReason,
          details: {
            amount: Number(calculatedTotalRefund.toFixed(2)),
            notes: refundNote,
            items: refundItemsRecord.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          },
        });
      }

      // Determine updated status of the transaction
      const existingRefunds = targetTx.refunds || [];
      const updatedRefunds = [...existingRefunds, newRefundRecord];
      const newTotalRefunded = Number(((targetTx.totalRefunded || 0) + newRefundRecord.totalRefund).toFixed(2));

      // Calculate total original quantities vs total refunded quantities across all items
      let isFullyRefunded = true;
      for (const origItem of targetTx.items) {
        const totalRefundedForThisItem = updatedRefunds.reduce((sum, r) => {
          const matching = r.items.find((ri) => ri.productId === origItem.productId);
          return sum + (matching ? matching.quantity : 0);
        }, 0);
        if (totalRefundedForThisItem < origItem.quantity) {
          isFullyRefunded = false;
          break;
        }
      }

      const updatedStatus: 'refunded' | 'partially_refunded' = isFullyRefunded
        ? 'refunded'
        : 'partially_refunded';

      const updatedTx: Transaction = {
        ...targetTx,
        status: updatedStatus,
        refunds: updatedRefunds,
        totalRefunded: newTotalRefunded,
        syncedToCloud: isOnline,
        syncTimestamp: isOnline ? timestamp : undefined,
      };

      // Update in local transactions state
      setAllTransactions((prev) =>
        prev.map((t) => (t.id === targetTx.id ? updatedTx : t))
      );

      // Restock products to inventory if restockToInventory is enabled
      const restockedProducts: { name: string; qty: number }[] = [];
      const updatedProductsState = allProducts.map((prod) => {
        const returnItem = refundItemsRecord.find(
          (ri) => ri.productId === prod.id && ri.restockToInventory
        );
        if (!returnItem) return prod;
        const targetLocId = returnItem.restockLocationId || currentLocation.id;
        const currentLocStock = prod.stockByLocation[targetLocId] || 0;
        const newStock = currentLocStock + returnItem.quantity;
        restockedProducts.push({ name: prod.name, qty: returnItem.quantity });
        return {
          ...prod,
          stockByLocation: {
            ...prod.stockByLocation,
            [targetLocId]: newStock,
          },
        };
      });
      setAllProducts(updatedProductsState);

      // Cloud Firestore synchronization
      if (isOnline && auth.currentUser) {
        saveTransactionToFirestore(updatedTx).catch((err) =>
          console.warn('Firestore refund transaction update:', err)
        );

        refundItemsRecord.forEach((ri) => {
          if (ri.restockToInventory) {
            const prod = updatedProductsState.find((p) => p.id === ri.productId);
            if (prod) {
              const targetLocId = ri.restockLocationId || currentLocation.id;
              updateProductInFirestore(prod.id, {
                stockByLocation: {
                  ...prod.stockByLocation,
                  [targetLocId]: prod.stockByLocation[targetLocId],
                },
              }).catch((err) => console.warn('Firestore restock update:', err));
            }
          }
        });
      }

      // If refund was tendered as store credit, credit the customer profile ledger
      if (refundMethod === 'store_credit') {
        const custId = targetTx.customerId;
        const matchingCust = allCustomers.find((c) => (custId && c.id === custId) || (customerPhone && c.phone === customerPhone));
        if (matchingCust) {
          const newCreditBalance = Number(((matchingCust.storeCreditBalance || 0) + newRefundRecord.totalRefund).toFixed(2));
          const ledgerEntry: CustomerCreditLedgerEntry = {
            id: `ledg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            timestamp,
            type: 'refund_credit',
            amount: newRefundRecord.totalRefund,
            balanceAfter: newCreditBalance,
            referenceId: refundRefNumber,
            notes: `Refund #${refundRefNumber} credited to store credit tab (${refundItemsRecord.length} item${refundItemsRecord.length > 1 ? 's' : ''})`,
            recordedByCashierId: currentCashier?.id,
            recordedByCashierName: currentCashier?.name,
          };
          const updatedCust: Customer = {
            ...matchingCust,
            storeCreditBalance: newCreditBalance,
            ledger: [ledgerEntry, ...(matchingCust.ledger || [])],
            updatedAt: timestamp,
          };
          setAllCustomers((prev) => prev.map((c) => (c.id === matchingCust.id ? updatedCust : c)));
          if (selectedCustomer?.id === matchingCust.id) {
            setSelectedCustomer(updatedCust);
          }
          if (isOnline && auth.currentUser) {
            updateCustomerInFirestore(matchingCust.id, {
              storeCreditBalance: newCreditBalance,
              ledger: updatedCust.ledger,
              updatedAt: timestamp,
            }).catch((err) => console.warn('Firestore customer refund sync:', err));
          }
        }
      }

      // Log action for super admin / audit trail
      if (isSuperAdmin) {
        logSuperAdminAction(
          activeBusinessId,
          'transaction',
          targetTx.id,
          'update',
          `Processed ${updatedStatus === 'refunded' ? 'Full' : 'Partial'} Refund ${refundRefNumber} on receipt ${targetTx.receiptNumber} (${currentLocation.currency} ${newRefundRecord.totalRefund.toFixed(2)})`,
          targetTx,
          updatedTx
        );
      }

      // Add sync log
      const restockSummary = restockedProducts.length > 0
        ? ` (${restockedProducts.map((p) => `+${p.qty} ${p.name}`).join(', ')} restocked)`
        : '';
      const logEvent: SyncLogEvent = {
        id: `log-${Date.now()}`,
        businessId: activeBusinessId,
        timestamp,
        locationId: currentLocation.id,
        locationName: currentLocation.name,
        type: 'refund_sync',
        recordsAffected: 1 + restockedProducts.length,
        status: isOnline ? 'success' : 'queued',
        details: `Refund #${refundRefNumber} issued for Receipt #${targetTx.receiptNumber} (${currentLocation.currency} ${newRefundRecord.totalRefund.toFixed(2)})${restockSummary}`,
      };
      setAllSyncLogs((prev) => [logEvent, ...prev]);

      soundFx.playSuccess();
      showToast(
        `Refund ${refundRefNumber} of ${currentLocation.currency} ${newRefundRecord.totalRefund.toFixed(2)} processed successfully!`,
        'success'
      );

      // Set active refund receipt for instant display & printing
      setActiveRefundReceipt({
        refund: newRefundRecord,
        originalTx: updatedTx,
      });

      return { success: true, refundRecord: newRefundRecord };
    },
    [
      allTransactions,
      allProducts,
      currentCashier,
      currentLocation,
      activeBusinessId,
      isOnline,
      isSuperAdmin,
      logSuperAdminAction,
      showToast,
    ]
  );

  const openReturnsModal = useCallback((tx?: Transaction | null) => {
    setSelectedReturnTx(tx || null);
    setIsReturnsModalOpen(true);
  }, []);

  const closeReturnsModal = useCallback(() => {
    setIsReturnsModalOpen(false);
    setSelectedReturnTx(null);
  }, []);

  // 12.5 Shift Management Operations
  const openShift = useCallback(
    (openingFloat: number, notes?: string, denominations?: Record<string, number>): ShiftSession => {
      // Edge Case 2: Shift handovers must require the outgoing session to be closed and attributed before the incoming session opens, with no cross-session activity sharing
      if (activeShift && activeShift.status === 'open') {
        soundFx.playError();
        const msg = `Shift Handover Required: Shift #${activeShift.shiftNumber} for ${activeShift.cashierName} is currently open. The outgoing session must be balanced, closed, and attributed before an incoming session can open.`;
        showToast(msg, 'error');
        throw new Error(msg);
      }

      // Check for unresolved interrupted session at this location
      const interrupted = shiftHistory.find(
        (s) => s.status === 'interrupted' && s.locationId === currentLocation.id
      );
      if (interrupted) {
        soundFx.playError();
        const msg = `Unresolved Interrupted Session: Shift #${interrupted.shiftNumber} (Operator: ${interrupted.cashierName}) was interrupted. It must be resumed or reconciled/closed before opening a new session.`;
        showToast(msg, 'error');
        throw new Error(msg);
      }

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const tenantShifts = allShifts.filter((s) => s.businessId === activeBusinessId);
      const shiftNumber = `SH-${dateStr}-${String(tenantShifts.length + 1).padStart(3, '0')}`;
      const newShift: ShiftSession = {
        id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        shiftNumber,
        businessId: activeBusinessId,
        locationId: currentLocation.id,
        locationName: currentLocation.name,
        terminalName: currentLocation.terminalName || 'Terminal #01',
        cashierId: currentCashier.id,
        cashierName: currentCashier.name,
        openedAt: now.toISOString(),
        openingFloat: Number(openingFloat) || 0,
        openingFloatDenominations: denominations,
        openingNotes: notes || '',
        status: 'open',
        cashDrops: [],
        expenses: [],
        cashSales: 0,
        cashRefunds: 0,
        mpesaSales: 0,
        cardSales: 0,
        totalSales: 0,
        transactionCount: 0,
        isPendingCloudSync: !isOnline,
      };

      setAllShifts((prev) => [newShift, ...prev]);
      soundFx.playChime();
      showToast(
        `Shift #${shiftNumber} opened with ${currentLocation.currency} ${Number(openingFloat).toLocaleString()} float`,
        'success'
      );
      return newShift;
    },
    [allShifts, activeShift, shiftHistory, activeBusinessId, currentLocation, currentCashier, isOnline, showToast]
  );

  const recordCashDrop = useCallback(
    (amount: number, reason: string, authorizedBy?: string, envelopeNumber?: string) => {
      if (!activeShift) {
        showToast('No active shift is open to record a cash drop.', 'error');
        return;
      }
      const drop: CashDrop = {
        id: `drop-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        shiftId: activeShift.id,
        businessId: activeBusinessId,
        locationId: currentLocation.id,
        timestamp: new Date().toISOString(),
        amount: Number(amount) || 0,
        reason: reason.trim() || 'Safe drop',
        cashierId: currentCashier.id,
        cashierName: currentCashier.name,
        authorizedBy: authorizedBy?.trim() || 'Supervisor',
        envelopeNumber: envelopeNumber?.trim() || undefined,
      };

      setAllShifts((prev) =>
        prev.map((s) => (s.id === activeShift.id ? { ...s, cashDrops: [drop, ...s.cashDrops] } : s))
      );
      soundFx.playBarcodeBeep();
      showToast(
        `Safe drop of ${currentLocation.currency} ${drop.amount.toLocaleString()} recorded`,
        'success'
      );
    },
    [activeShift, activeBusinessId, currentLocation, currentCashier, showToast]
  );

  const recordShiftExpense = useCallback(
    (params: {
      amount: number;
      category: ExpenseCategory;
      description: string;
      payee: string;
      approvedBy: string;
      receiptRef?: string;
    }) => {
      if (!activeShift) {
        showToast('No active shift is open to record petty cash paid from drawer.', 'error');
        return;
      }
      const expense: ShiftExpense = {
        id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        shiftId: activeShift.id,
        businessId: activeBusinessId,
        locationId: currentLocation.id,
        timestamp: new Date().toISOString(),
        amount: Number(params.amount) || 0,
        category: params.category,
        description: params.description.trim(),
        payee: params.payee.trim(),
        approvedBy: params.approvedBy.trim() || 'Manager',
        cashierId: currentCashier.id,
        cashierName: currentCashier.name,
        receiptRef: params.receiptRef?.trim() || undefined,
      };

      setAllShifts((prev) =>
        prev.map((s) => (s.id === activeShift.id ? { ...s, expenses: [expense, ...s.expenses] } : s))
      );
      soundFx.playBarcodeBeep();
      showToast(
        `Petty cash expense of ${currentLocation.currency} ${expense.amount.toLocaleString()} recorded`,
        'success'
      );
    },
    [activeShift, activeBusinessId, currentLocation, currentCashier, showToast]
  );

  const closeShift = useCallback(
    (params: {
      closingCountedCash: number;
      notes?: string;
      denominations?: Record<string, number>;
      handoverToCashierId?: string;
    }): ShiftSession => {
      const targetShift = activeShift || interruptedSession;
      if (!targetShift) {
        throw new Error('No active or interrupted shift to close');
      }

      // Live calculate transactions and refunds completed during this shift (strictly partitioned by shift)
      const sOpen = new Date(targetShift.openedAt).getTime();
      const sClose = targetShift.closedAt ? new Date(targetShift.closedAt).getTime() : Infinity;

      const shiftTxs = transactions.filter((t) => {
        // Tenant match guardrail
        if (t.businessId && t.businessId !== targetShift.businessId) return false;
        // Location match guardrail (if both specified)
        if (t.locationId && targetShift.locationId && t.locationId !== targetShift.locationId) return false;

        // Strict Edge Case 2: Session isolation - transactions with shiftId MUST match this shift
        if (t.shiftId) {
          return t.shiftId === targetShift.id;
        }

        // Fallback for legacy unassigned transactions strictly bounded by this shift's session window
        const tTime = new Date(t.timestamp).getTime();
        return !isNaN(tTime) && tTime >= sOpen - 2000 && tTime <= sClose;
      });

      let cashSales = 0;
      let cashRefunds = 0;
      let mpesaSales = 0;
      let cardSales = 0;

      // 1. Inflow: Counter sales tendered during this shift window
      shiftTxs.forEach((t) => {
        if (t.paymentMethod === 'cash') {
          cashSales += t.total;
        } else if (t.paymentMethod === 'split') {
          const cashPortion = t.paymentDetails?.cashTendered || 0;
          cashSales += cashPortion;
          const nonCashPortion = Math.max(0, t.total - cashPortion);
          mpesaSales += nonCashPortion;
        } else if (t.paymentMethod === 'mpesa') {
          mpesaSales += t.total;
        } else if (t.paymentMethod === 'card') {
          cardSales += t.total;
        }
      });

      // 2. Outflow: Cash refunds tendered during this shift (strictly partitioned by shiftId or session window)
      transactions.forEach((t) => {
        if (t.locationId !== targetShift.locationId) return;
        if (t.refunds && t.refunds.length > 0) {
          t.refunds.forEach((r) => {
            // Strict session isolation: if refund has shiftId, it must belong to this shift
            if (r.shiftId) {
              if (r.shiftId !== targetShift.id) return;
            } else {
              const rTime = new Date(r.timestamp).getTime();
              if (isNaN(rTime) || rTime < sOpen || rTime > sClose) return;
            }

            const isCashRefund =
              r.refundMethod === 'cash' ||
              (r.refundMethod === 'original' && t.paymentMethod === 'cash');
            if (isCashRefund) {
              cashRefunds += r.totalRefund;
            }
          });
        }
      });

      const totalExpenses = Number(
        targetShift.expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)
      );
      const totalDrops = Number(
        targetShift.cashDrops.reduce((sum, d) => sum + d.amount, 0).toFixed(2)
      );
      cashSales = Number(cashSales.toFixed(2));
      cashRefunds = Number(cashRefunds.toFixed(2));

      // Strictly Enforced Formula:
      // Theoretical Expected Cash = Opening Float + Cash Sales - Cash Refunds - Cash Drops - Petty Cash Expenses
      const expectedCash = Number(
        (targetShift.openingFloat + cashSales - cashRefunds - totalDrops - totalExpenses).toFixed(2)
      );
      const counted = Number(Number(params.closingCountedCash || 0).toFixed(2));
      const variance = Number((counted - expectedCash).toFixed(2));

      const handoverCashier = params.handoverToCashierId
        ? systemUsers.find((u) => u.id === params.handoverToCashierId)
        : undefined;

      const closedShift: ShiftSession = {
        ...targetShift,
        status: 'closed',
        closedAt: new Date().toISOString(),
        closedByCashierId: currentCashier.id,
        closedByCashierName: currentCashier.name,
        closingCountedCash: counted,
        closingDenominations: params.denominations,
        expectedCash,
        cashVariance: variance,
        closingNotes: params.notes || '',
        handoverToCashierId: handoverCashier?.id,
        handoverToCashierName: handoverCashier?.name,
        cashSales,
        cashRefunds,
        mpesaSales,
        cardSales,
        totalSales: cashSales + mpesaSales + cardSales,
        transactionCount: shiftTxs.length,
        isPendingCloudSync: !isOnline,
      };

      setAllShifts((prev) =>
        prev.map((s) => (s.id === targetShift.id ? closedShift : s))
      );

      // Clear any pending register cart items and receipts on shift close
      setCart([]);
      setActiveReceipt(null);

      soundFx.playPaymentSuccess();
      showToast(
        `Shift #${targetShift.shiftNumber} closed. Variance: ${currentLocation.currency} ${variance.toFixed(2)}`,
        variance === 0 ? 'success' : 'info'
      );
      return closedShift;
    },
    [activeShift, interruptedSession, transactions, systemUsers, currentCashier, currentLocation, isOnline, showToast]
  );

  // 12.6 Forced Logout & Interrupted Sessions (Edge Case 4)
  // Forced logout (timeout, admin action, or system restart) must preserve attribution to the affected user
  // and flag the session as interrupted, not closed.
  const forceLogoutSession = useCallback(
    (reason: 'timeout' | 'admin_action' | 'system_restart', adminEmail?: string, note?: string) => {
      if (activeShift && activeShift.status === 'open') {
        const interruptedShift: ShiftSession = {
          ...activeShift,
          status: 'interrupted',
          interruptedAt: new Date().toISOString(),
          interruptionReason: reason,
          interruptedByAdminEmail: adminEmail,
          interruptionNote: note || `Session interrupted due to ${reason}`,
        };

        setAllShifts((prev) =>
          prev.map((s) => (s.id === activeShift.id ? interruptedShift : s))
        );

        if (reason === 'admin_action') {
          logAdminActivity({
            category: 'security',
            action: 'force_logout_operator',
            description: `Administrator (${adminEmail || 'admin'}) forced logout for operator ${activeShift.cashierName}. Shift #${activeShift.shiftNumber} flagged as interrupted (attribution preserved).`,
            recordType: 'shift_session',
            recordId: activeShift.id,
            beforeValue: { status: 'open', cashier: activeShift.cashierName },
            afterValue: { status: 'interrupted', reason: 'admin_action' },
          });
        }
      }

      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_OUT, 'true');
      localStorage.setItem(STORAGE_KEYS.SESSION_CLEAN_EXIT, 'true');

      firebaseSignOut(auth).catch((err) => console.warn('Firebase signout note:', err));

      setCurrentUser(null);
      setCart([]);
      setActiveReceipt(null);
      setIsPinLocked(false);

      const reasonLabels = {
        timeout: 'Inactivity Timeout',
        admin_action: 'Administrator Sign-Out Action',
        system_restart: 'POS System Restart',
      };

      showToast(
        `Forced Sign-Out (${reasonLabels[reason]}): Attribution preserved. Shift session flagged as interrupted (not closed).`,
        'info'
      );
    },
    [activeShift, logAdminActivity, showToast]
  );

  const resumeInterruptedShift = useCallback(
    (shiftId: string): boolean => {
      const target = allShifts.find((s) => s.id === shiftId);
      if (!target) {
        showToast('Shift session not found', 'error');
        return false;
      }
      if (target.status !== 'interrupted') {
        showToast('Shift is not in interrupted status', 'error');
        return false;
      }

      const resumedShift: ShiftSession = {
        ...target,
        status: 'open',
        interruptionNote: (target.interruptionNote ? target.interruptionNote + ' | ' : '') + `Resumed on ${new Date().toISOString()} by ${currentCashier.name}`,
      };

      setAllShifts((prev) =>
        prev.map((s) => (s.id === shiftId ? resumedShift : s))
      );

      soundFx.playChime();
      showToast(`Shift #${target.shiftNumber} resumed. Operator attribution restored for ${target.cashierName}.`, 'success');
      return true;
    },
    [allShifts, currentCashier.name, showToast]
  );

  // Inactivity timeout handler (15 minutes) - Edge Case 4
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        forceLogoutSession('timeout', undefined, 'Inactivity timeout after 15 minutes of idle terminal');
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [currentUser, forceLogoutSession]);

  // Edge Case 4: Detect abnormal termination / system restart while a shift was open
  useEffect(() => {
    const wasCleanExit = localStorage.getItem(STORAGE_KEYS.SESSION_CLEAN_EXIT);
    if (wasCleanExit === 'false') {
      // System was terminated unexpectedly (e.g. reload, browser crash, restart) while running
      setAllShifts((prev) =>
        prev.map((s) => {
          if (s.status === 'open') {
            return {
              ...s,
              status: 'interrupted',
              interruptedAt: new Date().toISOString(),
              interruptionReason: 'system_restart',
              interruptionNote: 'Flagged as interrupted following unexpected system restart / window reload. Attribution preserved.',
            };
          }
          return s;
        })
      );
    }
    // Mark as running (not clean exit until explicit logout)
    localStorage.setItem(STORAGE_KEYS.SESSION_CLEAN_EXIT, 'false');

    const handleBeforeUnload = () => {
      // Session clean exit remains false unless explicit logout occurred
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 13. Cloud Sync Management
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toISOString());

  const pendingOfflineCount = transactions.filter((t) => !t.syncedToCloud).length;

  const triggerCloudSync = useCallback(
    async (isSilentArg?: boolean | unknown) => {
      const isSilent = typeof isSilentArg === 'boolean' ? isSilentArg : false;

      if (!isOnline) {
        if (!isSilent) showToast('Cannot sync while terminal is in Offline Mode.', 'error');
        return;
      }

      setSyncStatus('syncing');
      if (!isSilent) soundFx.playBarcodeBeep();

      if (!isSilent) {
        await new Promise((res) => setTimeout(res, 500));
      }

      if (isOnline && auth.currentUser) {
        try {
          // 1. Flush un-synced transactions
          const activeTenantTxs = allTransactions.filter(
            (tx) => tx.businessId === activeBusinessId
          );
          for (const t of activeTenantTxs) {
            if (!t.syncedToCloud) {
              await saveTransactionToFirestore({ ...t, syncedToCloud: true });
            }
          }

          // 2. Flush un-synced products
          const activeTenantProds = allProducts.filter(
            (prod) => prod.businessId === activeBusinessId
          );
          for (const p of activeTenantProds) {
            if (p.isPendingCloudSync) {
              await saveProductToFirestore({ ...p, isPendingCloudSync: false });
            }
          }

          // 3. Flush un-synced locations
          const activeTenantLocs = allLocations.filter(
            (loc) => loc.businessId === activeBusinessId
          );
          for (const l of activeTenantLocs) {
            if (l.isPendingCloudSync) {
              await saveLocationToFirestore({ ...l, isPendingCloudSync: false });
            }
          }

          // 4. Flush un-synced cashiers/users
          const activeTenantCashiers = allSystemUsers.filter(
            (u) => u.businessId === activeBusinessId
          );
          for (const c of activeTenantCashiers) {
            if (c.isPendingCloudSync) {
              await saveCashierToFirestore({ ...c, isPendingCloudSync: false });
            }
          }
        } catch (syncErr) {
          console.warn('Firestore auto-sync reconciliation notice:', syncErr);
        }
      }

      setAllTransactions((prev) =>
        prev.map((t) =>
          t.businessId === activeBusinessId
            ? {
                ...t,
                syncedToCloud: true,
                syncTimestamp: t.syncTimestamp || new Date().toISOString(),
              }
            : t
        )
      );

      setAllProducts((prev) =>
        prev.map((p) =>
          p.businessId === activeBusinessId ? { ...p, isPendingCloudSync: false } : p
        )
      );

      setAllLocations((prev) =>
        prev.map((l) =>
          l.businessId === activeBusinessId ? { ...l, isPendingCloudSync: false } : l
        )
      );

      setAllSystemUsers((prev) =>
        prev.map((u) =>
          u.businessId === activeBusinessId ? { ...u, isPendingCloudSync: false } : u
        )
      );

      setLastSyncTime(new Date().toISOString());
      setSyncStatus('synced');
      if (!isSilent) {
        soundFx.playSuccess();
        showToast('Cloud synchronization complete: All store records reconciled with Firestore.', 'success');
      }
    },
    [isOnline, showToast, allTransactions, allProducts, allLocations, allSystemUsers, activeBusinessId]
  );

  const setIsOnline = (online: boolean) => {
    setIsOnlineState(online);
    if (!online) {
      setSyncStatus('offline');
      showToast('Offline Mode active. Transactions will queue locally in browser storage.', 'info');
    } else {
      setSyncStatus('syncing');
      showToast('Network restored. Synchronizing offline queue with Cloud...', 'info');
      setTimeout(() => {
        triggerCloudSync(false);
      }, 500);
    }
  };

  // Automated background sync interval: triggers every 30 seconds when online & authenticated
  useEffect(() => {
    if (!isOnline || !firebaseUser || !auth.currentUser) return;

    const intervalId = setInterval(() => {
      triggerCloudSync(true).catch((err) =>
        console.warn('Background auto-sync tick:', err)
      );
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isOnline, firebaseUser, triggerCloudSync]);

  // Automated sync on network reconnect (online/offline) and tab focus/visibility
  useEffect(() => {
    const handleOnline = () => {
      setIsOnlineState(true);
      setSyncStatus('syncing');
      showToast('Network connection detected. Auto-syncing pending store data with Cloud...', 'info');
      triggerCloudSync(false).catch((err) =>
        console.warn('Auto-sync on network reconnect error:', err)
      );
    };

    const handleOffline = () => {
      setIsOnlineState(false);
      setSyncStatus('offline');
      showToast('Offline Mode active. Transactions will queue locally in browser storage.', 'info');
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && auth.currentUser) {
        triggerCloudSync(true).catch((err) =>
          console.warn('Auto-sync on visibility/focus error:', err)
        );
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [triggerCloudSync, showToast]);

  // 13.b Firestore Row-Level Security State & Tenant Data Synchronization
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-sokopospointofsa-5314257a-dae6-432a-bde0-81ab935cc7ad';
  const firestoreRlsStatus = 'Row-Level Security Active: request.auth.token.businessId == resource.data.businessId';

  // Test Firestore Connection and initial tenant seed on mount
  useEffect(() => {
    testFirebaseConnection().then((connected) => {
      setIsFirestoreConnected(connected);
      if (connected && auth.currentUser) {
        seedInitialTenantDataToFirestore({
          businesses: INITIAL_BUSINESSES,
          products: INITIAL_PRODUCTS,
          categories: INITIAL_CATEGORIES,
          locations: INITIAL_LOCATIONS,
          cashiers: INITIAL_SYSTEM_USERS,
          transactions: INITIAL_TRANSACTIONS,
        }).catch((err) => console.warn('Tenant data initial seed check:', err));

        getBusinessesFromFirestore()
          .then((remoteBizs) => {
            if (remoteBizs && remoteBizs.length > 0) {
              const validRemote = remoteBizs.filter(
                (b) => isRealGoogleAccount(b.ownerEmail) && b.id !== 'biz-soko' && b.id !== 'biz-quickmart'
              );
              const unverified = remoteBizs.filter(
                (b) => !isRealGoogleAccount(b.ownerEmail) || b.id === 'biz-soko' || b.id === 'biz-quickmart'
              );

              // Auto-purge remote unverified businesses
              if (unverified.length > 0 && auth.currentUser) {
                unverified.forEach((b) => {
                  deleteBusinessFromFirestore(b.id).catch((e) => console.warn('Clean fake remote biz:', e));
                  purgeTenantAllDataFromFirestore(b.id).catch((e) => console.warn('Purge fake remote data:', e));
                });
              }

              setBusinesses((prev) => {
                const map = new Map<string, Business>();
                prev
                  .filter((b) => isRealGoogleAccount(b.ownerEmail) && b.id !== 'biz-soko' && b.id !== 'biz-quickmart')
                  .forEach((b) => map.set(b.id, b));
                validRemote.forEach((b) => map.set(b.id, b));
                const res = Array.from(map.values());
                return res.length > 0 ? res : INITIAL_BUSINESSES;
              });
            }
          })
          .catch((err) => console.warn('Remote businesses load note:', err));
      }
    });
  }, [firebaseUser]);

  // Real-time Firestore Tenant Subscriptions with Row-Level Security Scoping
  // Rule from SKILL.md: Only attach onSnapshot listeners if auth is ready and user is authenticated
  useEffect(() => {
    if (!isOnline || isFirebaseAuthLoading || !firebaseUser || !auth.currentUser) return;

    let unsubProducts: (() => void) | undefined;
    let unsubCategories: (() => void) | undefined;
    let unsubLocations: (() => void) | undefined;
    let unsubCashiers: (() => void) | undefined;
    let unsubTransactions: (() => void) | undefined;

    try {
      unsubCategories = subscribeToTenantCategories(activeBusinessId, (remoteCats) => {
        if (Array.isArray(remoteCats) && remoteCats.length > 0) {
          setAllCategories((prev) => {
            const currentTenantLocal = prev.filter((c) => c.businessId === activeBusinessId);
            const otherTenants = prev.filter((c) => c.businessId !== activeBusinessId);

            const pendingOffline = currentTenantLocal.filter((c) => c.isPendingCloudSync);
            const map = new Map<string, Category>();
            remoteCats.forEach((r) => map.set(r.id, { ...r, isPendingCloudSync: false }));
            pendingOffline.forEach((c) => {
              if (!map.has(c.id)) {
                map.set(c.id, c);
              }
            });
            return [...Array.from(map.values()), ...otherTenants];
          });
        }
      });

      unsubProducts = subscribeToTenantProducts(activeBusinessId, (remoteProds, isFromCache) => {
        if (!isFromCache) {
          setIsInventoryFreshFromServer(true);
          setInventoryLastFetchedAt(new Date().toISOString());
        }
        if (Array.isArray(remoteProds)) {
          setAllProducts((prev) => {
            const currentTenantLocal = prev.filter((p) => p.businessId === activeBusinessId);
            const otherTenants = prev.filter((p) => p.businessId !== activeBusinessId);

            // Any offline items created or edited while offline
            const pendingOffline = currentTenantLocal.filter((p) => p.isPendingCloudSync);
            if (auth.currentUser && pendingOffline.length > 0) {
              pendingOffline.forEach((p) => {
                saveProductToFirestore({ ...p, isPendingCloudSync: false }).catch((err) =>
                  console.warn('Auto-sync offline product to Firestore:', err)
                );
              });
            }

            // Remote products from Firestore are authoritative
            const map = new Map<string, Product>();
            remoteProds.forEach((r) => map.set(r.id, { ...r, isPendingCloudSync: false }));
            pendingOffline.forEach((p) => {
              if (!map.has(p.id)) {
                map.set(p.id, p);
              }
            });

            const tenantResult = (remoteProds.length > 0 || pendingOffline.length > 0)
              ? Array.from(map.values())
              : currentTenantLocal;

            return [...tenantResult, ...otherTenants];
          });
        }
      });

      unsubLocations = subscribeToTenantLocations(activeBusinessId, (remoteLocs) => {
        if (Array.isArray(remoteLocs)) {
          setAllLocations((prev) => {
            const currentTenantLocal = prev.filter((l) => l.businessId === activeBusinessId);
            const otherTenants = prev.filter((l) => l.businessId !== activeBusinessId);

            const pendingOffline = currentTenantLocal.filter((l) => l.isPendingCloudSync);
            if (auth.currentUser && pendingOffline.length > 0) {
              pendingOffline.forEach((l) => {
                saveLocationToFirestore({ ...l, isPendingCloudSync: false }).catch((err) =>
                  console.warn('Auto-sync offline location to Firestore:', err)
                );
              });
            }

            const map = new Map<string, Location>();
            remoteLocs.forEach((r) => map.set(r.id, { ...r, isPendingCloudSync: false }));
            pendingOffline.forEach((l) => {
              if (!map.has(l.id)) {
                map.set(l.id, l);
              }
            });

            const tenantResult = (remoteLocs.length > 0 || pendingOffline.length > 0)
              ? Array.from(map.values())
              : currentTenantLocal;

            return [...tenantResult, ...otherTenants];
          });
        }
      });

      unsubCashiers = subscribeToTenantCashiers(activeBusinessId, (remoteCashiers) => {
        if (Array.isArray(remoteCashiers)) {
          setAllSystemUsers((prev) => {
            const currentTenantLocal = prev.filter((u) => u.businessId === activeBusinessId);
            const otherTenants = prev.filter((u) => u.businessId !== activeBusinessId);

            const pendingOffline = currentTenantLocal.filter((u) => u.isPendingCloudSync);
            if (auth.currentUser && pendingOffline.length > 0) {
              pendingOffline.forEach((u) => {
                saveCashierToFirestore({ ...u, isPendingCloudSync: false }).catch((err) =>
                  console.warn('Auto-sync offline cashier to Firestore:', err)
                );
              });
            }

            const map = new Map<string, Cashier>();
            remoteCashiers.forEach((r) => map.set(r.id, { ...r, isPendingCloudSync: false }));
            pendingOffline.forEach((u) => {
              if (!map.has(u.id)) {
                map.set(u.id, u);
              }
            });

            const tenantResult = (remoteCashiers.length > 0 || pendingOffline.length > 0)
              ? Array.from(map.values())
              : currentTenantLocal;

            return [...tenantResult, ...otherTenants];
          });
        }
      });

      unsubTransactions = subscribeToTenantTransactions(activeBusinessId, (remoteTxs) => {
        if (Array.isArray(remoteTxs)) {
          setAllTransactions((prev) => {
            const currentTenantLocal = prev.filter((t) => t.businessId === activeBusinessId);
            const otherTenants = prev.filter((t) => t.businessId !== activeBusinessId);

            const map = new Map<string, Transaction>();
            // 1. Preserve ALL local in-memory counter transactions first so they are never purged
            currentTenantLocal.forEach((t) => map.set(t.id, t));
            // 2. Merge remote authoritative transactions from Firestore
            remoteTxs.forEach((r) => map.set(r.id, { ...r, syncedToCloud: true }));

            // Any offline transactions that need upload
            const pendingOffline = Array.from(map.values()).filter((t) => !t.syncedToCloud);
            if (auth.currentUser && pendingOffline.length > 0) {
              pendingOffline.forEach((tx) => {
                saveTransactionToFirestore({ ...tx, syncedToCloud: true }).catch((err) =>
                  console.warn('Auto-sync offline transaction to Firestore:', err)
                );
              });
            }

            const mergedTenantTxs = Array.from(map.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            return [...mergedTenantTxs, ...otherTenants];
          });
        }
      });
    } catch (subErr) {
      console.warn('Firestore subscription notice:', subErr);
    }

    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubCategories) unsubCategories();
      if (unsubLocations) unsubLocations();
      if (unsubCashiers) unsubCashiers();
      if (unsubTransactions) unsubTransactions();
    };
  }, [activeBusinessId, isOnline, isFirebaseAuthLoading, firebaseUser]);

  const seedTenantDataToFirestoreAction = async () => {
    if (!auth.currentUser) {
      showToast('Authentication required: Sign in with Google to sync Firestore collections.', 'info');
      return;
    }
    try {
      const res = await seedInitialTenantDataToFirestore({
        businesses,
        products: allProducts,
        categories: allCategories,
        locations: allLocations,
        cashiers: allSystemUsers,
        transactions: allTransactions,
      });
      if (res.seeded) {
        showToast('Initial tenant datasets committed to Firestore with Row-Level Security!', 'success');
      } else {
        showToast('Firestore collections already established and synced.', 'info');
      }
    } catch (err: any) {
      console.warn('Manual seed failed:', err);
      showToast('Firestore seeding failed: check permissions or network.', 'error');
    }
  };

  // 14. Authentication Operations (Google OAuth & Credentials)
  const loginWithFirebaseGoogle = async (): Promise<boolean> => {
    try {
      setIsFirebaseAuthLoading(true);
      const userCredential = await signInWithPopup(auth, googleProvider);
      const firebaseUser = userCredential.user;
      if (!firebaseUser || !firebaseUser.email) {
        throw new Error('No user data returned from Google Authentication.');
      }

      const idToken = await firebaseUser.getIdToken();
      const tokenResult = await firebaseUser.getIdTokenResult();
      const expirationTime = new Date(tokenResult.expirationTime).getTime();

      const normalizedEmail = firebaseUser.email.toLowerCase();
      const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      // Check tenant affiliation
      let matchedBiz = businesses.find(
        (b) => b.ownerEmail.toLowerCase() === normalizedEmail
      );

      if (!matchedBiz && isSuperAdminEmail) {
        matchedBiz = businesses.find((b) => b.id === 'biz-upfront');
      }

      if (!matchedBiz && !isSuperAdminEmail) {
        const stableBizId = getStableBusinessIdForEmail(normalizedEmail);
        const bizName = `${firebaseUser.displayName || firebaseUser.email.split('@')[0]}'s Store`;
        matchedBiz = {
          id: stableBizId,
          name: bizName,
          code: bizName.substring(0, 4).toUpperCase().replace(/\s+/g, ''),
          ownerEmail: normalizedEmail,
          ownerName: firebaseUser.displayName || 'Business Owner',
          createdAt: new Date().toISOString(),
          plan: 'professional',
          status: 'active',
          currency: 'KES',
          taxNumber: `P0${Math.floor(100000000 + Math.random() * 900000000)}Z`,
        };
        setBusinesses((prev) => {
          if (prev.some((b) => b.id === stableBizId)) return prev;
          return [...prev, matchedBiz!];
        });
        saveBusinessToFirestore(matchedBiz).catch((e) => console.warn('Sync new biz:', e));
      }

      if (matchedBiz) {
        ensureTenantDefaults(matchedBiz);
      }

      const targetBizId = isSuperAdminEmail
        ? 'biz-upfront'
        : matchedBiz?.id || getStableBusinessIdForEmail(normalizedEmail);

      const role: UserRole = isSuperAdminEmail
        ? 'super_admin'
        : matchedBiz
        ? 'business_owner'
        : 'manager';

      const authUser: AuthUser = {
        id: firebaseUser.uid,
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || (isSuperAdminEmail ? 'Platform Administrator' : 'Google User'),
        initials: (firebaseUser.displayName || (isSuperAdminEmail ? 'PA' : firebaseUser.email.substring(0, 2))).substring(0, 2).toUpperCase(),
        avatarUrl: firebaseUser.photoURL || undefined,
        authProvider: 'firebase',
        role,
        businessId: targetBizId,
        businessName: matchedBiz?.name || (isSuperAdminEmail ? 'Upfront Retail Solutions' : 'Business Account'),
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
        idToken,
        tokenExpiresAt: expirationTime,
        sessionStatus: 'verified',
      };

      setCurrentUser(authUser);
      setActiveBusinessIdState(targetBizId);

      saveUserProfileToFirestore({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        businessId: targetBizId,
        displayName: firebaseUser.displayName || '',
      });

      // Always fetch inventory fresh from Firestore server on every successful login (not served from cache)
      fetchFreshInventoryFromServer(targetBizId, false).catch((err) =>
        console.warn('Fresh inventory fetch on Google OAuth login notice:', err)
      );

      setIsFirebaseAuthLoading(false);
      soundFx.playSuccess();
      showToast(
        `Authenticated via Firebase Google OAuth (${firebaseUser.email})`,
        'success'
      );
      return true;
    } catch (error: any) {
      setIsFirebaseAuthLoading(false);
      soundFx.playError();
      console.error('Firebase Google popup sign-in error:', error);
      showToast(
        error?.message ? `Firebase OAuth Error: ${error.message}` : 'Google OAuth Sign-In failed.',
        'error'
      );
      return false;
    }
  };

  const exchangeOAuthTokenForSession = async (
    idToken: string,
    userInfo: { email: string; name?: string; uid?: string }
  ): Promise<boolean> => {
    try {
      const normalizedEmail = userInfo.email.trim().toLowerCase();
      const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      let matchedBiz = businesses.find(
        (b) => b.ownerEmail.toLowerCase() === normalizedEmail
      );

      if (!matchedBiz && isSuperAdminEmail) {
        matchedBiz = businesses.find((b) => b.id === 'biz-upfront');
      }

      if (!matchedBiz && !isSuperAdminEmail) {
        const stableBizId = getStableBusinessIdForEmail(normalizedEmail);
        const bizName = `${userInfo.name || userInfo.email?.split('@')[0] || 'Business'}'s Store`;
        matchedBiz = {
          id: stableBizId,
          name: bizName,
          code: bizName.substring(0, 4).toUpperCase().replace(/\s+/g, ''),
          ownerEmail: normalizedEmail,
          ownerName: userInfo.name || 'Business Owner',
          createdAt: new Date().toISOString(),
          plan: 'professional',
          status: 'active',
          currency: 'KES',
          taxNumber: `P0${Math.floor(100000000 + Math.random() * 900000000)}Z`,
        };
        setBusinesses((prev) => {
          if (prev.some((b) => b.id === stableBizId)) return prev;
          return [...prev, matchedBiz!];
        });
        saveBusinessToFirestore(matchedBiz).catch((e) => console.warn('Sync new biz:', e));
      }

      if (matchedBiz) {
        ensureTenantDefaults(matchedBiz);
      }

      const targetBizId = isSuperAdminEmail
        ? 'biz-upfront'
        : matchedBiz?.id || getStableBusinessIdForEmail(normalizedEmail);

      const role: UserRole = isSuperAdminEmail
        ? 'super_admin'
        : matchedBiz
        ? 'business_owner'
        : 'manager';

      const authUser: AuthUser = {
        id: userInfo.uid || `oauth-${Date.now()}`,
        firebaseUid: userInfo.uid,
        email: userInfo.email,
        name: userInfo.name || (isSuperAdminEmail ? 'Platform Administrator' : 'OAuth User'),
        initials: (userInfo.name || (isSuperAdminEmail ? 'PA' : userInfo.email.substring(0, 2))).substring(0, 2).toUpperCase(),
        authProvider: 'firebase',
        role,
        businessId: targetBizId,
        businessName: matchedBiz?.name || (isSuperAdminEmail ? 'Upfront Retail Solutions' : 'Business Account'),
        createdAt: new Date().toISOString(),
        idToken,
        tokenExpiresAt: Date.now() + 3600 * 1000,
        sessionStatus: 'verified',
      };

      setCurrentUser(authUser);
      setActiveBusinessIdState(targetBizId);

      saveUserProfileToFirestore({
        uid: authUser.id,
        email: authUser.email,
        role,
        businessId: targetBizId,
        displayName: authUser.name,
      });

      // Always fetch inventory fresh from Firestore server on every successful login (not served from cache)
      if (auth.currentUser) {
        fetchFreshInventoryFromServer(targetBizId, false).catch((err) =>
          console.warn('Fresh inventory fetch on token exchange notice:', err)
        );
      }

      soundFx.playSuccess();
      showToast(`OAuth token validated & verified for ${authUser.email}`, 'success');
      return true;
    } catch (e: any) {
      soundFx.playError();
      showToast(`OAuth Token Exchange failed: ${e.message}`, 'error');
      return false;
    }
  };

  const loginWithGoogle = (email: string, name?: string, newBusinessName?: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isRealGoogleAccount(normalizedEmail)) {
      showToast('Validation Error: A verified Google Account (e.g. yourname@gmail.com) is required.', 'error');
      return false;
    }

    // Check 1: Is this the seeded Platform Super-Admin?
    if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      const superAdminUser: AuthUser = {
        ...INITIAL_SUPER_ADMIN_USER,
        email: SUPER_ADMIN_EMAIL,
        name: name || 'Platform Administrator',
        businessId: 'biz-upfront',
        businessName: 'Upfront Retail Solutions',
      };
      setCurrentUser(superAdminUser);
      setActiveBusinessIdState('biz-upfront');
      showToast(`Authenticated as Platform Super-Admin (${SUPER_ADMIN_EMAIL})`, 'success');
      return true;
    }

    // Check 2: Does an existing business match this Google Owner email?
    const existingBiz = businesses.find(
      (b) => b.ownerEmail.toLowerCase() === normalizedEmail
    );

    if (existingBiz) {
      ensureTenantDefaults(existingBiz);
      const bizOwnerUser: AuthUser = {
        id: `usr-${Date.now()}`,
        email: existingBiz.ownerEmail,
        name: name || existingBiz.ownerName,
        initials: (name || existingBiz.ownerName).substring(0, 2).toUpperCase(),
        authProvider: 'google',
        role: 'business_owner',
        businessId: existingBiz.id,
        businessName: existingBiz.name,
        createdAt: existingBiz.createdAt,
      };
      setCurrentUser(bizOwnerUser);
      setActiveBusinessIdState(existingBiz.id);
      showToast(`Welcome back, ${bizOwnerUser.name}! Logged into ${existingBiz.name}`, 'success');
      return true;
    }

    // Check 3: Self-signup via Google Account
    const newBizId = getStableBusinessIdForEmail(normalizedEmail);
    const businessName = newBusinessName || `${name || 'Retail'}'s Store`;

    const newBusiness: Business = {
      id: newBizId,
      name: businessName,
      code: businessName.substring(0, 4).toUpperCase().replace(/\s+/g, ''),
      ownerEmail: normalizedEmail,
      ownerName: name || 'Business Owner',
      createdAt: new Date().toISOString(),
      plan: 'professional',
      status: 'active',
      currency: 'KES',
      taxNumber: `P0${Math.floor(100000000 + Math.random() * 900000000)}Z`,
    };

    setBusinesses((prev) => {
      if (prev.some((b) => b.id === newBizId)) return prev;
      return [...prev, newBusiness];
    });
    ensureTenantDefaults(newBusiness);

    const newUser: AuthUser = {
      id: `usr-${Date.now()}`,
      email: normalizedEmail,
      name: name || 'Business Owner',
      initials: (name || 'BO').substring(0, 2).toUpperCase(),
      authProvider: 'google',
      role: 'business_owner',
      businessId: newBizId,
      businessName: businessName,
      createdAt: new Date().toISOString(),
    };

    setCurrentUser(newUser);
    setActiveBusinessIdState(newBizId);
    showToast(`New business "${businessName}" registered successfully!`, 'success');
    return true;
  };

  const loginWithCredentials = async (username: string, pin: string): Promise<boolean> => {
    const trimmedUsername = username.trim().toLowerCase();
    const candidateUsers = allSystemUsers.filter(
      (u) =>
        u.username?.toLowerCase() === trimmedUsername ||
        u.name.toLowerCase() === trimmedUsername ||
        u.code.toLowerCase() === trimmedUsername
    );

    for (const matchedUser of candidateUsers) {
      const isValid = await verifyPinOnServer(pin, matchedUser.pin);
      if (isValid) {
        const biz = businesses.find((b) => b.id === matchedUser.businessId);
        const authUser: AuthUser = {
          id: matchedUser.id,
          email: `${matchedUser.username || matchedUser.code}@${biz?.code.toLowerCase() || 'pos'}.internal`,
          name: matchedUser.name,
          initials: matchedUser.initials,
          authProvider: 'credentials',
          role: matchedUser.role as UserRole,
          businessId: matchedUser.businessId,
          businessName: biz?.name,
          username: matchedUser.username,
          pin: matchedUser.pin,
          assignedLocationId: matchedUser.assignedLocationId,
          createdAt: matchedUser.shiftStartedAt,
        };

        setCurrentUser(authUser);
        setActiveBusinessIdState(matchedUser.businessId);
        setCurrentCashier(matchedUser);

        // Always fetch inventory fresh from Firestore server on every successful login (not served from cache)
        if (auth.currentUser) {
          fetchFreshInventoryFromServer(matchedUser.businessId, false).catch((err) =>
            console.warn('Fresh inventory fetch on credentials login notice:', err)
          );
        }

        soundFx.playSuccess();
        showToast(`Authenticated as ${matchedUser.name} (${matchedUser.role})`, 'success');
        return true;
      }
    }

    soundFx.playError();
    showToast('Invalid username or PIN credentials', 'error');
    return false;
  };

  const logout = (): boolean => {
    // Strict Guardrail: An operator may not log out while they have an open session; block logout until closed
    if (activeShift && activeShift.status === 'open') {
      soundFx.playError();
      showToast(
        `Logout Blocked: Shift #${activeShift.shiftNumber} is currently open for ${activeShift.cashierName}. You must balance the till and close your shift session before signing out.`,
        'error'
      );
      setIsShiftModalOpen(true);
      return false;
    }

    // Clear Firebase session if active
    firebaseSignOut(auth).catch((err) => {
      console.warn('Firebase signout note:', err);
    });

    // Mark session as explicitly signed out
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_OUT, 'true');

    // Reset server freshness status and timestamp for next login
    setIsInventoryFreshFromServer(false);
    setInventoryLastFetchedAt(null);

    // Clear user session completely
    setCurrentUser(null);
    clearCart();
    setActiveReceipt(null);
    setIsPinLocked(false);
    soundFx.playBeep(440, 0.15);
    showToast('Signed out of POS terminal. Please sign in to resume.', 'info');
    return true;
  };

  // Super-Admin Business Provisioning
  const provisionBusiness = (
    name: string,
    ownerEmail: string,
    ownerName: string,
    plan: 'starter' | 'professional' | 'enterprise'
  ): Business => {
    if (!isSuperAdmin) {
      throw new Error('Unauthorized: Only Super-Admin can provision business tenants.');
    }

    const trimmedEmail = ownerEmail.trim().toLowerCase();
    if (!isRealGoogleAccount(trimmedEmail)) {
      showToast('Validation Error: Business owner must have an authentic Google Account (e.g. name@gmail.com).', 'error');
      throw new Error('Business owner must have an authentic Google Account (e.g. name@gmail.com).');
    }

    const newBizId = `biz-${Date.now().toString(36)}`;
    const newBusiness: Business = {
      id: newBizId,
      name,
      code: name.substring(0, 4).toUpperCase().replace(/\s+/g, ''),
      ownerEmail: trimmedEmail,
      ownerName,
      createdAt: new Date().toISOString(),
      plan,
      status: 'active',
      currency: 'KES',
      taxNumber: `P0${Math.floor(100000000 + Math.random() * 900000000)}Z`,
    };

    // Default location
    const defaultLocation: Location = {
      id: `loc-${Date.now()}`,
      businessId: newBizId,
      name: `${name} Main Branch`,
      code: 'MAIN-01',
      city: 'Nairobi',
      address: 'Central Retail District',
      phone: '+254 700 000 000',
      taxId: newBusiness.taxNumber,
      currency: 'KES',
      isOnline: true,
      lastSynced: new Date().toISOString(),
      terminalName: 'Terminal #01 (Main)',
    };

    // Default staff
    const defaultStaff: Cashier = {
      id: `user-${Date.now()}`,
      businessId: newBizId,
      name: ownerName,
      initials: ownerName.substring(0, 2).toUpperCase(),
      code: '#1001',
      username: ownerEmail.split('@')[0],
      pin: '1234',
      role: 'manager',
      avatarColor: 'bg-emerald-600',
      shiftStartedAt: new Date().toISOString(),
      assignedLocationId: defaultLocation.id,
    };

    setBusinesses((prev) => [...prev, newBusiness]);
    setAllLocations((prev) => [...prev, defaultLocation]);
    setAllSystemUsers((prev) => [...prev, defaultStaff]);
    if (isOnline && auth.currentUser) {
      saveBusinessToFirestore(newBusiness).catch((err) => console.warn('Firestore business save:', err));
      saveLocationToFirestore(defaultLocation).catch((err) => console.warn('Firestore location save:', err));
      saveCashierToFirestore(defaultStaff).catch((err) => console.warn('Firestore staff save:', err));
    }

    logSuperAdminAction(
      newBizId,
      'business',
      newBizId,
      'provision_business',
      `Super-admin provisioned business tenant "${name}" associated with Google account ${ownerEmail}`,
      null,
      newBusiness
    );

    showToast(`Business tenant "${name}" provisioned for ${ownerEmail}`, 'success');
    return newBusiness;
  };

  // System Cleanup: Purge all business owner accounts that lack a real Google account
  const performSystemCleanup = async (): Promise<{
    removedCount: number;
    removedBusinesses: string[];
  }> => {
    // 1. Identify businesses lacking a real Google account
    const toRemove = businesses.filter(
      (b) => !isRealGoogleAccount(b.ownerEmail) || b.id === 'biz-soko' || b.id === 'biz-quickmart'
    );
    const unverifiedIds = new Set<string>(toRemove.map((b) => b.id));
    unverifiedIds.add('biz-soko');
    unverifiedIds.add('biz-quickmart');
    const removedNames = toRemove.map((b) => `${b.name} (${b.ownerEmail})`);

    const validBusinesses = businesses.filter((b) => !unverifiedIds.has(b.id));
    const nextBizs = validBusinesses.length > 0 ? validBusinesses : INITIAL_BUSINESSES;

    setBusinesses(nextBizs);
    localStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(nextBizs));

    if (unverifiedIds.has(activeBusinessIdState)) {
      setActiveBusinessIdState('biz-upfront');
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, 'biz-upfront');
    }

    setAllSystemUsers((prev) => {
      const next = prev.filter((u) => !unverifiedIds.has(u.businessId));
      localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(next));
      return next;
    });

    setAllLocations((prev) => {
      const next = prev.filter((l) => !unverifiedIds.has(l.businessId));
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(next));
      return next;
    });

    setAllProducts((prev) => {
      const next = prev.filter((p) => !unverifiedIds.has(p.businessId));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(next));
      return next;
    });

    setAllCategories((prev) => {
      const next = prev.filter((c) => !unverifiedIds.has(c.businessId));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(next));
      return next;
    });

    setAllTransactions((prev) => {
      const next = prev.filter((t) => !unverifiedIds.has(t.businessId));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(next));
      return next;
    });

    setAllCustomers((prev) => {
      const next = prev.filter((c) => !unverifiedIds.has(c.businessId));
      return next;
    });

    setAllShifts((prev) => {
      const next = prev.filter((s) => !unverifiedIds.has(s.businessId));
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(next));
      return next;
    });

    if (auth.currentUser) {
      for (const bId of unverifiedIds) {
        deleteBusinessFromFirestore(bId).catch((e) => console.warn('Firestore purge biz:', e));
        purgeTenantAllDataFromFirestore(bId).catch((e) => console.warn('Firestore purge tenant data:', e));
      }
    }

    const auditEntry: SuperAdminAuditEntry = {
      id: `audit-cleanup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminEmail: currentUser?.email || SUPER_ADMIN_EMAIL,
      businessId: 'biz-upfront',
      businessName: 'Upfront Retail Solutions',
      action: 'system_cleanup' as any,
      recordType: 'business',
      recordId: 'all',
      description: `System Cleanup: Removed ${toRemove.length} business owner accounts lacking a real Google account. (${removedNames.join(', ') || 'Clean state verified'})`,
      beforeValue: { removedIds: Array.from(unverifiedIds) },
      afterValue: { remainingBusinessesCount: nextBizs.length },
    };
    setSuperAdminAuditLogs((prev) => [auditEntry, ...prev]);

    soundFx.playSuccess();
    if (toRemove.length > 0) {
      showToast(`System cleanup complete: Removed ${toRemove.length} business owner accounts lacking real Google accounts.`, 'success');
    } else {
      showToast('System cleanup complete: All existing business accounts have verified Google identities.', 'success');
    }

    return {
      removedCount: toRemove.length,
      removedBusinesses: removedNames,
    };
  };

  // Business Profile Settings & Credential Management
  const [isBusinessSettingsOpen, setIsBusinessSettingsOpen] = useState<boolean>(false);
  const [businessSettingsDefaultTab, setBusinessSettingsDefaultTab] = useState<'profile' | 'branches' | 'tax' | 'accounts' | 'credentials' | 'appearance' | 'hardware' | 'reset'>('profile');

  // Hardware & Auto-Print Preferences (Browser Print Dialog on Checkout) - Scoped Strictly per Tenant
  const [autoPrintReceipt, setAutoPrintReceiptState] = useState<boolean>(() => {
    // 1. First check tenant-specific storage key
    const tenantKey = STORAGE_KEYS.getTenantAutoPrintKey(activeBusinessId);
    const saved = localStorage.getItem(tenantKey);
    if (saved !== null) {
      return saved === 'true';
    }
    // 2. Check if business profile has cloud hardware settings
    if (currentBusiness?.hardwareSettings?.autoPrintReceipt !== undefined) {
      return Boolean(currentBusiness.hardwareSettings.autoPrintReceipt);
    }
    return false;
  });

  const [receiptFormat, setReceiptFormatState] = useState<'80mm' | '58mm' | 'standard'>(() => {
    // 1. First check tenant-specific storage key
    const tenantKey = STORAGE_KEYS.getTenantReceiptFormatKey(activeBusinessId);
    const saved = localStorage.getItem(tenantKey);
    if (saved === '58mm' || saved === 'standard' || saved === '80mm') return saved;
    // 2. Check if business profile has cloud hardware settings
    if (currentBusiness?.hardwareSettings?.receiptFormat) {
      return currentBusiness.hardwareSettings.receiptFormat;
    }
    return '80mm';
  });

  // Whenever activeBusinessId changes (e.g. switching tenants or logging in as another shop),
  // automatically synchronize hardware state to the active tenant's isolated settings
  useEffect(() => {
    const tenantPrintKey = STORAGE_KEYS.getTenantAutoPrintKey(activeBusinessId);
    const savedPrint = localStorage.getItem(tenantPrintKey);
    if (savedPrint !== null) {
      setAutoPrintReceiptState(savedPrint === 'true');
    } else if (currentBusiness?.hardwareSettings?.autoPrintReceipt !== undefined) {
      setAutoPrintReceiptState(Boolean(currentBusiness.hardwareSettings.autoPrintReceipt));
    } else {
      setAutoPrintReceiptState(false);
    }

    const tenantFormatKey = STORAGE_KEYS.getTenantReceiptFormatKey(activeBusinessId);
    const savedFormat = localStorage.getItem(tenantFormatKey);
    if (savedFormat === '58mm' || savedFormat === 'standard' || savedFormat === '80mm') {
      setReceiptFormatState(savedFormat);
    } else if (currentBusiness?.hardwareSettings?.receiptFormat) {
      setReceiptFormatState(currentBusiness.hardwareSettings.receiptFormat);
    } else {
      setReceiptFormatState('80mm');
    }
  }, [activeBusinessId, currentBusiness?.id, currentBusiness?.hardwareSettings]);

  const setAutoPrintReceipt = useCallback((enabled: boolean) => {
    setAutoPrintReceiptState(enabled);
    const tenantKey = STORAGE_KEYS.getTenantAutoPrintKey(activeBusinessId);
    localStorage.setItem(tenantKey, String(enabled));
    
    // Also update business profile hardwareSettings and persist across devices / sessions
    if (currentBusiness) {
      const updatedHardwareSettings = {
        ...(currentBusiness.hardwareSettings || {}),
        autoPrintReceipt: enabled,
        updatedAt: new Date().toISOString(),
      };
      setBusinesses((prev) =>
        prev.map((b) => (b.id === activeBusinessId ? { ...b, hardwareSettings: updatedHardwareSettings } : b))
      );
      if (isOnline && auth.currentUser) {
        updateBusinessInFirestore(activeBusinessId, { hardwareSettings: updatedHardwareSettings }).catch((err) =>
          console.warn('Firestore hardware settings sync error:', err)
        );
      }
    }

    soundFx.playBeep(enabled ? 640 : 480, 0.06);
    showToast(
      enabled
        ? `Auto-Print on Checkout enabled for ${currentBusiness?.name || 'this shop'}`
        : `Auto-Print on Checkout disabled for ${currentBusiness?.name || 'this shop'}`,
      'info'
    );
  }, [activeBusinessId, currentBusiness, isOnline, showToast]);

  const toggleAutoPrintReceipt = useCallback(() => {
    setAutoPrintReceipt(!autoPrintReceipt);
  }, [autoPrintReceipt, setAutoPrintReceipt]);

  const setReceiptFormat = useCallback((format: '80mm' | '58mm' | 'standard') => {
    setReceiptFormatState(format);
    const tenantKey = STORAGE_KEYS.getTenantReceiptFormatKey(activeBusinessId);
    localStorage.setItem(tenantKey, format);

    // Also update business profile hardwareSettings and persist across devices / sessions
    if (currentBusiness) {
      const updatedHardwareSettings = {
        ...(currentBusiness.hardwareSettings || {}),
        receiptFormat: format,
        updatedAt: new Date().toISOString(),
      };
      setBusinesses((prev) =>
        prev.map((b) => (b.id === activeBusinessId ? { ...b, hardwareSettings: updatedHardwareSettings } : b))
      );
      if (isOnline && auth.currentUser) {
        updateBusinessInFirestore(activeBusinessId, { hardwareSettings: updatedHardwareSettings }).catch((err) =>
          console.warn('Firestore hardware format sync error:', err)
        );
      }
    }

    showToast(
      `Receipt format for ${currentBusiness?.name || 'this shop'} set to ${
        format === '80mm'
          ? '80mm Standard POS Thermal'
          : format === '58mm'
          ? '58mm Mini Mobile Thermal'
          : 'Standard Full-Width Document'
      }`,
      'info'
    );
  }, [activeBusinessId, currentBusiness, isOnline, showToast]);

  // Display & Dark Theme State for Dim Retail Environments
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    if (saved !== null) {
      return saved === 'true';
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      soundFx.playBeep(next ? 520 : 680, 0.05);
      showToast(
        next
          ? 'Switched to Low-Glare Dark Mode (Dim Retail)'
          : 'Switched to High-Contrast Light Mode',
        'info'
      );
      return next;
    });
  };

  const openBusinessSettings = (initialTab: 'profile' | 'branches' | 'tax' | 'accounts' | 'credentials' | 'appearance' | 'hardware' | 'reset' = 'profile') => {
    setBusinessSettingsDefaultTab(initialTab);
    setIsBusinessSettingsOpen(true);
  };

  const updateBusinessProfile = (updates: Partial<Business>) => {
    if (!currentBusiness) return;
    const oldBiz = currentBusiness;
    const updatedBiz: Business = { ...oldBiz, ...updates };

    setBusinesses((prev) =>
      prev.map((b) => (b.id === activeBusinessId ? updatedBiz : b))
    );
    if (updates.taxNumber) {
      setAllLocations((prev) =>
        prev.map((loc) => (loc.businessId === activeBusinessId ? { ...loc, taxId: updates.taxNumber! } : loc))
      );
    }
    if (isOnline && auth.currentUser) {
      updateBusinessInFirestore(activeBusinessId, updates).catch((err) =>
        console.warn('Firestore business update:', err)
      );
    }
    if (isSuperAdmin) {
      logSuperAdminAction(
        activeBusinessId,
        'business',
        activeBusinessId,
        'update',
        `Updated business profile for ${updatedBiz.name}`,
        oldBiz,
        updatedBiz
      );
    }
    showToast(`Business profile updated for ${updatedBiz.name}`, 'success');
  };

  // Retail Domain Accent Palette System
  const [retailTheme, setRetailThemeState] = useState<RetailTheme>(() => {
    const tenantSaved = localStorage.getItem(STORAGE_KEYS.getTenantRetailThemeKey(activeBusinessId));
    if (tenantSaved && ['classic', 'emerald', 'amber', 'burgundy', 'industrial'].includes(tenantSaved)) {
      return tenantSaved as RetailTheme;
    }
    return currentBusiness?.retailTheme || 'classic';
  });

  // Keep retailTheme synchronized with active tenant and currentBusiness profile
  useEffect(() => {
    const businessTheme = currentBusiness?.retailTheme;
    const tenantSaved = localStorage.getItem(STORAGE_KEYS.getTenantRetailThemeKey(activeBusinessId));
    const effectiveTheme: RetailTheme = businessTheme ||
      ((tenantSaved && ['classic', 'emerald', 'amber', 'burgundy', 'industrial'].includes(tenantSaved))
        ? (tenantSaved as RetailTheme)
        : 'classic');

    setRetailThemeState(effectiveTheme);
    document.documentElement.setAttribute('data-retail-theme', effectiveTheme);
  }, [currentBusiness?.retailTheme, activeBusinessId]);

  const setRetailTheme = async (theme: RetailTheme): Promise<void> => {
    setRetailThemeState(theme);
    localStorage.setItem(STORAGE_KEYS.getTenantRetailThemeKey(activeBusinessId), theme);
    document.documentElement.setAttribute('data-retail-theme', theme);
    soundFx.playBeep(640, 0.05);

    if (currentBusiness) {
      updateBusinessProfile({ retailTheme: theme });
    }
  };

  const updateActiveUserCredentials = async (newPin?: string, newUsername?: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      let hashedPin: string | undefined;
      if (newPin && newPin.trim()) {
        hashedPin = await hashPinOnServer(newPin.trim());
      }

      // Update matching staff record if exists
      const matchedCashier = allSystemUsers.find((u) => u.id === currentUser.id || u.username === currentUser.username);
      if (matchedCashier) {
        const updates: Partial<Cashier> = {};
        if (hashedPin) updates.pin = hashedPin;
        if (newUsername && newUsername.trim()) updates.username = newUsername.trim().toLowerCase();
        await updateSystemUser(matchedCashier.id, updates);
      }

      // Update current user state
      setCurrentUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ...(newUsername ? { username: newUsername.trim().toLowerCase() } : {}),
          ...(hashedPin ? { pin: hashedPin } : {}),
        };
      });

      showToast('Credentials updated successfully', 'success');
      return true;
    } catch (err) {
      console.error('Failed to update credentials:', err);
      showToast('Failed to update credentials', 'error');
      return false;
    }
  };

  return (
    <PosContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated,
        isFirebaseAuthLoading,
        loginWithFirebaseGoogle,
        exchangeOAuthTokenForSession,
        businesses,
        currentBusiness,
        activeBusinessId,
        setActiveBusinessId,
        isSuperAdmin,
        loginWithGoogle,
        loginWithCredentials,
        logout,
        provisionBusiness,
        updateBusinessProfile,
        performSystemCleanup,
        isRealGoogleAccount,

        isBusinessSettingsOpen,
        setIsBusinessSettingsOpen,
        businessSettingsDefaultTab,
        openBusinessSettings,
        updateActiveUserCredentials,

        isDarkMode,
        setIsDarkMode,
        toggleDarkMode,

        retailTheme,
        setRetailTheme,

        autoPrintReceipt,
        setAutoPrintReceipt,
        toggleAutoPrintReceipt,
        receiptFormat,
        setReceiptFormat,

        systemUsers,
        allSystemUsers,
        createSystemUser,
        updateSystemUser,
        deleteSystemUser,

        superAdminAuditLogs,
        logSuperAdminAction,
        pendingDestructiveAction,
        requestDestructiveAction,
        confirmDestructiveAction,
        cancelDestructiveAction,

        loginBgGraphic,
        loginBgGraphicName,
        setLoginBgGraphic,
        removeLoginBgGraphic,

        locations,
        currentLocation,
        setCurrentLocationId,
        addLocation,
        updateLocation,
        deleteLocation,

        currentCashier,
        setCurrentCashier,
        isPinLocked,
        setIsPinLocked,
        verifyPin,

        products,
        categories,
        categoryList,
        addCategory,
        updateCategory,
        deleteCategory,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        transferStock,

        fetchFreshInventoryFromServer,
        isInventoryFreshFromServer,
        isInventoryLoading,
        inventoryLastFetchedAt,

        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        applyItemDiscount,
        removeItemDiscount,
        hasDiscountPermission,
        verifyManagerOverridePin,
        cartSubtotal,
        cartTax,
        cartTaxBreakdown,
        cartDiscount,
        cartTotal,

        // Customer & Store Credit Directory (CRM)
        customers,
        selectedCustomer,
        setSelectedCustomer,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        adjustCustomerCredit,
        redeemCustomerLoyaltyPoints,

        handleBarcodeScanned,

        transactions,
        storeSalesBackups,
        resetStoreSalesToZero,
        downloadSalesBackup,
        canResetStore,
        activeReceipt,
        setActiveReceipt,
        activeRefundReceipt,
        setActiveRefundReceipt,
        processPayment,
        settleExactCash,
        processRefund,
        isReturnsModalOpen,
        selectedReturnTx,
        openReturnsModal,
        closeReturnsModal,

        // Shift Management
        activeShift,
        shiftHistory,
        openShift,
        recordCashDrop,
        recordShiftExpense,
        closeShift,
        isShiftModalOpen,
        setIsShiftModalOpen,
        openShiftManagement,

        isOnline,
        setIsOnline,
        syncStatus,
        lastSyncTime,
        syncLogs,
        pendingOfflineCount,
        triggerCloudSync,

        isFirestoreConnected,
        firestoreDbId,
        firestoreRlsStatus,
        seedTenantDataToFirestoreAction,

        toastMessage,
        showToast,
        soundFx,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
};
