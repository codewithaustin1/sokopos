import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import {
  captureReferralCodeFromUrl,
  getCapturedReferralCode,
  clearCapturedReferralCode,
} from '../lib/affiliateService';
import { trackPlatformEvent } from '../lib/telemetryService';
import { resolveApiUrl } from '../lib/apiConfig';
import {
  AuthUser,
  Business,
  BusinessBrandingSettings,
  BusinessLegalConsent,
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
  BusinessLoyaltySettings,
  TaxRule,
  Customer,
  CustomerCreditLedgerEntry,
  SplitPaymentTender,
  Supplier,
  PricingTier,
  BusinessPlanTier,
  DEFAULT_PRICING_TIERS,
  PendingCheckoutIntent,
  DigitaxEtimsData,
  PermissionKey,
  RolePermissionsMap,
  ConfigurableStaffRole,
  DEFAULT_ROLE_PERMISSIONS,
  IndustrySolutionId,
  BrandingSlotId,
} from '../types';
import { digitaxService } from '../services/digitaxService';
import { bluetoothPrinterService } from '../services/bluetoothPrinterService';
import type { ScannerBurstMetadata } from '../utils/backgroundScanner';
import {
  resolveDynamicTaxRate,
  calculateCartTaxBreakdown,
  TaxBreakdownEntry,
  DEFAULT_TAX_SETTINGS,
} from '../utils/taxResolver';
import { normalizePathname, resolveLegacyHashToPath } from '../utils/seoConfig';
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
  INITIAL_SUPPLIERS,
  DEFAULT_LOYALTY_SETTINGS,
  SUPER_ADMIN_EMAIL,
  DEFAULT_APPOINTED_DEMO_CASHIER_ID,
  INITIAL_DEMO_BUSINESS,
} from '../data/initialData';
import { LEGAL_ENTITY, hasValidBusinessLegalConsent } from '../data/legalContent';
import { soundFx } from '../utils/audio';
import { Haptics } from '../utils/haptics';
import { calculatePaymentGuardrails } from '../utils/cashRounding';
import { safeConfetti } from '../utils/confetti';
import { ToastItem } from '../components/common/ToastContainer';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  testFirebaseConnection,
  FirebaseUser,
} from '../lib/firebase';
import {
  saveProductToFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  batchSaveProductsToFirestore,
  batchUpdateProductsInFirestore,
  batchDeleteProductsFromFirestore,
  saveCategoryToFirestore,
  updateCategoryInFirestore,
  deleteCategoryFromFirestore,
  getTenantCategoriesFromFirestore,
  saveLocationToFirestore,
  updateLocationInFirestore,
  deleteLocationFromFirestore,
  saveCashierToFirestore,
  updateCashierInFirestore,
  deleteCashierFromFirestore,
  getTenantCashiersFromFirestore,
  saveTransactionToFirestore,
  saveStockTransferToFirestore,
  saveSyncLogToFirestore,
  savePurgedSalesBackupToFirestore,
  purgeTenantTransactionsFromFirestore,
  saveBusinessToFirestore,
  updateBusinessInFirestore,
  saveBusinessLegalConsentToFirestore,
  ensureBusinessDocInFirestore,
  deleteBusinessFromFirestore,
  purgeTenantAllDataFromFirestore,
  getBusinessesFromFirestore,
  getBusinessByIdFromFirestore,
  getBusinessesByOwnerEmailFromFirestore,
  resolveBusinessUniquenessConflicts,
  deleteBusinessConflictsFromFirestore,
  saveUserProfileToFirestore,
  getFreshTenantProductsFromFirestore,
  subscribeToTenantProducts,
  subscribeToTenantLocations,
  subscribeToTenantTransactions,
  getTenantTransactionsRangeFromFirestore,
  flushPendingDocsBatch,
  isDemoBusinessId,
  seedInitialTenantDataToFirestore,
  getPlatformSettingsFromFirestore,
  savePlatformSettingsToFirestore,
  saveBrandingSlotToFirestore,
  clearAllBrandingSlotsInFirestore,
  subscribeToPricingTiers,
  savePricingTiersToFirestore,
  saveCustomerToFirestore,
  updateCustomerInFirestore,
  deleteCustomerFromFirestore,
  getTenantCustomersFromFirestore,
  saveSupplierToFirestore,
  updateSupplierInFirestore,
  deleteSupplierFromFirestore,
  getTenantSuppliersFromFirestore,
  subscribeToBusinessDocument,
  subscribeToPaymentRecord,
  PaymentRecordSnapshot,
  subscribeToAnalyticsRollups,
  upsertAnalyticsDailyRollupsBatch,
  subscribeToAnalyticsTargets,
  saveAnalyticsTargetToFirestore,
  subscribeToAnalyticsSavedViews,
  saveAnalyticsSavedViewToFirestore,
  deleteAnalyticsSavedViewFromFirestore,
  flushOutboxMutationToFirestore,
  isFirestoreQuotaCooldownActive,
} from '../lib/firestoreService';
import {
  AnalyticsDailyRollup,
  AnalyticsTarget,
  AnalyticsSavedView,
  BiChartMetric,
  BiFocusTab,
  TimeRangePreset,
} from '../types/reporting';
import {
  OutboxMutationEntry,
  OutboxCollectionName,
  OutboxOperation,
  OpfsSnapshotManifest,
  StorageQuotaTelemetry,
} from '../types/storage';
import {
  hydrateTerminalDatabase,
  syncNormalizedStoreRecords,
  saveCollectionRecords,
  saveLargeKvAsset,
  clearAllLargeBrandingKv,
  putEntityAndEnqueueOutbox,
  enqueueOutboxMutations,
  removeOutboxEntries,
  getAllOutboxEntries,
  buildOutboxEntry,
  estimateBrowserStorageQuota,
} from '../lib/localTerminalDb';
import {
  flushSyncOutbox,
  resetOutboxEntriesForImmediateRetry,
} from '../lib/syncOutboxWorker';
import {
  createOpfsBinarySnapshot,
  verifyOpfsSnapshot,
  downloadOpfsSnapshotFile,
  exportFullStoreArchive,
  isOpfsSupported,
} from '../lib/opfsArchive';
import { buildDailyRollupsFromData, makeTargetDocId } from '../utils/biEngine';
import {
  hashPinOnServer,
  verifyPinOnServer,
  verifyStaffPinViaServer,
  verifyManagerOverrideViaServer,
  saveStaffCredentialOnServer,
  syncStaffCredentialsOnServer,
  checkStaffIdentityAvailabilityOnServer,
  PROTECTED_PIN_MASK,
  isProtectedPin,
  isBcryptHash,
} from '../lib/pinSecurityService';
import {
  getItemDiscountedUnitPrice,
  hasDirectDiscountPermission,
} from '../utils/discountUtils';
import {
  CanonicalTierId,
  SubscriptionCapabilityKey,
  SubscriptionEntitlements,
  UpgradePromptRequest,
  CAPABILITY_MIN_TIER,
  CAPABILITY_LABELS,
  normalizePlanTier,
  getRequiredTierForBranchCount,
  getRequiredTierForStaffCount,
  getRequiredTierForProductCount,
  resolveBusinessEntitlements,
  isQuotaAtOrAboveLimit,
  formatTierDisplayName,
} from '../utils/subscriptionEntitlements';
import {
  verifyServerPayment,
  PendingSubscriptionCheckout,
  savePendingSubscriptionCheckout,
  loadPendingSubscriptionCheckout,
  clearPendingSubscriptionCheckout,
} from '../lib/paymentService';
import firebaseConfig from '../../firebase-applet-config.json';

interface PosContextType {
  // Authentication & Multi-tenancy
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  isAuthenticated: boolean;
  isFirebaseAuthLoading: boolean;
  pendingVerificationEmail: string | null;
  loginWithFirebaseGoogle: (customStoreName?: string) => Promise<boolean>;
  loginWithFirebaseEmailPassword: (
    emailInput: string,
    passwordInput: string,
    isSignUpMode?: boolean,
    customStoreName?: string
  ) => Promise<{ success: boolean; requiresVerification?: boolean; email?: string; error?: string }>;
  loginWithFirebaseEmailOtp: (
    customToken: string
  ) => Promise<{ success: boolean; error?: string }>;
  sendPasswordResetEmailAction: (emailInput: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resendVerificationEmail: () => Promise<{ success: boolean; message?: string; error?: string }>;
  checkEmailVerificationStatus: () => Promise<{ verified: boolean; error?: string }>;
  cancelEmailVerification: () => Promise<void>;
  exchangeOAuthTokenForSession: (idToken: string, user: { email: string; name?: string; uid?: string }) => Promise<boolean>;
  businesses: Business[];
  currentBusiness: Business;
  activeBusinessId: string;
  setActiveBusinessId: (bizId: string) => void;
  isSuperAdmin: boolean;
  appointedDemoCashierId: string;
  appointedDemoCashier: Cashier | null;
  appointDemoCashier: (cashierId: string) => void;
  isDemoSession: boolean;
  loginWithGoogle: (email: string, name?: string, newBusinessName?: string) => boolean;
  loginWithCredentials: (username: string, pin: string, isDemo?: boolean) => Promise<boolean>;
  logout: () => boolean;
  provisionBusiness: (name: string, ownerEmail: string, ownerName: string, plan: BusinessPlanTier) => Business;
  updateBusinessProfile: (updates: Partial<Business>) => void;
  saveBusinessBrandingLogo: (branding: BusinessBrandingSettings | null) => Promise<void>;
  applyBusinessLocalUpdate: (businessId: string, updates: Partial<Business>, syncToFirestore?: boolean) => void;
  updateBusinessStatus: (businessId: string, status: 'active' | 'suspended') => Promise<void>;
  performSystemCleanup: () => Promise<{ removedCount: number; removedBusinesses: string[] }>;
  refreshAllBusinessesForSuperAdmin: (force?: boolean) => Promise<Business[]>;
  isRealGoogleAccount: (email?: string | null) => boolean;
  requiresLegalConsent: boolean;
  recordMerchantLegalConsent: () => Promise<BusinessLegalConsent>;

  // Business Profile Settings & Branch Management
  isBusinessSettingsOpen: boolean;
  setIsBusinessSettingsOpen: (open: boolean) => void;
  businessSettingsDefaultTab: 'profile' | 'branches' | 'billing' | 'settlement' | 'tax' | 'loyalty' | 'pricing' | 'accounts' | 'credentials' | 'appearance' | 'hardware' | 'reset';
  openBusinessSettings: (initialTab?: 'profile' | 'branches' | 'billing' | 'settlement' | 'tax' | 'loyalty' | 'pricing' | 'accounts' | 'credentials' | 'appearance' | 'hardware' | 'reset') => void;
  updateActiveUserCredentials: (newPin?: string, newUsername?: string) => Promise<boolean>;

  // Pricing Architecture, Package Tiers & Entitlement Enforcement
  pricingTiers: PricingTier[];
  pricingSyncStatus: 'idle' | 'saving' | 'synced' | 'error';
  pricingSyncError: string | null;
  updatePricingTier: (tierId: string, updates: Partial<PricingTier>) => void;
  resetPricingTiersToDefault: () => void;
  updateBusinessPlan: (businessId: string, plan: BusinessPlanTier) => Promise<void>;
  entitlements: SubscriptionEntitlements;
  upgradePrompt: UpgradePromptRequest | null;
  openUpgradePrompt: (req: UpgradePromptRequest) => void;
  closeUpgradePrompt: () => void;
  requireCapability: (cap: SubscriptionCapabilityKey, customContext?: Partial<UpgradePromptRequest>) => boolean;
  isSubscriptionActive: boolean;
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCheckoutPlan: 'free' | 'starter' | 'business' | 'premium';
  selectedCheckoutBilling: 'monthly' | 'annual';
  selectCheckoutPackage: (plan: 'free' | 'starter' | 'business' | 'premium', billing?: 'monthly' | 'annual') => void;
  pendingCheckoutIntent: PendingCheckoutIntent | null;
  setPendingCheckoutIntent: (intent: PendingCheckoutIntent | null) => void;
  clearPendingCheckoutIntent: () => void;
  checkoutAuthRequested: boolean;
  setCheckoutAuthRequested: React.Dispatch<React.SetStateAction<boolean>>;
  requestCheckoutAuth: (
    plan: 'starter' | 'business' | 'premium',
    billing: 'monthly' | 'annual',
    planName: string,
    amountKes: number
  ) => void;
  activateBusinessSubscription: (businessId: string, plan: BusinessPlanTier, paymentReference?: string) => Promise<{ success: boolean; message: string }>;
  pendingSubscriptionCheckout: PendingSubscriptionCheckout | null;
  trackPendingSubscription: (pending: PendingSubscriptionCheckout) => void;
  clearPendingSubscription: () => void;
  livePaymentRecordSnapshot: PaymentRecordSnapshot | null;
  ensureBusinessSyncedForCheckout: () => Promise<{
    ok: boolean;
    idToken?: string;
    code?: 'FIREBASE_AUTH_REQUIRED' | 'EMAIL_VERIFICATION_REQUIRED' | 'DEMO_STORE' | 'OWNER_MISMATCH' | 'SYNC_FAILED';
    error?: string;
  }>;
  isPricingPageOpen: boolean;
  setIsPricingPageOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openPricingPage: () => void;
  closePricingPage: () => void;
  isAffiliateModalOpen: boolean;
  setIsAffiliateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Loyalty Program Settings
  loyaltySettings: BusinessLoyaltySettings;
  updateLoyaltySettings: (settings: Partial<BusinessLoyaltySettings>) => Promise<boolean>;

  // Hardware & Printing User Preferences
  autoPrintReceipt: boolean;
  setAutoPrintReceipt: (enabled: boolean) => void;
  toggleAutoPrintReceipt: () => void;
  receiptFormat: '80mm' | '58mm' | 'standard';
  setReceiptFormat: (format: '80mm' | '58mm' | 'standard') => void;
  printerType: 'system' | 'bluetooth';
  setPrinterType: (type: 'system' | 'bluetooth') => void;
  bluetoothPrinterId: string | null;
  bluetoothPrinterName: string | null;
  connectBluetoothPrinter: () => Promise<boolean>;
  setBluetoothPrinter: (id: string | null, name: string | null) => void;

  // Mobile Navigation & Bento Menu State
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;

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
  updateSystemUser: (id: string, updates: Partial<Cashier>) => Promise<boolean>;
  deleteSystemUser: (id: string) => void;
  refreshTenantStaff: (force?: boolean) => Promise<void>;
  isStaffLoading: boolean;

  // Live Role Privileges & Access Control (RBAC)
  rolePermissions: RolePermissionsMap;
  updateRolePermissions: (newPermissions: RolePermissionsMap) => Promise<boolean>;
  can: (permission: PermissionKey, roleOverride?: UserRole | Cashier['role']) => boolean;
  hasPermission: (permission: PermissionKey, roleOverride?: UserRole | Cashier['role']) => boolean;
  resetRolePermissionsToDefault: () => Promise<boolean>;

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

  // Platform & Super Admin Custom Branding (Logo, Favicon, Hero Visual & Industry Cards)
  loginBgGraphic: string | null;
  loginBgGraphicName: string | null;
  setLoginBgGraphic: (
    graphic: string | null,
    name?: string,
    meta?: { width?: number; height?: number; format?: string }
  ) => Promise<void>;
  removeLoginBgGraphic: () => Promise<void>;
  platformLogo: string | null;
  platformLogoName: string | null;
  setPlatformLogo: (
    logo: string | null,
    name?: string,
    meta?: { width?: number; height?: number; format?: string }
  ) => Promise<void>;
  removePlatformLogo: () => Promise<void>;
  platformFavicon: string | null;
  platformFaviconName: string | null;
  setPlatformFavicon: (
    favicon: string | null,
    name?: string,
    meta?: { width?: number; height?: number; format?: string }
  ) => Promise<void>;
  removePlatformFavicon: () => Promise<void>;
  industryImages: Partial<Record<IndustrySolutionId, { url: string; name?: string }>>;
  setIndustryImage: (
    industryId: IndustrySolutionId,
    url: string | null,
    name?: string,
    meta?: { width?: number; height?: number; format?: string }
  ) => Promise<void>;
  removeIndustryImage: (industryId: IndustrySolutionId) => Promise<void>;
  refreshPlatformSettings: () => Promise<boolean>;
  resetAllPlatformBranding: () => Promise<void>;

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
  refreshTenantCategories: (force?: boolean) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'businessId'> & { id?: string }) => Product | null;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  bulkAddProducts: (items: Array<Omit<Product, 'id' | 'businessId'> & { id?: string }>) => number;
  bulkUpdateProducts: (
    items: Array<{ id: string; updates: Partial<Product> }>,
    summaryLabel?: string
  ) => void;
  bulkDeleteProducts: (ids: string[], onSuccess?: () => void) => void;
  adjustStock: (productId: string, locationId: string, newStock: number, reason: string) => void;
  transferStock: (productId: string, fromLocId: string, toLocId: string, quantity: number) => boolean;
  linkProductToSupplier: (productId: string, supplierId: string | null) => Promise<void>;

  // Supplier Management & Supply Chain Oversight
  suppliers: Supplier[];
  selectedSupplier: Supplier | null;
  setSelectedSupplier: (supplier: Supplier | null) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'businessId' | 'createdAt'>) => Promise<Supplier>;
  bulkAddSuppliers: (suppliers: Array<Omit<Supplier, 'id' | 'businessId' | 'createdAt'>>) => Promise<number>;
  bulkUpdateSuppliers: (
    items: Array<{ id: string; updates: Partial<Supplier> }>,
    summaryLabel?: string
  ) => Promise<number>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<boolean>;
  getProductsForSupplier: (supplierId: string) => Product[];
  refreshTenantSuppliers: (force?: boolean) => Promise<void>;
  isSuppliersLoading: boolean;

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
  refreshTenantCustomers: (force?: boolean) => Promise<void>;
  isCustomersLoading: boolean;

  // Barcode Scanning & Unified Unknown-Barcode Workflow
  handleBarcodeScanned: (barcode: string) => {
    success: boolean;
    message: string;
    product?: Product;
    reason?: 'found' | 'not_found' | 'out_of_stock' | 'max_stock' | 'no_shift' | 'empty';
  };
  unknownBarcodePrompt: {
    isOpen: boolean;
    barcode: string | null;
    metadata: ScannerBurstMetadata | null;
    source: 'hardware' | 'camera' | 'search' | 'manual' | null;
  };
  openUnknownBarcodeModal: (
    barcode: string,
    options?: {
      metadata?: ScannerBurstMetadata | null;
      source?: 'hardware' | 'camera' | 'search' | 'manual';
      silent?: boolean;
    }
  ) => void;
  closeUnknownBarcodeModal: () => void;

  // Transactions & Checkout (Scoped to Current Business)
  transactions: Transaction[];
  loadHistoricalTransactions: (startIso: string, endIso: string) => Promise<number>;
  isLoadingOlderTransactions: boolean;
  olderTransactionsLoadedFrom: string | null;

  // Business Intelligence Suite (Daily Rollups, Period Targets, Saved Views)
  analyticsRollups: AnalyticsDailyRollup[];
  analyticsTargets: AnalyticsTarget[];
  analyticsSavedViews: AnalyticsSavedView[];
  isBiSyncing: boolean;
  biLastSyncedAt: string | null;
  syncAnalyticsRollups: (silent?: boolean) => Promise<number>;
  saveAnalyticsTarget: (params: {
    locationId: string;
    periodKey: string;
    revenueTarget: number;
    grossMarginTargetPct: number;
    maxDiscountPct: number;
  }) => Promise<AnalyticsTarget>;
  saveAnalyticsSavedView: (params: {
    id?: string;
    name: string;
    locationId: string;
    preset: TimeRangePreset;
    customStartIso?: string;
    customEndIso?: string;
    focusTab: BiFocusTab;
    chartMetric: BiChartMetric;
    isPinned?: boolean;
  }) => Promise<AnalyticsSavedView>;
  deleteAnalyticsSavedView: (viewId: string) => Promise<void>;

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
      mpesaMode?: string;
      mpesaType?: string;
      mpesaTarget?: string;
      paymentProvider?: 'paystack' | 'daraja';
      paymentReference?: string;
      splitBreakdown?: SplitPaymentTender[];
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
  logAdminActivity: (params: {
    category: AdminActivityCategory;
    action: string;
    description: string;
    recordType?: string;
    recordId?: string;
    adminId?: string;
    adminEmail?: string;
    adminName?: string;
    adminRole?: string;
    beforeValue?: unknown;
    afterValue?: unknown;
  }) => void;

  // Cloud Sync, IndexedDB Outbox & OPFS Snapshots
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncTime: string;
  syncLogs: SyncLogEvent[];
  pendingOfflineCount: number;
  triggerCloudSync: (isSilent?: boolean | unknown) => Promise<void>;
  isStorageHydrated: boolean;
  outboxItems: OutboxMutationEntry[];
  pendingOutboxCount: number;
  deadLetterCount: number;
  storageTelemetry: StorageQuotaTelemetry;
  opfsSnapshots: OpfsSnapshotManifest[];
  retryOutboxItem: (entryId: string) => Promise<void>;
  retryAllDeadLetterItems: () => Promise<void>;
  discardOutboxItem: (entryId: string) => Promise<void>;
  createManualOpfsSnapshot: () => Promise<OpfsSnapshotManifest | null>;
  verifyOpfsSnapshotIntegrity: (fileName: string) => Promise<{
    ok: boolean;
    computedSha256: string;
    expectedSha256: string;
    byteSize: number;
  }>;
  downloadOpfsArchive: (fileName: string) => Promise<boolean>;
  exportFullLocalStore: () => Promise<void>;

  // Firestore Row-Level Security Scoped Database
  isFirestoreConnected: boolean;
  firestoreDbId: string;
  firestoreRlsStatus: string;
  seedTenantDataToFirestoreAction: () => Promise<void>;

  // Shift Management & Cash Drawer Reconciliation
  activeShift: ShiftSession | null;
  interruptedSession: ShiftSession | null;
  shiftHistory: ShiftSession[];
  openShift: (openingFloat: number, notes?: string, denominations?: Record<string, number>, resolveInterrupted?: boolean) => ShiftSession;
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
  toastMessage: { text: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
  toasts: ToastItem[];
  showToast: (text: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  dismissToast: (id: string) => void;

  // Audio Sound FX
  soundFx: typeof soundFx;

  // Internationalization / Localization
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

// Lightweight synchronous boot/UI preference keys retained in localStorage.
// Heavy operational POS entities, logs, branding assets, and the sync outbox reside in IndexedDB + OPFS.
const STORAGE_KEYS = {
  CURRENT_USER: 'sokopos_auth_user_v2',
  IS_LOGGED_OUT: 'sokopos_is_logged_out_v2',
  ACTIVE_BIZ_ID: 'sokopos_active_biz_v2',
  SESSION_CLEAN_EXIT: 'sokopos_session_clean_exit_v1',
  CURRENT_LOC: 'sokopos_curr_loc_v2',
  DARK_MODE: 'sokopos_dark_mode_v2',
  AUTO_PRINT_RECEIPT: 'sokopos_auto_print_receipt_v2',
  RECEIPT_FORMAT: 'sokopos_receipt_format_v2',
  PRINTER_TYPE: 'sokopos_printer_type_v1',
  BLUETOOTH_PRINTER_ID: 'sokopos_bt_printer_id_v1',
  BLUETOOTH_PRINTER_NAME: 'sokopos_bt_printer_name_v1',
  RETAIL_THEME: 'sokopos_retail_theme_v2',
  APPOINTED_DEMO_CASHIER_ID: 'sokopos_appointed_demo_cashier_id_v1',
  IS_DEMO_SESSION: 'sokopos_is_demo_session_v1',
  getTenantAutoPrintKey: (bizId: string) => `sokopos_auto_print_receipt_${bizId || 'default'}_v2`,
  getTenantReceiptFormatKey: (bizId: string) => `sokopos_receipt_format_${bizId || 'default'}_v2`,
  getTenantPrinterTypeKey: (bizId: string) => `sokopos_printer_type_${bizId || 'default'}_v1`,
  getTenantBluetoothPrinterIdKey: (bizId: string) => `sokopos_bt_printer_id_${bizId || 'default'}_v1`,
  getTenantBluetoothPrinterNameKey: (bizId: string) => `sokopos_bt_printer_name_${bizId || 'default'}_v1`,
  getTenantRetailThemeKey: (bizId: string) => `sokopos_retail_theme_${bizId || 'default'}_v2`,
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
  // Localization & Language
  const [language, setLanguage] = useState<string>('en');
  const t = useCallback((key: string, fallback?: string) => {
    return fallback || key;
  }, []);

  // Guard prevents default INITIAL_* state from overwriting IndexedDB before boot hydration completes
  const isIdbHydratedRef = useRef<boolean>(false);
  const [isStorageHydrated, setIsStorageHydrated] = useState<boolean>(false);
  const [outboxItems, setOutboxItems] = useState<OutboxMutationEntry[]>([]);
  const [opfsSnapshots, setOpfsSnapshots] = useState<OpfsSnapshotManifest[]>([]);
  const [storageTelemetry, setStorageTelemetry] = useState<StorageQuotaTelemetry>(() => {
    const opfsSupported = isOpfsSupported();
    return {
      engine: opfsSupported ? 'IndexedDB + OPFS' : 'IndexedDB (OPFS Restricted)',
      usageBytes: 0,
      quotaBytes: 0,
      usagePct: 0,
      opfsSupported,
      migratedFromLocalStorageAt: null,
      migratedKeysCount: 0,
      lastSnapshot: null,
    };
  });

  // 1. Multi-Tenant Business Registry (persisted in IndexedDB)
  const [businesses, setBusinesses] = useState<Business[]>(INITIAL_BUSINESSES);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    saveCollectionRecords('businesses', businesses).catch((err) =>
      console.warn('IndexedDB businesses persist notice:', err)
    );
  }, [businesses]);

  const isOnlineRef = useRef<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const refreshStorageQuotaTelemetry = useCallback(async (overrideLastSnap?: OpfsSnapshotManifest | null) => {
    const quota = await estimateBrowserStorageQuota();
    setStorageTelemetry((prev) => ({
      ...prev,
      usageBytes: quota.usageBytes,
      quotaBytes: quota.quotaBytes,
      usagePct: quota.usagePct,
      lastSnapshot: overrideLastSnap !== undefined ? overrideLastSnap : prev.lastSnapshot,
    }));
  }, []);

  const queueMutationToOutbox = useCallback(
    async (params: {
      businessId: string;
      collectionName: OutboxCollectionName;
      docId: string;
      operation: OutboxOperation;
      payload: Record<string, any>;
      label?: string;
      immediateDispatch?: boolean;
    }) => {
      if (!params.businessId || isDemoBusinessId(params.businessId)) return;
      const entry = buildOutboxEntry(params);
      setOutboxItems((prev) => [entry, ...prev.filter((o) => o.id !== entry.id)]);
      await enqueueOutboxMutations([entry]);

      if (
        params.immediateDispatch !== false &&
        isOnlineRef.current &&
        auth.currentUser &&
        !isFirestoreQuotaCooldownActive()
      ) {
        const res = await flushOutboxMutationToFirestore(entry);
        if (res.status === 'acked') {
          await removeOutboxEntries([entry.id]);
          setOutboxItems((prev) => prev.filter((o) => o.id !== entry.id));
          if (params.collectionName === 'transactions' && params.operation === 'upsert') {
            setAllTransactions((prev) =>
              prev.map((t) =>
                t.id === params.docId
                  ? { ...t, syncedToCloud: true, syncTimestamp: t.syncTimestamp || new Date().toISOString() }
                  : t
              )
            );
          } else if (params.collectionName === 'products' && params.operation === 'upsert') {
            setAllProducts((prev) =>
              prev.map((p) => (p.id === params.docId ? { ...p, isPendingCloudSync: false } : p))
            );
          } else if (params.collectionName === 'locations' && params.operation === 'upsert') {
            setAllLocations((prev) =>
              prev.map((l) => (l.id === params.docId ? { ...l, isPendingCloudSync: false } : l))
            );
          } else if (params.collectionName === 'cashiers' && params.operation === 'upsert') {
            setAllSystemUsers((prev) =>
              prev.map((u) => (u.id === params.docId ? { ...u, isPendingCloudSync: false } : u))
            );
          }
        } else if (res.status === 'failed') {
          const nextAttempts = 1;
          const shouldDeadLetter = !res.retryable || nextAttempts >= entry.maxAttempts;
          const failedEntry: OutboxMutationEntry = {
            ...entry,
            attempts: nextAttempts,
            status: shouldDeadLetter ? 'dead_letter' : 'retry_scheduled',
            nextRetryAt: Date.now() + 5000,
            updatedAt: new Date().toISOString(),
            lastError: res.error,
            errorCode: res.errorCode,
          };
          await enqueueOutboxMutations([failedEntry]);
          setOutboxItems((prev) => [failedEntry, ...prev.filter((o) => o.id !== failedEntry.id)]);
          if (params.collectionName === 'transactions') {
            setAllTransactions((prev) =>
              prev.map((t) => (t.id === params.docId ? { ...t, syncedToCloud: false } : t))
            );
          }
        } else if (res.status === 'skipped_offline_or_quota') {
          const deferredEntry: OutboxMutationEntry = {
            ...entry,
            status: 'retry_scheduled',
            nextRetryAt: Date.now() + 5 * 60 * 1000,
            updatedAt: new Date().toISOString(),
            lastError: res.reason,
            errorCode: 'quota-cooldown',
          };
          await enqueueOutboxMutations([deferredEntry]);
          setOutboxItems((prev) => [deferredEntry, ...prev.filter((o) => o.id !== deferredEntry.id)]);
          if (params.collectionName === 'transactions') {
            setAllTransactions((prev) =>
              prev.map((t) => (t.id === params.docId ? { ...t, syncedToCloud: false } : t))
            );
          }
        }
      }
    },
    []
  );

  // 2. Authentication State
  const [isFirebaseAuthLoading, setIsFirebaseAuthLoading] = useState<boolean>(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // When logged out or visiting clean, currentUser is null.
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
    return null;
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

  // Enforce uniqueness of businesses at both Google email and tenant ID levels.
  // Prioritizes the account last logged into while deleting any conflicts at Firestore level.
  const prioritizeAccountAndPurgeConflicts = async (
    userEmail: string,
    displayName?: string,
    customStoreName?: string
  ): Promise<{ winner: Business; purgedCount: number; isExistingAccount: boolean }> => {
    const normalizedEmail = userEmail.toLowerCase().trim();
    const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();
    const now = new Date().toISOString();

    // Verify strictly against owner's businesses and stable tenant ID (no full-collection scan)
    let candidateBusinesses = [...businesses];
    const remoteBusinessIds = new Set<string>();
    try {
      const stableId = getStableBusinessIdForEmail(normalizedEmail);
      const [ownerMatches, stableBiz] = await Promise.all([
        getBusinessesByOwnerEmailFromFirestore(normalizedEmail),
        getBusinessByIdFromFirestore(stableId),
      ]);
      const remoteBizs = [...ownerMatches, ...(stableBiz ? [stableBiz] : [])];
      if (remoteBizs.length > 0) {
        const map = new Map<string, Business>();
        candidateBusinesses.forEach((b) => map.set(b.id, b));
        remoteBizs.forEach((b) => {
          if (b?.id) remoteBusinessIds.add(b.id);
          map.set(b.id, b);
        });
        candidateBusinesses = Array.from(map.values());
      }
    } catch (err) {
      console.warn('Could not fetch remote businesses for uniqueness check:', err);
    }

    // 1. Find all businesses associated with this email in database or local state
    const emailMatches = candidateBusinesses.filter(
      (b) => b.ownerEmail && b.ownerEmail.toLowerCase().trim() === normalizedEmail
    );

    let winner: Business;
    let conflicts: Business[] = [];
    let isExistingAccount = false;

    if (emailMatches.length > 0) {
      isExistingAccount = true;
      // Sort: prioritize the account last logged into (most recent lastLoginAt, fallback to createdAt)
      const sorted = [...emailMatches].sort((a, b) => {
        const aScore = Math.max(
          a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0,
          a.createdAt ? new Date(a.createdAt).getTime() : 0
        );
        const bScore = Math.max(
          b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0,
          b.createdAt ? new Date(b.createdAt).getTime() : 0
        );
        return bScore - aScore;
      });

      // Maintain existing store identity — each Google account can create only one user account, no duplicates
      winner = { ...sorted[0], lastLoginAt: now };
      conflicts = sorted.slice(1);
    } else if (isSuperAdminEmail) {
      const upfrontBiz = businesses.find((b) => b.id === 'biz-upfront') || INITIAL_BUSINESSES[0];
      winner = { ...upfrontBiz, lastLoginAt: now };
      isExistingAccount = true;
    } else {
      isExistingAccount = false;
      // Self-provision stable business
      const stableBizId = getStableBusinessIdForEmail(normalizedEmail);
      const bizName = customStoreName?.trim() || `${displayName || normalizedEmail.split('@')[0]}'s Store`;
      winner = {
        id: stableBizId,
        name: bizName,
        code: bizName.substring(0, 4).toUpperCase().replace(/\s+/g, ''),
        ownerEmail: normalizedEmail,
        ownerName: displayName || 'Business Owner',
        createdAt: now,
        lastLoginAt: now,
        plan: 'free',
        status: 'active',
        currency: 'KES',
        taxNumber: `P0${Math.floor(100000000 + Math.random() * 900000000)}Z`,
      };
    }

    // 2. Also check if any business conflicts on tenant ID (id)
    const idConflicts = candidateBusinesses.filter(
      (b) => b.id === winner.id && b.ownerEmail && b.ownerEmail.toLowerCase() !== normalizedEmail
    );
    if (idConflicts.length > 0) {
      conflicts.push(...idConflicts);
    }

    // Deduplicate conflicts
    const conflictMap = new Map<string, Business>();
    conflicts.forEach((c) => {
      if (c.id !== winner.id) conflictMap.set(c.id, c);
    });
    const uniqueConflicts = Array.from(conflictMap.values());
    const conflictIds = new Set(uniqueConflicts.map((c) => c.id));

    // 3. Update React state: preserve winner (with updated lastLoginAt), remove all conflicts
    setBusinesses((prev) => {
      const filtered = prev.filter(
        (b) => !conflictIds.has(b.id) && b.ownerEmail.toLowerCase() !== normalizedEmail
      );
      const nextBizs = [...filtered, winner];
      return nextBizs;
    });

    // 4. Sync winner business document to Firestore BEFORE ensuring tenant defaults / user profile writes
    if (auth.currentUser && (auth.currentUser.emailVerified || isSuperAdminEmail)) {
      try {
        if (remoteBusinessIds.has(winner.id) && !isSuperAdminEmail) {
          await updateBusinessInFirestore(winner.id, { lastLoginAt: winner.lastLoginAt });
        } else if (isSuperAdminEmail) {
          await saveBusinessToFirestore(winner);
        } else {
          await ensureBusinessDocInFirestore(winner, normalizedEmail);
        }
      } catch (e) {
        console.warn('Firestore sync winner note:', e);
      }
      if (uniqueConflicts.length > 0) {
        deleteBusinessConflictsFromFirestore(uniqueConflicts).catch((e) => {
          console.warn('Firestore delete conflicts note:', e);
        });
      }
    }

    // Safely invoke ensureTenantDefaults if initialized (runs after winner business doc exists in Firestore)
    try {
      if (typeof ensureTenantDefaults === 'function') {
        ensureTenantDefaults(winner);
      }
    } catch (e) {
      console.warn('Tenant defaults bootstrap notice:', e);
    }

    return { winner, purgedCount: uniqueConflicts.length, isExistingAccount };
  };

  // Firebase Real Connection Validation & Auth State Synchronizer
  useEffect(() => {
    // Safety watchdog: ensure initial loading skeleton resolves within 1200ms even if Firebase auth is delayed in iframe
    const watchdogTimer = setTimeout(() => {
      setIsFirebaseAuthLoading(false);
    }, 1200);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      clearTimeout(watchdogTimer);
      setFirebaseUser(fbUser);
      if (!fbUser || !fbUser.email) {
        setIsFirebaseAuthLoading(false);
        return;
      }

      // If user explicitly signed out, do not auto-login
      const isExplicitlyLoggedOut = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_OUT) === 'true';
      if (isExplicitlyLoggedOut) {
        setIsFirebaseAuthLoading(false);
        return;
      }
      // Clear logged out flag since an authentic Firebase user is active
      localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_OUT);

      setIsFirebaseAuthLoading(true);
      try {
        const normalizedEmail = fbUser.email.toLowerCase().trim();
        const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();

        // Enforce email verification gate before granting tenant access or writing to Firestore
        if (!fbUser.emailVerified && !isSuperAdminEmail) {
          setPendingVerificationEmail(fbUser.email);
          return;
        }

        setPendingVerificationEmail(null);

        const idToken = await fbUser.getIdToken();
        const tokenResult = await fbUser.getIdTokenResult();
        const expirationTime = new Date(tokenResult.expirationTime).getTime();

        const pendingStoreName = sessionStorage.getItem('sokopos_pending_store_name') || undefined;
        if (pendingStoreName) {
          sessionStorage.removeItem('sokopos_pending_store_name');
        }

        // Prioritize account last logged into & ensure business doc exists in Firestore before subscribing
        const { winner: matchedBiz } = await prioritizeAccountAndPurgeConflicts(
          normalizedEmail,
          fbUser.displayName || undefined,
          pendingStoreName
        );

        const targetBizId = isSuperAdminEmail ? 'biz-upfront' : matchedBiz.id;

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

        await saveUserProfileToFirestore({
          uid: fbUser.uid,
          email: fbUser.email,
          role,
          businessId: targetBizId,
          displayName: fbUser.displayName || '',
        });

        setCurrentUser(authUser);
        setActiveBusinessIdState(targetBizId);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, targetBizId);
      } catch (tokenErr) {
        console.error('Error obtaining Firebase ID token:', tokenErr);
      } finally {
        setIsFirebaseAuthLoading(false);
      }
    });

    return () => {
      clearTimeout(watchdogTimer);
      unsubscribe();
    };
  }, []);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAuthenticated = Boolean(currentUser);

  // 3. Active Business Scoping
  const [activeBusinessIdState, setActiveBusinessIdState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_BIZ_ID);
    if (saved && saved !== 'biz-soko' && saved !== 'biz-quickmart') return saved;
    return currentUser?.businessId || INITIAL_BUSINESSES[0].id;
  });

  // Automatic System Cleanup: Purge all accounts and data lacking a real Google account once IndexedDB finishes hydrating
  useEffect(() => {
    if (!isStorageHydrated) return;

    const unverifiedIds = new Set<string>();
    businesses.forEach((b) => {
      if (b.id !== 'biz-demo' && (!isRealGoogleAccount(b.ownerEmail) || b.id === 'biz-soko' || b.id === 'biz-quickmart')) {
        unverifiedIds.add(b.id);
      }
    });
    unverifiedIds.add('biz-soko');
    unverifiedIds.add('biz-quickmart');
    unverifiedIds.delete('biz-demo');

    const validBusinesses = businesses.filter((b) => !unverifiedIds.has(b.id));
    const nextBizs = validBusinesses.length > 0 ? validBusinesses : INITIAL_BUSINESSES;

    if (businesses.length !== validBusinesses.length || unverifiedIds.has(activeBusinessIdState)) {
      setBusinesses(nextBizs);

      if (unverifiedIds.has(activeBusinessIdState)) {
        setActiveBusinessIdState('biz-upfront');
        localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, 'biz-upfront');
      }

      setAllSystemUsers((prev) => prev.filter((u) => !unverifiedIds.has(u.businessId)));
      setAllLocations((prev) => prev.filter((l) => !unverifiedIds.has(l.businessId)));
      setAllProducts((prev) => prev.filter((p) => !unverifiedIds.has(p.businessId)));
      setAllCategories((prev) => prev.filter((c) => !unverifiedIds.has(c.businessId)));
      setAllTransactions((prev) => prev.filter((t) => !unverifiedIds.has(t.businessId)));
      setAllCustomers((prev) => prev.filter((c) => !unverifiedIds.has(c.businessId)));
      setAllShifts((prev) => prev.filter((s) => !unverifiedIds.has(s.businessId)));

      if (auth.currentUser) {
        for (const bId of unverifiedIds) {
          deleteBusinessFromFirestore(bId).catch((e) => console.warn('Clean startup biz from firestore:', e));
          purgeTenantAllDataFromFirestore(bId).catch((e) => console.warn('Clean startup tenant data from firestore:', e));
        }
      }
    }
  }, [isStorageHydrated]);

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

  // 4. Toast notifications (Framer Motion stack)
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const existingTimer = toastTimersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      text: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'success',
      duration: number = 3600
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = Date.now();

      setToasts((prev) => {
        // Deduplicate identical message triggered within 600ms
        const recentDup = prev.find((item) => item.text === text && now - item.createdAt < 600);
        if (recentDup) return prev;
        const next = [...prev, { id, text, type, duration, createdAt: now }];
        // Keep at most 4 stacked toasts
        return next.slice(-4);
      });

      const timer = setTimeout(() => {
        toastTimersRef.current.delete(id);
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, duration);
      toastTimersRef.current.set(id, timer);
    },
    []
  );

  const toastMessage = toasts.length > 0 ? toasts[toasts.length - 1] : null;

  // 4b. Appointed Public Demo Cashier State (Configured by Super Admin)
  const [appointedDemoCashierId, setAppointedDemoCashierId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APPOINTED_DEMO_CASHIER_ID);
    if (saved) return saved;
    return currentBusiness?.appointedDemoCashierId || DEFAULT_APPOINTED_DEMO_CASHIER_ID;
  });

  const isDemoSession = Boolean(currentUser?.isDemoSession || activeBusinessId === 'biz-demo');

  const requiresLegalConsent = useMemo(() => {
    if (!currentUser || !isStorageHydrated || isFirebaseAuthLoading) return false;
    if (isSuperAdmin || isDemoSession) return false;
    if (!currentBusiness?.id || currentBusiness.id === 'biz-demo' || currentBusiness.id === 'biz-upfront') {
      return false;
    }
    return !hasValidBusinessLegalConsent(currentBusiness.legalConsent);
  }, [
    currentUser,
    isStorageHydrated,
    isFirebaseAuthLoading,
    isSuperAdmin,
    isDemoSession,
    currentBusiness?.id,
    currentBusiness?.legalConsent,
  ]);

  // 4c. Pricing Architecture & Subscription Entitlement Engine (persisted in IndexedDB)
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(DEFAULT_PRICING_TIERS);
  const [pricingSyncStatus, setPricingSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const [pricingSyncError, setPricingSyncError] = useState<string | null>(null);
  const pricingTiersRef = useRef<PricingTier[]>(pricingTiers);
  const pricingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPricingToastAtRef = useRef<number>(0);

  useEffect(() => {
    pricingTiersRef.current = pricingTiers;
    if (!isIdbHydratedRef.current) return;
    saveCollectionRecords('pricing_tiers', pricingTiers).catch((err) =>
      console.warn('IndexedDB pricing tiers persist notice:', err)
    );
  }, [pricingTiers]);

  // Live Firestore real-time subscription so Super Admin price edits propagate instantly to all devices
  useEffect(() => {
    const unsubscribe = subscribeToPricingTiers(
      ({ tiers, updatedAt }) => {
        if (pricingSaveTimerRef.current) {
          // Local debounce save is still in flight; skip overwriting active edits
          return;
        }
        pricingTiersRef.current = tiers;
        setPricingTiers(tiers);
        if (updatedAt) {
          setPricingSyncStatus('synced');
          setPricingSyncError(null);
        }
      },
      (errMsg) => {
        setPricingSyncError(errMsg);
      }
    );
    return () => {
      unsubscribe();
      if (pricingSaveTimerRef.current) {
        clearTimeout(pricingSaveTimerRef.current);
        pricingSaveTimerRef.current = null;
      }
    };
  }, []);

  const persistPricingTiersSnapshot = useCallback(
    async (tiersToSave: PricingTier[], toastMessageText?: string) => {
      setPricingSyncStatus('saving');
      setPricingSyncError(null);
      const res = await savePricingTiersToFirestore(
        tiersToSave,
        auth.currentUser?.email || currentUser?.email || SUPER_ADMIN_EMAIL
      );
      if (res.ok) {
        setPricingSyncStatus('synced');
        setPricingSyncError(null);
        const now = Date.now();
        if (toastMessageText && now - lastPricingToastAtRef.current > 2000) {
          lastPricingToastAtRef.current = now;
          showToast(toastMessageText, 'success');
        }
      } else {
        setPricingSyncStatus('error');
        setPricingSyncError(res.error || 'Cloud sync requires verified Super Admin Google sign-in.');
        const now = Date.now();
        if (now - lastPricingToastAtRef.current > 4000) {
          lastPricingToastAtRef.current = now;
          showToast(
            `Saved locally, but cloud pricing sync failed: ${res.error || 'Verify Super Admin sign-in.'}`,
            'warning'
          );
        }
      }
    },
    [currentUser?.email, showToast]
  );

  const updatePricingTier = useCallback(
    (tierId: string, updates: Partial<PricingTier>) => {
      const nextTiers = pricingTiersRef.current.map((t) =>
        t.id === tierId ? { ...t, ...updates } : t
      );
      pricingTiersRef.current = nextTiers;
      setPricingTiers(nextTiers);
      setPricingSyncStatus('saving');
      setPricingSyncError(null);

      if (pricingSaveTimerRef.current) {
        clearTimeout(pricingSaveTimerRef.current);
      }
      pricingSaveTimerRef.current = setTimeout(() => {
        pricingSaveTimerRef.current = null;
        void persistPricingTiersSnapshot(
          pricingTiersRef.current,
          'Pricing updated and synced live to all devices'
        );
      }, 500);
    },
    [persistPricingTiersSnapshot]
  );

  const resetPricingTiersToDefault = useCallback(() => {
    if (pricingSaveTimerRef.current) {
      clearTimeout(pricingSaveTimerRef.current);
      pricingSaveTimerRef.current = null;
    }
    pricingTiersRef.current = DEFAULT_PRICING_TIERS;
    setPricingTiers(DEFAULT_PRICING_TIERS);
    void persistPricingTiersSnapshot(
      DEFAULT_PRICING_TIERS,
      'Pricing tiers reset to defaults and synced globally'
    );
  }, [persistPricingTiersSnapshot]);

  const entitlements = useMemo<SubscriptionEntitlements>(
    () => resolveBusinessEntitlements(currentBusiness, pricingTiers),
    [currentBusiness, pricingTiers]
  );

  const [upgradePrompt, setUpgradePrompt] = useState<UpgradePromptRequest | null>(null);

  const openUpgradePrompt = useCallback((req: UpgradePromptRequest) => {
    setUpgradePrompt(req);
  }, []);

  const closeUpgradePrompt = useCallback(() => {
    setUpgradePrompt(null);
  }, []);

  const requireCapability = useCallback(
    (cap: SubscriptionCapabilityKey, customContext?: Partial<UpgradePromptRequest>): boolean => {
      if (isSuperAdmin || entitlements.capabilities[cap]) {
        return true;
      }
      const meta = CAPABILITY_LABELS[cap];
      const requiredTier = customContext?.requiredTier || CAPABILITY_MIN_TIER[cap];
      soundFx.playError();
      setUpgradePrompt({
        title: customContext?.title || meta.title,
        description: customContext?.description || meta.description,
        requiredTier,
        featureLabel: customContext?.featureLabel || meta.title,
        quotaMetric: customContext?.quotaMetric,
      });
      return false;
    },
    [isSuperAdmin, entitlements.capabilities]
  );

  // Tenant Loyalty Points Configuration (Controlled by Store Owner)
  const loyaltySettings: BusinessLoyaltySettings = useMemo(() => {
    return {
      ...DEFAULT_LOYALTY_SETTINGS,
      ...(currentBusiness?.loyaltySettings || {}),
    };
  }, [currentBusiness?.loyaltySettings]);

  const updateLoyaltySettings = async (settings: Partial<BusinessLoyaltySettings>): Promise<boolean> => {
    if (!currentBusiness) return false;
    if (!isSuperAdmin && !requireCapability('loyaltyAndStoreCredit')) {
      return false;
    }
    const nextLoyalty: BusinessLoyaltySettings = {
      ...loyaltySettings,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.email || currentUser?.name,
    };
    updateBusinessProfile({ loyaltySettings: nextLoyalty });
    return true;
  };

  // 5. Super-Admin Audit Log (persisted in IndexedDB)
  const [superAdminAuditLogs, setSuperAdminAuditLogs] = useState<SuperAdminAuditEntry[]>(
    INITIAL_SUPER_ADMIN_AUDIT_LOGS
  );

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    saveCollectionRecords('super_admin_audit', superAdminAuditLogs.slice(0, 500)).catch((err) =>
      console.warn('IndexedDB super admin audit persist notice:', err)
    );
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

  // 5.5 Back-office & Administrative Activity Logging (Edge Case 5, persisted in IndexedDB)
  const [adminActivityLogs, setAdminActivityLogs] = useState<AdminActivityEntry[]>([]);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    saveCollectionRecords('admin_activity_logs', adminActivityLogs.slice(0, 500)).catch((err) =>
      console.warn('IndexedDB admin activity persist notice:', err)
    );
  }, [adminActivityLogs]);

  const logAdminActivity = useCallback(
    (params: {
      category: AdminActivityCategory;
      action: string;
      description: string;
      recordType?: string;
      recordId?: string;
      adminId?: string;
      adminEmail?: string;
      adminName?: string;
      adminRole?: string;
      beforeValue?: unknown;
      afterValue?: unknown;
    }) => {
      const targetBiz = businesses.find((b) => b.id === activeBusinessId);
      const newEntry: AdminActivityEntry = {
        id: `admin-act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        businessId: activeBusinessId,
        businessName: targetBiz?.name || activeBusinessId,
        category: params.category,
        action: params.action,
        description: params.description,
        adminId: params.adminId || currentUser?.id || 'admin-system',
        adminEmail: params.adminEmail || currentUser?.email || (isSuperAdmin ? SUPER_ADMIN_EMAIL : 'admin@sokopos.co.ke'),
        adminName: params.adminName || currentUser?.name || 'Administrator',
        adminRole: params.adminRole || currentUser?.role || 'business_owner',
        recordType: params.recordType || 'general',
        recordId: params.recordId || 'general',
        beforeValue: params.beforeValue ? JSON.parse(JSON.stringify(params.beforeValue)) : null,
        afterValue: params.afterValue ? JSON.parse(JSON.stringify(params.afterValue)) : null,
        isAdministrative: true,
      };
      setAdminActivityLogs((prev) => [newEntry, ...prev]);
    },
    [activeBusinessId, businesses, currentUser, isSuperAdmin]
  );

  // 5.6 Supervisor Overrides Logging (Edge Case 1, persisted in IndexedDB)
  const [supervisorOverrideLogs, setSupervisorOverrideLogs] = useState<SupervisorOverrideAuditEntry[]>([]);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    saveCollectionRecords('supervisor_overrides', supervisorOverrideLogs.slice(0, 500)).catch((err) =>
      console.warn('IndexedDB overrides persist notice:', err)
    );
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

  // 5.7 Voids Management & Attribution (Edge Case 1, persisted in IndexedDB)
  const [voidRecords, setVoidRecords] = useState<VoidRecord[]>([]);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    saveCollectionRecords('void_records', voidRecords.slice(0, 500)).catch((err) =>
      console.warn('IndexedDB void records persist notice:', err)
    );
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

  // Platform & Super Admin Custom Branding (large Base64 assets stored in IndexedDB `kv_large`)
  const [loginBgGraphic, setLoginBgGraphicState] = useState<string | null>(null);
  const [loginBgGraphicName, setLoginBgGraphicName] = useState<string | null>(null);

  const [platformLogo, setPlatformLogoState] = useState<string | null>(null);
  const [platformLogoName, setPlatformLogoName] = useState<string | null>(null);

  const [platformFavicon, setPlatformFaviconState] = useState<string | null>(null);
  const [platformFaviconName, setPlatformFaviconName] = useState<string | null>(null);

  const [industryImages, setIndustryImagesState] = useState<
    Partial<Record<IndustrySolutionId, { url: string; name?: string }>>
  >({});

  // Automatically update the document favicon in HTML head
  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (platformFavicon) {
      link.href = platformFavicon;
    } else {
      // Default SokoPoS favicon: rounded blue badge with crisp bold 'S'
      link.href =
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%232563eb"/><text x="16" y="23" font-size="20" font-family="sans-serif" font-weight="900" fill="white" text-anchor="middle">S</text></svg>';
    }
  }, [platformFavicon]);

  const applyFetchedPlatformSettings = useCallback((settings: NonNullable<Awaited<ReturnType<typeof getPlatformSettingsFromFirestore>>>) => {
    if (settings.loginBgGraphic !== undefined) {
      setLoginBgGraphicState(settings.loginBgGraphic);
      saveLargeKvAsset('login_bg_graphic', settings.loginBgGraphic || null, settings.loginBgGraphicName || null).catch(() => {});
    }
    if (settings.loginBgGraphicName !== undefined) {
      setLoginBgGraphicName(settings.loginBgGraphicName || null);
    }

    if (settings.platformLogo !== undefined) {
      setPlatformLogoState(settings.platformLogo);
      saveLargeKvAsset('platform_logo', settings.platformLogo || null, settings.platformLogoName || null).catch(() => {});
    }
    if (settings.platformLogoName !== undefined) {
      setPlatformLogoName(settings.platformLogoName || null);
    }

    if (settings.platformFavicon !== undefined) {
      setPlatformFaviconState(settings.platformFavicon);
      saveLargeKvAsset('platform_favicon', settings.platformFavicon || null, settings.platformFaviconName || null).catch(() => {});
    }
    if (settings.platformFaviconName !== undefined) {
      setPlatformFaviconName(settings.platformFaviconName || null);
    }

    if (settings.industryImages) {
      setIndustryImagesState((prev) => {
        const next = { ...prev };
        const ids: IndustrySolutionId[] = ['retail', 'bars', 'supermarkets', 'pharmacies'];
        for (const id of ids) {
          const entry = settings.industryImages?.[id];
          if (entry !== undefined) {
            if (entry.url) {
              next[id] = { url: entry.url, name: entry.name };
              saveLargeKvAsset(`industry_img_${id}`, entry.url, entry.name || null).catch(() => {});
            } else {
              delete next[id];
              saveLargeKvAsset(`industry_img_${id}`, null).catch(() => {});
            }
          }
        }
        return next;
      });
    }
  }, []);

  // Automatically load and sync global & per-slot platform settings from Firestore on boot
  useEffect(() => {
    let isMounted = true;
    getPlatformSettingsFromFirestore()
      .then((settings) => {
        if (!isMounted || !settings) return;
        applyFetchedPlatformSettings(settings);
      })
      .catch((err) => console.warn('Could not fetch platform branding settings:', err));

    return () => {
      isMounted = false;
    };
  }, [applyFetchedPlatformSettings]);

  const setLoginBgGraphic = useCallback(
    async (
      graphic: string | null,
      name?: string,
      meta?: { width?: number; height?: number; format?: string }
    ) => {
      const prev = loginBgGraphic;
      setLoginBgGraphicState(graphic);
      setLoginBgGraphicName(name || null);
      await saveLargeKvAsset('login_bg_graphic', graphic, name || null).catch((err) =>
        console.warn('IndexedDB hero image save notice:', err)
      );

      const cloudResult = await saveBrandingSlotToFirestore({
        slotId: 'hero',
        assetUrl: graphic,
        assetName: name || '',
        width: meta?.width,
        height: meta?.height,
        format: meta?.format,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || (isSuperAdmin ? SUPER_ADMIN_EMAIL : 'super_admin'),
      });

      logSuperAdminAction(
        'platform',
        'business',
        'platform-branding-login-bg',
        'update',
        graphic
          ? `Configured custom hero showcase visual (${name || 'custom'})`
          : 'Removed custom hero showcase visual; reverted to default Kenyan POS image',
        { loginBgGraphic: prev ? 'custom-image' : null },
        { loginBgGraphic: graphic ? 'custom-image' : null, name }
      );

      if (!cloudResult.ok) {
        showToast(
          `Applied locally, but cloud sync could not complete: ${cloudResult.error || 'Verify Super Admin Google sign-in.'}`,
          'warning'
        );
        return;
      }

      showToast(
        graphic
          ? 'Hero showcase image applied & synced across public pages'
          : 'Hero showcase visual reverted to curated default.',
        'success'
      );
    },
    [currentUser?.email, isSuperAdmin, logSuperAdminAction, loginBgGraphic, showToast]
  );

  const removeLoginBgGraphic = useCallback(async () => {
    await setLoginBgGraphic(null);
  }, [setLoginBgGraphic]);

  const setPlatformLogo = useCallback(
    async (
      logo: string | null,
      name?: string,
      meta?: { width?: number; height?: number; format?: string }
    ) => {
      const prev = platformLogo;
      setPlatformLogoState(logo);
      setPlatformLogoName(name || null);
      await saveLargeKvAsset('platform_logo', logo, name || null).catch((err) =>
        console.warn('IndexedDB platform logo save notice:', err)
      );

      const cloudResult = await saveBrandingSlotToFirestore({
        slotId: 'logo',
        assetUrl: logo,
        assetName: name || '',
        width: meta?.width,
        height: meta?.height,
        format: meta?.format,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || (isSuperAdmin ? SUPER_ADMIN_EMAIL : 'super_admin'),
      });

      logSuperAdminAction(
        'platform',
        'business',
        'platform-branding-logo',
        'update',
        logo
          ? `Configured custom platform logo (${name || 'custom logo'})`
          : 'Removed custom platform logo; reverted to default SokoPoS typography setup',
        { platformLogo: prev ? 'custom-logo' : null },
        { platformLogo: logo ? 'custom-logo' : null, name }
      );

      if (!cloudResult.ok) {
        showToast(
          `Logo applied locally, but cloud sync could not complete: ${cloudResult.error || 'Verify Super Admin Google sign-in.'}`,
          'warning'
        );
        return;
      }

      showToast(
        logo
          ? 'Platform brand logo applied & synced across POS headers'
          : 'Platform logo removed. Reverted to default SokoPoS brand setup.',
        'success'
      );
    },
    [currentUser?.email, isSuperAdmin, logSuperAdminAction, platformLogo, showToast]
  );

  const removePlatformLogo = useCallback(async () => {
    await setPlatformLogo(null);
  }, [setPlatformLogo]);

  const setPlatformFavicon = useCallback(
    async (
      favicon: string | null,
      name?: string,
      meta?: { width?: number; height?: number; format?: string }
    ) => {
      const prev = platformFavicon;
      setPlatformFaviconState(favicon);
      setPlatformFaviconName(name || null);
      await saveLargeKvAsset('platform_favicon', favicon, name || null).catch((err) =>
        console.warn('IndexedDB platform favicon save notice:', err)
      );

      const cloudResult = await saveBrandingSlotToFirestore({
        slotId: 'favicon',
        assetUrl: favicon,
        assetName: name || '',
        width: meta?.width,
        height: meta?.height,
        format: meta?.format,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || (isSuperAdmin ? SUPER_ADMIN_EMAIL : 'super_admin'),
      });

      logSuperAdminAction(
        'platform',
        'business',
        'platform-branding-favicon',
        'update',
        favicon
          ? `Configured custom platform favicon (${name || 'custom favicon'})`
          : 'Removed custom platform favicon; reverted to default SokoPoS favicon setup',
        { platformFavicon: prev ? 'custom-favicon' : null },
        { platformFavicon: favicon ? 'custom-favicon' : null, name }
      );

      if (!cloudResult.ok) {
        showToast(
          `Favicon applied locally, but cloud sync could not complete: ${cloudResult.error || 'Verify Super Admin Google sign-in.'}`,
          'warning'
        );
        return;
      }

      showToast(
        favicon
          ? 'Platform favicon applied & synced to browser tabs'
          : 'Platform favicon removed. Reverted to default SokoPoS icon setup.',
        'success'
      );
    },
    [currentUser?.email, isSuperAdmin, logSuperAdminAction, platformFavicon, showToast]
  );

  const removePlatformFavicon = useCallback(async () => {
    await setPlatformFavicon(null);
  }, [setPlatformFavicon]);

  const setIndustryImage = useCallback(
    async (
      industryId: IndustrySolutionId,
      url: string | null,
      name?: string,
      meta?: { width?: number; height?: number; format?: string }
    ) => {
      const slotMap: Record<IndustrySolutionId, BrandingSlotId> = {
        retail: 'industry_retail',
        bars: 'industry_bars',
        supermarkets: 'industry_supermarkets',
        pharmacies: 'industry_pharmacies',
      };
      const slotId = slotMap[industryId];
      const prevUrl = industryImages[industryId]?.url || null;

      setIndustryImagesState((prev) => {
        const next = { ...prev };
        if (url) {
          next[industryId] = { url, name };
        } else {
          delete next[industryId];
        }
        return next;
      });

      await saveLargeKvAsset(`industry_img_${industryId}`, url, name || null).catch((err) =>
        console.warn(`IndexedDB industry image save (${industryId}) notice:`, err)
      );

      const cloudResult = await saveBrandingSlotToFirestore({
        slotId,
        assetUrl: url,
        assetName: name || '',
        width: meta?.width,
        height: meta?.height,
        format: meta?.format,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || (isSuperAdmin ? SUPER_ADMIN_EMAIL : 'super_admin'),
      });

      logSuperAdminAction(
        'platform',
        'business',
        `platform-branding-${slotId}`,
        'update',
        url
          ? `Configured custom ${industryId} industry photo (${name || 'custom'})`
          : `Reverted ${industryId} industry photo to default curated visual`,
        { [slotId]: prevUrl ? 'custom-image' : null },
        { [slotId]: url ? 'custom-image' : null, name }
      );

      if (!cloudResult.ok) {
        showToast(
          `Applied locally, but cloud sync could not complete: ${cloudResult.error || 'Verify Super Admin Google sign-in.'}`,
          'warning'
        );
        return;
      }

      showToast(
        url
          ? `Custom ${industryId} card photo applied & synced`
          : `Reverted ${industryId} card photo to Kenyan default`,
        'success'
      );
    },
    [currentUser?.email, industryImages, isSuperAdmin, logSuperAdminAction, showToast]
  );

  const removeIndustryImage = useCallback(
    async (industryId: IndustrySolutionId) => {
      await setIndustryImage(industryId, null);
    },
    [setIndustryImage]
  );

  const refreshPlatformSettings = useCallback(async (): Promise<boolean> => {
    try {
      const settings = await getPlatformSettingsFromFirestore(true);
      if (!settings) return false;

      applyFetchedPlatformSettings(settings);
      showToast('Platform branding synced from Firestore', 'success');
      return true;
    } catch {
      showToast('Could not refresh platform branding from Firestore.', 'warning');
      return false;
    }
  }, [applyFetchedPlatformSettings, showToast]);

  const resetAllPlatformBranding = useCallback(async () => {
    const hadAny = Boolean(
      platformLogo ||
        platformFavicon ||
        loginBgGraphic ||
        Object.keys(industryImages).length > 0
    );
    setLoginBgGraphicState(null);
    setLoginBgGraphicName(null);
    setPlatformLogoState(null);
    setPlatformLogoName(null);
    setPlatformFaviconState(null);
    setPlatformFaviconName(null);
    setIndustryImagesState({});

    await clearAllLargeBrandingKv().catch(() => {});

    const cloudResult = await clearAllBrandingSlotsInFirestore(
      currentUser?.email || (isSuperAdmin ? SUPER_ADMIN_EMAIL : 'super_admin')
    );

    if (hadAny) {
      logSuperAdminAction(
        'platform',
        'business',
        'platform-branding-reset-all',
        'update',
        'Reset all custom platform branding assets (logo, favicon, hero visual, and industry cards) to defaults',
        { hadCustomAssets: true },
        { loginBgGraphic: null, platformLogo: null, platformFavicon: null, industryImages: {} }
      );
    }

    if (!cloudResult.ok) {
      showToast(
        `Defaults restored locally, but cloud sync could not complete: ${cloudResult.error || 'Verify Super Admin Google sign-in.'}`,
        'warning'
      );
      return;
    }

    showToast('All platform branding assets reset to SokoPoS defaults', 'success');
  }, [
    currentUser?.email,
    industryImages,
    isSuperAdmin,
    logSuperAdminAction,
    loginBgGraphic,
    platformFavicon,
    platformLogo,
    showToast,
  ]);

  // 7. Multi-Tenant Locations Store (persisted in IndexedDB)
  const [allLocations, setAllLocations] = useState<Location[]>(INITIAL_LOCATIONS);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    syncNormalizedStoreRecords('locations', allLocations).catch((err) =>
      console.warn('IndexedDB locations persist notice:', err)
    );
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
    if (!isSuperAdmin && isQuotaAtOrAboveLimit(locations.length, entitlements.limits.maxBranches)) {
      soundFx.playError();
      const nextRequiredTier = getRequiredTierForBranchCount(locations.length + 1);
      openUpgradePrompt({
        title: 'Store Branch Limit Reached',
        description: `Your ${entitlements.tierName} plan supports up to ${entitlements.limits.maxBranches} store branch${entitlements.limits.maxBranches === 1 ? '' : 'es'}. Upgrade to ${formatTierDisplayName(nextRequiredTier)} to add another branch.`,
        requiredTier: nextRequiredTier,
        featureLabel: 'Multi-Branch Store Locations',
        quotaMetric: {
          label: 'Store Branches',
          used: locations.length,
          limit: entitlements.limits.maxBranches,
        },
      });
      return;
    }

    const newLoc: Location = {
      ...loc,
      id: `loc-${Date.now()}`,
      businessId: activeBusinessId,
      isOnline: true,
      lastSynced: new Date().toISOString(),
      isPendingCloudSync: !isOnline,
    };
    setAllLocations((prev) => [...prev, newLoc]);
    void queueMutationToOutbox({
      businessId: activeBusinessId,
      collectionName: 'locations',
      docId: newLoc.id,
      operation: 'upsert',
      payload: newLoc,
      label: `Branch ${newLoc.name}`,
    });
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
      isPendingCloudSync: !isOnline,
    };
    setAllLocations((prev) =>
      prev.map((l) => (l.id === id ? updatedLoc : l))
    );
    void queueMutationToOutbox({
      businessId: oldLoc.businessId || activeBusinessId,
      collectionName: 'locations',
      docId: id,
      operation: 'upsert',
      payload: updatedLoc,
      label: `Branch ${updatedLoc.name}`,
    });
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
        void queueMutationToOutbox({
          businessId: targetLoc.businessId || activeBusinessId,
          collectionName: 'locations',
          docId: id,
          operation: 'delete',
          payload: { id, businessId: targetLoc.businessId || activeBusinessId },
          label: `Delete branch ${targetLoc.name}`,
        });
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

  // 8. Multi-Tenant System Users Store (Staff, persisted in IndexedDB)
  const [allSystemUsers, setAllSystemUsers] = useState<Cashier[]>(INITIAL_SYSTEM_USERS);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    syncNormalizedStoreRecords('system_users', allSystemUsers).catch((err) =>
      console.warn('IndexedDB system users persist notice:', err)
    );
  }, [allSystemUsers]);

  // Scoped System Users for active tenant
  const systemUsers = useMemo(() => {
    return allSystemUsers.filter((u) => u.businessId === activeBusinessId);
  }, [allSystemUsers, activeBusinessId]);

  // Appointed Public Demo Cashier Profile (resolved from system users)
  const appointedDemoCashier = useMemo<Cashier | null>(() => {
    return (
      allSystemUsers.find((u) => u.id === appointedDemoCashierId) ||
      allSystemUsers.find((u) => u.code === '#7000') ||
      allSystemUsers.find((u) => u.role === 'cashier') ||
      INITIAL_SYSTEM_USERS[0] ||
      null
    );
  }, [allSystemUsers, appointedDemoCashierId]);

  const appointDemoCashier = useCallback(
    (cashierId: string) => {
      const target = allSystemUsers.find((u) => u.id === cashierId);
      if (!target) return;
      setAppointedDemoCashierId(cashierId);
      localStorage.setItem(STORAGE_KEYS.APPOINTED_DEMO_CASHIER_ID, cashierId);

      // Save to current business profile
      setBusinesses((prev) =>
        prev.map((b) => (b.id === activeBusinessId ? { ...b, appointedDemoCashierId: cashierId } : b))
      );

      // Tag in-memory system users
      setAllSystemUsers((prev) =>
        prev.map((u) => ({
          ...u,
          isAppointedDemo: u.id === cashierId,
        }))
      );

      soundFx.playBarcodeBeep();
      showToast(`"${target.name}" (${target.code}) appointed as the public demo cashier profile.`, 'success');
    },
    [allSystemUsers, activeBusinessId, showToast, soundFx]
  );

  // Auto-upgrade any legacy unhashed staff PINs stored in localStorage to server Bcrypt hashes
  useEffect(() => {
    const unhashedUsers = allSystemUsers.filter(
      (u) => u.pin && !isProtectedPin(u.pin) && !isBcryptHash(u.pin)
    );
    if (unhashedUsers.length > 0 && auth.currentUser) {
      auth.currentUser
        .getIdToken()
        .then((idToken) =>
          fetch(resolveApiUrl('/api/auth/bulk-hash-pins'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              items: unhashedUsers.map((u) => ({ id: u.id, pin: u.pin })),
            }),
          })
        )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.results && Array.isArray(data.results)) {
            const hashMap = new Map<string, string>(data.results.map((r: any) => [String(r.id), String(r.hash)]));
            setAllSystemUsers((prev) =>
              prev.map((u) => {
                const newHash = hashMap.get(u.id);
                if (newHash) {
                  return { ...u, pin: String(newHash) };
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
      const canWriteTenantDefaults = Boolean(
        isOnline &&
          auth.currentUser &&
          (auth.currentUser.emailVerified ||
            auth.currentUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) &&
          (auth.currentUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ||
            biz.ownerEmail?.toLowerCase() === auth.currentUser.email?.toLowerCase())
      );
      if (canWriteTenantDefaults) {
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
      const canWriteCashier = Boolean(
        auth.currentUser &&
          (auth.currentUser.emailVerified ||
            auth.currentUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) &&
          (auth.currentUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ||
            biz.ownerEmail?.toLowerCase() === auth.currentUser.email?.toLowerCase())
      );
      if (canWriteCashier) {
        saveCashierToFirestore(ownerStaff).catch((e) => console.warn('Sync default owner user:', e));
      }
      return [...prevUsers, ownerStaff];
    });
  }, []);

  const healedTenantsRef = useRef<Set<string>>(new Set());

  // Auto-heal active business defaults on initial load and whenever active business changes
  useEffect(() => {
    if (currentBusiness && currentBusiness.id && currentBusiness.id !== 'biz-upfront') {
      if (!healedTenantsRef.current.has(currentBusiness.id)) {
        healedTenantsRef.current.add(currentBusiness.id);
        ensureTenantDefaults(currentBusiness);
      }
    }
  }, [currentBusiness?.id, ensureTenantDefaults]);

  const createSystemUser = async (user: Omit<Cashier, 'id' | 'businessId'>): Promise<boolean> => {
    // Only authenticated business owners or super-admin can create system users
    if (!currentUser || (currentUser.role !== 'business_owner' && currentUser.role !== 'super_admin')) {
      showToast('Unauthorized: Only a business owner or administrator can create system users.', 'error');
      return false;
    }

    if (!isSuperAdmin && isQuotaAtOrAboveLimit(systemUsers.length, entitlements.limits.maxStaffUsers)) {
      soundFx.playError();
      const nextRequiredTier = getRequiredTierForStaffCount(systemUsers.length + 1);
      openUpgradePrompt({
        title: 'Staff Account Limit Reached',
        description: `Your ${entitlements.tierName} plan supports up to ${entitlements.limits.maxStaffUsers} staff seat${entitlements.limits.maxStaffUsers === 1 ? '' : 's'}. Upgrade to ${formatTierDisplayName(nextRequiredTier)} to add more team members.`,
        requiredTier: nextRequiredTier,
        featureLabel: 'Additional Staff Seats',
        quotaMetric: {
          label: 'Staff Accounts',
          used: systemUsers.length,
          limit: entitlements.limits.maxStaffUsers,
        },
      });
      return false;
    }

    // Edge Case 3: Shared logins are prohibited, as they render attribution meaningless
    const rawUsername = (user.username || user.name.toLowerCase().replace(/\s+/g, '.')).trim().toLowerCase();
    const GENERIC_PROHIBITED = ['cashier', 'shared', 'pos', 'terminal', 'till', 'store', 'user', 'staff', 'counter', 'operator', 'guest', 'general'];
    if (!rawUsername || GENERIC_PROHIBITED.includes(rawUsername)) {
      showToast(
        `Shared logins prohibited: Generic or empty account identity "${rawUsername}" is forbidden. Each operator must have an individual personal account.`,
        'error'
      );
      return false;
    }

    const rawCode = (user.code || '').trim();
    const cleanCode = rawCode.toLowerCase().replace(/^#/, '');
    if (!cleanCode) {
      showToast('Staff ID / Code is required and must be unique across SokoPoS.', 'error');
      return false;
    }

    // Refresh current tenant cashiers from Firestore + verify global identity availability via server endpoint
    let globalUsers: Cashier[] = [...allSystemUsers];
    if (isOnline && auth.currentUser) {
      try {
        const [tenantRemoteCashiers, serverAvailability] = await Promise.all([
          getTenantCashiersFromFirestore(activeBusinessId),
          checkStaffIdentityAvailabilityOnServer({ username: rawUsername, code: rawCode }),
        ]);
        if (tenantRemoteCashiers && tenantRemoteCashiers.length > 0) {
          const map = new Map<string, Cashier>();
          globalUsers.forEach((u) => map.set(u.id, u));
          tenantRemoteCashiers.forEach((r) => map.set(r.id, r));
          globalUsers = Array.from(map.values());
        }
        if (serverAvailability && !serverAvailability.usernameAvailable) {
          showToast(
            `Username "${rawUsername}" is already assigned in SokoPoS. No two staff members can share a username.`,
            'error'
          );
          return false;
        }
        if (serverAvailability && !serverAvailability.codeAvailable) {
          showToast(
            `Staff ID "${rawCode}" is already assigned in SokoPoS. No two staff members can share a Staff ID.`,
            'error'
          );
          return false;
        }
      } catch (err) {
        console.warn('Targeted staff uniqueness check fallback to local state:', err);
      }
    }

    // Enforce tenant/local uniqueness as immediate guard
    const existingSameUsername = globalUsers.find(
      (u) => u.username?.trim().toLowerCase() === rawUsername
    );
    if (existingSameUsername) {
      showToast(
        `Username "${rawUsername}" is already assigned to ${existingSameUsername.name}. No two staff members in SokoPoS can share a username.`,
        'error'
      );
      return false;
    }

    const existingSameCode = globalUsers.find(
      (u) => u.code?.trim().toLowerCase().replace(/^#/, '') === cleanCode
    );
    if (existingSameCode) {
      showToast(
        `Staff ID "${rawCode}" is already assigned to ${existingSameCode.name}. No two staff members in SokoPoS can share a Staff ID.`,
        'error'
      );
      return false;
    }

    let hashedPin = user.pin;
    if (!isBcryptHash(user.pin)) {
      hashedPin = await hashPinOnServer(user.pin);
    }

    let newUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    while (globalUsers.some((u) => u.id === newUserId)) {
      newUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }

    // Isolate staff PIN hash into server-only credentials vault (also enforces global uniqueness on server)
    const credRes = await saveStaffCredentialOnServer({
      cashierId: newUserId,
      businessId: activeBusinessId,
      hash: hashedPin,
      role: user.role,
      name: user.name,
      code: rawCode,
      username: rawUsername,
    });

    if (!credRes.success && credRes.status === 409) {
      showToast(credRes.error || 'Staff ID or Username is already in use in SokoPoS.', 'error');
      return false;
    }
    if (!credRes.success && credRes.status === 403) {
      const nextRequiredTier = getRequiredTierForStaffCount(systemUsers.length + 1);
      openUpgradePrompt({
        title: 'Staff Account Limit Reached',
        description: credRes.error || `Your ${entitlements.tierName} plan has reached its staff seat limit.`,
        requiredTier: nextRequiredTier,
        featureLabel: 'Additional Staff Seats',
        quotaMetric:
          entitlements.limits.maxStaffUsers > 0
            ? { label: 'Staff Accounts', used: systemUsers.length, limit: entitlements.limits.maxStaffUsers }
            : undefined,
      });
      return false;
    }

    const newUser: Cashier = {
      ...user,
      code: rawCode,
      username: rawUsername,
      pin: PROTECTED_PIN_MASK,
      id: newUserId,
      businessId: activeBusinessId,
      isPendingCloudSync: !isOnline,
    };

    setAllSystemUsers((prev) => [...prev, newUser]);
    void queueMutationToOutbox({
      businessId: activeBusinessId,
      collectionName: 'cashiers',
      docId: newUser.id,
      operation: 'upsert',
      payload: newUser,
      label: `Staff ${newUser.name}`,
    });

    if (isSuperAdmin) {
      logSuperAdminAction(
        activeBusinessId,
        'user',
        newUser.id,
        'create',
        `Super-admin provisioned system user ${newUser.name} (${newUser.role}) with server-isolated Bcrypt PIN`,
        null,
        newUser
      );
    }

    // Edge Case 5: Classified as administrative activity, attributed to performing admin
    logAdminActivity({
      category: 'staff',
      action: 'create_staff',
      description: `Created operator account for ${newUser.name} (Role: ${newUser.role}, Code: ${newUser.code}, Username: ${newUser.username}) with server-isolated PIN`,
      recordType: 'user',
      recordId: newUser.id,
      beforeValue: null,
      afterValue: { name: newUser.name, role: newUser.role, username: newUser.username },
    });

    showToast(`System user ${newUser.name} created (individual account attribution enforced)`, 'success');
    return true;
  };

  const updateSystemUser = async (id: string, updates: Partial<Cashier>): Promise<boolean> => {
    const oldUser = allSystemUsers.find((u) => u.id === id);
    if (!oldUser) return false;

    const GENERIC_PROHIBITED = ['cashier', 'shared', 'pos', 'terminal', 'till', 'store', 'user', 'staff', 'counter', 'operator', 'guest', 'general'];
    const normalizedUsername = updates.username !== undefined ? updates.username.trim().toLowerCase() : undefined;
    const normalizedCode = updates.code !== undefined ? updates.code.trim() : undefined;
    const cleanCode = normalizedCode !== undefined ? normalizedCode.toLowerCase().replace(/^#/, '') : undefined;

    if (normalizedUsername !== undefined) {
      if (!normalizedUsername || GENERIC_PROHIBITED.includes(normalizedUsername)) {
        showToast(
          `Shared logins prohibited: Generic or empty account identity "${normalizedUsername || ''}" is forbidden. Each operator must have an individual personal account.`,
          'error'
        );
        return false;
      }
    }

    if (normalizedCode !== undefined && !cleanCode) {
      showToast('Staff ID / Code cannot be empty.', 'error');
      return false;
    }

    // Refresh current tenant cashiers from Firestore + verify global identity availability via server endpoint
    let globalUsers: Cashier[] = [...allSystemUsers];
    if (isOnline && auth.currentUser && (normalizedUsername !== undefined || cleanCode !== undefined)) {
      try {
        const [tenantRemoteCashiers, serverAvailability] = await Promise.all([
          getTenantCashiersFromFirestore(activeBusinessId),
          checkStaffIdentityAvailabilityOnServer({
            username: normalizedUsername,
            code: normalizedCode,
            excludeCashierId: id,
          }),
        ]);
        if (tenantRemoteCashiers && tenantRemoteCashiers.length > 0) {
          const map = new Map<string, Cashier>();
          globalUsers.forEach((u) => map.set(u.id, u));
          tenantRemoteCashiers.forEach((r) => map.set(r.id, r));
          globalUsers = Array.from(map.values());
        }
        if (normalizedUsername !== undefined && serverAvailability && !serverAvailability.usernameAvailable) {
          showToast(
            `Username "${normalizedUsername}" is already assigned in SokoPoS. No two staff members can share a username.`,
            'error'
          );
          return false;
        }
        if (cleanCode !== undefined && serverAvailability && !serverAvailability.codeAvailable) {
          showToast(
            `Staff ID "${normalizedCode}" is already assigned in SokoPoS. No two staff members can share a Staff ID.`,
            'error'
          );
          return false;
        }
      } catch (err) {
        console.warn('Targeted staff uniqueness check fallback on update:', err);
      }
    }

    if (normalizedUsername !== undefined) {
      const existingUsername = globalUsers.find(
        (u) => u.id !== id && u.username?.trim().toLowerCase() === normalizedUsername
      );
      if (existingUsername) {
        showToast(
          `Username "${normalizedUsername}" is already assigned to ${existingUsername.name}. No two staff members in SokoPoS can share a username.`,
          'error'
        );
        return false;
      }
    }

    if (cleanCode !== undefined) {
      const existingCode = globalUsers.find(
        (u) => u.id !== id && u.code?.trim().toLowerCase().replace(/^#/, '') === cleanCode
      );
      if (existingCode) {
        showToast(
          `Staff ID "${normalizedCode}" is already assigned to ${existingCode.name}. No two staff members in SokoPoS can share a Staff ID.`,
          'error'
        );
        return false;
      }
    }

    const finalUpdates: Partial<Cashier> = {
      ...updates,
      ...(normalizedUsername !== undefined ? { username: normalizedUsername } : {}),
      ...(normalizedCode !== undefined ? { code: normalizedCode } : {}),
    };

    const hasNewPin = Boolean(updates.pin && updates.pin.trim() && updates.pin !== PROTECTED_PIN_MASK);
    let hashedPin: string | undefined;
    if (hasNewPin && updates.pin) {
      hashedPin = isBcryptHash(updates.pin) ? updates.pin : await hashPinOnServer(updates.pin);
      finalUpdates.pin = PROTECTED_PIN_MASK;
    }

    // Keep server-only vault in sync for PIN and/or identity/role metadata changes
    if (
      hasNewPin ||
      normalizedUsername !== undefined ||
      normalizedCode !== undefined ||
      updates.role !== undefined ||
      updates.name !== undefined
    ) {
      const credRes = await saveStaffCredentialOnServer({
        cashierId: id,
        businessId: oldUser.businessId,
        ...(hashedPin ? { hash: hashedPin } : {}),
        role: updates.role || oldUser.role,
        name: updates.name || oldUser.name,
        code: normalizedCode ?? oldUser.code,
        username: normalizedUsername ?? oldUser.username,
      });

      if (!credRes.success && credRes.status === 409) {
        showToast(credRes.error || 'Staff ID or Username is already in use in SokoPoS.', 'error');
        return false;
      }
    }

    const updatedUser: Cashier = {
      ...oldUser,
      ...finalUpdates,
      isPendingCloudSync: !isOnline,
    };

    setAllSystemUsers((prev) =>
      prev.map((u) => (u.id === id ? updatedUser : u))
    );
    void queueMutationToOutbox({
      businessId: oldUser.businessId || activeBusinessId,
      collectionName: 'cashiers',
      docId: id,
      operation: 'upsert',
      payload: updatedUser,
      label: `Staff ${updatedUser.name}`,
    });

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
    return true;
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
        void queueMutationToOutbox({
          businessId: targetUser.businessId || activeBusinessId,
          collectionName: 'cashiers',
          docId: id,
          operation: 'delete',
          payload: { id, businessId: targetUser.businessId || activeBusinessId },
          label: `Delete staff ${targetUser.name}`,
        });
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
      const result = await verifyStaffPinViaServer({
        pin,
        cashierId: currentCashier.id,
        businessId: currentCashier.businessId,
        fallbackHash: currentCashier.pin,
      });

      if (result.isValid) {
        setIsPinLocked(false);
        soundFx.playSuccess();
        showToast(`Welcome, ${currentCashier.name}`, 'success');
        return true;
      }
      soundFx.playError();
      if (result.error) {
        showToast(result.error, 'error');
      }
      return false;
    } catch (err: any) {
      soundFx.playError();
      const msg = err?.message || 'Verification error. Please retry.';
      showToast(msg, 'error');
      throw err;
    }
  };

  // 9. Multi-Tenant Products & Categories Stores (persisted in IndexedDB)
  const [allProducts, setAllProducts] = useState<Product[]>(() => {
    const seenIds = new Set<string>();
    return INITIAL_PRODUCTS.filter((p) => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });
  });

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    syncNormalizedStoreRecords('products', allProducts).catch((err) =>
      console.warn('IndexedDB products persist notice:', err)
    );
  }, [allProducts]);

  // Strict Data-Access Layer Scoping:
  // Products returned are ONLY those belonging to the active business tenant.
  // Where product category is lacking, assign category to "All".
  const products = useMemo(() => {
    const seen = new Set<string>();
    return allProducts
      .filter((p) => p.businessId === activeBusinessId)
      .filter((p) => {
        if (!p || !p.id) return false;
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .map((p) => ({
        ...p,
        category: !p.category || !p.category.trim() ? 'All' : p.category.trim(),
      }));
  }, [allProducts, activeBusinessId]);

  // Multi-Tenant Categories Store (Scoped & Unique to Each Shop, persisted in IndexedDB)
  const [allCategories, setAllCategories] = useState<Category[]>(INITIAL_CATEGORIES);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    syncNormalizedStoreRecords('categories', allCategories).catch((err) =>
      console.warn('IndexedDB categories persist notice:', err)
    );
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
      isPendingCloudSync: !isOnline,
    };

    setAllCategories((prev) => [newCat, ...prev]);
    void queueMutationToOutbox({
      businessId: activeBusinessId,
      collectionName: 'categories',
      docId: newCat.id,
      operation: 'upsert',
      payload: newCat,
      label: `Category ${newCat.name}`,
    });

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
      isPendingCloudSync: !isOnline,
    };

    setAllCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));

    // If category name was renamed, update all products in this business that had the old category
    if (oldCat.name !== trimmedName) {
      const affectedProducts = allProducts
        .filter((p) => p.businessId === activeBusinessId && p.category === oldCat.name)
        .map((p) => ({ ...p, category: trimmedName, isPendingCloudSync: !isOnline }));

      setAllProducts((prev) =>
        prev.map((p) =>
          p.businessId === activeBusinessId && p.category === oldCat.name
            ? { ...p, category: trimmedName, isPendingCloudSync: !isOnline }
            : p
        )
      );

      affectedProducts.forEach((updatedProd) => {
        void queueMutationToOutbox({
          businessId: activeBusinessId,
          collectionName: 'products',
          docId: updatedProd.id,
          operation: 'upsert',
          payload: updatedProd,
          label: `Recategorize ${updatedProd.name}`,
        });
      });
    }

    void queueMutationToOutbox({
      businessId: oldCat.businessId || activeBusinessId,
      collectionName: 'categories',
      docId: id,
      operation: 'upsert',
      payload: updated,
      label: `Category ${updated.name}`,
    });

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

    // "Where product category is lacking, assign category to 'All'."
    const affectedProducts = allProducts
      .filter((p) => p.businessId === activeBusinessId && p.category === target.name)
      .map((p) => ({ ...p, category: 'All', isPendingCloudSync: !isOnline }));

    setAllProducts((prev) =>
      prev.map((p) =>
        p.businessId === activeBusinessId && p.category === target.name
          ? { ...p, category: 'All', isPendingCloudSync: !isOnline }
          : p
      )
    );

    affectedProducts.forEach((updatedProd) => {
      void queueMutationToOutbox({
        businessId: activeBusinessId,
        collectionName: 'products',
        docId: updatedProd.id,
        operation: 'upsert',
        payload: updatedProd,
        label: `Assign ${updatedProd.name} to All`,
      });
    });

    void queueMutationToOutbox({
      businessId: target.businessId || activeBusinessId,
      collectionName: 'categories',
      docId: id,
      operation: 'delete',
      payload: { id, businessId: target.businessId || activeBusinessId },
      label: `Delete category ${target.name}`,
    });

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
      if (!targetBizId) return [];

      // Unauthenticated staff terminal session: return local catalog directly without attempting cloud queries
      if (!auth.currentUser) {
        return allProducts.filter((p) => p.businessId === targetBizId);
      }

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
            if (defaultTemplate.length > 0) {
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

  // Manual server inventory refresh only (live onSnapshot stream handles initial & automatic updates)

  const addProduct = (product: Omit<Product, 'id' | 'businessId'> & { id?: string }): Product | null => {
    if (!isSuperAdmin && !can('manageInventory')) {
      soundFx.playError();
      showToast('Permission denied: Inventory management access is required to add products.', 'error');
      return null;
    }

    if (!isSuperAdmin && isQuotaAtOrAboveLimit(products.length, entitlements.limits.maxProducts)) {
      soundFx.playError();
      const nextRequiredTier = getRequiredTierForProductCount(products.length + 1);
      openUpgradePrompt({
        title: 'SKU Catalog Limit Reached',
        description: `Free Advisory accounts allow up to ${entitlements.limits.maxProducts} inventory SKUs (existing items remain readable). Upgrade to ${formatTierDisplayName(nextRequiredTier)} for an unlimited product catalog.`,
        requiredTier: nextRequiredTier,
        featureLabel: 'Unlimited Product Catalog',
        quotaMetric: {
          label: 'Inventory SKUs',
          used: products.length,
          limit: entitlements.limits.maxProducts,
        },
      });
      return null;
    }

    const finalCategory = (!product.category || !product.category.trim()) ? 'All' : product.category.trim();
    const uniqueId = product.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProduct: Product = {
      ...product,
      category: finalCategory,
      id: uniqueId,
      businessId: activeBusinessId,
      supplierId: product.supplierId ?? null,
      supplierName: product.supplierName ?? null,
      isPendingCloudSync: !isOnline,
    };

    setAllProducts((prev) => [newProduct, ...prev.filter((p) => p.id !== newProduct.id)]);
    void queueMutationToOutbox({
      businessId: activeBusinessId,
      collectionName: 'products',
      docId: newProduct.id,
      operation: 'upsert',
      payload: newProduct,
      label: `Product ${newProduct.name}`,
    });

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
    return newProduct;
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
      isPendingCloudSync: !isOnline,
    };
    setAllProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    void queueMutationToOutbox({
      businessId: oldProduct.businessId || activeBusinessId,
      collectionName: 'products',
      docId: id,
      operation: 'upsert',
      payload: updated,
      label: `Product ${updated.name}`,
    });

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
        void queueMutationToOutbox({
          businessId: target.businessId || activeBusinessId,
          collectionName: 'products',
          docId: id,
          operation: 'delete',
          payload: { id, businessId: target.businessId || activeBusinessId },
          label: `Delete product ${target.name}`,
        });
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

  const bulkAddProducts = (
    items: Array<Omit<Product, 'id' | 'businessId'> & { id?: string }>
  ): number => {
    if (!Array.isArray(items) || items.length === 0) return 0;
    if (
      !isSuperAdmin &&
      entitlements.limits.maxProducts > 0 &&
      products.length + items.length > entitlements.limits.maxProducts
    ) {
      soundFx.playError();
      const remaining = Math.max(0, entitlements.limits.maxProducts - products.length);
      openUpgradePrompt({
        title: 'Bulk Import Exceeds SKU Quota',
        description: `Importing ${items.length} products would bring your catalog to ${products.length + items.length} SKUs, exceeding the ${entitlements.limits.maxProducts}-SKU Free Advisory cap (${remaining} slot${remaining === 1 ? '' : 's'} remaining).`,
        requiredTier: 'starter',
        featureLabel: 'Unlimited Product Catalog',
        quotaMetric: {
          label: 'Inventory SKUs',
          used: products.length,
          limit: entitlements.limits.maxProducts,
        },
      });
      return 0;
    }
    const now = Date.now();
    const createdProducts: Product[] = items.map((product, idx) => {
      const finalCategory = !product.category || !product.category.trim() ? 'All' : product.category.trim();
      const uniqueId =
        product.id ||
        `prod-${now}-${idx}-${Math.random().toString(36).substring(2, 7)}-${Math.floor(100 + Math.random() * 900)}`;
      return {
        ...product,
        category: finalCategory,
        id: uniqueId,
        businessId: activeBusinessId,
        supplierId: product.supplierId ?? null,
        supplierName: product.supplierName ?? null,
        isPendingCloudSync: !isOnline,
      };
    });

    const createdIds = new Set(createdProducts.map((p) => p.id));
    setAllProducts((prev) => [...createdProducts, ...prev.filter((p) => !createdIds.has(p.id))]);

    const enqueueBulkCreatedProducts = () => {
      const entries = createdProducts.map((p) =>
        buildOutboxEntry({
          businessId: activeBusinessId,
          collectionName: 'products',
          docId: p.id,
          operation: 'upsert',
          payload: p,
          label: `Import ${p.name}`,
        })
      );
      setOutboxItems((prev) => {
        const entryIds = new Set(entries.map((e) => e.id));
        return [...entries, ...prev.filter((o) => !entryIds.has(o.id))];
      });
      void enqueueOutboxMutations(entries);
    };

    if (isOnline && auth.currentUser && !isFirestoreQuotaCooldownActive() && !isDemoBusinessId(activeBusinessId)) {
      batchSaveProductsToFirestore(createdProducts)
        .then(() => {
          setAllProducts((prev) =>
            prev.map((p) => (createdIds.has(p.id) ? { ...p, isPendingCloudSync: false } : p))
          );
        })
        .catch((err) => {
          console.warn('Firestore bulk product save failed, queuing in outbox:', err);
          enqueueBulkCreatedProducts();
        });
    } else {
      enqueueBulkCreatedProducts();
    }

    logAdminActivity({
      category: 'catalog',
      action: 'bulk_create_products',
      description: `Imported ${createdProducts.length} catalog products via CSV`,
      recordType: 'product',
      recordId: activeBusinessId,
    });
    showToast(`Imported ${createdProducts.length} product${createdProducts.length === 1 ? '' : 's'}`, 'success');
    return createdProducts.length;
  };

  const bulkUpdateProducts = (
    items: Array<{ id: string; updates: Partial<Product> }>,
    summaryLabel?: string
  ) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const updateMap = new Map(items.map((i) => [i.id, i.updates]));
    setAllProducts((prev) =>
      prev.map((p) => {
        const up = updateMap.get(p.id);
        if (!up) return p;
        const finalCategory =
          up.category !== undefined
            ? !up.category || !up.category.trim()
              ? 'All'
              : up.category.trim()
            : p.category;
        return {
          ...p,
          ...up,
          category: finalCategory,
          isPendingCloudSync: !isOnline,
        };
      })
    );

    const enqueueBulkUpdatedProducts = () => {
      const updatedSnapshots = allProducts
        .filter((p) => updateMap.has(p.id))
        .map((p) => {
          const up = updateMap.get(p.id)!;
          const finalCategory =
            up.category !== undefined
              ? !up.category || !up.category.trim()
                ? 'All'
                : up.category.trim()
              : p.category;
          return { ...p, ...up, category: finalCategory, isPendingCloudSync: true };
        });
      if (updatedSnapshots.length === 0) return;
      const entries = updatedSnapshots.map((p) =>
        buildOutboxEntry({
          businessId: p.businessId || activeBusinessId,
          collectionName: 'products',
          docId: p.id,
          operation: 'upsert',
          payload: p,
          label: `Bulk edit ${p.name}`,
        })
      );
      setOutboxItems((prev) => {
        const entryIds = new Set(entries.map((e) => e.id));
        return [...entries, ...prev.filter((o) => !entryIds.has(o.id))];
      });
      void enqueueOutboxMutations(entries);
    };

    if (isOnline && auth.currentUser && !isFirestoreQuotaCooldownActive() && !isDemoBusinessId(activeBusinessId)) {
      batchUpdateProductsInFirestore(items)
        .then(() => {
          setAllProducts((prev) =>
            prev.map((p) => (updateMap.has(p.id) ? { ...p, isPendingCloudSync: false } : p))
          );
        })
        .catch((err) => {
          console.warn('Firestore bulk product update failed, queuing in outbox:', err);
          enqueueBulkUpdatedProducts();
        });
    } else {
      enqueueBulkUpdatedProducts();
    }

    logAdminActivity({
      category: 'catalog',
      action: 'bulk_update_products',
      description: summaryLabel || `Bulk updated ${items.length} products`,
      recordType: 'product',
      recordId: activeBusinessId,
    });
    showToast(summaryLabel || `Updated ${items.length} product${items.length === 1 ? '' : 's'}`, 'success');
  };

  const bulkDeleteProducts = (ids: string[], onSuccess?: () => void) => {
    const cleanIds = Array.from(new Set(ids.filter(Boolean)));
    if (cleanIds.length === 0) return;
    const targets = allProducts.filter((p) => cleanIds.includes(p.id));
    if (targets.length === 0) return;

    const previewNames = targets
      .slice(0, 3)
      .map((t) => t.name)
      .join(', ');
    const moreSuffix = targets.length > 3 ? ` +${targets.length - 3} more` : '';

    requestDestructiveAction({
      title: `Delete ${targets.length} Selected Product${targets.length === 1 ? '' : 's'}`,
      description: `This will permanently remove ${targets.length} item${targets.length === 1 ? '' : 's'} (${previewNames}${moreSuffix}) from ${currentBusiness.name}'s inventory across all branches.`,
      warningNote: 'Past sales receipts will retain historical item names, but active inventory tracking will be removed.',
      recordType: 'product',
      recordId: cleanIds[0],
      businessId: currentBusiness.id,
      onConfirm: () => {
        const idSet = new Set(cleanIds);
        setAllProducts((prev) => prev.filter((p) => !idSet.has(p.id)));
        const enqueueBulkDeletedProducts = () => {
          const entries = targets.map((t) =>
            buildOutboxEntry({
              businessId: t.businessId || activeBusinessId,
              collectionName: 'products',
              docId: t.id,
              operation: 'delete',
              payload: { id: t.id, businessId: t.businessId || activeBusinessId },
              label: `Delete ${t.name}`,
            })
          );
          setOutboxItems((prev) => {
            const entryIds = new Set(entries.map((e) => e.id));
            return [...entries, ...prev.filter((o) => !entryIds.has(o.id))];
          });
          void enqueueOutboxMutations(entries);
        };

        if (isOnline && auth.currentUser && !isFirestoreQuotaCooldownActive() && !isDemoBusinessId(activeBusinessId)) {
          batchDeleteProductsFromFirestore(cleanIds).catch((err) => {
            console.warn('Firestore bulk product delete failed, queuing in outbox:', err);
            enqueueBulkDeletedProducts();
          });
        } else {
          enqueueBulkDeletedProducts();
        }
        logAdminActivity({
          category: 'catalog',
          action: 'bulk_delete_products',
          description: `Bulk deleted ${targets.length} products from catalog`,
          recordType: 'product',
          recordId: activeBusinessId,
        });
        showToast(`Deleted ${targets.length} product${targets.length === 1 ? '' : 's'}`, 'info');
        onSuccess?.();
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

    const updatedStockProd: Product = {
      ...target,
      stockByLocation: updatedStockMap,
      isPendingCloudSync: !isOnline,
    };
    setAllProducts((prev) =>
      prev.map((p) => (p.id === productId ? updatedStockProd : p))
    );
    void queueMutationToOutbox({
      businessId: target.businessId || activeBusinessId,
      collectionName: 'products',
      docId: productId,
      operation: 'upsert',
      payload: updatedStockProd,
      label: `Stock adjust ${target.name}`,
    });

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
    if (!isSuperAdmin && !requireCapability('stockTransfers')) {
      return false;
    }
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

    const updatedTransferProd: Product = {
      ...target,
      stockByLocation: updatedMap,
      isPendingCloudSync: !isOnline,
    };
    const transferRecord = {
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
    };

    setAllProducts((prev) =>
      prev.map((p) => (p.id === productId ? updatedTransferProd : p))
    );
    void queueMutationToOutbox({
      businessId: target.businessId || activeBusinessId,
      collectionName: 'products',
      docId: productId,
      operation: 'upsert',
      payload: updatedTransferProd,
      label: `Stock transfer ${target.name}`,
    });
    void queueMutationToOutbox({
      businessId: activeBusinessId,
      collectionName: 'stock_transfers',
      docId: transferRecord.id,
      operation: 'upsert',
      payload: transferRecord,
      label: `Transfer ${quantity} × ${target.name}`,
    });

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

  const linkProductToSupplier = async (productId: string, supplierId: string | null): Promise<void> => {
    const targetProd = allProducts.find((p) => p.id === productId);
    if (!targetProd) return;

    let suppName: string | undefined = undefined;
    if (supplierId) {
      const supp = allSuppliers.find((s) => s.id === supplierId);
      suppName = supp?.name;
    }

    const updatedProd: Product = {
      ...targetProd,
      supplierId: supplierId || undefined,
      supplierName: suppName,
      isPendingCloudSync: !isOnline,
    };

    setAllProducts((prev) => prev.map((p) => (p.id === productId ? updatedProd : p)));
    void queueMutationToOutbox({
      businessId: targetProd.businessId || activeBusinessId,
      collectionName: 'products',
      docId: productId,
      operation: 'upsert',
      payload: {
        ...updatedProd,
        supplierId: supplierId || null,
        supplierName: suppName || null,
      },
      label: `Link supplier ${targetProd.name}`,
    });

    logAdminActivity({
      category: 'inventory',
      action: 'link_supplier_item',
      description: supplierId
        ? `Linked inventory item "${targetProd.name}" to supplier "${suppName}"`
        : `Unlinked supplier from inventory item "${targetProd.name}"`,
      recordType: 'product',
      recordId: productId,
    });

    soundFx.playSuccess();
    showToast(
      supplierId ? `Linked to ${suppName}` : `Unlinked from supplier`,
      'success'
    );
  };

  // Online / Offline Network Connectivity State
  const [isOnline, setIsOnlineState] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // 10. Multi-Tenant Customers & Store Credit Directory Store (persisted in IndexedDB)
  const [allCustomers, setAllCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    syncNormalizedStoreRecords('customers', allCustomers).catch((err) =>
      console.warn('IndexedDB customers persist notice:', err)
    );
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

  // On-demand, session-cached (15-min TTL) customer directory fetcher
  const ON_DEMAND_CACHE_TTL_MS = 15 * 60 * 1000;
  const lastCustomersFetchRef = useRef<Record<string, number>>({});
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);

  const refreshTenantCustomers = useCallback(
    async (force = false) => {
      if (!isOnline || !auth.currentUser || !activeBusinessId || isDemoBusinessId(activeBusinessId)) {
        return;
      }
      const lastFetched = lastCustomersFetchRef.current[activeBusinessId] || 0;
      if (!force && Date.now() - lastFetched < ON_DEMAND_CACHE_TTL_MS) {
        return;
      }
      setIsCustomersLoading(true);
      try {
        const remoteCustomers = await getTenantCustomersFromFirestore(activeBusinessId);
        lastCustomersFetchRef.current[activeBusinessId] = Date.now();
        if (remoteCustomers && remoteCustomers.length > 0) {
          setAllCustomers((prev) => {
            const others = prev.filter((c) => c.businessId !== activeBusinessId);
            const map = new Map<string, Customer>();
            prev.filter((c) => c.businessId === activeBusinessId).forEach((c) => map.set(c.id, c));
            remoteCustomers.forEach((rc) => map.set(rc.id, rc));
            return [...others, ...Array.from(map.values())];
          });
        }
      } catch (err) {
        console.warn('On-demand customer fetch notice:', err);
      } finally {
        setIsCustomersLoading(false);
      }
    },
    [activeBusinessId, isOnline]
  );

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
    void queueMutationToOutbox({
      businessId: activeBusinessId,
      collectionName: 'customers',
      docId: newCust.id,
      operation: 'upsert',
      payload: newCust,
      label: `Customer ${newCust.name}`,
    });

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

    void queueMutationToOutbox({
      businessId: target.businessId || activeBusinessId,
      collectionName: 'customers',
      docId: id,
      operation: 'upsert',
      payload: updatedCust,
      label: `Customer ${updatedCust.name}`,
    });

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

    void queueMutationToOutbox({
      businessId: target.businessId || activeBusinessId,
      collectionName: 'customers',
      docId: id,
      operation: 'delete',
      payload: { id, businessId: target.businessId || activeBusinessId },
      label: `Delete customer ${target.name}`,
    });

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
    if (!isSuperAdmin && !requireCapability('loyaltyAndStoreCredit')) {
      return;
    }
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

    void queueMutationToOutbox({
      businessId: cust.businessId || activeBusinessId,
      collectionName: 'customers',
      docId: customerId,
      operation: 'upsert',
      payload: updatedCust,
      label: `Credit adjust ${cust.name}`,
    });

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
    if (!isSuperAdmin && !requireCapability('loyaltyAndStoreCredit')) {
      return false;
    }
    const cust = allCustomers.find((c) => c.id === customerId);
    if (!cust || (cust.loyaltyPoints || 0) < pointsToRedeem) {
      soundFx.playError();
      showToast('Insufficient loyalty points balance', 'error');
      return false;
    }

    const rate = loyaltySettings.pointsPerCurrencyUnit > 0 ? loyaltySettings.pointsPerCurrencyUnit : 10;
    const cashValue = (pointsToRedeem / rate).toFixed(2);

    const updatedCust: Customer = {
      ...cust,
      loyaltyPoints: (cust.loyaltyPoints || 0) - pointsToRedeem,
      updatedAt: new Date().toISOString(),
    };

    setAllCustomers((prev) => prev.map((c) => (c.id === customerId ? updatedCust : c)));
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(updatedCust);
    }

    void queueMutationToOutbox({
      businessId: cust.businessId || activeBusinessId,
      collectionName: 'customers',
      docId: customerId,
      operation: 'upsert',
      payload: updatedCust,
      label: `Loyalty redeem ${cust.name}`,
    });

    soundFx.playSuccess();
    showToast(`Redeemed ${pointsToRedeem} points for ${cust.name} (${currentLocation.currency} ${cashValue} value)`, 'success');
    return true;
  };

  // 10.5 Multi-Tenant Suppliers Management Store (persisted in IndexedDB)
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    syncNormalizedStoreRecords('suppliers', allSuppliers).catch((err) =>
      console.warn('IndexedDB suppliers persist notice:', err)
    );
  }, [allSuppliers]);

  // Scoped to active business tenant
  const suppliers = useMemo(() => {
    return allSuppliers.filter((s) => s.businessId === activeBusinessId);
  }, [allSuppliers, activeBusinessId]);

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    setSelectedSupplier(null);
  }, [activeBusinessId]);

  // On-demand, session-cached (15-min TTL) supplier directory fetcher
  const lastSuppliersFetchRef = useRef<Record<string, number>>({});
  const [isSuppliersLoading, setIsSuppliersLoading] = useState(false);

  const refreshTenantSuppliers = useCallback(
    async (force = false) => {
      if (!isOnline || !auth.currentUser || !activeBusinessId || isDemoBusinessId(activeBusinessId)) {
        return;
      }
      const lastFetched = lastSuppliersFetchRef.current[activeBusinessId] || 0;
      if (!force && Date.now() - lastFetched < ON_DEMAND_CACHE_TTL_MS) {
        return;
      }
      setIsSuppliersLoading(true);
      try {
        const remoteSuppliers = await getTenantSuppliersFromFirestore(activeBusinessId);
        lastSuppliersFetchRef.current[activeBusinessId] = Date.now();
        if (remoteSuppliers && remoteSuppliers.length > 0) {
          setAllSuppliers((prev) => {
            const others = prev.filter((s) => s.businessId !== activeBusinessId);
            const map = new Map<string, Supplier>();
            prev.filter((s) => s.businessId === activeBusinessId).forEach((s) => map.set(s.id, s));
            remoteSuppliers.forEach((rs) => map.set(rs.id, rs));
            return [...others, ...Array.from(map.values())];
          });
        }
      } catch (err) {
        console.warn('On-demand supplier fetch notice:', err);
      } finally {
        setIsSuppliersLoading(false);
      }
    },
    [activeBusinessId, isOnline]
  );

  const addSupplier = async (
    data: Omit<Supplier, 'id' | 'businessId' | 'createdAt'>
  ): Promise<Supplier> => {
    if (!isSuperAdmin && !requireCapability('suppliers')) {
      throw new Error('Upgrade to Business or Premium to add suppliers and purchase orders.');
    }
    const trimmedName = data.name.trim();
    const trimmedPhone = data.phone.trim();
    if (!trimmedName || !trimmedPhone) {
      throw new Error('Supplier company name and phone number are required');
    }

    const newSupp: Supplier = {
      ...data,
      name: trimmedName,
      phone: trimmedPhone,
      id: `supp-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      businessId: activeBusinessId,
      status: data.status || 'active',
      paymentTerms: data.paymentTerms || 'net_14',
      totalInvoiced: data.totalInvoiced || 0,
      ordersCount: data.ordersCount || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAllSuppliers((prev) => [newSupp, ...prev]);
    void queueMutationToOutbox({
      businessId: activeBusinessId,
      collectionName: 'suppliers',
      docId: newSupp.id,
      operation: 'upsert',
      payload: newSupp,
      label: `Supplier ${newSupp.name}`,
    });

    logAdminActivity({
      category: 'inventory',
      action: 'create_supplier',
      description: `Added vendor profile: ${newSupp.name} (${newSupp.category || 'General Supplies'}, Terms: ${newSupp.paymentTerms})`,
      recordType: 'supplier',
      recordId: newSupp.id,
      afterValue: newSupp,
    });

    soundFx.playSuccess();
    showToast(`Supplier "${newSupp.name}" added successfully!`, 'success');
    return newSupp;
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>): Promise<void> => {
    const target = allSuppliers.find((s) => s.id === id);
    if (!target) return;

    const updatedSupp: Supplier = {
      ...target,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setAllSuppliers((prev) => prev.map((s) => (s.id === id ? updatedSupp : s)));

    if (selectedSupplier?.id === id) {
      setSelectedSupplier(updatedSupp);
    }

    // If name changed, synchronize supplierName on all linked products
    if (updates.name && updates.name !== target.name) {
      const newName = updates.name;
      const renamedLinked = allProducts
        .filter((p) => p.supplierId === id)
        .map((p) => ({ ...p, supplierName: newName, isPendingCloudSync: !isOnline }));
      setAllProducts((prev) =>
        prev.map((p) => (p.supplierId === id ? { ...p, supplierName: newName, isPendingCloudSync: !isOnline } : p))
      );
      renamedLinked.forEach((p) => {
        void queueMutationToOutbox({
          businessId: p.businessId || activeBusinessId,
          collectionName: 'products',
          docId: p.id,
          operation: 'upsert',
          payload: p,
          label: `Supplier rename ${p.name}`,
        });
      });
    }

    void queueMutationToOutbox({
      businessId: target.businessId || activeBusinessId,
      collectionName: 'suppliers',
      docId: id,
      operation: 'upsert',
      payload: updatedSupp,
      label: `Supplier ${updatedSupp.name}`,
    });

    logAdminActivity({
      category: 'inventory',
      action: 'update_supplier',
      description: `Updated supplier profile: ${updatedSupp.name}`,
      recordType: 'supplier',
      recordId: id,
      beforeValue: target,
      afterValue: updatedSupp,
    });

    showToast(`Supplier "${updatedSupp.name}" updated`, 'success');
  };

  const bulkAddSuppliers = async (
    items: Array<Omit<Supplier, 'id' | 'businessId' | 'createdAt'>>
  ): Promise<number> => {
    if (!Array.isArray(items) || items.length === 0) return 0;
    if (!isSuperAdmin && !requireCapability('suppliers')) {
      throw new Error('Upgrade to Business or Premium to import suppliers.');
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const createdSuppliers: Supplier[] = items
      .filter((item) => item.name?.trim() && item.phone?.trim())
      .map((item, idx) => ({
        ...item,
        name: item.name.trim(),
        phone: item.phone.trim(),
        id: `supp-${nowMs}-${idx}-${Math.floor(100 + Math.random() * 900)}`,
        businessId: activeBusinessId,
        status: item.status || 'active',
        paymentTerms: item.paymentTerms || 'net_14',
        totalInvoiced: item.totalInvoiced || 0,
        ordersCount: item.ordersCount || 0,
        createdAt: nowIso,
        updatedAt: nowIso,
        isPendingCloudSync: !isOnline,
      }));

    if (createdSuppliers.length === 0) return 0;

    setAllSuppliers((prev) => [...createdSuppliers, ...prev]);

    const entries = createdSuppliers.map((s) =>
      buildOutboxEntry({
        businessId: activeBusinessId,
        collectionName: 'suppliers',
        docId: s.id,
        operation: 'upsert',
        payload: s,
        label: `Import supplier ${s.name}`,
      })
    );
    setOutboxItems((prev) => {
      const entryIds = new Set(entries.map((e) => e.id));
      return [...entries, ...prev.filter((o) => !entryIds.has(o.id))];
    });
    void enqueueOutboxMutations(entries);

    logAdminActivity({
      category: 'inventory',
      action: 'bulk_create_suppliers',
      description: `Imported ${createdSuppliers.length} supplier${createdSuppliers.length === 1 ? '' : 's'} via CSV`,
      recordType: 'supplier',
      recordId: activeBusinessId,
    });

    soundFx.playSuccess();
    showToast(
      `Imported ${createdSuppliers.length} supplier${createdSuppliers.length === 1 ? '' : 's'}`,
      'success'
    );
    return createdSuppliers.length;
  };

  const bulkUpdateSuppliers = async (
    items: Array<{ id: string; updates: Partial<Supplier> }>,
    summaryLabel?: string
  ): Promise<number> => {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const updateMap = new Map(items.map((item) => [item.id, item.updates]));
    const nowIso = new Date().toISOString();
    const updatedRecords: Supplier[] = [];

    setAllSuppliers((prev) =>
      prev.map((s) => {
        const patch = updateMap.get(s.id);
        if (!patch) return s;
        const merged: Supplier = {
          ...s,
          ...patch,
          updatedAt: nowIso,
          isPendingCloudSync: !isOnline,
        };
        updatedRecords.push(merged);
        return merged;
      })
    );

    if (updatedRecords.length === 0) return 0;

    const entries = updatedRecords.map((s) =>
      buildOutboxEntry({
        businessId: s.businessId || activeBusinessId,
        collectionName: 'suppliers',
        docId: s.id,
        operation: 'upsert',
        payload: s,
        label: `Update supplier ${s.name}`,
      })
    );
    setOutboxItems((prev) => {
      const entryIds = new Set(entries.map((e) => e.id));
      return [...entries, ...prev.filter((o) => !entryIds.has(o.id))];
    });
    void enqueueOutboxMutations(entries);

    logAdminActivity({
      category: 'inventory',
      action: 'bulk_update_suppliers',
      description:
        summaryLabel ||
        `Updated ${updatedRecords.length} supplier${updatedRecords.length === 1 ? '' : 's'} via CSV`,
      recordType: 'supplier',
      recordId: activeBusinessId,
    });

    showToast(
      summaryLabel ||
        `Updated ${updatedRecords.length} supplier${updatedRecords.length === 1 ? '' : 's'}`,
      'success'
    );
    return updatedRecords.length;
  };

  const deleteSupplier = async (id: string): Promise<boolean> => {
    const target = allSuppliers.find((s) => s.id === id);
    if (!target) return false;

    // Check if products are linked
    const linkedCount = allProducts.filter((p) => p.supplierId === id && p.businessId === activeBusinessId).length;

    setAllSuppliers((prev) => prev.filter((s) => s.id !== id));

    if (selectedSupplier?.id === id) {
      setSelectedSupplier(null);
    }

    // Unlink products
    if (linkedCount > 0) {
      const unlinkedProds = allProducts
        .filter((p) => p.supplierId === id && p.businessId === activeBusinessId)
        .map((p) => ({ ...p, supplierId: null as any, supplierName: null as any, isPendingCloudSync: !isOnline }));
      setAllProducts((prev) =>
        prev.map((p) => (p.supplierId === id ? { ...p, supplierId: undefined, supplierName: undefined } : p))
      );
      unlinkedProds.forEach((p) => {
        void queueMutationToOutbox({
          businessId: p.businessId || activeBusinessId,
          collectionName: 'products',
          docId: p.id,
          operation: 'upsert',
          payload: p,
          label: `Unlink supplier ${p.name}`,
        });
      });
    }

    void queueMutationToOutbox({
      businessId: target.businessId || activeBusinessId,
      collectionName: 'suppliers',
      docId: id,
      operation: 'delete',
      payload: { id, businessId: target.businessId || activeBusinessId },
      label: `Delete supplier ${target.name}`,
    });

    logAdminActivity({
      category: 'inventory',
      action: 'delete_supplier',
      description: `Deleted supplier profile: ${target.name} (${linkedCount} linked products unlinked)`,
      recordType: 'supplier',
      recordId: id,
      beforeValue: target,
    });

    showToast(`Supplier "${target.name}" removed`, 'info');
    return true;
  };

  const getProductsForSupplier = (supplierId: string): Product[] => {
    return products.filter((p) => p.supplierId === supplierId);
  };

  // 11. Multi-Tenant Transactions Store (persisted in IndexedDB)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    syncNormalizedStoreRecords('transactions', allTransactions).catch((err) =>
      console.warn('IndexedDB transactions persist notice:', err)
    );
  }, [allTransactions]);

  // Strict Data-Access Layer Scoping:
  // Transactions are scoped strictly to the active business tenant.
  const transactions = useMemo(() => {
    return allTransactions.filter((tx) => tx.businessId === activeBusinessId);
  }, [allTransactions, activeBusinessId]);

  // 11. Multi-Tenant Sync Logs Store (persisted in IndexedDB)
  const [allSyncLogs, setAllSyncLogs] = useState<SyncLogEvent[]>(INITIAL_SYNC_LOGS);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    saveCollectionRecords('sync_logs', allSyncLogs.slice(0, 400)).catch((err) =>
      console.warn('IndexedDB sync logs persist notice:', err)
    );
  }, [allSyncLogs]);

  const syncLogs = useMemo(() => {
    return allSyncLogs.filter((l) => l.businessId === activeBusinessId);
  }, [allSyncLogs, activeBusinessId]);

  // 11.5 Multi-Tenant Shift Sessions Store (persisted in IndexedDB)
  const [allShifts, setAllShifts] = useState<ShiftSession[]>(INITIAL_SHIFTS);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    syncNormalizedStoreRecords('shifts', allShifts).catch((err) =>
      console.warn('IndexedDB shifts persist notice:', err)
    );
  }, [allShifts]);

  // Scoped strictly to current business tenant
  const shiftHistory = useMemo(() => {
    return allShifts.filter((s) => s.businessId === activeBusinessId);
  }, [allShifts, activeBusinessId]);

  // 11.75 Executive Business Intelligence Suite (Daily Rollups, Period Targets, Saved Views - persisted in IndexedDB)
  const [allAnalyticsRollups, setAllAnalyticsRollups] = useState<AnalyticsDailyRollup[]>([]);
  const [allAnalyticsTargets, setAllAnalyticsTargets] = useState<AnalyticsTarget[]>([]);
  const [allAnalyticsSavedViews, setAllAnalyticsSavedViews] = useState<AnalyticsSavedView[]>([]);
  const [isBiSyncing, setIsBiSyncing] = useState(false);
  const [biLastSyncedAt, setBiLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    saveCollectionRecords('bi_rollups', allAnalyticsRollups.slice(0, 1000)).catch((err) =>
      console.warn('IndexedDB BI rollups persist notice:', err)
    );
  }, [allAnalyticsRollups]);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    saveCollectionRecords('bi_targets', allAnalyticsTargets).catch((err) =>
      console.warn('IndexedDB BI targets persist notice:', err)
    );
  }, [allAnalyticsTargets]);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    saveCollectionRecords('bi_saved_views', allAnalyticsSavedViews).catch((err) =>
      console.warn('IndexedDB BI views persist notice:', err)
    );
  }, [allAnalyticsSavedViews]);

  const analyticsRollups = useMemo(
    () => allAnalyticsRollups.filter((r) => r.businessId === activeBusinessId),
    [allAnalyticsRollups, activeBusinessId]
  );
  const analyticsTargets = useMemo(
    () => allAnalyticsTargets.filter((t) => t.businessId === activeBusinessId),
    [allAnalyticsTargets, activeBusinessId]
  );
  const analyticsSavedViews = useMemo(
    () =>
      allAnalyticsSavedViews
        .filter((v) => v.businessId === activeBusinessId)
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [allAnalyticsSavedViews, activeBusinessId]
  );

  const syncAnalyticsRollups = useCallback(
    async (silent = false): Promise<number> => {
      if (!activeBusinessId) return 0;
      setIsBiSyncing(true);
      try {
        const computed = buildDailyRollupsFromData({
          businessId: activeBusinessId,
          transactions: allTransactions.filter((t) => t.businessId === activeBusinessId),
          products: allProducts.filter((p) => p.businessId === activeBusinessId),
          shifts: allShifts.filter((s) => s.businessId === activeBusinessId),
          locations: allLocations.filter((l) => l.businessId === activeBusinessId),
        });

        setAllAnalyticsRollups((prev) => {
          const otherTenants = prev.filter((r) => r.businessId !== activeBusinessId);
          const map = new Map<string, AnalyticsDailyRollup>();
          prev
            .filter((r) => r.businessId === activeBusinessId)
            .forEach((r) => map.set(r.id, r));
          computed.forEach((r) => map.set(r.id, r));
          return [...Array.from(map.values()), ...otherTenants];
        });

        const nowIso = new Date().toISOString();
        setBiLastSyncedAt(nowIso);

        const enqueueRollupOutbox = (rows: AnalyticsDailyRollup[]) => {
          if (isDemoBusinessId(activeBusinessId) || rows.length === 0) return;
          const entries = rows.map((r) =>
            buildOutboxEntry({
              businessId: activeBusinessId,
              collectionName: 'analytics_daily_rollups',
              docId: r.id,
              operation: 'upsert',
              payload: r,
              label: `BI rollup ${r.dateKey}`,
            })
          );
          setOutboxItems((prev) => {
            const ids = new Set(entries.map((e) => e.id));
            return [...entries, ...prev.filter((o) => !ids.has(o.id))];
          });
          void enqueueOutboxMutations(entries);
        };

        if (
          isOnline &&
          auth.currentUser &&
          !isFirestoreQuotaCooldownActive() &&
          !isDemoBusinessId(activeBusinessId) &&
          computed.length > 0
        ) {
          try {
            const committed = await upsertAnalyticsDailyRollupsBatch(computed);
            if (!silent) {
              showToast(
                `Synced ${committed} daily BI rollup snapshot${committed === 1 ? '' : 's'} to Firestore.`,
                'success'
              );
            }
            return committed;
          } catch (batchErr) {
            enqueueRollupOutbox(computed);
            throw batchErr;
          }
        }

        enqueueRollupOutbox(computed);
        if (!silent) {
          showToast(
            `Computed ${computed.length} daily BI snapshot${computed.length === 1 ? '' : 's'} locally & queued for cloud sync.`,
            'info'
          );
        }
        return computed.length;
      } catch (err) {
        console.warn('BI rollup synchronization notice:', err);
        if (!silent) {
          showToast('Queued daily BI rollups locally; will sync to Firestore when ready.', 'warning');
        }
        return 0;
      } finally {
        setIsBiSyncing(false);
      }
    },
    [activeBusinessId, allTransactions, allProducts, allShifts, allLocations, isOnline, showToast]
  );

  const syncRollupForTransactions = useCallback(
    (nextTxs: Transaction[], nextShifts?: ShiftSession[]) => {
      if (!activeBusinessId) return;
      const tenantTxs = nextTxs.filter((t) => t.businessId === activeBusinessId);
      const tenantProds = allProducts.filter((p) => p.businessId === activeBusinessId);
      const tenantShifts = (nextShifts || allShifts).filter((s) => s.businessId === activeBusinessId);
      const tenantLocs = allLocations.filter((l) => l.businessId === activeBusinessId);

      const computed = buildDailyRollupsFromData({
        businessId: activeBusinessId,
        transactions: tenantTxs,
        products: tenantProds,
        shifts: tenantShifts,
        locations: tenantLocs,
      });
      if (computed.length === 0) return;

      setAllAnalyticsRollups((prev) => {
        const other = prev.filter((r) => r.businessId !== activeBusinessId);
        const map = new Map<string, AnalyticsDailyRollup>();
        prev
          .filter((r) => r.businessId === activeBusinessId)
          .forEach((r) => map.set(r.id, r));
        computed.forEach((r) => map.set(r.id, r));
        return [...Array.from(map.values()), ...other];
      });
      setBiLastSyncedAt(new Date().toISOString());

      const latestSlice = computed.slice(0, 7);
      if (isDemoBusinessId(activeBusinessId)) return;

      const queueLatestRollups = () => {
        const entries = latestSlice.map((r) =>
          buildOutboxEntry({
            businessId: activeBusinessId,
            collectionName: 'analytics_daily_rollups',
            docId: r.id,
            operation: 'upsert',
            payload: r,
            label: `BI rollup ${r.dateKey}`,
          })
        );
        setOutboxItems((prev) => {
          const ids = new Set(entries.map((e) => e.id));
          return [...entries, ...prev.filter((o) => !ids.has(o.id))];
        });
        void enqueueOutboxMutations(entries);
      };

      if (isOnline && auth.currentUser && !isFirestoreQuotaCooldownActive()) {
        // Persist latest 7 active daily rollups silently in background
        upsertAnalyticsDailyRollupsBatch(latestSlice).catch(() => {
          queueLatestRollups();
        });
      } else {
        queueLatestRollups();
      }
    },
    [activeBusinessId, allProducts, allShifts, allLocations, isOnline]
  );

  const saveAnalyticsTarget = useCallback(
    async (params: {
      locationId: string;
      periodKey: string;
      revenueTarget: number;
      grossMarginTargetPct: number;
      maxDiscountPct: number;
    }): Promise<AnalyticsTarget> => {
      const nowIso = new Date().toISOString();
      const target: AnalyticsTarget = {
        id: makeTargetDocId(activeBusinessId, params.locationId, params.periodKey),
        businessId: activeBusinessId,
        locationId: params.locationId,
        periodKey: params.periodKey,
        revenueTarget: Math.max(0, Number(params.revenueTarget) || 0),
        grossMarginTargetPct: Math.min(100, Math.max(0, Number(params.grossMarginTargetPct) || 0)),
        maxDiscountPct: Math.min(100, Math.max(0, Number(params.maxDiscountPct) || 0)),
        updatedAt: nowIso,
        updatedByUid: auth.currentUser?.uid || currentUser?.id,
        updatedByEmail: auth.currentUser?.email || currentUser?.email,
      };

      setAllAnalyticsTargets((prev) => {
        const filtered = prev.filter((t) => t.id !== target.id);
        return [target, ...filtered];
      });

      await queueMutationToOutbox({
        businessId: activeBusinessId,
        collectionName: 'analytics_targets',
        docId: target.id,
        operation: 'upsert',
        payload: target,
        label: `BI target ${params.periodKey}`,
      });
      showToast(`Saved ${params.periodKey} BI target.`, 'success');
      return target;
    },
    [activeBusinessId, currentUser, queueMutationToOutbox, showToast]
  );

  const saveAnalyticsSavedView = useCallback(
    async (params: {
      id?: string;
      name: string;
      locationId: string;
      preset: TimeRangePreset;
      customStartIso?: string;
      customEndIso?: string;
      focusTab: BiFocusTab;
      chartMetric: BiChartMetric;
      isPinned?: boolean;
    }): Promise<AnalyticsSavedView> => {
      const nowIso = new Date().toISOString();
      const existing = params.id
        ? allAnalyticsSavedViews.find((v) => v.id === params.id)
        : undefined;
      const view: AnalyticsSavedView = {
        id: existing?.id || `bi-view-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        businessId: activeBusinessId,
        name: params.name.trim().slice(0, 80) || 'Untitled View',
        locationId: params.locationId || 'all',
        preset: params.preset,
        customStartIso: params.customStartIso,
        customEndIso: params.customEndIso,
        focusTab: params.focusTab,
        chartMetric: params.chartMetric,
        createdByUid: existing?.createdByUid || auth.currentUser?.uid || currentUser?.id,
        isPinned: params.isPinned ?? existing?.isPinned ?? true,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      setAllAnalyticsSavedViews((prev) => {
        const filtered = prev.filter((v) => v.id !== view.id);
        return [view, ...filtered];
      });

      await queueMutationToOutbox({
        businessId: activeBusinessId,
        collectionName: 'analytics_saved_views',
        docId: view.id,
        operation: 'upsert',
        payload: view,
        label: `BI view ${view.name}`,
      });
      showToast(`Saved BI view "${view.name}".`, 'success');
      return view;
    },
    [activeBusinessId, allAnalyticsSavedViews, currentUser, queueMutationToOutbox, showToast]
  );

  const deleteAnalyticsSavedView = useCallback(
    async (viewId: string): Promise<void> => {
      const targetView = allAnalyticsSavedViews.find((v) => v.id === viewId);
      setAllAnalyticsSavedViews((prev) => prev.filter((v) => v.id !== viewId));
      await queueMutationToOutbox({
        businessId: targetView?.businessId || activeBusinessId,
        collectionName: 'analytics_saved_views',
        docId: viewId,
        operation: 'delete',
        payload: { id: viewId, businessId: targetView?.businessId || activeBusinessId },
        label: `Delete BI view ${targetView?.name || viewId}`,
      });
      showToast('Removed saved BI view.', 'info');
    },
    [activeBusinessId, allAnalyticsSavedViews, queueMutationToOutbox, showToast]
  );

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

  // 12b. Pre-Purge Store Sales Backups & Clean Zero Reset (persisted in IndexedDB)
  const [storeSalesBackups, setStoreSalesBackups] = useState<StoreSalesBackup[]>([]);

  useEffect(() => {
    if (!isIdbHydratedRef.current) return;
    saveCollectionRecords('sales_backups', storeSalesBackups).catch((err) =>
      console.warn('IndexedDB sales backups persist notice:', err)
    );
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
      if (isOnline) {
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
      if (isOnline) {
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

  // Live Role Privileges & Access Control (RBAC)
  const rolePermissions: RolePermissionsMap = useMemo(() => {
    if (currentBusiness?.rolePermissions) {
      return {
        manager: { ...DEFAULT_ROLE_PERMISSIONS.manager, ...(currentBusiness.rolePermissions.manager || {}) },
        supervisor: { ...DEFAULT_ROLE_PERMISSIONS.supervisor, ...(currentBusiness.rolePermissions.supervisor || {}) },
        cashier: { ...DEFAULT_ROLE_PERMISSIONS.cashier, ...(currentBusiness.rolePermissions.cashier || {}) },
        inventory_clerk: { ...DEFAULT_ROLE_PERMISSIONS.inventory_clerk, ...(currentBusiness.rolePermissions.inventory_clerk || {}) },
      };
    }
    return DEFAULT_ROLE_PERMISSIONS;
  }, [currentBusiness?.rolePermissions]);

  const can = useCallback(
    (permission: PermissionKey, roleOverride?: UserRole | Cashier['role']): boolean => {
      const activeRole = roleOverride || currentUser?.role || currentCashier?.role;
      // Super Admin and Business Owner have unconstrained master authority across all operations
      if (activeRole === 'super_admin' || activeRole === 'business_owner' || isSuperAdmin) {
        return true;
      }
      if (!activeRole) return false;

      const roleKey = activeRole as ConfigurableStaffRole;
      const currentRoleMap = rolePermissions[roleKey];
      if (!currentRoleMap) return false;
      return Boolean(currentRoleMap[permission]);
    },
    [currentUser?.role, currentCashier?.role, isSuperAdmin, rolePermissions]
  );

  const hasPermission = can;

  const updateRolePermissions = useCallback(
    async (newPermissions: RolePermissionsMap): Promise<boolean> => {
      if (!currentBusiness) return false;
      if (!isSuperAdmin && !requireCapability('granularRbac')) {
        return false;
      }
      try {
        const updatedBiz: Business = { ...currentBusiness, rolePermissions: newPermissions };
        setBusinesses((prev) =>
          prev.map((b) => (b.id === activeBusinessId ? updatedBiz : b))
        );
        if (isOnline) {
          updateBusinessInFirestore(activeBusinessId, {
            rolePermissions: newPermissions,
          }).catch((err) => console.warn('Firestore role permissions update:', err));
        }
        showToast('Role privileges updated! Immediate effect applied to all staff roles.', 'success');
        return true;
      } catch (err) {
        console.error('Failed to update role permissions:', err);
        showToast('Failed to save role privileges', 'error');
        return false;
      }
    },
    [currentBusiness, activeBusinessId, isOnline, showToast, isSuperAdmin, requireCapability]
  );

  const resetRolePermissionsToDefault = useCallback(async (): Promise<boolean> => {
    return updateRolePermissions(DEFAULT_ROLE_PERMISSIONS);
  }, [updateRolePermissions]);

  const hasDiscountPermission = (cashier?: Cashier): boolean => {
    if (isSuperAdmin || currentUser?.role === 'business_owner' || currentUser?.role === 'super_admin') {
      return true;
    }
    const role = cashier?.role || currentCashier?.role;
    if (cashier?.canApplyDiscount === true) {
      return true;
    }
    return can('applyDiscounts', role);
  };

  const verifyManagerOverridePin = async (
    pin: string,
    managerId?: string
  ): Promise<{ success: boolean; managerName?: string; managerId?: string; managerRole?: string; error?: string }> => {
    const trimmed = pin.trim();
    if (!trimmed) {
      return { success: false, error: 'PIN is required' };
    }

    try {
      // Route manager override validation strictly through protected /api/auth/verify-pin route
      const serverResult = await verifyManagerOverrideViaServer({
        pin: trimmed,
        businessId: activeBusinessId,
        managerId,
      });

      if (serverResult.success) {
        return {
          success: true,
          managerName: serverResult.managerName,
          managerId: serverResult.managerId,
          managerRole: serverResult.managerRole,
        };
      }

      // If server returned specific error (e.g. rate limit lockout)
      if (serverResult.error) {
        return { success: false, error: serverResult.error };
      }
    } catch (err: any) {
      if (err?.message?.includes('locked') || err?.message?.includes('Too many')) {
        return { success: false, error: err.message };
      }
      console.warn('Server manager override validation notice:', err);
    }

    // Direct match against eligible managers with fallback hash if offline
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

    // Master administrator PIN fallback
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

  // Unified Unknown-Barcode Quick-Add / Restricted Notice State
  const [unknownBarcodePrompt, setUnknownBarcodePrompt] = useState<{
    isOpen: boolean;
    barcode: string | null;
    metadata: ScannerBurstMetadata | null;
    source: 'hardware' | 'camera' | 'search' | 'manual' | null;
  }>({
    isOpen: false,
    barcode: null,
    metadata: null,
    source: null,
  });

  const openUnknownBarcodeModal = useCallback(
    (
      rawBarcode: string,
      options?: {
        metadata?: ScannerBurstMetadata | null;
        source?: 'hardware' | 'camera' | 'search' | 'manual';
        silent?: boolean;
      }
    ) => {
      const clean = rawBarcode.trim().replace(/^['"]+|['"]+$/g, '');
      if (!clean) return;
      const canManage = isSuperAdmin || can('manageInventory');
      if (!options?.silent) {
        if (canManage) {
          soundFx.playBeep(340, 0.14);
          showToast(
            `Barcode "${clean}" is not in ${currentBusiness?.name || 'store'} catalog. Quick-Add opened.`,
            'info'
          );
        } else {
          soundFx.playError();
          showToast(
            `Barcode "${clean}" is not in catalog. Ask a manager or inventory clerk to add it.`,
            'error'
          );
        }
      }
      setUnknownBarcodePrompt({
        isOpen: true,
        barcode: clean,
        metadata: options?.metadata || null,
        source: options?.source || 'manual',
      });
    },
    [can, currentBusiness?.name, isSuperAdmin, showToast]
  );

  const closeUnknownBarcodeModal = useCallback(() => {
    setUnknownBarcodePrompt({
      isOpen: false,
      barcode: null,
      metadata: null,
      source: null,
    });
  }, []);

  // Barcode Handler
  const handleBarcodeScanned = (barcode: string): {
    success: boolean;
    message: string;
    product?: Product;
    reason?: 'found' | 'not_found' | 'out_of_stock' | 'max_stock' | 'no_shift' | 'empty';
  } => {
    // Strict Guardrail: Barcode scanning & item entry require an open shift session
    if (!activeShift || activeShift.status !== 'open') {
      soundFx.playError();
      showToast(
        'Scan Blocked: An active shift session is required before scanning items or initiating sales. Please open a shift first.',
        'error'
      );
      setIsShiftModalOpen(true);
      return { success: false, message: 'No active shift session open', reason: 'no_shift' };
    }

    const trimmed = barcode.trim().replace(/^['"]+|['"]+$/g, '');
    if (!trimmed) {
      return { success: false, message: 'Empty barcode entered', reason: 'empty' };
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
          product: match,
          reason: 'out_of_stock',
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
          product: match,
          reason: 'max_stock',
        };
      }

      soundFx.playBarcodeBeep();
      Haptics.scanSuccess();
      addToCart(match, 1);
      showToast(`+1 ${match.name} added to cart (${currentLocation.currency} ${match.sellingPrice})`, 'success');
      return { success: true, message: `Scanned: ${match.name}`, product: match, reason: 'found' };
    }

    return {
      success: false,
      message: `Barcode "${trimmed}" not found in ${currentBusiness.name} catalog`,
      reason: 'not_found',
    };
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
      mpesaMode?: string;
      mpesaType?: string;
      mpesaTarget?: string;
      paymentProvider?: 'paystack' | 'daraja';
      paymentReference?: string;
      splitBreakdown?: SplitPaymentTender[];
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
    const splitStoreCreditAmount = paymentMethod === 'split'
      ? (details.splitBreakdown?.find((b) => b.method === 'store_credit')?.amount || details.storeCreditUsed || 0)
      : 0;
    let storeCreditUsed = isStoreCreditPayment ? guardrail.payableAmount : splitStoreCreditAmount;
    let newStoreCreditBalance = customer ? customer.storeCreditBalance : undefined;

    if (storeCreditUsed > 0) {
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
      const potentialDebt = Math.max(0, -((customer.storeCreditBalance || 0) - storeCreditUsed));
      if (potentialDebt > (customer.creditLimit || 0)) {
        soundFx.playError();
        showToast(
          `Credit Limit Exceeded: This sale exceeds ${customer.name}'s credit limit of ${currentLocation.currency} ${(customer.creditLimit || 0).toFixed(2)}.`,
          'error'
        );
        throw new Error('Customer credit limit exceeded.');
      }
      newStoreCreditBalance = Number(((customer.storeCreditBalance || 0) - storeCreditUsed).toFixed(2));
    }

    const previousPoints = customer ? (customer.loyaltyPoints || 0) : undefined;
    if (customer && loyaltySettings.enabled) {
      const spendPerPt = loyaltySettings.spendPerPoint > 0 ? loyaltySettings.spendPerPoint : 100;
      loyaltyPointsEarned = Math.floor(guardrail.payableAmount / spendPerPt);
    }
    const currentPoints = customer && previousPoints !== undefined
      ? Math.max(0, previousPoints + loyaltyPointsEarned - loyaltyPointsRedeemed)
      : undefined;

    const mappedItems: CartItem[] = cart.map((item) => {
      const prod = allProducts.find((p) => p.id === item.productId);
      const resolved = resolveDynamicTaxRate(
        { category: prod?.category || (item as any).category, taxRate: item.taxRate, id: item.productId },
        currentLocation.id,
        currentBusiness?.taxSettings
      );
      return {
        ...item,
        unitCost: typeof item.unitCost === 'number' ? item.unitCost : (prod?.buyingPrice ?? 0),
        taxRate: resolved.rate,
      };
    });

    const cleanNum = receiptNum.replace(/[^0-9]/g, '').slice(-4) || Math.floor(1000 + Math.random() * 9000).toString();
    const traderInvNum = receiptNum.startsWith('SOKO') ? receiptNum : `SOKO-${receiptNum}`;
    const isSandboxEtims = Boolean(currentUser?.isDemoSession || activeBusinessId === 'biz-demo');
    const initialEtimsData: DigitaxEtimsData = {
      cuSerialNumber: 'KRARVS000000005',
      cuInvoiceNumber: Number(`1181${cleanNum}`),
      receiptNumber: Number(`960${cleanNum}`),
      internalData: 'UZ4JESUT5QGLW4CPRBSUVAZRLE',
      receiptSignature: 'QK2OPDK3TMLJ6BQ5',
      offlineUrl: `https://receipt.dg.tax/r/business_01M4WBVDC1WR8K1WYB8MKYMKG6/${traderInvNum}`,
      etimsUrl: `https://etims-sbx.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData?Data=P052100681P01QK2OPDK3TMLJ6BQ5`,
      taxPin: isSandboxEtims ? 'P099887766D' : (currentBusiness?.taxSettings?.taxNumber || 'A011001890C'),
      customerTin: customer?.kraPin || undefined,
      customerName: customer?.name || undefined,
      status: isSandboxEtims ? 'COMPLETED' : 'PENDING',
      verifiedAt: new Date().toISOString(),
      isPartnerVerified: true,
    };

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
      customerId: customer?.id || null,
      customerName: customer?.name || null,
      customerPhone: customer?.phone || null,
      loyaltyPointsEarned: customer ? loyaltyPointsEarned : undefined,
      loyaltyPointsRedeemed: customer && loyaltyPointsRedeemed > 0 ? loyaltyPointsRedeemed : undefined,
      customerPreviousPoints: previousPoints,
      customerCurrentPoints: currentPoints,
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
      etimsData: initialEtimsData,
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

    // Append to transactions & refresh daily BI rollup snapshot
    const nextTxsAfterSale = [newTx, ...allTransactions];
    setAllTransactions((prev) => [newTx, ...prev]);
    syncRollupForTransactions(nextTxsAfterSale);

    // Atomic IndexedDB dual-write: persist receipt + enqueue Sync Outbox entry in one IDB transaction
    const txOutboxEntry = !isDemoBusinessId(activeBusinessId)
      ? buildOutboxEntry({
          businessId: activeBusinessId,
          collectionName: 'transactions',
          docId: newTx.id,
          operation: 'upsert',
          payload: newTx,
          label: `Sale ${newTx.receiptNumber}`,
        })
      : null;

    if (txOutboxEntry) {
      setOutboxItems((prev) => [txOutboxEntry, ...prev.filter((o) => o.id !== txOutboxEntry.id)]);
      putEntityAndEnqueueOutbox('transactions', newTx, txOutboxEntry).catch((err) =>
        console.warn('Atomic IndexedDB sale + outbox persist notice:', err)
      );
    }

    // Asynchronously transmit to Digitax KRA eTIMS (bypassed in sandbox mode)
    if (isOnline && !isSandboxEtims) {
      (async () => {
        try {
          const payload = digitaxService.mapTransactionToEtims(
            {
              receiptNumber: newTx.receiptNumber,
              total: newTx.total,
              subtotal: newTx.subtotal,
              taxAmount: newTx.taxAmount,
              paymentMethod: newTx.paymentMethod,
              customerName: customer?.name,
              items: newTx.items.map((it) => ({
                name: it.productName,
                quantity: it.quantity,
                price: it.unitPrice,
                taxRate: it.taxRate,
              })),
            },
            customer?.kraPin
          );
          const saleResp = await digitaxService.createSale(payload);
          if (saleResp?.id) {
            const finalSale = await digitaxService.pollSaleCompletion(saleResp.id);
            if (finalSale) {
              const updatedEtims: DigitaxEtimsData = {
                saleId: finalSale.id,
                cuSerialNumber: finalSale.serial_number || 'KRARVS000000005',
                cuInvoiceNumber: finalSale.invoice_number,
                receiptNumber: finalSale.receipt_number,
                internalData: finalSale.internal_data,
                receiptSignature: finalSale.receipt_signature,
                etimsUrl: finalSale.etims_url,
                offlineUrl: finalSale.offline_url,
                status: finalSale.status,
                taxPin: 'A011001890C',
                customerTin: finalSale.customer_tin || customer?.kraPin,
                customerName: finalSale.customer_name || customer?.name,
                verifiedAt: new Date().toISOString(),
                isPartnerVerified: true,
              };

              const txWithEtims = { ...newTx, etimsData: updatedEtims };
              setAllTransactions((prev) =>
                prev.map((t) => (t.id === newTx.id ? { ...t, etimsData: updatedEtims } : t))
              );
              setActiveReceipt((prev) => (prev?.id === newTx.id ? { ...prev, etimsData: updatedEtims } : prev));
              if (auth.currentUser) {
                void queueMutationToOutbox({
                  businessId: activeBusinessId,
                  collectionName: 'transactions',
                  docId: newTx.id,
                  operation: 'upsert',
                  payload: txWithEtims,
                  label: `Sale eTIMS ${newTx.receiptNumber}`,
                });
              }
            }
          }
        } catch (etimsErr) {
          console.warn('Digitax eTIMS automated transmission notice:', etimsErr);
        }
      })();
    }

    // Dispatch sale + inventory deductions through the transactional Sync Outbox
    void queueMutationToOutbox({
      businessId: activeBusinessId,
      collectionName: 'transactions',
      docId: newTx.id,
      operation: 'upsert',
      payload: newTx,
      label: `Sale ${newTx.receiptNumber}`,
    });

    cart.forEach((ci) => {
      const prod = allProducts.find((p) => p.id === ci.productId);
      if (prod) {
        const currentStock = prod.stockByLocation[currentLocation.id] || 0;
        const updatedStock = Math.max(0, currentStock - ci.quantity);
        const updatedProdPayload = {
          ...prod,
          stockByLocation: {
            ...prod.stockByLocation,
            [currentLocation.id]: updatedStock,
          },
          isPendingCloudSync: !isOnline,
        };
        void queueMutationToOutbox({
          businessId: prod.businessId || activeBusinessId,
          collectionName: 'products',
          docId: prod.id,
          operation: 'upsert',
          payload: updatedProdPayload,
          label: `Stock deduct ${prod.name}`,
        });
      }
    });

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

    trackPlatformEvent('pos_checkout', {
      businessId: activeBusinessId,
      businessName: currentBusiness?.name,
      isDemo: activeBusinessId === 'biz-demo',
      channel: paymentMethod,
      amountKes: newTx.total,
    });

    // Update Customer Profile, Loyalty Points & Credit Ledger
    if (customer) {
      const updatedLedger = [...(customer.ledger || [])];
      if (storeCreditUsed > 0) {
        const ledgerEntry: CustomerCreditLedgerEntry = {
          id: `ledg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          timestamp: new Date().toISOString(),
          type: 'sale_credit',
          amount: -storeCreditUsed,
          balanceAfter: newStoreCreditBalance ?? ((customer.storeCreditBalance || 0) - storeCreditUsed),
          referenceId: receiptNum,
          notes: `Sale #${receiptNum} (${paymentMethod === 'split' ? 'Split payment (Store Credit tab)' : 'Charged to credit tab'}, ${cart.length} item${cart.length > 1 ? 's' : ''})`,
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
        loyaltyPoints: currentPoints !== undefined ? currentPoints : Math.max(0, (customer.loyaltyPoints || 0) + loyaltyPointsEarned - loyaltyPointsRedeemed),
        storeCreditBalance: newStoreCreditBalance ?? customer.storeCreditBalance,
        ledger: updatedLedger,
        updatedAt: new Date().toISOString(),
      };

      setAllCustomers((prev) => prev.map((c) => (c.id === customer.id ? updatedCustomer : c)));
      void queueMutationToOutbox({
        businessId: updatedCustomer.businessId || activeBusinessId,
        collectionName: 'customers',
        docId: customer.id,
        operation: 'upsert',
        payload: updatedCustomer,
        label: `Customer loyalty/credit ${customer.name}`,
      });
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
    const roundingNote =
      guardrail.roundingDifference !== 0
        ? ` (Half-up rounded from ${currentLocation.currency} ${cartTotal.toFixed(2)})`
        : '';
    showToast(
      `Sale #${receiptNum} completed — ${currentLocation.currency} ${guardrail.payableAmount.toFixed(2)}${roundingNote}`,
      'success'
    );
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
      safeConfetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
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
      if (!isSuperAdmin && !requireCapability('returnsAndRefunds')) {
        return { success: false, error: 'Returns & Refunds require a Business or Premium subscription.' };
      }
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

      // Update in local transactions state & refresh BI daily rollup
      const nextTxsAfterRefund = allTransactions.map((t) => (t.id === targetTx.id ? updatedTx : t));
      setAllTransactions((prev) =>
        prev.map((t) => (t.id === targetTx.id ? updatedTx : t))
      );
      syncRollupForTransactions(nextTxsAfterRefund);

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

      // Transactional Outbox + Cloud Firestore synchronization
      void queueMutationToOutbox({
        businessId: updatedTx.businessId || activeBusinessId,
        collectionName: 'transactions',
        docId: updatedTx.id,
        operation: 'upsert',
        payload: updatedTx,
        label: `Refund ${refundRefNumber}`,
      });

      refundItemsRecord.forEach((ri) => {
        if (ri.restockToInventory) {
          const prod = updatedProductsState.find((p) => p.id === ri.productId);
          if (prod) {
            void queueMutationToOutbox({
              businessId: prod.businessId || activeBusinessId,
              collectionName: 'products',
              docId: prod.id,
              operation: 'upsert',
              payload: prod,
              label: `Restock ${prod.name}`,
            });
          }
        }
      });

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
          void queueMutationToOutbox({
            businessId: matchingCust.businessId || activeBusinessId,
            collectionName: 'customers',
            docId: matchingCust.id,
            operation: 'upsert',
            payload: updatedCust,
            label: `Refund store credit ${matchingCust.name}`,
          });
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

  const openReturnsModal = useCallback(
    (tx?: Transaction | null) => {
      if (!isSuperAdmin && !requireCapability('returnsAndRefunds')) {
        return;
      }
      setSelectedReturnTx(tx || null);
      setIsReturnsModalOpen(true);
    },
    [isSuperAdmin, requireCapability]
  );

  const closeReturnsModal = useCallback(() => {
    setIsReturnsModalOpen(false);
    setSelectedReturnTx(null);
  }, []);

  // 12.5 Shift Management Operations
  const openShift = useCallback(
    (openingFloat: number, notes?: string, denominations?: Record<string, number>, resolveInterrupted = true): ShiftSession => {
      // Edge Case 2: Shift handovers must require the outgoing session to be closed and attributed before the incoming session opens, with no cross-session activity sharing
      if (activeShift && activeShift.status === 'open') {
        soundFx.playError();
        const msg = `Shift Handover Required: Shift #${activeShift.shiftNumber} for ${activeShift.cashierName} is currently open. The outgoing session must be balanced, closed, and attributed before an incoming session can open.`;
        showToast(msg, 'error');
        throw new Error(msg);
      }

      // Check for unresolved interrupted session at this location or business
      const interruptedSessions = shiftHistory.filter(
        (s) => s.status === 'interrupted' && (s.locationId === currentLocation.id || s.businessId === activeBusinessId)
      );
      if (interruptedSessions.length > 0) {
        if (resolveInterrupted) {
          // Cleanly auto-close and reconcile the interrupted session so opening the new session proceeds smoothly
          const closedAt = new Date().toISOString();
          const interruptedIds = new Set(interruptedSessions.map((s) => s.id));
          setAllShifts((prev) =>
            prev.map((s) =>
              interruptedIds.has(s.id)
                ? {
                    ...s,
                    status: 'closed',
                    closedAt,
                    closingCountedCash: s.openingFloat,
                    expectedCash: s.openingFloat,
                    cashVariance: 0,
                    closingNotes: (s.interruptionNote ? s.interruptionNote + ' | ' : '') + `Auto-reconciled & closed upon initializing new shift by ${currentCashier.name}`,
                  }
                : s
            )
          );
        } else {
          const first = interruptedSessions[0];
          soundFx.playError();
          const msg = `Unresolved Interrupted Session: Shift #${first.shiftNumber} (Operator: ${first.cashierName}) was interrupted. It must be resumed or reconciled/closed before opening a new session.`;
          showToast(msg, 'error');
          throw new Error(msg);
        }
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

      const nextShiftsWithExpense = allShifts.map((s) =>
        s.id === activeShift.id ? { ...s, expenses: [expense, ...s.expenses] } : s
      );
      setAllShifts((prev) =>
        prev.map((s) => (s.id === activeShift.id ? { ...s, expenses: [expense, ...s.expenses] } : s))
      );
      syncRollupForTransactions(allTransactions, nextShiftsWithExpense);
      soundFx.playBarcodeBeep();
      showToast(
        `Petty cash expense of ${currentLocation.currency} ${expense.amount.toLocaleString()} recorded`,
        'success'
      );
    },
    [activeShift, activeBusinessId, currentLocation, currentCashier, showToast, allShifts, allTransactions, syncRollupForTransactions]
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
          if (t.paymentDetails?.splitBreakdown && t.paymentDetails.splitBreakdown.length > 0) {
            t.paymentDetails.splitBreakdown.forEach((entry) => {
              if (entry.method === 'cash') cashSales += entry.amount;
              else if (entry.method === 'mpesa') mpesaSales += entry.amount;
              else if (entry.method === 'card') cardSales += entry.amount;
            });
          } else {
            const cashPortion = t.paymentDetails?.cashTendered || 0;
            cashSales += cashPortion;
            const nonCashPortion = Math.max(0, t.total - cashPortion);
            mpesaSales += nonCashPortion;
          }
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

      const updatedShiftsSnapshot = allShifts.map((s) =>
        s.id === targetShift.id ? closedShift : s
      );
      setAllShifts(updatedShiftsSnapshot);

      // Clear any pending register cart items and receipts on shift close
      setCart([]);
      setActiveReceipt(null);

      // Automatic OPFS binary checkpoint on every Shift Close
      void createOpfsBinarySnapshot({
        businessId: activeBusinessId,
        businessName: currentBusiness?.name || activeBusinessId,
        trigger: 'shift_close',
        data: {
          businesses: businesses.filter((b) => b.id === activeBusinessId),
          products: allProducts.filter((p) => p.businessId === activeBusinessId),
          categories: allCategories.filter((c) => c.businessId === activeBusinessId),
          locations: allLocations.filter((l) => l.businessId === activeBusinessId),
          systemUsers: allSystemUsers.filter((u) => u.businessId === activeBusinessId),
          customers: allCustomers.filter((c) => c.businessId === activeBusinessId),
          suppliers: allSuppliers.filter((s) => s.businessId === activeBusinessId),
          transactions: allTransactions.filter((t) => t.businessId === activeBusinessId),
          shifts: updatedShiftsSnapshot.filter((s) => s.businessId === activeBusinessId),
          biRollups: allAnalyticsRollups.filter((r) => r.businessId === activeBusinessId),
          biTargets: allAnalyticsTargets.filter((t) => t.businessId === activeBusinessId),
          biSavedViews: allAnalyticsSavedViews.filter((v) => v.businessId === activeBusinessId),
          outbox: outboxItems.filter((o) => o.businessId === activeBusinessId),
        },
      }).then((manifest) => {
        if (manifest) {
          setOpfsSnapshots((prev) => [manifest, ...prev.filter((m) => m.fileName !== manifest.fileName)].slice(0, 12));
          void refreshStorageQuotaTelemetry(manifest);
        }
      });

      soundFx.playPaymentSuccess();
      showToast(
        `Shift #${targetShift.shiftNumber} closed & OPFS archive snapshot recorded. Variance: ${currentLocation.currency} ${variance.toFixed(2)}`,
        variance === 0 ? 'success' : 'info'
      );
      return closedShift;
    },
    [
      activeShift,
      interruptedSession,
      transactions,
      systemUsers,
      currentCashier,
      currentLocation,
      isOnline,
      showToast,
      activeBusinessId,
      currentBusiness?.name,
      businesses,
      allProducts,
      allCategories,
      allLocations,
      allSystemUsers,
      allCustomers,
      allSuppliers,
      allTransactions,
      allShifts,
      allAnalyticsRollups,
      allAnalyticsTargets,
      allAnalyticsSavedViews,
      outboxItems,
      refreshStorageQuotaTelemetry,
    ]
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
    let lastReset = 0;

    // Throttle activity event execution (especially rapid scroll & mousemove) to keep main-thread 60fps
    const throttledResetTimer = () => {
      const now = Date.now();
      if (now - lastReset < 3000) return;
      lastReset = now;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        forceLogoutSession('timeout', undefined, 'Inactivity timeout after 15 minutes of idle terminal');
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, throttledResetTimer, { passive: true }));
    throttledResetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, throttledResetTimer));
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

  // 13. Cloud Sync, Transactional IndexedDB Outbox & OPFS Snapshots
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toISOString());

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // Boot-time IndexedDB hydration + idempotent legacy localStorage migration
  useEffect(() => {
    let cancelled = false;
    hydrateTerminalDatabase()
      .then(async (hydrated) => {
        if (cancelled) return;

        if (hydrated.businesses && hydrated.businesses.length > 0) {
          const cleaned = hydrated.businesses.filter(
            (b) => isRealGoogleAccount(b.ownerEmail) && b.id !== 'biz-soko' && b.id !== 'biz-quickmart'
          );
          if (cleaned.length > 0) {
            const { uniqueBusinesses } = resolveBusinessUniquenessConflicts(cleaned);
            setBusinesses(uniqueBusinesses.length > 0 ? uniqueBusinesses : cleaned);
          }
        }
        if (hydrated.products && hydrated.products.length > 0) {
          const hasUpfront = hydrated.products.some((p) => p.businessId === 'biz-upfront');
          const baseList = hasUpfront
            ? hydrated.products
            : [...hydrated.products, ...INITIAL_PRODUCTS.filter((p) => p.businessId === 'biz-upfront')];
          const seen = new Set<string>();
          setAllProducts(
            baseList.filter((p) => {
              if (!p?.id || seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            })
          );
        }
        if (hydrated.categories && hydrated.categories.length > 0) setAllCategories(hydrated.categories);
        if (hydrated.locations && hydrated.locations.length > 0) setAllLocations(hydrated.locations);
        if (hydrated.systemUsers && hydrated.systemUsers.length > 0) setAllSystemUsers(hydrated.systemUsers);
        if (hydrated.customers && hydrated.customers.length > 0) setAllCustomers(hydrated.customers);
        if (hydrated.suppliers && hydrated.suppliers.length > 0) setAllSuppliers(hydrated.suppliers);
        if (hydrated.transactions && hydrated.transactions.length > 0) setAllTransactions(hydrated.transactions);
        if (hydrated.shifts && hydrated.shifts.length > 0) setAllShifts(hydrated.shifts);
        if (hydrated.syncLogs && hydrated.syncLogs.length > 0) setAllSyncLogs(hydrated.syncLogs);
        if (hydrated.salesBackups) setStoreSalesBackups(hydrated.salesBackups);
        if (hydrated.superAdminAuditLogs && hydrated.superAdminAuditLogs.length > 0) {
          setSuperAdminAuditLogs(hydrated.superAdminAuditLogs);
        }
        if (hydrated.adminActivityLogs) setAdminActivityLogs(hydrated.adminActivityLogs);
        if (hydrated.supervisorOverrideLogs) setSupervisorOverrideLogs(hydrated.supervisorOverrideLogs);
        if (hydrated.voidRecords) setVoidRecords(hydrated.voidRecords);
        if (hydrated.pricingTiers && hydrated.pricingTiers.length > 0) {
          setPricingTiers(hydrated.pricingTiers);
        }
        if (hydrated.biRollups) setAllAnalyticsRollups(hydrated.biRollups);
        if (hydrated.biTargets) setAllAnalyticsTargets(hydrated.biTargets);
        if (hydrated.biSavedViews) setAllAnalyticsSavedViews(hydrated.biSavedViews);

        if (hydrated.branding.loginBgGraphic) {
          setLoginBgGraphicState(hydrated.branding.loginBgGraphic);
          setLoginBgGraphicName(hydrated.branding.loginBgGraphicName || null);
        }
        if (hydrated.branding.platformLogo) {
          setPlatformLogoState(hydrated.branding.platformLogo);
          setPlatformLogoName(hydrated.branding.platformLogoName || null);
        }
        if (hydrated.branding.platformFavicon) {
          setPlatformFaviconState(hydrated.branding.platformFavicon);
          setPlatformFaviconName(hydrated.branding.platformFaviconName || null);
        }
        if (hydrated.branding.industryImages && Object.keys(hydrated.branding.industryImages).length > 0) {
          setIndustryImagesState(hydrated.branding.industryImages);
        }

        setOutboxItems(hydrated.outbox || []);
        setOpfsSnapshots(hydrated.opfsManifests || []);

        const quota = await estimateBrowserStorageQuota();
        if (cancelled) return;

        isIdbHydratedRef.current = true;
        setIsStorageHydrated(true);

        const opfsSupported = isOpfsSupported();
        setStorageTelemetry({
          engine: opfsSupported ? 'IndexedDB + OPFS' : 'IndexedDB (OPFS Restricted)',
          usageBytes: quota.usageBytes,
          quotaBytes: quota.quotaBytes,
          usagePct: quota.usagePct,
          opfsSupported,
          migratedFromLocalStorageAt: hydrated.migrationReceipt?.migratedAt || null,
          migratedKeysCount: hydrated.migrationReceipt?.migratedKeys.length || 0,
          lastSnapshot: hydrated.opfsManifests[0] || null,
        });

        // Create initial OPFS baseline snapshot after first-ever localStorage migration
        if (
          opfsSupported &&
          hydrated.migrationReceipt &&
          hydrated.migrationReceipt.migratedKeys.length > 0 &&
          hydrated.opfsManifests.length === 0
        ) {
          const snap = await createOpfsBinarySnapshot({
            businessId: activeBusinessIdState,
            businessName:
              (hydrated.businesses || INITIAL_BUSINESSES).find((b) => b.id === activeBusinessIdState)?.name ||
              'SokoPoS Store',
            trigger: 'migration',
            data: {
              businesses: hydrated.businesses || INITIAL_BUSINESSES,
              products: hydrated.products || INITIAL_PRODUCTS,
              categories: hydrated.categories || INITIAL_CATEGORIES,
              locations: hydrated.locations || INITIAL_LOCATIONS,
              systemUsers: hydrated.systemUsers || INITIAL_SYSTEM_USERS,
              customers: hydrated.customers || INITIAL_CUSTOMERS,
              suppliers: hydrated.suppliers || INITIAL_SUPPLIERS,
              transactions: hydrated.transactions || INITIAL_TRANSACTIONS,
              shifts: hydrated.shifts || INITIAL_SHIFTS,
              biRollups: hydrated.biRollups || [],
              biTargets: hydrated.biTargets || [],
              biSavedViews: hydrated.biSavedViews || [],
              outbox: hydrated.outbox || [],
            },
          });
          if (snap && !cancelled) {
            setOpfsSnapshots((prev) => [snap, ...prev]);
            void refreshStorageQuotaTelemetry(snap);
          }
        }
      })
      .catch((err) => {
        console.warn('[TerminalDB] Hydration notice, continuing with in-memory defaults:', err);
        isIdbHydratedRef.current = true;
        setIsStorageHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshStorageQuotaTelemetry]);

  const tenantOutboxItems = useMemo(
    () => outboxItems.filter((item) => item.businessId === activeBusinessId),
    [outboxItems, activeBusinessId]
  );

  const pendingOutboxCount = useMemo(
    () => tenantOutboxItems.filter((item) => item.status !== 'dead_letter').length,
    [tenantOutboxItems]
  );

  const deadLetterCount = useMemo(
    () => tenantOutboxItems.filter((item) => item.status === 'dead_letter').length,
    [tenantOutboxItems]
  );

  const pendingOfflineCount = useMemo(() => {
    const unsyncedTxCount = transactions.filter((t) => !t.syncedToCloud).length;
    return Math.max(pendingOutboxCount, unsyncedTxCount);
  }, [pendingOutboxCount, transactions]);

  const triggerCloudSync = useCallback(
    async (isSilentArg?: boolean | unknown) => {
      const isSilent = typeof isSilentArg === 'boolean' ? isSilentArg : false;

      if (!isOnline) {
        if (!isSilent) showToast('Cannot sync while terminal is in Offline Mode.', 'error');
        return;
      }

      if (isDemoBusinessId(activeBusinessId)) {
        setSyncStatus('synced');
        if (!isSilent) {
          showToast('Demo sandbox runs locally without cloud writes.', 'info');
        }
        return;
      }

      // Sweep any entity still flagged as pending into IndexedDB sync_outbox before flushing
      const existingOutbox = await getAllOutboxEntries();
      const existingIds = new Set(existingOutbox.map((e) => e.id));
      const sweepAdditions: OutboxMutationEntry[] = [];

      allTransactions
        .filter((tx) => tx.businessId === activeBusinessId && !tx.syncedToCloud)
        .forEach((t) => {
          const id = `transactions:${t.id}`;
          if (!existingIds.has(id)) {
            sweepAdditions.push(
              buildOutboxEntry({
                businessId: activeBusinessId,
                collectionName: 'transactions',
                docId: t.id,
                operation: 'upsert',
                payload: t,
                label: `Sale ${t.receiptNumber || t.id}`,
              })
            );
          }
        });

      allProducts
        .filter((p) => p.businessId === activeBusinessId && p.isPendingCloudSync)
        .forEach((p) => {
          const id = `products:${p.id}`;
          if (!existingIds.has(id)) {
            sweepAdditions.push(
              buildOutboxEntry({
                businessId: activeBusinessId,
                collectionName: 'products',
                docId: p.id,
                operation: 'upsert',
                payload: p,
                label: `Product ${p.name}`,
              })
            );
          }
        });

      allLocations
        .filter((l) => l.businessId === activeBusinessId && l.isPendingCloudSync)
        .forEach((l) => {
          const id = `locations:${l.id}`;
          if (!existingIds.has(id)) {
            sweepAdditions.push(
              buildOutboxEntry({
                businessId: activeBusinessId,
                collectionName: 'locations',
                docId: l.id,
                operation: 'upsert',
                payload: l,
                label: `Branch ${l.name}`,
              })
            );
          }
        });

      allSystemUsers
        .filter((u) => u.businessId === activeBusinessId && u.isPendingCloudSync)
        .forEach((u) => {
          const id = `cashiers:${u.id}`;
          if (!existingIds.has(id)) {
            sweepAdditions.push(
              buildOutboxEntry({
                businessId: activeBusinessId,
                collectionName: 'cashiers',
                docId: u.id,
                operation: 'upsert',
                payload: u,
                label: `Staff ${u.name}`,
              })
            );
          }
        });

      if (sweepAdditions.length > 0) {
        await enqueueOutboxMutations(sweepAdditions);
      }

      const preQueue = await getAllOutboxEntries();
      const now = Date.now();
      const hasDueWork = preQueue.some(
        (e) =>
          e.businessId === activeBusinessId &&
          (e.status === 'pending' ||
            (e.status === 'retry_scheduled' && (isSilent ? e.nextRetryAt <= now : true)))
      );

      if (!hasDueWork) {
        setOutboxItems(preQueue);
        if (!isSilent) {
          soundFx.playSuccess();
          setLastSyncTime(new Date().toISOString());
          const hasDead = preQueue.some((e) => e.businessId === activeBusinessId && e.status === 'dead_letter');
          setSyncStatus(hasDead ? 'error' : 'synced');
          showToast(
            hasDead
              ? 'Pending queue clear, but Dead-Letter items need inspection in Cloud Sync Hub.'
              : 'All IndexedDB outbox records are synchronized with Firestore.',
            hasDead ? 'warning' : 'success'
          );
        }
        return;
      }

      setSyncStatus('syncing');

      const report = await flushSyncOutbox({
        businessId: activeBusinessId,
        isOnline,
        includeScheduledOrDeadLetter: !isSilent,
      });

      setOutboxItems(report.remainingQueue);
      const stillPendingDocIds = new Set(
        report.remainingQueue
          .filter((e) => e.businessId === activeBusinessId)
          .map((e) => `${e.collectionName}:${e.docId}`)
      );

      const nowIso = new Date().toISOString();
      if (report.ackedCount > 0) {
        setAllTransactions((prev) =>
          prev.map((t) =>
            t.businessId === activeBusinessId && !t.syncedToCloud && !stillPendingDocIds.has(`transactions:${t.id}`)
              ? { ...t, syncedToCloud: true, syncTimestamp: t.syncTimestamp || nowIso }
              : t
          )
        );
        setAllProducts((prev) =>
          prev.map((p) =>
            p.businessId === activeBusinessId && p.isPendingCloudSync && !stillPendingDocIds.has(`products:${p.id}`)
              ? { ...p, isPendingCloudSync: false }
              : p
          )
        );
        setAllLocations((prev) =>
          prev.map((l) =>
            l.businessId === activeBusinessId && l.isPendingCloudSync && !stillPendingDocIds.has(`locations:${l.id}`)
              ? { ...l, isPendingCloudSync: false }
              : l
          )
        );
        setAllSystemUsers((prev) =>
          prev.map((u) =>
            u.businessId === activeBusinessId && u.isPendingCloudSync && !stillPendingDocIds.has(`cashiers:${u.id}`)
              ? { ...u, isPendingCloudSync: false }
              : u
          )
        );
      }

      const tenantDeadCount = report.remainingQueue.filter(
        (e) => e.businessId === activeBusinessId && e.status === 'dead_letter'
      ).length;

      setLastSyncTime(nowIso);
      setSyncStatus(tenantDeadCount > 0 ? 'error' : 'synced');
      void refreshStorageQuotaTelemetry();

      if (!isSilent) {
        if (report.deadLetteredCount > 0 || tenantDeadCount > 0) {
          showToast(
            `Flushed ${report.ackedCount} queued mutations. ${tenantDeadCount} moved to Dead-Letter Queue for review.`,
            'warning'
          );
        } else if (report.skippedQuotaOrOffline) {
          showToast('Firestore cooldown or offline guard active; outbox safely preserved in IndexedDB.', 'info');
        } else {
          soundFx.playSuccess();
          showToast(
            `Outbox flushed (${report.ackedCount} committed). All store records synchronized.`,
            'success'
          );
        }
      }
    },
    [
      isOnline,
      showToast,
      allTransactions,
      allProducts,
      allLocations,
      allSystemUsers,
      activeBusinessId,
      refreshStorageQuotaTelemetry,
    ]
  );

  const retryOutboxItem = useCallback(
    async (entryId: string) => {
      const updated = await resetOutboxEntriesForImmediateRetry([entryId]);
      setOutboxItems(updated);
      await triggerCloudSync(false);
    },
    [triggerCloudSync]
  );

  const retryAllDeadLetterItems = useCallback(async () => {
    const deadIds = outboxItems
      .filter((e) => e.businessId === activeBusinessId && e.status === 'dead_letter')
      .map((e) => e.id);
    if (deadIds.length === 0) {
      showToast('No Dead-Letter entries to retry.', 'info');
      return;
    }
    const updated = await resetOutboxEntriesForImmediateRetry(deadIds);
    setOutboxItems(updated);
    await triggerCloudSync(false);
  }, [outboxItems, activeBusinessId, showToast, triggerCloudSync]);

  const discardOutboxItem = useCallback(
    async (entryId: string) => {
      await removeOutboxEntries([entryId]);
      setOutboxItems((prev) => prev.filter((e) => e.id !== entryId));
      void refreshStorageQuotaTelemetry();
      showToast('Removed mutation entry from local Sync Outbox.', 'info');
    },
    [refreshStorageQuotaTelemetry, showToast]
  );

  const createManualOpfsSnapshot = useCallback(async (): Promise<OpfsSnapshotManifest | null> => {
    const manifest = await createOpfsBinarySnapshot({
      businessId: activeBusinessId,
      businessName: currentBusiness?.name || activeBusinessId,
      trigger: 'manual',
      data: {
        businesses: businesses.filter((b) => b.id === activeBusinessId),
        products: allProducts.filter((p) => p.businessId === activeBusinessId),
        categories: allCategories.filter((c) => c.businessId === activeBusinessId),
        locations: allLocations.filter((l) => l.businessId === activeBusinessId),
        systemUsers: allSystemUsers.filter((u) => u.businessId === activeBusinessId),
        customers: allCustomers.filter((c) => c.businessId === activeBusinessId),
        suppliers: allSuppliers.filter((s) => s.businessId === activeBusinessId),
        transactions: allTransactions.filter((t) => t.businessId === activeBusinessId),
        shifts: allShifts.filter((s) => s.businessId === activeBusinessId),
        biRollups: allAnalyticsRollups.filter((r) => r.businessId === activeBusinessId),
        biTargets: allAnalyticsTargets.filter((t) => t.businessId === activeBusinessId),
        biSavedViews: allAnalyticsSavedViews.filter((v) => v.businessId === activeBusinessId),
        outbox: outboxItems.filter((o) => o.businessId === activeBusinessId),
      },
    });
    if (manifest) {
      setOpfsSnapshots((prev) => [manifest, ...prev.filter((m) => m.fileName !== manifest.fileName)].slice(0, 12));
      await refreshStorageQuotaTelemetry(manifest);
      soundFx.playSuccess();
      showToast(
        `OPFS binary snapshot archived (${(manifest.byteSize / 1024).toFixed(1)} KB, SHA-256 verified).`,
        'success'
      );
      return manifest;
    }
    showToast('OPFS binary snapshots are unavailable in this browser window; use JSON Store Export instead.', 'warning');
    return null;
  }, [
    activeBusinessId,
    currentBusiness?.name,
    businesses,
    allProducts,
    allCategories,
    allLocations,
    allSystemUsers,
    allCustomers,
    allSuppliers,
    allTransactions,
    allShifts,
    allAnalyticsRollups,
    allAnalyticsTargets,
    allAnalyticsSavedViews,
    outboxItems,
    refreshStorageQuotaTelemetry,
    showToast,
  ]);

  const verifyOpfsSnapshotIntegrity = useCallback(
    async (fileName: string) => {
      const result = await verifyOpfsSnapshot(fileName);
      if (result.ok) {
        soundFx.playSuccess();
        showToast(`SHA-256 integrity verified for ${fileName}`, 'success');
      } else {
        showToast(`Checksum mismatch or missing archive file for ${fileName}`, 'error');
      }
      return result;
    },
    [showToast]
  );

  const downloadOpfsArchive = useCallback(
    async (fileName: string): Promise<boolean> => {
      const ok = await downloadOpfsSnapshotFile(fileName);
      if (ok) {
        showToast(`Downloaded OPFS archive: ${fileName}`, 'success');
      } else {
        showToast('Could not read OPFS snapshot file from browser storage.', 'error');
      }
      return ok;
    },
    [showToast]
  );

  const exportFullLocalStore = useCallback(async () => {
    const res = await exportFullStoreArchive({
      businessId: activeBusinessId,
      businessName: currentBusiness?.name || activeBusinessId,
      fallbackSnapshot: {
        businesses,
        products: allProducts,
        categories: allCategories,
        locations: allLocations,
        systemUsers: allSystemUsers,
        customers: allCustomers,
        suppliers: allSuppliers,
        transactions: allTransactions,
        shifts: allShifts,
        biRollups: allAnalyticsRollups,
        biTargets: allAnalyticsTargets,
        biSavedViews: allAnalyticsSavedViews,
        outbox: outboxItems,
      },
    });
    soundFx.playSuccess();
    showToast(
      `Exported ${res.recordTotal.toLocaleString()} store records to ${res.fileName}`,
      'success'
    );
  }, [
    activeBusinessId,
    currentBusiness?.name,
    businesses,
    allProducts,
    allCategories,
    allLocations,
    allSystemUsers,
    allCustomers,
    allSuppliers,
    allTransactions,
    allShifts,
    allAnalyticsRollups,
    allAnalyticsTargets,
    allAnalyticsSavedViews,
    outboxItems,
    showToast,
  ]);

  const setIsOnline = (online: boolean) => {
    setIsOnlineState(online);
    isOnlineRef.current = online;
    if (!online) {
      setSyncStatus('offline');
      showToast('Offline Mode active. Transactions queue atomically in IndexedDB Sync Outbox.', 'info');
    } else {
      setSyncStatus('syncing');
      showToast('Network restored. Flushing IndexedDB Sync Outbox with Cloud...', 'info');
      setTimeout(() => {
        triggerCloudSync(false);
      }, 500);
    }
  };

  // Automated outbox retry loop: checks every 10 seconds for pending or due exponential-backoff mutations
  useEffect(() => {
    const hasActiveSession = Boolean(currentUser && auth.currentUser && !isDemoBusinessId(activeBusinessId));
    if (!isOnline || !hasActiveSession || !activeBusinessId || !isStorageHydrated) return;

    const intervalId = setInterval(() => {
      triggerCloudSync(true).catch((err) =>
        console.warn('Background outbox flush tick:', err)
      );
    }, 10000);

    return () => clearInterval(intervalId);
  }, [isOnline, currentUser, activeBusinessId, isStorageHydrated, triggerCloudSync]);

  // Automated sync on network reconnect (online/offline) and tab focus/visibility
  useEffect(() => {
    const handleOnline = () => {
      setIsOnlineState(true);
      isOnlineRef.current = true;
      setSyncStatus('syncing');
      showToast('Network connection detected. Flushing IndexedDB Sync Outbox...', 'info');
      triggerCloudSync(true).catch((err) =>
        console.warn('Auto-sync on network reconnect error:', err)
      );
    };

    const handleOffline = () => {
      setIsOnlineState(false);
      isOnlineRef.current = false;
      setSyncStatus('offline');
      showToast('Offline Mode active. Transactions queue atomically in IndexedDB Sync Outbox.', 'info');
    };

    const handleVisibilityOrFocus = () => {
      const hasActiveSession = Boolean(currentUser && auth.currentUser && !isDemoBusinessId(activeBusinessId));
      if (document.visibilityState === 'visible' && navigator.onLine && hasActiveSession && activeBusinessId) {
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
  }, [triggerCloudSync, showToast, activeBusinessId, currentUser]);

  // 13.b Firestore Row-Level Security State & Tenant Data Synchronization
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-sokopospointofsa-5314257a-dae6-432a-bde0-81ab935cc7ad';
  const firestoreRlsStatus = 'Row-Level Security Active: request.auth.token.businessId == resource.data.businessId';

  const hasVerifiedConnectionRef = useRef<boolean>(false);
  const lastBusinessesFetchRef = useRef<number>(0);
  const lastCategoriesFetchRef = useRef<Record<string, number>>({});
  const lastStaffFetchRef = useRef<Record<string, number>>({});
  const [isStaffLoading, setIsStaffLoading] = useState<boolean>(false);
  const [isLoadingOlderTransactions, setIsLoadingOlderTransactions] = useState<boolean>(false);
  const [olderTransactionsLoadedFrom, setOlderTransactionsLoadedFrom] = useState<string | null>(null);

  useEffect(() => {
    setOlderTransactionsLoadedFrom(null);
  }, [activeBusinessId]);

  const refreshAllBusinessesForSuperAdmin = useCallback(
    async (force = false): Promise<Business[]> => {
      if (!isOnline || !auth.currentUser) return businesses;
      const email = (auth.currentUser.email || '').trim().toLowerCase();
      if (email !== SUPER_ADMIN_EMAIL.toLowerCase()) return businesses;
      if (!force && Date.now() - lastBusinessesFetchRef.current < ON_DEMAND_CACHE_TTL_MS) {
        return businesses;
      }
      try {
        const remoteBizs = await getBusinessesFromFirestore();
        lastBusinessesFetchRef.current = Date.now();
        if (remoteBizs && remoteBizs.length > 0) {
          const validRemote = remoteBizs.filter(
            (b) => isRealGoogleAccount(b.ownerEmail) && b.id !== 'biz-soko' && b.id !== 'biz-quickmart'
          );
          if (validRemote.length > 0) {
            setBusinesses((prev) => {
              const combined = [
                ...prev.filter((b) => isRealGoogleAccount(b.ownerEmail) && b.id !== 'biz-soko' && b.id !== 'biz-quickmart'),
                ...validRemote,
              ];
              const { uniqueBusinesses } = resolveBusinessUniquenessConflicts(combined);
              return uniqueBusinesses.length > 0 ? uniqueBusinesses : validRemote;
            });
            return validRemote;
          }
        }
      } catch (err) {
        console.warn('Super Admin businesses refresh notice:', err);
      }
      return businesses;
    },
    [isOnline, businesses]
  );

  const refreshTenantCategories = useCallback(
    async (force = false) => {
      if (!isOnline || !auth.currentUser || !activeBusinessId || isDemoBusinessId(activeBusinessId)) return;
      const lastFetched = lastCategoriesFetchRef.current[activeBusinessId] || 0;
      if (!force && Date.now() - lastFetched < ON_DEMAND_CACHE_TTL_MS) return;
      try {
        const remoteCats = await getTenantCategoriesFromFirestore(activeBusinessId);
        lastCategoriesFetchRef.current[activeBusinessId] = Date.now();
        if (Array.isArray(remoteCats) && remoteCats.length > 0) {
          setAllCategories((prev) => {
            const currentTenantLocal = prev.filter((c) => c.businessId === activeBusinessId);
            const otherTenants = prev.filter((c) => c.businessId !== activeBusinessId);
            const pendingOffline = currentTenantLocal.filter((c) => c.isPendingCloudSync);
            const map = new Map<string, Category>();
            remoteCats.forEach((r) => map.set(r.id, { ...r, isPendingCloudSync: false }));
            pendingOffline.forEach((c) => {
              if (!map.has(c.id)) map.set(c.id, c);
            });
            return [...Array.from(map.values()), ...otherTenants];
          });
        }
      } catch (err) {
        console.warn('On-demand categories fetch notice:', err);
      }
    },
    [activeBusinessId, isOnline]
  );

  const refreshTenantStaff = useCallback(
    async (force = false) => {
      if (!isOnline || !auth.currentUser || !activeBusinessId || isDemoBusinessId(activeBusinessId)) return;
      const lastFetched = lastStaffFetchRef.current[activeBusinessId] || 0;
      if (!force && Date.now() - lastFetched < ON_DEMAND_CACHE_TTL_MS) return;
      setIsStaffLoading(true);
      try {
        const remoteCashiers = await getTenantCashiersFromFirestore(activeBusinessId);
        lastStaffFetchRef.current[activeBusinessId] = Date.now();
        if (Array.isArray(remoteCashiers)) {
          setAllSystemUsers((prev) => {
            const currentTenantLocal = prev.filter((u) => u.businessId === activeBusinessId);
            const otherTenants = prev.filter((u) => u.businessId !== activeBusinessId);
            const pendingOffline = currentTenantLocal.filter((u) => u.isPendingCloudSync);
            const map = new Map<string, Cashier>();
            remoteCashiers.forEach((r) => map.set(r.id, { ...r, isPendingCloudSync: false }));
            pendingOffline.forEach((u) => {
              if (!map.has(u.id)) map.set(u.id, u);
            });
            const tenantResult =
              remoteCashiers.length > 0 || pendingOffline.length > 0
                ? Array.from(map.values())
                : currentTenantLocal;
            return [...tenantResult, ...otherTenants];
          });
        }
      } catch (err) {
        console.warn('On-demand staff fetch notice:', err);
      } finally {
        setIsStaffLoading(false);
      }
    },
    [activeBusinessId, isOnline]
  );

  const loadHistoricalTransactions = useCallback(
    async (startIso: string, endIso: string): Promise<number> => {
      if (!isOnline || !auth.currentUser || !activeBusinessId || isDemoBusinessId(activeBusinessId)) {
        return 0;
      }
      setIsLoadingOlderTransactions(true);
      try {
        const olderTxs = await getTenantTransactionsRangeFromFirestore(
          activeBusinessId,
          startIso,
          endIso,
          1000
        );
        if (olderTxs.length > 0) {
          setAllTransactions((prev) => {
            const currentTenantLocal = prev.filter((t) => t.businessId === activeBusinessId);
            const otherTenants = prev.filter((t) => t.businessId !== activeBusinessId);
            const map = new Map<string, Transaction>();
            currentTenantLocal.forEach((t) => map.set(t.id, t));
            olderTxs.forEach((r) => map.set(r.id, { ...r, syncedToCloud: true }));
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            return [...merged, ...otherTenants];
          });
        }
        setOlderTransactionsLoadedFrom((prev) => (!prev || startIso < prev ? startIso : prev));
        return olderTxs.length;
      } catch (err) {
        console.warn('Historical transaction query notice:', err);
        return 0;
      } finally {
        setIsLoadingOlderTransactions(false);
      }
    },
    [activeBusinessId, isOnline]
  );

  // Test Firestore Connection once and load strictly the signed-in user's business profile (no full-collection scan)
  useEffect(() => {
    if (!firebaseUser || !auth.currentUser) {
      return;
    }
    let cancelled = false;

    const runInitialBootSync = async () => {
      const connected = hasVerifiedConnectionRef.current ? true : await testFirebaseConnection();
      if (cancelled) return;
      hasVerifiedConnectionRef.current = connected;
      setIsFirestoreConnected(connected);

      if (!connected || !auth.currentUser) return;
      const userEmail = (auth.currentUser.email || '').toLowerCase().trim();
      if (!userEmail) return;

      try {
        const isSA = userEmail === SUPER_ADMIN_EMAIL.toLowerCase();
        const remoteBizs = isSA
          ? (await getBusinessByIdFromFirestore('biz-upfront').then((b) => (b ? [b] : [])))
          : await getBusinessesByOwnerEmailFromFirestore(userEmail);

        if (cancelled) return;
        if (remoteBizs.length > 0) {
          const validRemote = remoteBizs.filter(
            (b) => isRealGoogleAccount(b.ownerEmail) && b.id !== 'biz-soko' && b.id !== 'biz-quickmart'
          );
          if (validRemote.length > 0) {
            setBusinesses((prev) => {
              const combined = [
                ...prev.filter((b) => isRealGoogleAccount(b.ownerEmail) && b.id !== 'biz-soko' && b.id !== 'biz-quickmart'),
                ...validRemote,
              ];
              const { uniqueBusinesses } = resolveBusinessUniquenessConflicts(combined);
              return uniqueBusinesses.length > 0 ? uniqueBusinesses : validRemote;
            });

            const targetBiz = validRemote[0];
            const validRemoteIds = new Set(validRemote.map((b) => b.id));
            setActiveBusinessIdState((prev) => {
              if (isSA) {
                localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, 'biz-upfront');
                return 'biz-upfront';
              }
              if (!prev || prev === 'biz-upfront' || prev === 'biz-soko' || prev === 'biz-quickmart' || !validRemoteIds.has(prev)) {
                if (targetBiz) {
                  localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, targetBiz.id);
                  return targetBiz.id;
                }
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.warn('Scoped remote business load note:', err);
      }
    };

    runInitialBootSync();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  // Real-time Firestore Tenant Subscriptions (3 core live streams: products, locations, 30-day transactions)
  // Categories, staff, customers, and suppliers load on demand with 15-min TTL session caching.
  useEffect(() => {
    if (!isOnline || isFirebaseAuthLoading || !currentUser || !firebaseUser || !auth.currentUser) return;
    if (!activeBusinessId || isDemoBusinessId(activeBusinessId)) return;

    const signedInEmail = (auth.currentUser.email || '').toLowerCase().trim();
    const isSA = signedInEmail === SUPER_ADMIN_EMAIL.toLowerCase() || currentUser.role === 'super_admin';

    // Non-Super-Admin tenants require verified email & matching tenant scope before attaching listeners
    if (!isSA && !auth.currentUser.emailVerified) return;
    if (!isSA && activeBusinessId === 'biz-upfront') return;

    const targetBizObj = businesses.find((b) => b.id === activeBusinessId);
    const ownsActiveBiz = Boolean(
      targetBizObj?.ownerEmail && targetBizObj.ownerEmail.toLowerCase().trim() === signedInEmail
    );
    if (!isSA) {
      if (currentUser.authProvider !== 'firebase' || currentUser.firebaseUid !== auth.currentUser.uid) {
        return;
      }
      if (currentUser.businessId !== activeBusinessId && !ownsActiveBiz) return;
      if (targetBizObj?.ownerEmail && !ownsActiveBiz) return;
    }

    let unsubProducts: (() => void) | undefined;
    let unsubLocations: (() => void) | undefined;
    let unsubTransactions: (() => void) | undefined;
    let unsubBiRollups: (() => void) | undefined;
    let unsubBiTargets: (() => void) | undefined;
    let unsubBiViews: (() => void) | undefined;

    // Session-cached 1x fetches for static metadata (categories & staff)
    refreshTenantCategories(false).catch(() => {});
    refreshTenantStaff(false).catch(() => {});

    try {
      unsubProducts = subscribeToTenantProducts(activeBusinessId, (remoteProds, isFromCache) => {
        if (!isFromCache) {
          setIsInventoryFreshFromServer(true);
          setInventoryLastFetchedAt(new Date().toISOString());
        }
        if (Array.isArray(remoteProds)) {
          setAllProducts((prev) => {
            const currentTenantLocal = prev.filter((p) => p.businessId === activeBusinessId);
            const otherTenants = prev.filter((p) => p.businessId !== activeBusinessId);

            const pendingOffline = currentTenantLocal.filter((p) => p.isPendingCloudSync);
            if (pendingOffline.length > 0) {
              flushPendingDocsBatch(
                pendingOffline.map((p) => ({
                  collectionName: 'products' as const,
                  id: p.id,
                  data: { ...p, isPendingCloudSync: false },
                }))
              ).catch((err) => console.warn('Auto-sync offline products batch:', err));
            }

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
            if (pendingOffline.length > 0) {
              flushPendingDocsBatch(
                pendingOffline.map((l) => ({
                  collectionName: 'locations' as const,
                  id: l.id,
                  data: { ...l, isPendingCloudSync: false },
                }))
              ).catch((err) => console.warn('Auto-sync offline locations batch:', err));
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

      unsubTransactions = subscribeToTenantTransactions(
        activeBusinessId,
        (remoteTxs) => {
          if (Array.isArray(remoteTxs)) {
            setAllTransactions((prev) => {
              const currentTenantLocal = prev.filter((t) => t.businessId === activeBusinessId);
              const otherTenants = prev.filter((t) => t.businessId !== activeBusinessId);

              const map = new Map<string, Transaction>();
              currentTenantLocal.forEach((t) => map.set(t.id, t));
              remoteTxs.forEach((r) => map.set(r.id, { ...r, syncedToCloud: true }));

              const pendingOffline = Array.from(map.values()).filter((t) => !t.syncedToCloud);
              if (pendingOffline.length > 0) {
                flushPendingDocsBatch(
                  pendingOffline.map((tx) => ({
                    collectionName: 'transactions' as const,
                    id: tx.id,
                    data: { ...tx, syncedToCloud: true },
                  }))
                ).catch((err) => console.warn('Auto-sync offline transactions batch:', err));
              }

              const mergedTenantTxs = Array.from(map.values()).sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );

              return [...mergedTenantTxs, ...otherTenants];
            });
          }
        },
        { windowDays: 30, maxDocs: 500 }
      );

      unsubBiRollups = subscribeToAnalyticsRollups(activeBusinessId, (remoteRollups) => {
        setAllAnalyticsRollups((prev) => {
          const other = prev.filter((r) => r.businessId !== activeBusinessId);
          const map = new Map<string, AnalyticsDailyRollup>();
          prev
            .filter((r) => r.businessId === activeBusinessId)
            .forEach((r) => map.set(r.id, r));
          remoteRollups.forEach((r) => map.set(r.id, r));
          return [...Array.from(map.values()), ...other];
        });
        setBiLastSyncedAt(new Date().toISOString());
      });

      unsubBiTargets = subscribeToAnalyticsTargets(activeBusinessId, (remoteTargets) => {
        setAllAnalyticsTargets((prev) => {
          const other = prev.filter((t) => t.businessId !== activeBusinessId);
          const map = new Map<string, AnalyticsTarget>();
          prev
            .filter((t) => t.businessId === activeBusinessId)
            .forEach((t) => map.set(t.id, t));
          remoteTargets.forEach((t) => map.set(t.id, t));
          return [...Array.from(map.values()), ...other];
        });
      });

      unsubBiViews = subscribeToAnalyticsSavedViews(activeBusinessId, (remoteViews) => {
        setAllAnalyticsSavedViews((prev) => {
          const other = prev.filter((v) => v.businessId !== activeBusinessId);
          return [...remoteViews, ...other];
        });
      });
    } catch (subErr) {
      console.warn('Firestore subscription notice:', subErr);
    }

    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubLocations) unsubLocations();
      if (unsubTransactions) unsubTransactions();
      if (unsubBiRollups) unsubBiRollups();
      if (unsubBiTargets) unsubBiTargets();
      if (unsubBiViews) unsubBiViews();
    };
  }, [
    activeBusinessId,
    isOnline,
    isFirebaseAuthLoading,
    firebaseUser,
    currentUser,
    businesses,
    refreshTenantCategories,
    refreshTenantStaff,
  ]);

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
  const loginWithFirebaseGoogle = async (customStoreName?: string): Promise<boolean> => {
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_OUT);
    try {
      setIsFirebaseAuthLoading(true);

      // Fast-path: Check if user is already authenticated in Firebase Auth client
      let firebaseUser = auth.currentUser;
      if (!firebaseUser || !firebaseUser.email) {
        // Enforce a 20s timeout race so popup authorization never hangs indefinitely
        const popupPromise = signInWithPopup(auth, googleProvider);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Google authorization popup timed out. Please allow popups or use Direct Sign-In.')), 20000)
        );
        const userCredential = await Promise.race([popupPromise, timeoutPromise]);
        firebaseUser = userCredential.user;
      }

      if (!firebaseUser || !firebaseUser.email) {
        throw new Error('No user data returned from Google Authentication.');
      }

      const idToken = await firebaseUser.getIdToken().catch(() => '');
      const tokenResult = await firebaseUser.getIdTokenResult().catch(() => null);
      const expirationTime = tokenResult?.expirationTime
        ? new Date(tokenResult.expirationTime).getTime()
        : Date.now() + 3600 * 1000;

      const normalizedEmail = firebaseUser.email.toLowerCase().trim();
      const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      // Enforce uniqueness: prioritize account last logged into
      const { winner: matchedBiz, isExistingAccount } = await prioritizeAccountAndPurgeConflicts(
        normalizedEmail,
        firebaseUser.displayName || undefined,
        customStoreName
      );

      const targetBizId = isSuperAdminEmail ? 'biz-upfront' : matchedBiz.id;

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

      await saveUserProfileToFirestore({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        businessId: targetBizId,
        displayName: firebaseUser.displayName || '',
      });

      // Set state after business doc and user profile are synced to Firestore
      setCurrentUser(authUser);
      setActiveBusinessIdState(targetBizId);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, targetBizId);
      setIsFirebaseAuthLoading(false);

      soundFx.playSuccess();
      if (customStoreName && isExistingAccount) {
        showToast(
          `Account already exists: This Google account is already registered to "${matchedBiz.name}". You have been logged into your shop.`,
          'info'
        );
      } else if (isExistingAccount) {
        showToast(
          `Welcome back, ${authUser.name}! Logged into ${matchedBiz.name}`,
          'success'
        );
      } else {
        if (!isSuperAdminEmail) {
          trackPlatformEvent('signup_complete', {
            businessId: matchedBiz.id,
            businessName: matchedBiz.name,
            planId: matchedBiz.plan,
            dedupeKey: `signup-${matchedBiz.id}`,
            dedupeTtlMs: 3600_000,
          });
        }
        showToast(
          `Welcome to SokoPoS! Your shop "${matchedBiz.name}" has been created.`,
          'success'
        );
      }
      return true;
    } catch (error: any) {
      setIsFirebaseAuthLoading(false);
      const errorCode = error?.code || '';

      // User closed or dismissed the popup window intentionally
      if (errorCode === 'auth/popup-closed-by-user') {
        console.info('Google sign-in popup closed by user.');
        showToast('Sign-in cancelled. Click Continue with Google to try again.', 'info');
        return false;
      }

      soundFx.playError();
      console.warn('Firebase Google popup sign-in notice:', error?.message || error);

      if (errorCode === 'auth/unauthorized-domain') {
        showToast(
          'Preview Domain Restricted: This Cloud Run domain is not on Firebase Authorized Domains. Use Direct Google Login below.',
          'info'
        );
      } else if (errorCode === 'auth/popup-blocked' || errorCode === 'auth/cancelled-popup-request') {
        showToast(
          'Popup was blocked by your browser. Please allow popups or use Direct Google Sign-In below.',
          'info'
        );
      } else {
        showToast(
          error?.message ? `Firebase OAuth Error: ${error.message}` : 'Google OAuth Sign-In failed.',
          'error'
        );
      }
      return false;
    }
  };

  const loginWithFirebaseEmailPassword = async (
    emailInput: string,
    passwordInput: string,
    isSignUpMode: boolean = false,
    customStoreName?: string
  ): Promise<{ success: boolean; requiresVerification?: boolean; email?: string; error?: string }> => {
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_OUT);
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!email || !password) {
      return { success: false, error: 'Please enter both an email address and a password.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      setIsFirebaseAuthLoading(true);
      let userCredential;
      let isNewlyCreated = false;

      if (isSignUpMode) {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          isNewlyCreated = true;
        } catch (err: any) {
          if (err?.code === 'auth/email-already-in-use') {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
          } else {
            throw err;
          }
        }
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      const firebaseUser = userCredential.user;
      if (!firebaseUser || !firebaseUser.email) {
        throw new Error('No user account data returned from Firebase.');
      }

      const normalizedEmail = firebaseUser.email.toLowerCase().trim();
      const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      // Enforce Email Verification Gate for non-super-admin Email/Password accounts
      if (!firebaseUser.emailVerified && !isSuperAdminEmail) {
        if (customStoreName) {
          sessionStorage.setItem('sokopos_pending_store_name', customStoreName);
        }
        if (isNewlyCreated) {
          try {
            await sendEmailVerification(firebaseUser);
          } catch (verifyErr) {
            console.warn('Initial sendEmailVerification notice:', verifyErr);
          }
        }
        setPendingVerificationEmail(firebaseUser.email);
        setIsFirebaseAuthLoading(false);
        return {
          success: false,
          requiresVerification: true,
          email: firebaseUser.email,
        };
      }

      setPendingVerificationEmail(null);
      if (sessionStorage.getItem('sokopos_pending_store_name')) {
        sessionStorage.removeItem('sokopos_pending_store_name');
      }

      const { winner: matchedBiz, isExistingAccount } = await prioritizeAccountAndPurgeConflicts(
        normalizedEmail,
        firebaseUser.displayName || undefined,
        customStoreName
      );

      const targetBizId = isSuperAdminEmail ? 'biz-upfront' : matchedBiz.id;
      const role: UserRole = isSuperAdminEmail
        ? 'super_admin'
        : matchedBiz
        ? 'business_owner'
        : 'manager';

      const idToken = await firebaseUser.getIdToken().catch(() => '');
      const tokenResult = await firebaseUser.getIdTokenResult().catch(() => null);
      const expirationTime = tokenResult?.expirationTime
        ? new Date(tokenResult.expirationTime).getTime()
        : Date.now() + 3600 * 1000;

      const authUser: AuthUser = {
        id: firebaseUser.uid,
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || (isSuperAdminEmail ? 'Platform Administrator' : firebaseUser.email.split('@')[0]),
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

      await saveUserProfileToFirestore({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        businessId: targetBizId,
        displayName: firebaseUser.displayName || '',
      });

      setCurrentUser(authUser);
      setActiveBusinessIdState(targetBizId);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, targetBizId);
      setIsFirebaseAuthLoading(false);

      soundFx.playSuccess();
      if (customStoreName && isExistingAccount) {
        showToast(
          `Account found: Logged into "${matchedBiz.name}".`,
          'info'
        );
      } else if (isExistingAccount) {
        showToast(
          `Welcome back! Logged into ${matchedBiz.name}`,
          'success'
        );
      } else {
        if (!isSuperAdminEmail) {
          trackPlatformEvent('signup_complete', {
            businessId: matchedBiz.id,
            businessName: matchedBiz.name,
            planId: matchedBiz.plan,
            dedupeKey: `signup-${matchedBiz.id}`,
            dedupeTtlMs: 3600_000,
          });
        }
        showToast(
          `Welcome to SokoPoS! Shop "${matchedBiz.name}" is ready.`,
          'success'
        );
      }

      return { success: true };
    } catch (err: any) {
      setIsFirebaseAuthLoading(false);
      console.warn('Email/Password Auth notice:', err);

      let errorMessage = 'Authentication failed. Please check your email and password.';
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        errorMessage = 'Incorrect password or email. Please check your credentials and try again.';
      } else if (err?.code === 'auth/user-not-found') {
        errorMessage = 'No user account found. Create an account under "Add new shop" or check your email.';
      } else if (err?.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (err?.code === 'auth/weak-password') {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (err?.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please sign in with your password.';
      } else if (err?.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please wait a moment or reset your password.';
      } else if (err?.message) {
        errorMessage = err.message;
      }

      // Offline-only fallback when network is unreachable
      if (err?.code === 'auth/network-request-failed') {
        const localOk = loginWithGoogle(email, email.split('@')[0], customStoreName);
        if (localOk) {
          soundFx.playSuccess();
          return { success: true };
        }
      }

      return { success: false, error: errorMessage };
    }
  };

  const loginWithFirebaseEmailOtp = async (
    customToken: string
  ): Promise<{ success: boolean; error?: string }> => {
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_OUT);
    const cleanToken = String(customToken || '').trim();
    if (!cleanToken) {
      return { success: false, error: 'Missing Firebase custom session token.' };
    }

    try {
      setIsFirebaseAuthLoading(true);
      const userCredential = await signInWithCustomToken(auth, cleanToken);
      const firebaseUser = userCredential.user;
      if (!firebaseUser || !firebaseUser.email) {
        throw new Error('No email profile returned from Firebase Custom Token session.');
      }

      const normalizedEmail = firebaseUser.email.toLowerCase().trim();
      const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      setPendingVerificationEmail(null);
      if (sessionStorage.getItem('sokopos_pending_store_name')) {
        sessionStorage.removeItem('sokopos_pending_store_name');
      }

      const { winner: matchedBiz, isExistingAccount } = await prioritizeAccountAndPurgeConflicts(
        normalizedEmail,
        firebaseUser.displayName || undefined
      );

      const targetBizId = isSuperAdminEmail ? 'biz-upfront' : matchedBiz.id;
      const role: UserRole = isSuperAdminEmail
        ? 'super_admin'
        : matchedBiz
        ? 'business_owner'
        : 'manager';

      const idToken = await firebaseUser.getIdToken().catch(() => '');
      const tokenResult = await firebaseUser.getIdTokenResult().catch(() => null);
      const expirationTime = tokenResult?.expirationTime
        ? new Date(tokenResult.expirationTime).getTime()
        : Date.now() + 3600 * 1000;

      const authUser: AuthUser = {
        id: firebaseUser.uid,
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        name:
          firebaseUser.displayName ||
          (isSuperAdminEmail ? 'Platform Administrator' : firebaseUser.email.split('@')[0]),
        initials: (
          firebaseUser.displayName || (isSuperAdminEmail ? 'PA' : firebaseUser.email.substring(0, 2))
        )
          .substring(0, 2)
          .toUpperCase(),
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

      await saveUserProfileToFirestore({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        businessId: targetBizId,
        displayName: firebaseUser.displayName || '',
      });

      setCurrentUser(authUser);
      setActiveBusinessIdState(targetBizId);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, targetBizId);
      setIsFirebaseAuthLoading(false);

      soundFx.playSuccess();
      if (isExistingAccount) {
        showToast(`Welcome back! Logged into ${matchedBiz.name}`, 'success');
      } else {
        if (!isSuperAdminEmail) {
          trackPlatformEvent('signup_complete', {
            businessId: matchedBiz.id,
            businessName: matchedBiz.name,
            planId: matchedBiz.plan,
            dedupeKey: `signup-${matchedBiz.id}`,
            dedupeTtlMs: 3600_000,
          });
        }
        showToast(`Welcome to SokoPoS! Shop "${matchedBiz.name}" is ready.`, 'success');
      }

      return { success: true };
    } catch (err: any) {
      setIsFirebaseAuthLoading(false);
      console.warn('Passwordless Email OTP session error:', err);
      let errorMessage = 'Failed to establish Firebase session from verified OTP.';
      if (err?.code === 'auth/invalid-custom-token' || err?.code === 'auth/custom-token-mismatch') {
        errorMessage = 'Session token mismatch or invalid signature. Please verify service account configuration.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      return { success: false, error: errorMessage };
    }
  };

  const sendPasswordResetEmailAction = async (
    emailInput: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    const email = emailInput.trim().toLowerCase();
    if (!email) {
      return { success: false, error: 'Please enter your account email address.' };
    }
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: `Password reset instructions have been dispatched to ${email}. Please check your inbox or spam folder.`,
      };
    } catch (err: any) {
      console.warn('Password reset note:', err);
      let errorMessage = 'Failed to send password reset email. Please verify the email address.';
      if (err?.code === 'auth/user-not-found') {
        errorMessage = 'No SokoPoS account found with this email address.';
      } else if (err?.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      return { success: false, error: errorMessage };
    }
  };

  const resendVerificationEmail = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      return { success: false, error: 'No active sign-up session found. Please sign in again.' };
    }
    try {
      await sendEmailVerification(fbUser);
      return {
        success: true,
        message: `Verification link sent to ${fbUser.email}. Please check your inbox and spam folder.`,
      };
    } catch (err: any) {
      console.warn('Resend verification email error:', err);
      if (err?.code === 'auth/too-many-requests') {
        return {
          success: false,
          error: 'A verification email was recently sent. Please wait a minute before requesting another.',
        };
      }
      return {
        success: false,
        error: err?.message || 'Failed to resend verification email.',
      };
    }
  };

  const checkEmailVerificationStatus = async (): Promise<{ verified: boolean; error?: string }> => {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.email) {
      return { verified: false, error: 'Session expired. Please sign in again.' };
    }
    try {
      await fbUser.reload();
      const refreshedUser = auth.currentUser;
      if (!refreshedUser || !refreshedUser.emailVerified) {
        return {
          verified: false,
          error: 'Email not verified yet. Please click the verification link in your inbox first.',
        };
      }

      // Force token refresh so request.auth.token.email_verified == true in Firestore rules
      const idToken = await refreshedUser.getIdToken(true);
      const tokenResult = await refreshedUser.getIdTokenResult();
      const expirationTime = new Date(tokenResult.expirationTime).getTime();

      const normalizedEmail = refreshedUser.email!.toLowerCase().trim();
      const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();
      const pendingStoreName = sessionStorage.getItem('sokopos_pending_store_name') || undefined;
      if (pendingStoreName) {
        sessionStorage.removeItem('sokopos_pending_store_name');
      }

      const { winner: matchedBiz, isExistingAccount } = await prioritizeAccountAndPurgeConflicts(
        normalizedEmail,
        refreshedUser.displayName || undefined,
        pendingStoreName
      );

      const targetBizId = isSuperAdminEmail ? 'biz-upfront' : matchedBiz.id;
      const role: UserRole = isSuperAdminEmail
        ? 'super_admin'
        : matchedBiz
        ? 'business_owner'
        : 'manager';

      const authUser: AuthUser = {
        id: refreshedUser.uid,
        firebaseUid: refreshedUser.uid,
        email: refreshedUser.email!,
        name: refreshedUser.displayName || (isSuperAdminEmail ? 'Platform Administrator' : refreshedUser.email!.split('@')[0]),
        initials: (refreshedUser.displayName || (isSuperAdminEmail ? 'PA' : refreshedUser.email!.substring(0, 2))).substring(0, 2).toUpperCase(),
        avatarUrl: refreshedUser.photoURL || undefined,
        authProvider: 'firebase',
        role,
        businessId: targetBizId,
        businessName: matchedBiz?.name || (isSuperAdminEmail ? 'Upfront Retail Solutions' : 'Business Account'),
        createdAt: refreshedUser.metadata.creationTime || new Date().toISOString(),
        idToken,
        tokenExpiresAt: expirationTime,
        sessionStatus: 'verified',
      };

      await saveUserProfileToFirestore({
        uid: refreshedUser.uid,
        email: refreshedUser.email!,
        role,
        businessId: targetBizId,
        displayName: refreshedUser.displayName || '',
      });

      setPendingVerificationEmail(null);
      setCurrentUser(authUser);
      setActiveBusinessIdState(targetBizId);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, targetBizId);

      soundFx.playSuccess();
      showToast(
        isExistingAccount
          ? `Email verified! Logged into ${matchedBiz.name}.`
          : `Email verified! Shop "${matchedBiz.name}" is now active.`,
        'success'
      );
      return { verified: true };
    } catch (err: any) {
      console.warn('Check verification status error:', err);
      return {
        verified: false,
        error: err?.message || 'Unable to verify status right now. Please try again.',
      };
    }
  };

  const cancelEmailVerification = async (): Promise<void> => {
    setPendingVerificationEmail(null);
    sessionStorage.removeItem('sokopos_pending_store_name');
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Sign out during cancelEmailVerification:', err);
    }
  };

  const exchangeOAuthTokenForSession = async (
    idToken: string,
    userInfo: { email: string; name?: string; uid?: string }
  ): Promise<boolean> => {
    try {
      const normalizedEmail = userInfo.email.trim().toLowerCase();
      const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      // Enforce uniqueness: prioritize account last logged into & delete conflicts at Firestore level
      const { winner: matchedBiz } = await prioritizeAccountAndPurgeConflicts(
        normalizedEmail,
        userInfo.name || undefined
      );

      const targetBizId = isSuperAdminEmail ? 'biz-upfront' : matchedBiz.id;

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
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_OUT);
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

    // Enforce uniqueness: prioritize account last logged into & delete conflicts at Firestore level
    const now = new Date().toISOString();
    const emailMatches = businesses.filter(
      (b) => b.ownerEmail && b.ownerEmail.toLowerCase() === normalizedEmail
    );

    let matchedBiz: Business;
    let conflicts: Business[] = [];

    if (emailMatches.length > 0) {
      const sorted = [...emailMatches].sort((a, b) => {
        const aScore = Math.max(
          a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0,
          a.createdAt ? new Date(a.createdAt).getTime() : 0
        );
        const bScore = Math.max(
          b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0,
          b.createdAt ? new Date(b.createdAt).getTime() : 0
        );
        return bScore - aScore;
      });
      matchedBiz = {
        ...sorted[0],
        lastLoginAt: now,
      };
      conflicts = sorted.slice(1);
    } else {
      const newBizId = getStableBusinessIdForEmail(normalizedEmail);
      const businessName = newBusinessName || `${name || 'Retail'}'s Store`;
      const capturedRefCode = getCapturedReferralCode();
      matchedBiz = {
        id: newBizId,
        name: businessName,
        code: businessName.substring(0, 4).toUpperCase().replace(/\s+/g, ''),
        ownerEmail: normalizedEmail,
        ownerName: name || 'Business Owner',
        createdAt: now,
        lastLoginAt: now,
        plan: 'free',
        status: 'active',
        currency: 'KES',
        taxNumber: `P0${Math.floor(100000000 + Math.random() * 900000000)}Z`,
        ...(capturedRefCode ? { referredByCode: capturedRefCode, referredAt: now } : {}),
      };
      if (capturedRefCode) {
        clearCapturedReferralCode();
      }
    }

    // Check for tenant ID conflicts across other emails
    const idConflicts = businesses.filter(
      (b) => b.id === matchedBiz.id && b.ownerEmail && b.ownerEmail.toLowerCase() !== normalizedEmail
    );
    if (idConflicts.length > 0) {
      conflicts.push(...idConflicts);
    }

    const conflictMap = new Map<string, Business>();
    conflicts.forEach((c) => {
      if (c.id !== matchedBiz.id) conflictMap.set(c.id, c);
    });
    const uniqueConflicts = Array.from(conflictMap.values());
    const conflictIds = new Set(uniqueConflicts.map((c) => c.id));

    setBusinesses((prev) => {
      const filtered = prev.filter(
        (b) => !conflictIds.has(b.id) && b.ownerEmail.toLowerCase() !== normalizedEmail
      );
      const nextBizs = [...filtered, matchedBiz];
      return nextBizs;
    });

    ensureTenantDefaults(matchedBiz);

    if (auth.currentUser) {
      if (emailMatches.length > 0) {
        updateBusinessInFirestore(matchedBiz.id, { lastLoginAt: matchedBiz.lastLoginAt }).catch((e) =>
          console.warn('Sync matched biz lastLoginAt note:', e)
        );
      } else {
        saveBusinessToFirestore(matchedBiz).catch((e) => console.warn('Sync matched biz note:', e));
      }
      if (uniqueConflicts.length > 0) {
        deleteBusinessConflictsFromFirestore(uniqueConflicts).catch((e) =>
          console.warn('Purge conflicts note:', e)
        );
      }
    }

    const bizOwnerUser: AuthUser = {
      id: `usr-${Date.now()}`,
      email: matchedBiz.ownerEmail,
      name: name || matchedBiz.ownerName,
      initials: (name || matchedBiz.ownerName).substring(0, 2).toUpperCase(),
      authProvider: 'google',
      role: 'business_owner',
      businessId: matchedBiz.id,
      businessName: matchedBiz.name,
      createdAt: matchedBiz.createdAt,
    };

    setCurrentUser(bizOwnerUser);
    setActiveBusinessIdState(matchedBiz.id);
    if (newBusinessName && emailMatches.length > 0) {
      showToast(
        `Account already exists: This Google account is already registered to "${matchedBiz.name}". You have been logged into your shop.`,
        'info'
      );
    } else {
      showToast(`Welcome back, ${bizOwnerUser.name}! Logged into ${matchedBiz.name}`, 'success');
    }
    return true;
  };

  const loginWithCredentials = async (
    usernameOrId: string,
    pin: string,
    isDemo?: boolean
  ): Promise<boolean> => {
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_OUT);
    const trimmedInput = usernameOrId.trim().toLowerCase();
    const cleanCode = trimmedInput.replace(/^#/, '');

    if (!trimmedInput) {
      soundFx.playError();
      showToast('Please enter your Staff Username or Staff ID.', 'error');
      return false;
    }

    // Search candidates strictly by unique ID, Username, or Staff Code (#7000/7000)
    const matchesIdentity = (u: Cashier) =>
      u.id.toLowerCase() === trimmedInput ||
      u.username?.trim().toLowerCase() === trimmedInput ||
      u.code?.trim().toLowerCase() === trimmedInput ||
      u.code?.trim().toLowerCase().replace(/^#/, '') === cleanCode;

    let candidateUsers = allSystemUsers.filter(matchesIdentity);
    let serverVerifiedLookup: Awaited<ReturnType<typeof verifyStaffPinViaServer>> | null = null;

    // If candidate not in memory and online, try targeted identity lookup (if signed in) or server credential vault
    if (candidateUsers.length === 0 && isOnline) {
      try {
        let remoteCashiers: Cashier[] = [];
        if (auth.currentUser && activeBusinessId && activeBusinessId !== 'biz-demo') {
          remoteCashiers = await getTenantCashiersFromFirestore(activeBusinessId);
        }
        if (remoteCashiers && remoteCashiers.length > 0) {
          setAllSystemUsers((prev) => {
            const map = new Map<string, Cashier>();
            prev.forEach((u) => map.set(u.id, u));
            remoteCashiers.forEach((r) => map.set(r.id, { ...r, isPendingCloudSync: false }));
            return Array.from(map.values());
          });
          candidateUsers = remoteCashiers.filter(matchesIdentity);
        }

        // Fresh staff terminal with no Firebase Google session: verify directly via server vault
        if (candidateUsers.length === 0) {
          const directVerify = await verifyStaffPinViaServer({
            pin,
            usernameOrCode: trimmedInput,
          });
          if (directVerify.isValid && directVerify.cashierId && directVerify.businessId) {
            serverVerifiedLookup = directVerify;
            const resolvedName = directVerify.name || usernameOrId;
            const synthesizedUser: Cashier = {
              id: directVerify.cashierId,
              businessId: directVerify.businessId,
              name: resolvedName,
              initials: resolvedName
                .split(' ')
                .map((p) => p[0])
                .join('')
                .substring(0, 2)
                .toUpperCase() || 'ST',
              role: (directVerify.role as Cashier['role']) || 'cashier',
              code: directVerify.code || usernameOrId,
              username: directVerify.username || trimmedInput,
              pin: PROTECTED_PIN_MASK,
              assignedLocationId: '',
              avatarColor: 'bg-blue-600',
              shiftStartedAt: new Date().toISOString(),
            };
            setAllSystemUsers((prev) => {
              const map = new Map<string, Cashier>();
              prev.forEach((u) => map.set(u.id, u));
              map.set(synthesizedUser.id, synthesizedUser);
              return Array.from(map.values());
            });
            candidateUsers = [synthesizedUser];
          } else if (
            directVerify.error &&
            (directVerify.error.includes('Access Blocked') ||
              directVerify.error.includes('locked') ||
              directVerify.error.includes('Invalid PIN'))
          ) {
            soundFx.playError();
            showToast(directVerify.error, 'error');
            return false;
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('locked') || err?.message?.includes('Too many')) {
          soundFx.playError();
          showToast(err.message, 'error');
          return false;
        }
        console.warn('Targeted remote cashiers check on login:', err);
      }
    }

    if (candidateUsers.length === 0) {
      soundFx.playError();
      showToast(`Staff ID or Username "${usernameOrId}" not found in system.`, 'error');
      return false;
    }

    for (const matchedUser of candidateUsers) {
      const isExplicitDemoUser = Boolean(isDemo) || matchedUser.businessId === 'biz-demo';

      // Validate staff PIN strictly through protected /api/auth/verify-pin server route
      let isValid = false;
      let verifiedBusinessName = serverVerifiedLookup?.businessName;
      let verifiedBusinessStatus = serverVerifiedLookup?.businessStatus;
      try {
        if (serverVerifiedLookup && serverVerifiedLookup.cashierId === matchedUser.id) {
          isValid = serverVerifiedLookup.isValid;
        } else {
          const verifyRes = await verifyStaffPinViaServer({
            pin,
            cashierId: matchedUser.id,
            businessId: matchedUser.businessId,
            usernameOrCode: matchedUser.username || matchedUser.code,
            fallbackHash: matchedUser.pin,
          });
          verifiedBusinessName = verifiedBusinessName || verifyRes.businessName;
          verifiedBusinessStatus = verifiedBusinessStatus || verifyRes.businessStatus;

          // Demo PIN bypass ONLY applies when explicitly in a demo flow or logging into a biz-demo account
          const isDemoMatch =
            isExplicitDemoUser &&
            pin === '1234' &&
            (matchedUser.businessId === 'biz-demo' ||
              matchedUser.code === '#7000' ||
              matchedUser.id === appointedDemoCashierId ||
              matchedUser.isAppointedDemo);

          isValid = verifyRes.isValid || isDemoMatch;

          if (!isValid && verifyRes.error) {
            if (verifyRes.error.includes('Access Blocked') || verifyRes.error.includes('locked')) {
              soundFx.playError();
              showToast(verifyRes.error, 'error');
              return false;
            }
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('locked') || err?.message?.includes('Too many')) {
          soundFx.playError();
          showToast(err.message, 'error');
          return false;
        }
        console.warn('Server PIN verification fallback attempt:', err);
        const isDemoMatch =
          isExplicitDemoUser &&
          pin === '1234' &&
          (matchedUser.businessId === 'biz-demo' ||
            matchedUser.code === '#7000' ||
            matchedUser.id === appointedDemoCashierId ||
            matchedUser.isAppointedDemo);
        isValid = isDemoMatch || (await verifyPinOnServer(pin, matchedUser.pin));
      }

      if (isValid) {
        // Isolate demo sessions strictly to biz-demo; real staff members always land in their own businessId
        const isDemoSessionActive = Boolean(isDemo) || matchedUser.businessId === 'biz-demo';
        const targetBizId = isDemoSessionActive ? 'biz-demo' : matchedUser.businessId;

        if (!targetBizId) {
          soundFx.playError();
          showToast('Access Blocked: Staff member has no assigned business tenant.', 'error');
          return false;
        }

        // Resolve assigned location within targetBizId (never inherit a location from the previous business)
        const targetBizLocations = allLocations.filter((l) => l.businessId === targetBizId);
        const targetLocationId = isDemoSessionActive
          ? 'loc-demo-01'
          : (matchedUser.assignedLocationId && targetBizLocations.some((l) => l.id === matchedUser.assignedLocationId)
              ? matchedUser.assignedLocationId
              : targetBizLocations[0]?.id || matchedUser.assignedLocationId);

        let biz = businesses.find((b) => b.id === targetBizId);
        if (!biz && isOnline && auth.currentUser && !isDemoBusinessId(targetBizId)) {
          try {
            const singleBiz = await getBusinessByIdFromFirestore(targetBizId);
            if (singleBiz) {
              setBusinesses((prev) => {
                const map = new Map<string, Business>();
                prev.forEach((b) => map.set(b.id, b));
                map.set(singleBiz.id, singleBiz);
                return Array.from(map.values());
              });
              biz = singleBiz;
            }
          } catch (e) {
            console.warn('Fetch remote business by ID for staff session:', e);
          }
        }

        // Strict Check: Check if business is active or suspended
        if ((biz && biz.status === 'suspended') || verifiedBusinessStatus === 'suspended') {
          soundFx.playError();
          showToast(
            `Access Blocked: The business account "${biz?.name || verifiedBusinessName || targetBizId}" is currently suspended. Please contact the business owner.`,
            'error'
          );
          return false;
        }

        const resolvedBizName = isDemoSessionActive
          ? 'SokoPoS Demo Mart (Sandbox)'
          : (biz?.name || verifiedBusinessName || 'SokoPoS Terminal Store');

        // Strict Session Lockdown: Bound strictly to targetBizId and matchedUser.role with masked PIN
        const authUser: AuthUser = {
          id: matchedUser.id,
          email: `${matchedUser.username || matchedUser.code.replace(/^#/, '')}@${isDemoSessionActive ? 'demo' : biz?.code.toLowerCase() || 'pos'}.internal`,
          name: matchedUser.name,
          initials: matchedUser.initials,
          authProvider: 'credentials',
          role: matchedUser.role as UserRole,
          businessId: targetBizId,
          businessName: resolvedBizName,
          username: matchedUser.username,
          pin: PROTECTED_PIN_MASK,
          assignedLocationId: targetLocationId,
          createdAt: matchedUser.shiftStartedAt,
          isDemoSession: isDemoSessionActive,
        };

        // Pin active tenant state strictly to this business
        setCurrentUser(authUser);
        setActiveBusinessIdState(targetBizId);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, targetBizId);

        if (isDemoSessionActive) {
          localStorage.setItem(STORAGE_KEYS.IS_DEMO_SESSION, 'true');
          localStorage.removeItem('sokopos_demo_intent');
        } else {
          localStorage.removeItem(STORAGE_KEYS.IS_DEMO_SESSION);
          localStorage.removeItem('sokopos_demo_intent');
        }

        setCurrentCashier(matchedUser);

        if (targetLocationId) {
          setCurrentLocationIdState(targetLocationId);
          localStorage.setItem(STORAGE_KEYS.CURRENT_LOC, targetLocationId);
        }

        clearCart();
        setActiveReceipt(null);
        setActiveRefundReceipt(null);

        soundFx.playSuccess();
        showToast(
          `Shift started for ${matchedUser.name} (${matchedUser.role}) at ${resolvedBizName}.`,
          'success'
        );
        return true;
      }
    }

    soundFx.playError();
    showToast('Incorrect 4-digit PIN for this staff account. Try again.', 'error');
    return false;
  };

  const logout = (): boolean => {
    // 1. If an active shift session is open, safely close and preserve it with full attribution
    if (activeShift && activeShift.status === 'open') {
      const closedShift: ShiftSession = {
        ...activeShift,
        status: 'closed',
        closedAt: new Date().toISOString(),
        closedByCashierId: currentCashier?.id || activeShift.cashierId,
        closedByCashierName: currentCashier?.name || activeShift.cashierName,
        closingCountedCash:
          activeShift.openingFloat + (activeShift.cashSales || 0) - (activeShift.cashRefunds || 0),
        expectedCash:
          activeShift.openingFloat + (activeShift.cashSales || 0) - (activeShift.cashRefunds || 0),
        cashVariance: 0,
        closingNotes: 'Shift session closed automatically upon operator sign-out.',
      };

      setAllShifts((prev) =>
        prev.map((s) => (s.id === activeShift.id ? closedShift : s))
      );
    }

    // 2. Mark session as explicitly signed out
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_OUT, 'true');
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.IS_DEMO_SESSION);
    localStorage.removeItem('sokopos_demo_intent');

    // 3. Clear Firebase session if active
    try {
      firebaseSignOut(auth).catch((err) => {
        console.warn('Firebase signout note:', err);
      });
    } catch (err) {
      console.warn('Firebase signout exception:', err);
    }

    // 4. Reset server freshness status and timestamp for next login
    setIsInventoryFreshFromServer(false);
    setInventoryLastFetchedAt(null);

    // 5. Clear user session completely
    setCurrentUser(null);
    clearCart();
    setActiveReceipt(null);
    setActiveRefundReceipt(null);
    setIsPinLocked(false);
    soundFx.playBeep(440, 0.15);
    showToast('Signed out of POS terminal. Session terminated successfully.', 'info');

    // 6. Navigate to root landing page
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    return true;
  };

  // Super-Admin Business Provisioning
  const provisionBusiness = (
    name: string,
    ownerEmail: string,
    ownerName: string,
    plan: BusinessPlanTier
  ): Business => {
    if (!isSuperAdmin) {
      throw new Error('Unauthorized: Only Super-Admin can provision business tenants.');
    }

    const canonicalPlan = normalizePlanTier(plan);

    const trimmedEmail = ownerEmail.trim().toLowerCase();
    if (!isRealGoogleAccount(trimmedEmail)) {
      showToast('Validation Error: Business owner must have an authentic Google Account (e.g. name@gmail.com).', 'error');
      throw new Error('Business owner must have an authentic Google Account (e.g. name@gmail.com).');
    }

    // Enforce uniqueness at email level: No two businesses may share the same Google account email
    const existingWithEmail = businesses.find(
      (b) => b.ownerEmail.toLowerCase() === trimmedEmail
    );
    if (existingWithEmail) {
      const errMsg = `Conflict Error: A business tenant ("${existingWithEmail.name}", ID: ${existingWithEmail.id}) is already registered with Google account ${trimmedEmail}. No two businesses may share the same Google account email.`;
      showToast(errMsg, 'error');
      throw new Error(errMsg);
    }

    const newBizId = `biz-${Date.now().toString(36)}`;
    // Enforce uniqueness at tenant ID level
    if (businesses.some((b) => b.id === newBizId)) {
      const errMsg = `Conflict Error: Tenant ID "${newBizId}" is already taken. Tenant IDs must be strictly unique.`;
      showToast(errMsg, 'error');
      throw new Error(errMsg);
    }

    const capturedRefCode = getCapturedReferralCode();
    const newBusiness: Business = {
      id: newBizId,
      name,
      code: name.substring(0, 4).toUpperCase().replace(/\s+/g, ''),
      ownerEmail: trimmedEmail,
      ownerName,
      createdAt: new Date().toISOString(),
      plan: canonicalPlan,
      status: 'active',
      currency: 'KES',
      taxNumber: `P0${Math.floor(100000000 + Math.random() * 900000000)}Z`,
      ...(capturedRefCode ? { referredByCode: capturedRefCode, referredAt: new Date().toISOString() } : {}),
    };
    if (capturedRefCode) {
      clearCapturedReferralCode();
    }

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
    if (isOnline) {
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

  // System Cleanup: Purge unverified accounts and enforce strict uniqueness across Google accounts and tenant IDs
  const performSystemCleanup = async (): Promise<{
    removedCount: number;
    removedBusinesses: string[];
  }> => {
    // 1. Identify businesses lacking a real Google account
    const fakeToRemove = businesses.filter(
      (b) => !isRealGoogleAccount(b.ownerEmail) || b.id === 'biz-soko' || b.id === 'biz-quickmart'
    );

    // 2. Enforce uniqueness on remaining businesses (email & tenant ID levels)
    // Prioritizing the account last logged into
    const verifiedCandidates = businesses.filter(
      (b) => isRealGoogleAccount(b.ownerEmail) && b.id !== 'biz-soko' && b.id !== 'biz-quickmart'
    );
    const { uniqueBusinesses, conflictsToDelete } = resolveBusinessUniquenessConflicts(verifiedCandidates);

    const toRemove = [...fakeToRemove, ...conflictsToDelete];
    const unverifiedIds = new Set<string>(toRemove.map((b) => b.id));
    unverifiedIds.add('biz-soko');
    unverifiedIds.add('biz-quickmart');
    const removedNames = toRemove.map((b) => `${b.name} (${b.ownerEmail})`);

    const validBusinesses = uniqueBusinesses.filter((b) => !unverifiedIds.has(b.id));
    const nextBizs = validBusinesses.length > 0 ? validBusinesses : INITIAL_BUSINESSES;

    setBusinesses(nextBizs);

    if (unverifiedIds.has(activeBusinessIdState)) {
      setActiveBusinessIdState('biz-upfront');
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, 'biz-upfront');
    }

    setAllSystemUsers((prev) => prev.filter((u) => !unverifiedIds.has(u.businessId)));
    setAllLocations((prev) => prev.filter((l) => !unverifiedIds.has(l.businessId)));
    setAllProducts((prev) => prev.filter((p) => !unverifiedIds.has(p.businessId)));
    setAllCategories((prev) => prev.filter((c) => !unverifiedIds.has(c.businessId)));
    setAllTransactions((prev) => prev.filter((t) => !unverifiedIds.has(t.businessId)));
    setAllCustomers((prev) => prev.filter((c) => !unverifiedIds.has(c.businessId)));
    setAllShifts((prev) => prev.filter((s) => !unverifiedIds.has(s.businessId)));

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
  const [businessSettingsDefaultTab, setBusinessSettingsDefaultTab] = useState<'profile' | 'branches' | 'billing' | 'settlement' | 'tax' | 'loyalty' | 'pricing' | 'accounts' | 'credentials' | 'appearance' | 'hardware' | 'reset'>('profile');

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

  const [printerType, setPrinterTypeState] = useState<'system' | 'bluetooth'>(() => {
    const tenantKey = STORAGE_KEYS.getTenantPrinterTypeKey(activeBusinessId);
    const saved = localStorage.getItem(tenantKey);
    if (saved === 'system' || saved === 'bluetooth') return saved;
    if (currentBusiness?.hardwareSettings?.printerType) {
      return currentBusiness.hardwareSettings.printerType;
    }
    return 'system';
  });

  const [bluetoothPrinterId, setBluetoothPrinterIdState] = useState<string | null>(() => {
    const tenantKey = STORAGE_KEYS.getTenantBluetoothPrinterIdKey(activeBusinessId);
    const saved = localStorage.getItem(tenantKey);
    if (saved) return saved;
    if (currentBusiness?.hardwareSettings?.bluetoothPrinterId) {
      return currentBusiness.hardwareSettings.bluetoothPrinterId;
    }
    return null;
  });

  const [bluetoothPrinterName, setBluetoothPrinterNameState] = useState<string | null>(() => {
    const tenantKey = STORAGE_KEYS.getTenantBluetoothPrinterNameKey(activeBusinessId);
    const saved = localStorage.getItem(tenantKey);
    if (saved) return saved;
    if (currentBusiness?.hardwareSettings?.bluetoothPrinterName) {
      return currentBusiness.hardwareSettings.bluetoothPrinterName;
    }
    return null;
  });

  // Mobile Navigation & Bento Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

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

    const tenantPrinterTypeKey = STORAGE_KEYS.getTenantPrinterTypeKey(activeBusinessId);
    const savedPrinterType = localStorage.getItem(tenantPrinterTypeKey);
    if (savedPrinterType === 'system' || savedPrinterType === 'bluetooth') {
      setPrinterTypeState(savedPrinterType);
    } else if (currentBusiness?.hardwareSettings?.printerType) {
      setPrinterTypeState(currentBusiness.hardwareSettings.printerType);
    } else {
      setPrinterTypeState('system');
    }

    const tenantBtIdKey = STORAGE_KEYS.getTenantBluetoothPrinterIdKey(activeBusinessId);
    const savedBtId = localStorage.getItem(tenantBtIdKey);
    if (savedBtId) {
      setBluetoothPrinterIdState(savedBtId);
    } else {
      setBluetoothPrinterIdState(currentBusiness?.hardwareSettings?.bluetoothPrinterId || null);
    }

    const tenantBtNameKey = STORAGE_KEYS.getTenantBluetoothPrinterNameKey(activeBusinessId);
    const savedBtName = localStorage.getItem(tenantBtNameKey);
    if (savedBtName) {
      setBluetoothPrinterNameState(savedBtName);
    } else {
      setBluetoothPrinterNameState(currentBusiness?.hardwareSettings?.bluetoothPrinterName || null);
    }
  }, [
    activeBusinessId,
    currentBusiness?.id,
    currentBusiness?.hardwareSettings?.autoPrintReceipt,
    currentBusiness?.hardwareSettings?.receiptFormat,
    currentBusiness?.hardwareSettings?.printerType,
    currentBusiness?.hardwareSettings?.bluetoothPrinterId,
    currentBusiness?.hardwareSettings?.bluetoothPrinterName,
  ]);

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
      if (isOnline) {
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
      if (isOnline) {
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

  const setPrinterType = useCallback((type: 'system' | 'bluetooth') => {
    setPrinterTypeState(type);
    const tenantKey = STORAGE_KEYS.getTenantPrinterTypeKey(activeBusinessId);
    localStorage.setItem(tenantKey, type);

    if (currentBusiness) {
      const updatedHardwareSettings = {
        ...(currentBusiness.hardwareSettings || {}),
        printerType: type,
        updatedAt: new Date().toISOString(),
      };
      setBusinesses((prev) =>
        prev.map((b) => (b.id === activeBusinessId ? { ...b, hardwareSettings: updatedHardwareSettings } : b))
      );
      if (isOnline) {
        updateBusinessInFirestore(activeBusinessId, { hardwareSettings: updatedHardwareSettings }).catch((err) =>
          console.warn('Firestore hardware settings sync error:', err)
        );
      }
    }

    showToast(`Printer type set to ${type === 'bluetooth' ? 'Direct Bluetooth Thermal' : 'System Print Dialog'}`, 'info');
  }, [activeBusinessId, currentBusiness, isOnline, showToast]);

  const setBluetoothPrinter = useCallback((id: string | null, name: string | null) => {
    setBluetoothPrinterIdState(id);
    setBluetoothPrinterNameState(name);
    
    const idKey = STORAGE_KEYS.getTenantBluetoothPrinterIdKey(activeBusinessId);
    const nameKey = STORAGE_KEYS.getTenantBluetoothPrinterNameKey(activeBusinessId);
    
    if (id) localStorage.setItem(idKey, id); else localStorage.removeItem(idKey);
    if (name) localStorage.setItem(nameKey, name); else localStorage.removeItem(nameKey);

    if (currentBusiness) {
      const updatedHardwareSettings = {
        ...(currentBusiness.hardwareSettings || {}),
        bluetoothPrinterId: id || undefined,
        bluetoothPrinterName: name || undefined,
        updatedAt: new Date().toISOString(),
      };
      setBusinesses((prev) =>
        prev.map((b) => (b.id === activeBusinessId ? { ...b, hardwareSettings: updatedHardwareSettings } : b))
      );
      if (isOnline) {
        updateBusinessInFirestore(activeBusinessId, { hardwareSettings: updatedHardwareSettings }).catch((err) =>
          console.warn('Firestore hardware settings sync error:', err)
        );
      }
    }
  }, [activeBusinessId, currentBusiness, isOnline]);

  const connectBluetoothPrinter = useCallback(async (): Promise<boolean> => {
    try {
      const printer = await bluetoothPrinterService.connect();
      if (printer) {
        setBluetoothPrinter(printer.device.id, printer.device.name || 'BT Printer');
        showToast(`Connected to Bluetooth printer: ${printer.device.name || 'BT Printer'}`, 'success');
        
        // Also switch printer type to bluetooth automatically if not already
        if (printerType !== 'bluetooth') {
          setPrinterType('bluetooth');
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Bluetooth Connect Error:', err);
      showToast(err instanceof Error ? err.message : 'Failed to connect to Bluetooth printer', 'error');
      return false;
    }
  }, [printerType, setPrinterType, setBluetoothPrinter, showToast]);

  // Display & Dark Theme State: SokoPoS defaults primarily to High-Contrast Light Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    if (saved !== null) {
      return saved === 'true';
    }
    // SokoPoS is primarily availed in Light mode by default
    return false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
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

  const openBusinessSettings = (initialTab: 'profile' | 'branches' | 'billing' | 'settlement' | 'tax' | 'loyalty' | 'pricing' | 'accounts' | 'credentials' | 'appearance' | 'hardware' | 'reset' = 'profile') => {
    if (initialTab === 'pricing') {
      openPricingPage();
      return;
    }
    setBusinessSettingsDefaultTab(initialTab);
    setIsBusinessSettingsOpen(true);
  };

  const applyBusinessLocalUpdate = (
    businessId: string,
    updates: Partial<Business>,
    syncToFirestore = false
  ) => {
    if (!businessId) return;
    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, ...updates } : b))
    );
    if (syncToFirestore && isOnline) {
      updateBusinessInFirestore(businessId, updates).catch((err) =>
        console.warn('Firestore business fallback sync:', err)
      );
    }
  };

  const updateBusinessProfile = (updates: Partial<Business>) => {
    if (!currentBusiness) return;

    if (!isSuperAdmin) {
      if (
        updates.currency !== undefined &&
        updates.currency !== currentBusiness.currency &&
        !requireCapability('multiCurrency')
      ) {
        return;
      }
      if (updates.taxSettings !== undefined) {
        const hasDynamicRules =
          Boolean(updates.taxSettings.enableDynamicCategoryTax) ||
          Boolean(updates.taxSettings.enableDynamicRegionalTax) ||
          (updates.taxSettings.rules?.some((r) => !r.isDefault && r.isActive) ?? false);
        if (hasDynamicRules && !requireCapability('advancedTaxRules')) {
          return;
        }
      }
      if (updates.hardwareSettings !== undefined) {
        const headerChanged =
          updates.hardwareSettings.printerHeaderNote !== undefined &&
          updates.hardwareSettings.printerHeaderNote !== (currentBusiness.hardwareSettings?.printerHeaderNote || '');
        const footerChanged =
          updates.hardwareSettings.printerFooterNote !== undefined &&
          updates.hardwareSettings.printerFooterNote !== (currentBusiness.hardwareSettings?.printerFooterNote || '');
        if ((headerChanged || footerChanged) && !requireCapability('customReceiptBranding')) {
          return;
        }
      }
    }

    // Never allow non-super-admins to tamper with protected billing/plan fields via profile updates
    const safeUpdates: Partial<Business> = isSuperAdmin
      ? updates
      : (() => {
          const { plan: _p, status: _s, subscription: _sub, ...rest } = updates;
          return rest;
        })();

    if (Object.keys(safeUpdates).length === 0) return;

    const oldBiz = currentBusiness;
    const updatedBiz: Business = { ...oldBiz, ...safeUpdates };

    setBusinesses((prev) =>
      prev.map((b) => (b.id === activeBusinessId ? updatedBiz : b))
    );
    if (safeUpdates.taxNumber) {
      setAllLocations((prev) =>
        prev.map((loc) => (loc.businessId === activeBusinessId ? { ...loc, taxId: safeUpdates.taxNumber! } : loc))
      );
    }
    if (isOnline) {
      updateBusinessInFirestore(activeBusinessId, safeUpdates).catch((err) =>
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

  const saveBusinessBrandingLogo = async (branding: BusinessBrandingSettings | null): Promise<void> => {
    if (!currentBusiness) return;
    const oldBiz = currentBusiness;
    const nextBranding: BusinessBrandingSettings = branding
      ? {
          ...branding,
          updatedAt: branding.updatedAt || new Date().toISOString(),
          updatedBy: branding.updatedBy || currentUser?.email || currentBusiness.ownerEmail,
        }
      : {
          logoBase64: null,
          logoFileName: undefined,
          aspectRatio: '4:1',
          width: 400,
          height: 100,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.email || currentBusiness.ownerEmail,
        };

    const updatedBiz: Business = {
      ...oldBiz,
      brandingSettings: nextBranding,
    };

    setBusinesses((prev) =>
      prev.map((b) => (b.id === activeBusinessId ? updatedBiz : b))
    );

    if (isOnline && activeBusinessId !== 'biz-demo') {
      try {
        await updateBusinessInFirestore(activeBusinessId, {
          brandingSettings: nextBranding,
        });
      } catch (err) {
        setBusinesses((prev) =>
          prev.map((b) => (b.id === activeBusinessId ? oldBiz : b))
        );
        throw err;
      }
    }
  };

  const recordMerchantLegalConsent = async (): Promise<BusinessLegalConsent> => {
    if (!currentUser || !currentBusiness) {
      throw new Error('Active merchant session and business setup are required.');
    }
    if (isDemoSession || currentBusiness.id === 'biz-demo') {
      throw new Error('Legal onboarding consent is only required for live merchant accounts.');
    }
    if (!isOnline) {
      throw new Error('You appear to be offline. Reconnect to the internet so your consent can be recorded in Firestore.');
    }
    if (!auth.currentUser) {
      throw new Error('Verified cloud authentication is required before recording legal consent. Please sign in with your merchant Google or email account.');
    }
    const isAdminEmail =
      (auth.currentUser.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    if (!auth.currentUser.emailVerified && !isAdminEmail) {
      throw new Error('Please verify your email address before completing initial legal setup.');
    }

    const consentRecord: BusinessLegalConsent = {
      termsAccepted: true,
      asIsWarrantyAcknowledged: true,
      operationalRisksAccepted: true,
      termsVersion: LEGAL_ENTITY.lastRevised,
      privacyPolicyVersion: LEGAL_ENTITY.lastRevised,
      entityName: LEGAL_ENTITY.companyName,
      acceptedAt: new Date().toISOString(),
      acceptedByUid: auth.currentUser.uid,
      acceptedByEmail: (auth.currentUser.email || currentUser.email || currentBusiness.ownerEmail).trim().toLowerCase(),
      acceptedByName: currentUser.name || currentBusiness.ownerName || auth.currentUser.displayName || 'Merchant Owner',
    };

    await saveBusinessLegalConsentToFirestore(currentBusiness, consentRecord);

    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === currentBusiness.id ? { ...b, legalConsent: consentRecord } : b
      )
    );

    logAdminActivity({
      category: 'security',
      action: 'merchant_legal_consent_recorded',
      description: `Recorded Sokoplus Horizon Terms of Service (${LEGAL_ENTITY.lastRevised}), AS-IS disclaimer, and operational risk acknowledgements in Firestore for "${currentBusiness.name}"`,
      recordType: 'business',
      recordId: currentBusiness.id,
      afterValue: consentRecord,
    });

    soundFx.playSuccess();
    showToast(`Legal agreement recorded in cloud. POS access unlocked for ${currentBusiness.name}.`, 'success');
    return consentRecord;
  };

  const updateBusinessStatus = async (businessId: string, status: 'active' | 'suspended'): Promise<void> => {
    const targetBiz = businesses.find((b) => b.id === businessId);
    if (!targetBiz) return;

    const oldStatus = targetBiz.status;
    const updatedBiz: Business = { ...targetBiz, status };

    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? updatedBiz : b))
    );

    if (isOnline) {
      updateBusinessInFirestore(businessId, { status }).catch((err) =>
        console.warn('Firestore business status update:', err)
      );
    }

    if (isSuperAdmin) {
      logSuperAdminAction(
        businessId,
        'business',
        businessId,
        'update',
        status === 'active'
          ? `Super-admin activated POS access subscription for "${targetBiz.name}"`
          : `Super-admin suspended POS access for "${targetBiz.name}" (manual subscription suspension)`,
        { status: oldStatus },
        { status }
      );
    }

    logAdminActivity({
      category: 'system',
      action: status === 'active' ? 'activate_subscription' : 'suspend_subscription',
      description: status === 'active'
        ? `Activated POS access for business "${targetBiz.name}" (${targetBiz.code})`
        : `Deactivated POS access for business "${targetBiz.name}" (${targetBiz.code})`,
      recordType: 'business',
      recordId: businessId,
      beforeValue: { status: oldStatus },
      afterValue: { status },
    });

    soundFx.playSuccess();
    showToast(
      status === 'active'
        ? `POS access enabled for ${targetBiz.name}`
        : `POS access suspended for ${targetBiz.name}`,
      status === 'active' ? 'success' : 'warning'
    );
  };

  const updateBusinessPlan = async (businessId: string, plan: BusinessPlanTier): Promise<void> => {
    if (!isSuperAdmin) {
      showToast('Access denied: Only verified Paystack checkout or Super Admin can change subscription tiers.', 'error');
      return;
    }
    const targetBiz = businesses.find((b) => b.id === businessId);
    if (!targetBiz) return;

    const oldPlan = targetBiz.plan;
    const updatedBiz: Business = { ...targetBiz, plan };

    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? updatedBiz : b))
    );

    if (isOnline) {
      updateBusinessInFirestore(businessId, { plan }).catch((err) =>
        console.warn('Firestore business plan update error:', err)
      );
    }

    if (isSuperAdmin) {
      logSuperAdminAction(
        businessId,
        'business',
        businessId,
        'update',
        `Changed subscription tier for "${targetBiz.name}" from ${oldPlan} to ${plan}`,
        { plan: oldPlan },
        { plan }
      );
    }

    logAdminActivity({
      category: 'system',
      action: 'change_plan',
      description: `Updated plan from ${oldPlan?.toUpperCase()} to ${plan.toUpperCase()} for "${targetBiz.name}"`,
      recordType: 'business',
      recordId: businessId,
      beforeValue: { plan: oldPlan },
      afterValue: { plan },
    });

    soundFx.playSuccess();
    showToast(`Subscription plan updated to ${plan.toUpperCase()} for ${targetBiz.name}`, 'success');
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
    if (!isSuperAdmin && theme !== 'classic' && !requireCapability('customReceiptBranding')) {
      return;
    }
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
  // Package Subscription & Activation State
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState<boolean>(false);

  useEffect(() => {
    captureReferralCodeFromUrl();
  }, []);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<'free' | 'starter' | 'business' | 'premium'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('sokopos_selected_checkout_pkg');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.plan && ['free', 'starter', 'business', 'premium'].includes(parsed.plan)) {
            return parsed.plan;
          }
        }
      } catch {
        // ignore storage errors
      }
    }
    return 'business';
  });
  const [selectedCheckoutBilling, setSelectedCheckoutBilling] = useState<'monthly' | 'annual'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('sokopos_selected_checkout_pkg');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.billing === 'annual' || parsed?.billing === 'monthly') {
            return parsed.billing;
          }
        }
      } catch {
        // ignore storage errors
      }
    }
    return 'monthly';
  });

  const selectCheckoutPackage = useCallback(
    (plan: 'free' | 'starter' | 'business' | 'premium', billing: 'monthly' | 'annual' = 'monthly') => {
      setSelectedCheckoutPlan(plan);
      setSelectedCheckoutBilling(billing);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('sokopos_selected_checkout_pkg', JSON.stringify({ plan, billing }));
        } catch {
          // ignore storage errors
        }
      }
    },
    []
  );

  const [pendingCheckoutIntent, setPendingCheckoutIntentState] = useState<PendingCheckoutIntent | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('sokopos_pending_checkout_intent');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.planId && Date.now() - (parsed.timestamp || 0) < 2 * 3600 * 1000) {
            return parsed;
          }
        }
      } catch {
        // ignore storage errors
      }
    }
    return null;
  });

  const setPendingCheckoutIntent = useCallback((intent: PendingCheckoutIntent | null) => {
    setPendingCheckoutIntentState(intent);
    if (typeof window !== 'undefined') {
      try {
        if (intent) {
          sessionStorage.setItem('sokopos_pending_checkout_intent', JSON.stringify(intent));
        } else {
          sessionStorage.removeItem('sokopos_pending_checkout_intent');
        }
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const clearPendingCheckoutIntent = useCallback(() => {
    setPendingCheckoutIntent(null);
  }, [setPendingCheckoutIntent]);

  const [checkoutAuthRequested, setCheckoutAuthRequested] = useState<boolean>(false);

  const requestCheckoutAuth = useCallback(
    (
      plan: 'starter' | 'business' | 'premium',
      billing: 'monthly' | 'annual',
      planName: string,
      amountKes: number
    ) => {
      selectCheckoutPackage(plan, billing);
      setPendingCheckoutIntent({
        planId: plan,
        billingCycle: billing,
        planName,
        amountKes,
        timestamp: Date.now(),
      });
      setCheckoutAuthRequested(true);
    },
    [selectCheckoutPackage, setPendingCheckoutIntent]
  );

  // Keep any open unauthenticated checkout intent synchronized if live prices update
  useEffect(() => {
    if (!pendingCheckoutIntent) return;
    const liveTier = pricingTiers.find((t) => t.id === pendingCheckoutIntent.planId);
    if (!liveTier) return;
    const liveAmount =
      pendingCheckoutIntent.planId === 'free'
        ? (liveTier.consultationFee ?? 1999)
        : pendingCheckoutIntent.billingCycle === 'annual'
        ? liveTier.annualPrice
        : liveTier.monthlyPrice;
    if (
      liveAmount !== pendingCheckoutIntent.amountKes ||
      liveTier.name !== pendingCheckoutIntent.planName
    ) {
      setPendingCheckoutIntent({
        ...pendingCheckoutIntent,
        planName: liveTier.name,
        amountKes: liveAmount,
      });
    }
  }, [pricingTiers, pendingCheckoutIntent, setPendingCheckoutIntent]);

  // Dedicated Full-Page Pricing State (Seamless clean /pricing URL + legacy #pricing support)
  const [isPricingPageOpen, setIsPricingPageOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = normalizePathname(window.location.pathname);
      if (path === '/pricing') return true;
      return resolveLegacyHashToPath(window.location.hash) === '/pricing';
    }
    return false;
  });

  const openPricingPage = useCallback(() => {
    setIsBusinessSettingsOpen(false);
    setIsPricingPageOpen(true);
    if (typeof window !== 'undefined') {
      if (normalizePathname(window.location.pathname) !== '/pricing' || window.location.hash) {
        window.history.pushState(null, '', '/pricing');
        window.dispatchEvent(new Event('sokopos-route-change'));
      }
    }
  }, []);

  const closePricingPage = useCallback(() => {
    setIsPricingPageOpen(false);
    if (typeof window !== 'undefined') {
      const path = normalizePathname(window.location.pathname);
      const isPricingHash = resolveLegacyHashToPath(window.location.hash) === '/pricing';
      if (path === '/pricing' || isPricingHash) {
        const target = currentUser ? '/pos' : '/';
        window.history.pushState(null, '', target);
        window.dispatchEvent(new Event('sokopos-route-change'));
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const syncPricingRoute = () => {
      if (typeof window === 'undefined') return;
      const path = normalizePathname(window.location.pathname);
      const legacyTarget = resolveLegacyHashToPath(window.location.hash);
      if (legacyTarget === '/pricing') {
        window.history.replaceState(null, '', '/pricing');
        setIsPricingPageOpen(true);
        window.dispatchEvent(new Event('sokopos-route-change'));
      } else {
        setIsPricingPageOpen(path === '/pricing');
      }
    };
    syncPricingRoute();
    window.addEventListener('popstate', syncPricingRoute);
    window.addEventListener('hashchange', syncPricingRoute);
    window.addEventListener('sokopos-route-change', syncPricingRoute);
    return () => {
      window.removeEventListener('popstate', syncPricingRoute);
      window.removeEventListener('hashchange', syncPricingRoute);
      window.removeEventListener('sokopos-route-change', syncPricingRoute);
    };
  }, []);

  const isSubscriptionActive = useMemo(() => {
    if (isSuperAdmin) return true;
    return entitlements.isActive;
  }, [isSuperAdmin, entitlements.isActive]);

  const activateBusinessSubscription = useCallback(
    async (
      businessId: string,
      plan: BusinessPlanTier,
      paymentReference?: string
    ): Promise<{ success: boolean; message: string }> => {
      const targetId = businessId || currentBusiness?.id;
      if (!targetId) return { success: false, message: 'No target business tenant found' };

      const normalizedTier = normalizePlanTier(plan);
      const now = new Date().toISOString();

      // Super-Admin override: direct administrative provisioning without Paystack checkout
      if (isSuperAdmin && (!paymentReference || !paymentReference.startsWith('SOKO-'))) {
        const nextSubscription = {
          status: 'active' as const,
          plan: normalizedTier,
          planId: normalizedTier,
          activatedAt: now,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
        updateBusinessProfile({
          plan: normalizedTier,
          status: 'active',
          subscription: nextSubscription,
        });
        showToast(`Package "${formatTierDisplayName(normalizedTier)}" activated by Super Admin.`, 'success');
        return { success: true, message: `ADMIN-${Date.now()}` };
      }

      if (!paymentReference || !paymentReference.trim()) {
        showToast('A verified Paystack payment reference is required to activate a subscription.', 'error');
        return { success: false, message: 'Verified Paystack payment reference is required.' };
      }

      const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
      const verifyRes = await verifyServerPayment(paymentReference.trim(), idToken);
      if (!verifyRes.verified || verifyRes.status !== 'success') {
        const errMsg = verifyRes.error || verifyRes.gatewayResponse || 'Server payment verification failed.';
        showToast(errMsg, 'error');
        return { success: false, message: errMsg };
      }

      const verifiedTier = normalizePlanTier(verifyRes.planId || normalizedTier);
      const verifiedSubscription = verifyRes.activatedSubscription || {
        status: 'active' as const,
        plan: verifiedTier,
        planId: verifiedTier,
        activatedAt: verifyRes.paidAt || now,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastPaymentReference: verifyRes.reference || paymentReference,
        paymentProvider: verifyRes.provider || 'paystack',
      };

      // Update local state authoritatively; server /api/payments/verify handles Firestore write
      applyBusinessLocalUpdate(
        targetId,
        {
          plan: verifiedTier,
          status: 'active',
          subscription: verifiedSubscription as any,
        },
        false
      );

      trackPlatformEvent('subscription_activated', {
        businessId: targetId,
        businessName: currentBusiness?.name,
        planId: verifiedTier,
        dedupeKey: `sub-act-${targetId}-${verifyRes.reference || paymentReference}`,
        dedupeTtlMs: 600_000,
      });

      showToast(`Package "${formatTierDisplayName(verifiedTier)}" verified and activated!`, 'success');
      return { success: true, message: verifyRes.reference || paymentReference };
    },
    [currentBusiness?.id, currentBusiness?.name, isSuperAdmin, applyBusinessLocalUpdate, updateBusinessProfile, showToast]
  );

  // Unified Pending Subscription Checkout Persistence & Real-Time Firestore Push Sync
  const [pendingSubscriptionCheckout, setPendingSubscriptionCheckoutState] =
    useState<PendingSubscriptionCheckout | null>(() => loadPendingSubscriptionCheckout());
  const [livePaymentRecordSnapshot, setLivePaymentRecordSnapshot] =
    useState<PaymentRecordSnapshot | null>(null);
  const notifiedPaymentRefsRef = useRef<Set<string>>(new Set());

  const trackPendingSubscription = useCallback((pending: PendingSubscriptionCheckout) => {
    savePendingSubscriptionCheckout(pending);
    setPendingSubscriptionCheckoutState(pending);
  }, []);

  const clearPendingSubscription = useCallback(() => {
    clearPendingSubscriptionCheckout();
    setPendingSubscriptionCheckoutState(null);
    setLivePaymentRecordSnapshot(null);
  }, []);

  // Real-time Firestore listener on active business document so backend webhook/poller/callback
  // subscription updates (and late M-Pesa receipt codes) push straight into client UI immediately.
  useEffect(() => {
    if (!isOnline || isFirebaseAuthLoading || !currentUser || !firebaseUser || !auth.currentUser) {
      return;
    }
    const bizId = activeBusinessId;
    if (!bizId || isDemoBusinessId(bizId) || currentBusiness?.id !== bizId) {
      return;
    }

    const signedInEmail = (auth.currentUser.email || '').toLowerCase().trim();
    const isSA = signedInEmail === SUPER_ADMIN_EMAIL.toLowerCase() || currentUser.role === 'super_admin';

    if (!isSA && !auth.currentUser.emailVerified) return;
    if (!isSA && bizId === 'biz-upfront') return;

    const targetBizObj = businesses.find((b) => b.id === bizId);
    if (!targetBizObj) return;

    if (!isSA) {
      if (currentUser.authProvider !== 'firebase' || currentUser.firebaseUid !== auth.currentUser.uid) {
        return;
      }
      if (currentUser.businessId !== bizId) return;
      const targetOwnerEmail = (targetBizObj.ownerEmail || '').toLowerCase().trim();
      if (!targetOwnerEmail || targetOwnerEmail !== signedInEmail) return;
    }

    const unsub = subscribeToBusinessDocument(bizId, (remoteBiz) => {
      setBusinesses((prev) => {
        let changed = false;
        const next = prev.map((b) => {
          if (b.id !== bizId) return b;
          const prevSub = b.subscription || {};
          const remSub = remoteBiz.subscription || {};
          const legalChanged =
            JSON.stringify(b.legalConsent || null) !== JSON.stringify(remoteBiz.legalConsent || null);
          const subChanged =
            prevSub.status !== remSub.status ||
            prevSub.expiresAt !== remSub.expiresAt ||
            prevSub.lastPaymentReference !== remSub.lastPaymentReference ||
            prevSub.mpesaReceiptNumber !== remSub.mpesaReceiptNumber ||
            prevSub.lastMpesaReceipt !== remSub.lastMpesaReceipt ||
            prevSub.planId !== remSub.planId ||
            b.plan !== remoteBiz.plan ||
            b.status !== remoteBiz.status;
          if (!subChanged && !legalChanged) return b;
          changed = true;
          return {
            ...b,
            plan: remoteBiz.plan || b.plan,
            status: remoteBiz.status || b.status,
            ...(remoteBiz.legalConsent !== undefined ? { legalConsent: remoteBiz.legalConsent } : {}),
            subscription: {
              ...prevSub,
              ...remSub,
            },
          };
        });
        return changed ? next : prev;
      });
    });
    return () => unsub();
  }, [
    isOnline,
    isFirebaseAuthLoading,
    currentUser,
    firebaseUser,
    activeBusinessId,
    currentBusiness?.id,
    businesses,
  ]);

  // Real-time Firestore listener on the active pending payment_records/{reference}
  // so modal-closed, cross-reload, or late M-Pesa receipt updates sync live without polling delay.
  useEffect(() => {
    const pendingRef = pendingSubscriptionCheckout?.reference;
    if (
      !isOnline ||
      isFirebaseAuthLoading ||
      !currentUser ||
      !firebaseUser ||
      !auth.currentUser ||
      !pendingRef
    ) {
      setLivePaymentRecordSnapshot(null);
      return;
    }

    const signedInEmail = (auth.currentUser.email || '').toLowerCase().trim();
    const isSA = signedInEmail === SUPER_ADMIN_EMAIL.toLowerCase() || currentUser.role === 'super_admin';

    if (!isSA && !auth.currentUser.emailVerified) {
      setLivePaymentRecordSnapshot(null);
      return;
    }
    if (!isSA) {
      if (currentUser.authProvider !== 'firebase' || currentUser.firebaseUid !== auth.currentUser.uid) {
        setLivePaymentRecordSnapshot(null);
        return;
      }
      const pendingBizId = pendingSubscriptionCheckout?.businessId;
      if (pendingBizId && pendingBizId !== activeBusinessId) {
        setLivePaymentRecordSnapshot(null);
        return;
      }
      const targetBizObj = businesses.find((b) => b.id === (pendingBizId || activeBusinessId));
      const targetOwnerEmail = (targetBizObj?.ownerEmail || '').toLowerCase().trim();
      if (!targetOwnerEmail || targetOwnerEmail !== signedInEmail) {
        setLivePaymentRecordSnapshot(null);
        return;
      }
    }

    const unsub = subscribeToPaymentRecord(pendingRef, (record) => {
      setLivePaymentRecordSnapshot(record);

      if (record.status === 'success') {
        const targetId = record.businessId || pendingSubscriptionCheckout.businessId;
        const resolvedTier = normalizePlanTier(record.planId || pendingSubscriptionCheckout.planId);
        if (targetId && !isDemoBusinessId(targetId)) {
          setBusinesses((prev) =>
            prev.map((b) => {
              if (b.id !== targetId) return b;
              const prevSub = b.subscription || {};
              const needsUpdate =
                b.plan !== resolvedTier ||
                b.status !== 'active' ||
                prevSub.lastPaymentReference !== record.reference ||
                (record.mpesaReceiptNumber && prevSub.mpesaReceiptNumber !== record.mpesaReceiptNumber);
              if (!needsUpdate) return b;
              return {
                ...b,
                plan: resolvedTier,
                status: 'active',
                subscription: {
                  ...prevSub,
                  status: 'active',
                  plan: resolvedTier,
                  planId: resolvedTier,
                  activatedAt: prevSub.activatedAt || record.paidAt || new Date().toISOString(),
                  lastPaymentReference: record.reference,
                  paymentProvider: record.provider,
                  ...(record.mpesaReceiptNumber
                    ? {
                        mpesaReceiptNumber: record.mpesaReceiptNumber,
                        lastMpesaReceipt: record.mpesaReceiptNumber,
                      }
                    : {}),
                },
              };
            })
          );
        }

        if (!isSubscriptionModalOpen && !notifiedPaymentRefsRef.current.has(record.reference)) {
          notifiedPaymentRefsRef.current.add(record.reference);
          showToast(
            record.mpesaReceiptNumber
              ? `Payment verified (${record.mpesaReceiptNumber})! ${formatTierDisplayName(resolvedTier)} plan is now active.`
              : `Payment verified! ${formatTierDisplayName(resolvedTier)} plan is now active.`,
            'success'
          );
        }
      } else if (
        (record.status === 'failed' || record.status === 'abandoned') &&
        !isSubscriptionModalOpen &&
        !notifiedPaymentRefsRef.current.has(`${record.reference}-fail`)
      ) {
        notifiedPaymentRefsRef.current.add(`${record.reference}-fail`);
        showToast(
          record.gatewayResponse || 'Pending subscription payment was declined or cancelled.',
          'error'
        );
      }
    });

    return () => unsub();
  }, [
    isOnline,
    isFirebaseAuthLoading,
    currentUser,
    firebaseUser,
    activeBusinessId,
    businesses,
    pendingSubscriptionCheckout?.reference,
    pendingSubscriptionCheckout?.businessId,
    pendingSubscriptionCheckout?.planId,
    isSubscriptionModalOpen,
    showToast,
  ]);

  const ensureBusinessSyncedForCheckout = useCallback(async (): Promise<{
    ok: boolean;
    idToken?: string;
    code?: 'FIREBASE_AUTH_REQUIRED' | 'EMAIL_VERIFICATION_REQUIRED' | 'DEMO_STORE' | 'OWNER_MISMATCH' | 'SYNC_FAILED';
    error?: string;
  }> => {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.email) {
      return {
        ok: false,
        code: 'FIREBASE_AUTH_REQUIRED',
        error: 'Please sign in with your verified Business Owner Google or email account to pay for this subscription.',
      };
    }

    try {
      await fbUser.reload().catch(() => {});
      const fbEmail = String(fbUser.email || '').trim().toLowerCase();
      const isSuperAdminFb = fbEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      if (!fbUser.emailVerified && !isSuperAdminFb) {
        return {
          ok: false,
          code: 'EMAIL_VERIFICATION_REQUIRED',
          error: `Please verify your email (${fbEmail}) before starting subscription checkout.`,
        };
      }

      if (!currentBusiness || currentBusiness.id === 'biz-demo') {
        return {
          ok: false,
          code: 'DEMO_STORE',
          error: 'Demo sandbox stores cannot be billed. Please sign in with your own business account.',
        };
      }

      const bizOwnerEmail = String(currentBusiness.ownerEmail || '').trim().toLowerCase();
      if (!isSuperAdminFb && bizOwnerEmail && bizOwnerEmail !== fbEmail) {
        return {
          ok: false,
          code: 'OWNER_MISMATCH',
          error: `Signed-in account (${fbEmail}) does not match "${currentBusiness.name}" owner (${bizOwnerEmail}). Sign in with the store owner account to activate billing.`,
        };
      }

      const syncRes = await ensureBusinessDocInFirestore(currentBusiness, fbEmail);
      if (!syncRes.ok) {
        return {
          ok: false,
          code: 'SYNC_FAILED',
          error: syncRes.error || 'Could not sync your store profile for billing. Please refresh and try again.',
        };
      }

      await saveUserProfileToFirestore({
        uid: fbUser.uid,
        email: fbEmail,
        role: isSuperAdminFb ? 'super_admin' : 'business_owner',
        businessId: currentBusiness.id,
        displayName: fbUser.displayName || currentUser?.name || '',
      });

      const idToken = await fbUser.getIdToken(true);
      return { ok: true, idToken };
    } catch (err: any) {
      return {
        ok: false,
        code: 'SYNC_FAILED',
        error: err?.message || 'Unable to verify checkout session. Please refresh and try again.',
      };
    }
  }, [currentBusiness, currentUser?.name]);

  return (
    <PosContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated,
        isFirebaseAuthLoading,
        pendingVerificationEmail,
        loginWithFirebaseGoogle,
        loginWithFirebaseEmailPassword,
        loginWithFirebaseEmailOtp,
        sendPasswordResetEmailAction,
        resendVerificationEmail,
        checkEmailVerificationStatus,
        cancelEmailVerification,
        exchangeOAuthTokenForSession,
        businesses,
        currentBusiness,
        activeBusinessId,
        setActiveBusinessId,
        isSuperAdmin,
        appointedDemoCashierId,
        appointedDemoCashier,
        appointDemoCashier,
        isDemoSession,
        loginWithGoogle,
        loginWithCredentials,
        logout,
        provisionBusiness,
        updateBusinessProfile,
        saveBusinessBrandingLogo,
        applyBusinessLocalUpdate,
        updateBusinessStatus,
        performSystemCleanup,
        refreshAllBusinessesForSuperAdmin,
        isRealGoogleAccount,
        requiresLegalConsent,
        recordMerchantLegalConsent,

        isBusinessSettingsOpen,
        setIsBusinessSettingsOpen,
        businessSettingsDefaultTab,
        openBusinessSettings,
        updateActiveUserCredentials,

        pricingTiers,
        pricingSyncStatus,
        pricingSyncError,
        updatePricingTier,
        resetPricingTiersToDefault,
        updateBusinessPlan,
        entitlements,
        upgradePrompt,
        openUpgradePrompt,
        closeUpgradePrompt,
        requireCapability,
        isSubscriptionActive,
        isSubscriptionModalOpen,
        setIsSubscriptionModalOpen,
        selectedCheckoutPlan,
        selectedCheckoutBilling,
        selectCheckoutPackage,
        pendingCheckoutIntent,
        setPendingCheckoutIntent,
        clearPendingCheckoutIntent,
        checkoutAuthRequested,
        setCheckoutAuthRequested,
        requestCheckoutAuth,
        activateBusinessSubscription,
        pendingSubscriptionCheckout,
        trackPendingSubscription,
        clearPendingSubscription,
        livePaymentRecordSnapshot,
        ensureBusinessSyncedForCheckout,
        isPricingPageOpen,
        setIsPricingPageOpen,
        openPricingPage,
        closePricingPage,
        isAffiliateModalOpen,
        setIsAffiliateModalOpen,

        loyaltySettings,
        updateLoyaltySettings,

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
        printerType,
        setPrinterType,
        bluetoothPrinterId,
        bluetoothPrinterName,
        connectBluetoothPrinter,
        setBluetoothPrinter,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        toggleMobileMenu,

        systemUsers,
        allSystemUsers,
        createSystemUser,
        updateSystemUser,
        deleteSystemUser,
        refreshTenantStaff,
        isStaffLoading,

        rolePermissions,
        updateRolePermissions,
        can,
        hasPermission,
        resetRolePermissionsToDefault,

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

        platformLogo,
        platformLogoName,
        setPlatformLogo,
        removePlatformLogo,

        platformFavicon,
        platformFaviconName,
        setPlatformFavicon,
        removePlatformFavicon,
        industryImages,
        setIndustryImage,
        removeIndustryImage,
        refreshPlatformSettings,
        resetAllPlatformBranding,

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
        refreshTenantCategories,
        addProduct,
        updateProduct,
        deleteProduct,
        bulkAddProducts,
        bulkUpdateProducts,
        bulkDeleteProducts,
        adjustStock,
        transferStock,
        linkProductToSupplier,

        // Supplier Management & Supply Chain Oversight
        suppliers,
        selectedSupplier,
        setSelectedSupplier,
        addSupplier,
        bulkAddSuppliers,
        bulkUpdateSuppliers,
        updateSupplier,
        deleteSupplier,
        getProductsForSupplier,
        refreshTenantSuppliers,
        isSuppliersLoading,

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
        refreshTenantCustomers,
        isCustomersLoading,

        handleBarcodeScanned,
        unknownBarcodePrompt,
        openUnknownBarcodeModal,
        closeUnknownBarcodeModal,

        transactions,
        loadHistoricalTransactions,
        isLoadingOlderTransactions,
        olderTransactionsLoadedFrom,
        analyticsRollups,
        analyticsTargets,
        analyticsSavedViews,
        isBiSyncing,
        biLastSyncedAt,
        syncAnalyticsRollups,
        saveAnalyticsTarget,
        saveAnalyticsSavedView,
        deleteAnalyticsSavedView,
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

        // Shift Management & Cash Drawer Reconciliation
        activeShift,
        interruptedSession,
        shiftHistory,
        openShift,
        recordCashDrop,
        recordShiftExpense,
        closeShift,
        forceLogoutSession,
        resumeInterruptedShift,
        isShiftModalOpen,
        setIsShiftModalOpen,
        openShiftManagement,

        // Supervisor Overrides & Attributions (Edge Case 1)
        supervisorOverrideLogs,
        logSupervisorOverride,
        voidRecords,
        recordVoid,

        isOnline,
        setIsOnline,
        syncStatus,
        lastSyncTime,
        syncLogs,
        pendingOfflineCount,
        triggerCloudSync,
        isStorageHydrated,
        outboxItems: tenantOutboxItems,
        pendingOutboxCount,
        deadLetterCount,
        storageTelemetry,
        opfsSnapshots,
        retryOutboxItem,
        retryAllDeadLetterItems,
        discardOutboxItem,
        createManualOpfsSnapshot,
        verifyOpfsSnapshotIntegrity,
        downloadOpfsArchive,
        exportFullLocalStore,

        isFirestoreConnected,
        firestoreDbId,
        firestoreRlsStatus,
        seedTenantDataToFirestoreAction,

        toastMessage,
        toasts,
        showToast,
        dismissToast,
        soundFx,

        language,
        setLanguage,
        t,

        adminActivityLogs,
        logAdminActivity,
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
