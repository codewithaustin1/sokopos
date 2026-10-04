import {
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  Business,
  Product,
  Category,
  Location,
  Cashier,
  Customer,
  Transaction,
  SyncLogEvent,
  StockTransfer,
  StoreSalesBackup,
  PlatformSettings,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// Tenant Businesses Firestore API
// -------------------------------------------------------------
export async function getBusinessesFromFirestore(): Promise<Business[]> {
  if (!auth.currentUser) return [];
  const path = 'businesses';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => d.data() as Business);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveBusinessToFirestore(biz: Business): Promise<void> {
  if (!auth.currentUser) return;
  const path = `businesses/${biz.id}`;
  try {
    await setDoc(doc(db, 'businesses', biz.id), biz);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateBusinessInFirestore(
  businessId: string,
  updates: Partial<Business>
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `businesses/${businessId}`;
  try {
    await setDoc(doc(db, 'businesses', businessId), updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBusinessFromFirestore(businessId: string): Promise<void> {
  if (!auth.currentUser) return;
  const path = `businesses/${businessId}`;
  try {
    await deleteDoc(doc(db, 'businesses', businessId));
  } catch (error) {
    console.warn(`Failed to delete business ${businessId} from Firestore:`, error);
  }
}

export async function purgeTenantAllDataFromFirestore(businessId: string): Promise<{
  purgedRecords: number;
}> {
  if (!auth.currentUser) return { purgedRecords: 0 };
  let purgedRecords = 0;
  const collectionsToPurge = [
    'products',
    'categories',
    'locations',
    'cashiers',
    'transactions',
    'customers',
    'stock_transfers',
    'sync_logs',
  ];

  for (const collName of collectionsToPurge) {
    try {
      const q = query(collection(db, collName), where('businessId', '==', businessId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        purgedRecords += snap.docs.length;
      }
    } catch (err) {
      console.warn(`Purge ${collName} for tenant ${businessId} non-fatal:`, err);
    }
  }

  return { purgedRecords };
}

export async function saveUserProfileToFirestore(user: {
  uid: string;
  email: string;
  role: string;
  businessId?: string | null;
  displayName?: string;
}): Promise<void> {
  if (!auth.currentUser) return;
  const path = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email,
        role: user.role,
        businessId: user.businessId || null,
        displayName: user.displayName || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Failed to sync user profile in Firestore:', error);
  }
}

// -------------------------------------------------------------
// Tenant Products Firestore API (Row-Level Security Scoped)
// -------------------------------------------------------------
export async function getTenantProductsFromFirestore(businessId: string): Promise<Product[]> {
  if (!auth.currentUser) return [];
  const path = 'products';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Product);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Direct Server Fetch: Retrieves tenant products explicitly from the Firestore server,
 * strictly bypassing any local client IndexedDB or memory cache.
 */
export async function getFreshTenantProductsFromFirestore(businessId: string): Promise<Product[]> {
  if (!auth.currentUser) return [];
  const path = 'products';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocsFromServer(q);
    return snap.docs.map((d) => d.data() as Product);
  } catch (error) {
    console.warn('Direct server fetch from Firestore failed, falling back:', error);
    try {
      const fallbackSnap = await getDocs(query(collection(db, path), where('businessId', '==', businessId)));
      return fallbackSnap.docs.map((d) => d.data() as Product);
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, OperationType.LIST, path);
    }
  }
}

export function subscribeToTenantProducts(
  businessId: string,
  onData: (products: Product[], isFromCache?: boolean) => void
): Unsubscribe {
  if (!auth.currentUser) {
    return () => {};
  }
  const path = 'products';
  const q = query(collection(db, path), where('businessId', '==', businessId));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      const isFromCache = snap.metadata.fromCache;
      const prods = snap.docs.map((d) => d.data() as Product);
      onData(prods, isFromCache);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  if (!auth.currentUser) return;
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateProductInFirestore(
  productId: string,
  updates: Partial<Product>
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `products/${productId}`;
  try {
    await setDoc(doc(db, 'products', productId), updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  if (!auth.currentUser) return;
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Tenant Categories Firestore API (Unique per Shop)
// -------------------------------------------------------------
export async function getTenantCategoriesFromFirestore(businessId: string): Promise<Category[]> {
  if (!auth.currentUser) return [];
  const path = 'categories';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Category);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToTenantCategories(
  businessId: string,
  onData: (categories: Category[]) => void
): Unsubscribe {
  if (!auth.currentUser) {
    return () => {};
  }
  const path = 'categories';
  const q = query(collection(db, path), where('businessId', '==', businessId));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Category));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveCategoryToFirestore(category: Category): Promise<void> {
  if (!auth.currentUser) return;
  const path = `categories/${category.id}`;
  try {
    await setDoc(doc(db, 'categories', category.id), category);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCategoryInFirestore(
  categoryId: string,
  updates: Partial<Category>
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `categories/${categoryId}`;
  try {
    await setDoc(doc(db, 'categories', categoryId), updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  if (!auth.currentUser) return;
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Tenant Locations Firestore API
// -------------------------------------------------------------
export async function getTenantLocationsFromFirestore(businessId: string): Promise<Location[]> {
  if (!auth.currentUser) return [];
  const path = 'locations';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Location);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToTenantLocations(
  businessId: string,
  onData: (locations: Location[]) => void
): Unsubscribe {
  if (!auth.currentUser) {
    return () => {};
  }
  const path = 'locations';
  const q = query(collection(db, path), where('businessId', '==', businessId));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Location));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveLocationToFirestore(loc: Location): Promise<void> {
  if (!auth.currentUser) return;
  const path = `locations/${loc.id}`;
  try {
    await setDoc(doc(db, 'locations', loc.id), loc);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateLocationInFirestore(
  locationId: string,
  updates: Partial<Location>
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `locations/${locationId}`;
  try {
    await setDoc(doc(db, 'locations', locationId), updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteLocationFromFirestore(locationId: string): Promise<void> {
  if (!auth.currentUser) return;
  const path = `locations/${locationId}`;
  try {
    await deleteDoc(doc(db, 'locations', locationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Tenant Cashiers / Staff Firestore API
// -------------------------------------------------------------
export async function getTenantCashiersFromFirestore(businessId: string): Promise<Cashier[]> {
  if (!auth.currentUser) return [];
  const path = 'cashiers';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Cashier);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToTenantCashiers(
  businessId: string,
  onData: (cashiers: Cashier[]) => void
): Unsubscribe {
  if (!auth.currentUser) {
    return () => {};
  }
  const path = 'cashiers';
  const q = query(collection(db, path), where('businessId', '==', businessId));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Cashier));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveCashierToFirestore(cashier: Cashier): Promise<void> {
  if (!auth.currentUser) return;
  const path = `cashiers/${cashier.id}`;
  try {
    await setDoc(doc(db, 'cashiers', cashier.id), cashier);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCashierInFirestore(
  cashierId: string,
  updates: Partial<Cashier>
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `cashiers/${cashierId}`;
  try {
    await setDoc(doc(db, 'cashiers', cashierId), updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCashierFromFirestore(cashierId: string): Promise<void> {
  if (!auth.currentUser) return;
  const path = `cashiers/${cashierId}`;
  try {
    await deleteDoc(doc(db, 'cashiers', cashierId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Tenant Transactions Firestore API
// -------------------------------------------------------------
export async function getTenantTransactionsFromFirestore(businessId: string): Promise<Transaction[]> {
  if (!auth.currentUser) return [];
  const path = 'transactions';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Transaction);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToTenantTransactions(
  businessId: string,
  onData: (transactions: Transaction[]) => void
): Unsubscribe {
  if (!auth.currentUser) {
    return () => {};
  }
  const path = 'transactions';
  const q = query(collection(db, path), where('businessId', '==', businessId));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Transaction));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveTransactionToFirestore(tx: Transaction): Promise<void> {
  if (!auth.currentUser) return;
  const path = `transactions/${tx.id}`;
  try {
    await setDoc(doc(db, 'transactions', tx.id), tx);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateTransactionInFirestore(
  txId: string,
  partialTx: Partial<Transaction>
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `transactions/${txId}`;
  try {
    await setDoc(doc(db, 'transactions', txId), partialTx, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function savePurgedSalesBackupToFirestore(backup: StoreSalesBackup): Promise<void> {
  if (!auth.currentUser) return;
  const path = `purged_sales_backups/${backup.id}`;
  try {
    await setDoc(doc(db, 'purged_sales_backups', backup.id), backup);
  } catch (error) {
    console.warn('Failed to save purged sales backup to Firestore:', error);
  }
}

export async function purgeTenantTransactionsFromFirestore(businessId: string): Promise<number> {
  if (!auth.currentUser) return 0;
  const path = 'transactions';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    if (snap.empty) return 0;
    
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
    return snap.docs.length;
  } catch (error) {
    console.warn('Failed to purge tenant transactions from Firestore:', error);
    return 0;
  }
}

// -------------------------------------------------------------
// Tenant Stock Transfers & Sync Logs Firestore API
// -------------------------------------------------------------
export async function saveStockTransferToFirestore(transfer: StockTransfer): Promise<void> {
  if (!auth.currentUser) return;
  const path = `stock_transfers/${transfer.id}`;
  try {
    await setDoc(doc(db, 'stock_transfers', transfer.id), transfer);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveSyncLogToFirestore(log: SyncLogEvent): Promise<void> {
  if (!auth.currentUser) return;
  const path = `sync_logs/${log.id}`;
  try {
    await setDoc(doc(db, 'sync_logs', log.id), log);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// Multi-Tenant Seeding Utility for Firestore
// -------------------------------------------------------------
export async function seedInitialTenantDataToFirestore(params: {
  businesses: Business[];
  products: Product[];
  categories?: Category[];
  locations: Location[];
  cashiers: Cashier[];
  transactions: Transaction[];
}): Promise<{ seeded: boolean; counts: Record<string, number> }> {
  const counts = { businesses: 0, products: 0, categories: 0, locations: 0, cashiers: 0, transactions: 0 };
  if (!auth.currentUser) {
    return { seeded: false, counts };
  }
  try {
    // Check if businesses already exist in Firestore
    const bizSnap = await getDocs(collection(db, 'businesses'));
    if (bizSnap.empty) {
      const batch = writeBatch(db);

      params.businesses.forEach((b) => {
        batch.set(doc(db, 'businesses', b.id), b);
        counts.businesses++;
      });

      params.products.forEach((p) => {
        batch.set(doc(db, 'products', p.id), p);
        counts.products++;
      });

      if (params.categories) {
        params.categories.forEach((cat) => {
          batch.set(doc(db, 'categories', cat.id), cat);
          counts.categories++;
        });
      }

      params.locations.forEach((l) => {
        batch.set(doc(db, 'locations', l.id), l);
        counts.locations++;
      });

      params.cashiers.forEach((c) => {
        batch.set(doc(db, 'cashiers', c.id), c);
        counts.cashiers++;
      });

      params.transactions.forEach((t) => {
        batch.set(doc(db, 'transactions', t.id), t);
        counts.transactions++;
      });

      await batch.commit();
      return { seeded: true, counts };
    }
    return { seeded: false, counts: { existing: bizSnap.size } };
  } catch (error) {
    console.warn('Tenant data initial seed check/write in Firestore:', error);
    return { seeded: false, counts };
  }
}

// -------------------------------------------------------------
// Platform Global Settings & Branding (Super Admin)
// -------------------------------------------------------------
export async function getPlatformSettingsFromFirestore(): Promise<PlatformSettings | null> {
  try {
    const snap = await getDoc(doc(db, 'platform_settings', 'global'));
    if (snap.exists()) {
      return snap.data() as PlatformSettings;
    }
    return null;
  } catch (error) {
    console.warn('Failed to load platform settings from Firestore:', error);
    return null;
  }
}

export async function savePlatformSettingsToFirestore(settings: PlatformSettings): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'platform_settings', 'global'), settings, { merge: true });
  } catch (error) {
    console.warn('Failed to save platform settings to Firestore:', error);
  }
}

// -------------------------------------------------------------
// Customers & Store Credit Directory (Tenant Scoped)
// -------------------------------------------------------------
export async function saveCustomerToFirestore(customer: Customer): Promise<void> {
  if (!auth.currentUser) return;
  const path = `customers/${customer.id}`;
  try {
    await setDoc(doc(db, 'customers', customer.id), customer);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCustomerInFirestore(customerId: string, updates: Partial<Customer>): Promise<void> {
  if (!auth.currentUser) return;
  const path = `customers/${customerId}`;
  try {
    await setDoc(
      doc(db, 'customers', customerId),
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  if (!auth.currentUser) return;
  const path = `customers/${customerId}`;
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToTenantCustomers(
  businessId: string,
  onUpdate: (customers: Customer[]) => void
): Unsubscribe {
  if (!auth.currentUser) {
    return () => {};
  }
  const q = query(collection(db, 'customers'), where('businessId', '==', businessId));
  return onSnapshot(
    q,
    (snapshot) => {
      const customers: Customer[] = [];
      snapshot.forEach((d) => customers.push(d.data() as Customer));
      onUpdate(customers);
    },
    (error) => {
      console.warn('Firestore customer real-time subscription error:', error);
    }
  );
}

export async function getTenantCustomersFromFirestore(businessId: string): Promise<Customer[]> {
  if (!auth.currentUser) return [];
  const path = 'customers';
  try {
    const q = query(collection(db, 'customers'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    const customers: Customer[] = [];
    snap.forEach((d) => customers.push(d.data() as Customer));
    return customers;
  } catch (error) {
    console.warn('Failed to get tenant customers from Firestore:', error);
    return [];
  }
}
