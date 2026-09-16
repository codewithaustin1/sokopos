import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import {
  AuthUser,
  Business,
  CartItem,
  Cashier,
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
} from '../types';
import {
  INITIAL_BUSINESSES,
  INITIAL_LOCATIONS,
  INITIAL_PRODUCTS,
  INITIAL_SUPER_ADMIN_AUDIT_LOGS,
  INITIAL_SUPER_ADMIN_USER,
  INITIAL_SYNC_LOGS,
  INITIAL_SYSTEM_USERS,
  INITIAL_TRANSACTIONS,
  SUPER_ADMIN_EMAIL,
} from '../data/initialData';
import { soundFx } from '../utils/audio';
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
  saveLocationToFirestore,
  updateLocationInFirestore,
  deleteLocationFromFirestore,
  saveCashierToFirestore,
  updateCashierInFirestore,
  deleteCashierFromFirestore,
  saveTransactionToFirestore,
  saveStockTransferToFirestore,
  saveSyncLogToFirestore,
  saveBusinessToFirestore,
  updateBusinessInFirestore,
  getBusinessesFromFirestore,
  saveUserProfileToFirestore,
  getFreshTenantProductsFromFirestore,
  subscribeToTenantProducts,
  subscribeToTenantLocations,
  subscribeToTenantCashiers,
  subscribeToTenantTransactions,
  seedInitialTenantDataToFirestore,
} from '../lib/firestoreService';
import {
  hashPinOnServer,
  verifyPinOnServer,
  isBcryptHash,
} from '../lib/pinSecurityService';
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
  logout: () => void;
  provisionBusiness: (name: string, ownerEmail: string, ownerName: string, plan: 'starter' | 'professional' | 'enterprise') => Business;
  updateBusinessProfile: (updates: Partial<Business>) => void;

  // Business Profile Settings & Branch Management
  isBusinessSettingsOpen: boolean;
  setIsBusinessSettingsOpen: (open: boolean) => void;
  businessSettingsDefaultTab: 'profile' | 'branches' | 'accounts' | 'credentials';
  openBusinessSettings: (initialTab?: 'profile' | 'branches' | 'accounts' | 'credentials') => void;
  updateActiveUserCredentials: (newPin?: string, newUsername?: string) => Promise<boolean>;

  // System Users Management (Business Owner & Super Admin only)
  systemUsers: Cashier[];
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
  cartSubtotal: number;
  cartTax: number;
  cartDiscount: number;
  cartTotal: number;

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
    }
  ) => Transaction;
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
  }) => Promise<{ success: boolean; refundRecord?: RefundRecord; error?: string }>;
  isReturnsModalOpen: boolean;
  selectedReturnTx: Transaction | null;
  openReturnsModal: (tx?: Transaction | null) => void;
  closeReturnsModal: () => void;

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

  // Toast
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CURRENT_USER: 'sokopos_auth_user_v2',
  IS_LOGGED_OUT: 'sokopos_is_logged_out_v2',
  ACTIVE_BIZ_ID: 'sokopos_active_biz_v2',
  BUSINESSES: 'sokopos_businesses_v2',
  PRODUCTS: 'sokopos_products_v2',
  LOCATIONS: 'sokopos_locations_v2',
  SYSTEM_USERS: 'sokopos_system_users_v2',
  TRANSACTIONS: 'sokopos_transactions_v2',
  SYNC_LOGS: 'sokopos_sync_logs_v2',
  SUPER_ADMIN_AUDIT: 'sokopos_sa_audit_v2',
  CURRENT_LOC: 'sokopos_curr_loc_v2',
};

export function getStableBusinessIdForEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  if (normalized === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return 'biz-upfront';
  }
  if (normalized === 'owner@sokopos.co.ke') {
    return 'biz-soko';
  }
  if (normalized === 'samuel.ndungu@quickchoice.co.ke') {
    return 'biz-quickmart';
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
        return JSON.parse(saved);
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
    testFirebaseConnection();

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
    if (saved) return saved;
    return currentUser?.businessId || INITIAL_BUSINESSES[0].id;
  });

  // Strict Data-Access Isolation Enforcement:
  // Non-super-admin users CANNOT view or query any business other than their assigned tenant.
  const activeBusinessId = useMemo(() => {
    if (!isSuperAdmin && currentUser?.businessId) {
      return currentUser.businessId;
    }
    return activeBusinessIdState;
  }, [isSuperAdmin, currentUser?.businessId, activeBusinessIdState]);

  const currentBusiness = useMemo(() => {
    return businesses.find((b) => b.id === activeBusinessId) || businesses[0];
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
      if (!isSuperAdmin) return;
      const targetBiz = businesses.find((b) => b.id === businessId);
      const newEntry: SuperAdminAuditEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        adminEmail: currentUser?.email || SUPER_ADMIN_EMAIL,
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
    [isSuperAdmin, businesses, currentUser?.email]
  );

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

    let hashedPin = user.pin;
    if (!isBcryptHash(user.pin)) {
      hashedPin = await hashPinOnServer(user.pin);
    }

    const newUser: Cashier = {
      ...user,
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

    showToast(`System user ${newUser.name} created (PIN Bcrypt hashed on server)`, 'success');
    return true;
  };

  const updateSystemUser = async (id: string, updates: Partial<Cashier>): Promise<void> => {
    const oldUser = allSystemUsers.find((u) => u.id === id);
    if (!oldUser) return;

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
  const products = useMemo(() => {
    return allProducts.filter((p) => p.businessId === activeBusinessId);
  }, [allProducts, activeBusinessId]);

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
    if (currentUser && currentUser.id) {
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
  }, [currentUser, fetchFreshInventoryFromServer]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => cats.add(p.category));
    return Array.from(cats);
  }, [products]);

  const addProduct = (product: Omit<Product, 'id' | 'businessId'>) => {
    const newProduct: Product = {
      ...product,
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
    showToast(`Product "${newProduct.name}" added`, 'success');
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const oldProduct = allProducts.find((p) => p.id === id);
    if (!oldProduct) return;

    const updated: Product = {
      ...oldProduct,
      ...updates,
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

  // 10. Multi-Tenant Transactions Store
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

  // 12. Cart State
  const [isOnline, setIsOnlineState] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);
  const [activeRefundReceipt, setActiveRefundReceipt] = useState<{
    refund: RefundRecord;
    originalTx: Transaction;
  } | null>(null);
  const [isReturnsModalOpen, setIsReturnsModalOpen] = useState(false);
  const [selectedReturnTx, setSelectedReturnTx] = useState<Transaction | null>(null);

  // Clear cart when tenant switches
  useEffect(() => {
    setCart([]);
  }, [activeBusinessId]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const discountedPrice = item.unitPrice * (1 - item.discountPercent / 100);
      const netItemPrice = discountedPrice / (1 + item.taxRate);
      return sum + netItemPrice * item.quantity;
    }, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const discountedPrice = item.unitPrice * (1 - item.discountPercent / 100);
      return sum + discountedPrice * item.quantity;
    }, 0);
  }, [cart]);

  const cartTax = cartTotal - cartSubtotal;
  const cartDiscount = 0;

  const addToCart = (product: Product, quantity = 1) => {
    soundFx.playBeep(650, 0.08);
    const currLocStock = product.stockByLocation[currentLocation.id] || 0;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity + quantity > currLocStock) {
          showToast(`Warning: Only ${currLocStock} units available at this register!`, 'info');
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      if (quantity > currLocStock) {
        showToast(`Warning: Only ${currLocStock} units available at this register!`, 'info');
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
          taxRate: product.taxRate,
        },
      ];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Barcode Handler
  const handleBarcodeScanned = (barcode: string) => {
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
      soundFx.playBarcodeBeep();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(60);
        } catch {
          // ignore haptic restrictions
        }
      }
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
    }
  ): Transaction => {
    const receiptNum = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      businessId: activeBusinessId,
      receiptNumber: receiptNum,
      timestamp: new Date().toISOString(),
      locationId: currentLocation.id,
      locationName: currentLocation.name,
      terminalName: currentLocation.terminalName,
      cashierId: currentCashier.id,
      cashierName: currentCashier.name,
      items: [...cart],
      subtotal: Number(cartSubtotal.toFixed(2)),
      taxAmount: Number(cartTax.toFixed(2)),
      discountAmount: cartDiscount,
      total: Number(cartTotal.toFixed(2)),
      paymentMethod,
      paymentDetails: details,
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
    }): Promise<{ success: boolean; refundRecord?: RefundRecord; error?: string }> => {
      const { transactionId, refundMethod, refundReason, refundNote, customerName, customerPhone, items } = params;

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
        cashierId: currentCashier.id,
        cashierName: currentCashier.name,
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
          locations: INITIAL_LOCATIONS,
          cashiers: INITIAL_SYSTEM_USERS,
          transactions: INITIAL_TRANSACTIONS,
        }).catch((err) => console.warn('Tenant data initial seed check:', err));

        getBusinessesFromFirestore()
          .then((remoteBizs) => {
            if (remoteBizs && remoteBizs.length > 0) {
              setBusinesses((prev) => {
                const map = new Map<string, Business>();
                prev.forEach((b) => map.set(b.id, b));
                remoteBizs.forEach((b) => map.set(b.id, b));
                return Array.from(map.values());
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
    let unsubLocations: (() => void) | undefined;
    let unsubCashiers: (() => void) | undefined;
    let unsubTransactions: (() => void) | undefined;

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

            // Any offline transactions that need upload
            const pendingOffline = currentTenantLocal.filter((t) => !t.syncedToCloud);
            if (auth.currentUser && pendingOffline.length > 0) {
              pendingOffline.forEach((tx) => {
                saveTransactionToFirestore({ ...tx, syncedToCloud: true }).catch((err) =>
                  console.warn('Auto-sync offline transaction to Firestore:', err)
                );
              });
            }

            const map = new Map<string, Transaction>();
            remoteTxs.forEach((r) => map.set(r.id, { ...r, syncedToCloud: true }));
            pendingOffline.forEach((p) => {
              if (!map.has(p.id)) {
                map.set(p.id, p);
              }
            });

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
      fetchFreshInventoryFromServer(targetBizId, false).catch((err) =>
        console.warn('Fresh inventory fetch on token exchange notice:', err)
      );

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
        fetchFreshInventoryFromServer(matchedUser.businessId, false).catch((err) =>
          console.warn('Fresh inventory fetch on credentials login notice:', err)
        );

        soundFx.playSuccess();
        showToast(`Authenticated as ${matchedUser.name} (${matchedUser.role})`, 'success');
        return true;
      }
    }

    soundFx.playError();
    showToast('Invalid username or PIN credentials', 'error');
    return false;
  };

  const logout = () => {
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

    const newBizId = `biz-${Date.now().toString(36)}`;
    const newBusiness: Business = {
      id: newBizId,
      name,
      code: name.substring(0, 4).toUpperCase().replace(/\s+/g, ''),
      ownerEmail: ownerEmail.trim().toLowerCase(),
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

  // Business Profile Settings & Credential Management
  const [isBusinessSettingsOpen, setIsBusinessSettingsOpen] = useState<boolean>(false);
  const [businessSettingsDefaultTab, setBusinessSettingsDefaultTab] = useState<'profile' | 'branches' | 'accounts' | 'credentials'>('profile');

  const openBusinessSettings = (initialTab: 'profile' | 'branches' | 'accounts' | 'credentials' = 'profile') => {
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

        isBusinessSettingsOpen,
        setIsBusinessSettingsOpen,
        businessSettingsDefaultTab,
        openBusinessSettings,
        updateActiveUserCredentials,

        systemUsers,
        createSystemUser,
        updateSystemUser,
        deleteSystemUser,

        superAdminAuditLogs,
        logSuperAdminAction,
        pendingDestructiveAction,
        requestDestructiveAction,
        confirmDestructiveAction,
        cancelDestructiveAction,

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
        cartSubtotal,
        cartTax,
        cartDiscount,
        cartTotal,

        handleBarcodeScanned,

        transactions,
        activeReceipt,
        setActiveReceipt,
        activeRefundReceipt,
        setActiveRefundReceipt,
        processPayment,
        processRefund,
        isReturnsModalOpen,
        selectedReturnTx,
        openReturnsModal,
        closeReturnsModal,

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
