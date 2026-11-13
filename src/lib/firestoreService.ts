import {
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
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
  Supplier,
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

const QUOTA_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooldown when Firestore daily quota is exhausted
let firestoreQuotaCooldownUntil = 0;
let hasLoggedQuotaWarning = false;

export function isFirestoreQuotaError(error: unknown): boolean {
  if (!error) return false;
  const code = (error as any)?.code || '';
  const msg = error instanceof Error ? error.message : String(error);
  return (
    code === 'resource-exhausted' ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Free daily read units per project')
  );
}

export function isFirestoreQuotaCooldownActive(): boolean {
  return Date.now() < firestoreQuotaCooldownUntil;
}

export function markFirestoreQuotaExceeded(): void {
  firestoreQuotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
  if (!hasLoggedQuotaWarning) {
    hasLoggedQuotaWarning = true;
    console.warn(
      '[SokoPoS Offline-First] Firestore daily read quota reached. Continuing seamlessly with local cached storage.'
    );
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isFirestoreQuotaError(error)) {
    markFirestoreQuotaExceeded();
    throw error instanceof Error ? error : new Error(String(error));
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified ?? false,
      isAnonymous: auth.currentUser?.isAnonymous ?? false,
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

/**
 * Recursively removes keys with `undefined` values from objects and nested objects/arrays.
 * Firestore strictly forbids `undefined` in document payloads (setDoc, updateDoc, writeBatch).
 * Preserves `null`, primitives, Dates, and Firestore FieldValues.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return undefined as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  // Check for Firestore FieldValue or special objects
  if ('_methodName' in (data as Record<string, any>)) {
    return data;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const sanitized = sanitizeForFirestore(value);
      if (sanitized !== undefined) {
        clean[key] = sanitized;
      }
    }
  }
  return clean as T;
}

export function isDemoBusinessId(businessId?: string | null): boolean {
  return businessId === 'biz-demo';
}

export function isDemoRecordId(id?: string | null): boolean {
  if (!id) return false;
  return (
    id.startsWith('prod-demo-') ||
    id.startsWith('cust-demo-') ||
    id.startsWith('supp-demo-') ||
    id.startsWith('loc-demo-') ||
    id.startsWith('cat-demo-') ||
    id.startsWith('tx-demo-') ||
    id === 'biz-demo'
  );
}

// -------------------------------------------------------------
// Tenant Businesses Firestore API
// -------------------------------------------------------------
export async function getBusinessesFromFirestore(): Promise<Business[]> {
  if (!db || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  const path = 'businesses';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => d.data() as Business);
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getBusinessByIdFromFirestore(businessId: string): Promise<Business | null> {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return null;
  }
  const path = `businesses/${businessId}`;
  try {
    const snap = await getDoc(doc(db, 'businesses', businessId));
    return snap.exists() ? (snap.data() as Business) : null;
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return null;
    }
    console.warn(`Failed to get business ${businessId} from Firestore:`, error);
    return null;
  }
}

export async function getBusinessesByOwnerEmailFromFirestore(email: string): Promise<Business[]> {
  const cleanEmail = (email || '').trim();
  if (!db || !cleanEmail || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  const path = 'businesses';
  try {
    const lowerEmail = cleanEmail.toLowerCase();
    const qLower = query(collection(db, path), where('ownerEmail', '==', lowerEmail));
    const snapLower = await getDocs(qLower);
    const results = snapLower.docs.map((d) => d.data() as Business);

    if (results.length === 0 && cleanEmail !== lowerEmail) {
      const qExact = query(collection(db, path), where('ownerEmail', '==', cleanEmail));
      const snapExact = await getDocs(qExact);
      return snapExact.docs.map((d) => d.data() as Business);
    }
    return results;
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveBusinessToFirestore(biz: Business): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(biz.id)) return;
  const path = `businesses/${biz.id}`;
  try {
    await setDoc(doc(db, 'businesses', biz.id), sanitizeForFirestore(biz));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateBusinessInFirestore(
  businessId: string,
  updates: Partial<Business>
): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(businessId)) return;
  const path = `businesses/${businessId}`;
  try {
    await setDoc(doc(db, 'businesses', businessId), sanitizeForFirestore(updates), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBusinessFromFirestore(businessId: string): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(businessId)) return;
  const path = `businesses/${businessId}`;
  try {
    await deleteDoc(doc(db, 'businesses', businessId));
  } catch (error) {
    console.warn(`Failed to delete business ${businessId} from Firestore:`, error);
  }
}

/**
 * Enforces business uniqueness at both the Google account email and Tenant ID levels.
 * When conflicting businesses share the same email or tenant ID,
 * the business last logged into (most recent lastLoginAt, or fallback createdAt)
 * is prioritized. All other conflicting businesses are returned in conflictsToDelete.
 */
export function resolveBusinessUniquenessConflicts(businesses: Business[]): {
  uniqueBusinesses: Business[];
  conflictsToDelete: Business[];
} {
  if (!Array.isArray(businesses) || businesses.length === 0) {
    return { uniqueBusinesses: [], conflictsToDelete: [] };
  }

  // Calculate login priority score (most recent lastLoginAt wins; fallback to createdAt)
  const getSortScore = (b: Business): number => {
    const loginScore = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
    const createdScore = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return Math.max(loginScore, createdScore);
  };

  const conflictsToDelete: Business[] = [];
  const keptByEmail = new Map<string, Business>();

  // 1. Enforce Email Uniqueness: No two businesses may share the same Google account email
  for (const biz of businesses) {
    if (!biz || !biz.ownerEmail) {
      if (biz && biz.id) {
        conflictsToDelete.push(biz);
      }
      continue;
    }
    const normalizedEmail = biz.ownerEmail.trim().toLowerCase();

    const existing = keptByEmail.get(normalizedEmail);
    if (!existing) {
      keptByEmail.set(normalizedEmail, biz);
    } else {
      // Conflict on Google Account email!
      const existingScore = getSortScore(existing);
      const currentScore = getSortScore(biz);

      if (currentScore > existingScore) {
        // Current business was logged into more recently: keep current, delete existing
        keptByEmail.set(normalizedEmail, biz);
        conflictsToDelete.push(existing);
      } else {
        // Existing business was logged into more recently: keep existing, delete current
        conflictsToDelete.push(biz);
      }
    }
  }

  // 2. Enforce Tenant ID Uniqueness: No two businesses may share the same tenant ID
  const keptById = new Map<string, Business>();
  for (const biz of Array.from(keptByEmail.values())) {
    const bizId = (biz.id || '').trim();
    if (!bizId) {
      conflictsToDelete.push(biz);
      continue;
    }

    const existing = keptById.get(bizId);
    if (!existing) {
      keptById.set(bizId, biz);
    } else {
      // Conflict on tenant ID
      const existingScore = getSortScore(existing);
      const currentScore = getSortScore(biz);

      if (currentScore > existingScore) {
        keptById.set(bizId, biz);
        conflictsToDelete.push(existing);
      } else {
        conflictsToDelete.push(biz);
      }
    }
  }

  // Deduplicate conflicts to delete
  const uniqueConflictMap = new Map<string, Business>();
  for (const c of conflictsToDelete) {
    if (c && c.id) {
      uniqueConflictMap.set(c.id, c);
    }
  }

  const conflictIdSet = new Set(uniqueConflictMap.keys());
  const finalUniqueBusinesses = Array.from(keptById.values()).filter(
    (b) => !conflictIdSet.has(b.id)
  );

  return {
    uniqueBusinesses: finalUniqueBusinesses,
    conflictsToDelete: Array.from(uniqueConflictMap.values()),
  };
}

/**
 * Permanently deletes conflicting businesses and purges their tenant data at the Firestore level.
 */
export async function deleteBusinessConflictsFromFirestore(
  conflicts: Business[]
): Promise<number> {
  if (!db || !conflicts || conflicts.length === 0) return 0;

  let deletedCount = 0;
  for (const conflict of conflicts) {
    try {
      console.log(
        `[Firestore Uniqueness] Purging conflicting business "${conflict.name}" (ID: ${conflict.id}, Email: ${conflict.ownerEmail}) from Firestore...`
      );
      await deleteDoc(doc(db, 'businesses', conflict.id));
      await purgeTenantAllDataFromFirestore(conflict.id);
      deletedCount++;
    } catch (err) {
      console.warn(`[Firestore Uniqueness] Error deleting conflict ${conflict.id} from Firestore:`, err);
    }
  }
  return deletedCount;
}

export async function purgeTenantAllDataFromFirestore(businessId: string): Promise<{
  purgedRecords: number;
}> {
  if (!db) return { purgedRecords: 0 };
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
  if (!db) return;
  const path = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      sanitizeForFirestore({
        uid: user.uid,
        email: user.email,
        role: user.role,
        businessId: user.businessId || null,
        displayName: user.displayName || '',
        updatedAt: new Date().toISOString(),
      }),
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
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  const path = 'products';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Product);
  } catch (error) {
    if (!auth.currentUser || isFirestoreQuotaError(error)) {
      if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Direct Server Fetch: Retrieves tenant products explicitly from the Firestore server,
 * strictly bypassing any local client IndexedDB or memory cache.
 */
export async function getFreshTenantProductsFromFirestore(businessId: string): Promise<Product[]> {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  const path = 'products';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocsFromServer(q);
    return snap.docs.map((d) => d.data() as Product);
  } catch (error) {
    if (!auth.currentUser) {
      return [];
    }
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return [];
    }
    console.warn('Direct server fetch from Firestore failed, falling back:', error);
    try {
      const fallbackSnap = await getDocs(query(collection(db, path), where('businessId', '==', businessId)));
      return fallbackSnap.docs.map((d) => d.data() as Product);
    } catch (fallbackErr) {
      if (!auth.currentUser || isFirestoreQuotaError(fallbackErr)) {
        if (isFirestoreQuotaError(fallbackErr)) markFirestoreQuotaExceeded();
        return [];
      }
      handleFirestoreError(fallbackErr, OperationType.LIST, path);
      return [];
    }
  }
}

export function subscribeToTenantProducts(
  businessId: string,
  onData: (products: Product[], isFromCache?: boolean) => void
): Unsubscribe {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
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
      if (!auth.currentUser || isFirestoreQuotaError(error)) {
        if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
        return;
      }
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        console.warn(`Firestore products subscription notice on "${path}":`, err);
      }
    }
  );
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  if (!db || !auth.currentUser || product.businessId === 'biz-demo' || product.id.startsWith('prod-demo-')) return;
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), sanitizeForFirestore(product));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateProductInFirestore(
  productId: string,
  updates: Partial<Product>
): Promise<void> {
  if (!db || !auth.currentUser || productId.startsWith('prod-demo-') || updates.businessId === 'biz-demo') return;
  const path = `products/${productId}`;
  try {
    await setDoc(doc(db, 'products', productId), sanitizeForFirestore(updates), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  if (!db || !auth.currentUser || productId.startsWith('prod-demo-')) return;
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
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  const path = 'categories';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Category);
  } catch (error) {
    if (!auth.currentUser || isFirestoreQuotaError(error)) {
      if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToTenantCategories(
  businessId: string,
  onData: (categories: Category[]) => void
): Unsubscribe {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
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
      if (!auth.currentUser || isFirestoreQuotaError(error)) {
        if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
        return;
      }
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        console.warn(`Firestore categories subscription notice on "${path}":`, err);
      }
    }
  );
}

export async function saveCategoryToFirestore(category: Category): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(category.businessId) || isDemoRecordId(category.id)) return;
  const path = `categories/${category.id}`;
  try {
    await setDoc(doc(db, 'categories', category.id), sanitizeForFirestore(category));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCategoryInFirestore(
  categoryId: string,
  updates: Partial<Category>
): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(updates.businessId) || isDemoRecordId(categoryId)) return;
  const path = `categories/${categoryId}`;
  try {
    await setDoc(doc(db, 'categories', categoryId), sanitizeForFirestore(updates), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  if (!db || !auth.currentUser || isDemoRecordId(categoryId)) return;
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
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  const path = 'locations';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Location);
  } catch (error) {
    if (!auth.currentUser || isFirestoreQuotaError(error)) {
      if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToTenantLocations(
  businessId: string,
  onData: (locations: Location[]) => void
): Unsubscribe {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
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
      if (!auth.currentUser || isFirestoreQuotaError(error)) {
        if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
        return;
      }
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        console.warn(`Firestore locations subscription notice on "${path}":`, err);
      }
    }
  );
}

export async function saveLocationToFirestore(loc: Location): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(loc.businessId) || isDemoRecordId(loc.id)) return;
  const path = `locations/${loc.id}`;
  try {
    await setDoc(doc(db, 'locations', loc.id), sanitizeForFirestore(loc));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateLocationInFirestore(
  locationId: string,
  updates: Partial<Location>
): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(updates.businessId) || isDemoRecordId(locationId)) return;
  const path = `locations/${locationId}`;
  try {
    await setDoc(doc(db, 'locations', locationId), sanitizeForFirestore(updates), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteLocationFromFirestore(locationId: string): Promise<void> {
  if (!db || !auth.currentUser || isDemoRecordId(locationId)) return;
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
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  const path = 'cashiers';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Cashier);
  } catch (error) {
    if (!auth.currentUser || isFirestoreQuotaError(error)) {
      if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Targeted indexed lookup of cashiers by username and/or staff code across SokoPoS.
 * Replaces expensive full-collection `getAllCashiersFromFirestore()` scans.
 */
export async function findCashierInFirestoreByIdentity(
  username?: string,
  code?: string
): Promise<Cashier[]> {
  if (!db || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  const path = 'cashiers';
  const foundMap = new Map<string, Cashier>();
  try {
    const cleanUser = (username || '').trim().toLowerCase();
    const rawCode = (code || '').trim();
    const cleanCode = rawCode.replace(/^#/, '');

    const queries = [];
    if (cleanUser) {
      queries.push(query(collection(db, path), where('username', '==', cleanUser), limit(5)));
    }
    if (rawCode) {
      queries.push(query(collection(db, path), where('code', '==', rawCode), limit(5)));
      if (`#${cleanCode}` !== rawCode) {
        queries.push(query(collection(db, path), where('code', '==', `#${cleanCode}`), limit(5)));
      }
      if (cleanCode && cleanCode !== rawCode) {
        queries.push(query(collection(db, path), where('code', '==', cleanCode), limit(5)));
      }
    }

    const snaps = await Promise.all(queries.map((q) => getDocs(q)));
    snaps.forEach((snap) => {
      snap.docs.forEach((d) => {
        const c = d.data() as Cashier;
        if (c?.id) foundMap.set(c.id, c);
      });
    });
    return Array.from(foundMap.values());
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return [];
    }
    console.warn('Targeted cashier identity lookup notice:', error);
    return [];
  }
}

export async function getAllCashiersFromFirestore(): Promise<Cashier[]> {
  if (!db || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  const path = 'cashiers';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => d.data() as Cashier);
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToTenantCashiers(
  businessId: string,
  onData: (cashiers: Cashier[]) => void
): Unsubscribe {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
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
      if (!auth.currentUser || isFirestoreQuotaError(error)) {
        if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
        return;
      }
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        console.warn(`Firestore cashiers subscription notice on "${path}":`, err);
      }
    }
  );
}

export async function saveCashierToFirestore(cashier: Cashier): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(cashier.businessId) || isDemoRecordId(cashier.id)) return;
  const path = `cashiers/${cashier.id}`;
  try {
    // Sanitize public cashier document: Never expose raw bcrypt PIN hashes in public listings
    const publicDoc = {
      ...cashier,
      pin: '••••••••',
    };
    await setDoc(doc(db, 'cashiers', cashier.id), sanitizeForFirestore(publicDoc));

    // If caller provided a real pin/hash, attempt storing in isolated private subcollection
    if (cashier.pin && cashier.pin !== '••••••••' && !cashier.pin.startsWith('[PROTECTED')) {
      const privatePath = `cashiers/${cashier.id}/private/credentials`;
      setDoc(doc(db, 'cashiers', cashier.id, 'private', 'credentials'), {
        cashierId: cashier.id,
        businessId: cashier.businessId,
        hash: cashier.pin,
        updatedAt: new Date().toISOString(),
      }).catch((e) => {
        // Private subcollection is protected by security rules; non-super-admins use server endpoint
        console.info('Client direct write to private credentials subcollection bypassed (handled by server vault).');
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCashierInFirestore(
  cashierId: string,
  updates: Partial<Cashier>
): Promise<void> {
  if (!db || !auth.currentUser || updates.businessId === 'biz-demo') return;
  const path = `cashiers/${cashierId}`;
  try {
    const publicUpdates: Partial<Cashier> = { ...updates };
    if (publicUpdates.pin) {
      publicUpdates.pin = '••••••••';
    }
    await setDoc(doc(db, 'cashiers', cashierId), sanitizeForFirestore(publicUpdates), { merge: true });

    if (updates.pin && updates.pin !== '••••••••' && !updates.pin.startsWith('[PROTECTED')) {
      setDoc(doc(db, 'cashiers', cashierId, 'private', 'credentials'), {
        cashierId,
        hash: updates.pin,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {
        // Handled by server vault
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCashierFromFirestore(cashierId: string): Promise<void> {
  if (!db || !auth.currentUser) return;
  const path = `cashiers/${cashierId}`;
  try {
    await deleteDoc(doc(db, 'cashiers', cashierId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Tenant Transactions Firestore API (30-Day Live Window + On-Demand Range)
// -------------------------------------------------------------
let hasLoggedTxIndexHint = false;

export async function getTenantTransactionsFromFirestore(businessId: string): Promise<Transaction[]> {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  const path = 'transactions';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId), limit(500));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Transaction);
  } catch (error) {
    if (!auth.currentUser || isFirestoreQuotaError(error)) {
      if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getTenantTransactionsRangeFromFirestore(
  businessId: string,
  startIso: string,
  endIso: string,
  maxDocs = 1000
): Promise<Transaction[]> {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return [];
  }
  const path = 'transactions';
  try {
    const q = query(
      collection(db, path),
      where('businessId', '==', businessId),
      where('timestamp', '>=', startIso),
      where('timestamp', '<=', endIso),
      orderBy('timestamp', 'desc'),
      limit(maxDocs)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Transaction);
  } catch (error: any) {
    if (!auth.currentUser || isFirestoreQuotaError(error)) {
      if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
      return [];
    }
    const errMsg = String(error?.message || '').toLowerCase();
    if (error?.code === 'failed-precondition' || errMsg.includes('index')) {
      if (!hasLoggedTxIndexHint) {
        hasLoggedTxIndexHint = true;
        console.info(
          '[Firestore Index Hint] Create composite index on transactions(businessId ASC, timestamp DESC) for server-side date range queries. Falling back to bounded client filter.'
        );
      }
      try {
        const fallbackQ = query(collection(db, path), where('businessId', '==', businessId), limit(maxDocs));
        const fallbackSnap = await getDocs(fallbackQ);
        return fallbackSnap.docs
          .map((d) => d.data() as Transaction)
          .filter((tx) => tx.timestamp >= startIso && tx.timestamp <= endIso);
      } catch (fallbackErr) {
        if (isFirestoreQuotaError(fallbackErr)) {
          markFirestoreQuotaExceeded();
          return [];
        }
        handleFirestoreError(fallbackErr, OperationType.LIST, path);
      }
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToTenantTransactions(
  businessId: string,
  onData: (transactions: Transaction[]) => void,
  options: { windowDays?: number; maxDocs?: number } = {}
): Unsubscribe {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return () => {};
  }
  const { windowDays = 30, maxDocs = 500 } = options;
  const cutoffIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const path = 'transactions';

  let activeUnsub: Unsubscribe = () => {};
  let disposed = false;

  const attachFallbackListener = () => {
    if (disposed || !db || !auth.currentUser) return;
    const fallbackQ = query(
      collection(db, path),
      where('businessId', '==', businessId),
      limit(maxDocs)
    );
    activeUnsub = onSnapshot(
      fallbackQ,
      (snap) => {
        const docs = snap.docs
          .map((d) => d.data() as Transaction)
          .filter((tx) => !tx.timestamp || tx.timestamp >= cutoffIso);
        onData(docs);
      },
      (error) => {
        if (!auth.currentUser || isFirestoreQuotaError(error)) {
          if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
          return;
        }
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch (err) {
          console.warn(`Firestore transactions fallback subscription notice on "${path}":`, err);
        }
      }
    );
  };

  const indexedQ = query(
    collection(db, path),
    where('businessId', '==', businessId),
    where('timestamp', '>=', cutoffIso),
    orderBy('timestamp', 'desc'),
    limit(maxDocs)
  );

  activeUnsub = onSnapshot(
    indexedQ,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Transaction));
    },
    (error: any) => {
      if (!auth.currentUser || isFirestoreQuotaError(error)) {
        if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
        return;
      }
      const errMsg = String(error?.message || '').toLowerCase();
      if (error?.code === 'failed-precondition' || errMsg.includes('index')) {
        if (!hasLoggedTxIndexHint) {
          hasLoggedTxIndexHint = true;
          console.info(
            '[Firestore Index Hint] Create composite index on transactions(businessId ASC, timestamp DESC) for server-side 30d live sync. Falling back to bounded listener.'
          );
        }
        activeUnsub();
        attachFallbackListener();
        return;
      }
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        console.warn(`Firestore transactions subscription notice on "${path}":`, err);
      }
    }
  );

  return () => {
    disposed = true;
    activeUnsub();
  };
}

export async function saveTransactionToFirestore(tx: Transaction): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(tx.businessId) || isDemoRecordId(tx.id)) return;
  const path = `transactions/${tx.id}`;
  try {
    await setDoc(doc(db, 'transactions', tx.id), sanitizeForFirestore(tx));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateTransactionInFirestore(
  txId: string,
  partialTx: Partial<Transaction>
): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(partialTx.businessId) || isDemoRecordId(txId)) return;
  const path = `transactions/${txId}`;
  try {
    await setDoc(doc(db, 'transactions', txId), sanitizeForFirestore(partialTx), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Atomic writeBatch flusher for pending offline queue items (transactions, products, locations, cashiers).
 * Groups up to 450 documents per commit to reduce write latency and overhead.
 */
export async function flushPendingDocsBatch(
  items: Array<{
    collectionName: 'transactions' | 'products' | 'locations' | 'cashiers';
    id: string;
    data: Record<string, any>;
  }>
): Promise<number> {
  if (!db || !auth.currentUser || !items || items.length === 0 || isFirestoreQuotaCooldownActive()) {
    return 0;
  }

  const eligible = items.filter(
    (item) => item.id && !isDemoRecordId(item.id) && !isDemoBusinessId(item.data?.businessId)
  );
  if (eligible.length === 0) return 0;

  let committed = 0;
  const CHUNK_SIZE = 450;
  for (let i = 0; i < eligible.length; i += CHUNK_SIZE) {
    const chunk = eligible.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const payload =
        item.collectionName === 'cashiers'
          ? { ...item.data, pin: '••••••••' }
          : item.data;
      batch.set(doc(db, item.collectionName, item.id), sanitizeForFirestore(payload), { merge: true });
    }
    try {
      await batch.commit();
      committed += chunk.length;
    } catch (error) {
      if (isFirestoreQuotaError(error)) {
        markFirestoreQuotaExceeded();
        return committed;
      }
      handleFirestoreError(error, OperationType.WRITE, 'batch');
    }
  }
  return committed;
}

export async function savePurgedSalesBackupToFirestore(backup: StoreSalesBackup): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(backup.businessId)) return;
  const path = `purged_sales_backups/${backup.id}`;
  try {
    await setDoc(doc(db, 'purged_sales_backups', backup.id), sanitizeForFirestore(backup));
  } catch (error) {
    console.warn('Failed to save purged sales backup to Firestore:', error);
  }
}

export async function purgeTenantTransactionsFromFirestore(businessId: string): Promise<number> {
  if (!db || !auth.currentUser || isDemoBusinessId(businessId)) return 0;
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
  if (!db || !auth.currentUser || isDemoBusinessId(transfer.businessId)) return;
  const path = `stock_transfers/${transfer.id}`;
  try {
    await setDoc(doc(db, 'stock_transfers', transfer.id), sanitizeForFirestore(transfer));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveSyncLogToFirestore(log: SyncLogEvent): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(log.businessId)) return;
  const path = `sync_logs/${log.id}`;
  try {
    await setDoc(doc(db, 'sync_logs', log.id), sanitizeForFirestore(log));
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
  if (!db || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return { seeded: false, counts };
  }
  try {
    // Point lookup on flagship doc instead of scanning the entire businesses collection
    const upfrontSnap = await getDoc(doc(db, 'businesses', 'biz-upfront'));
    if (!upfrontSnap.exists()) {
      const batch = writeBatch(db);

      params.businesses
        .filter((b) => !isDemoBusinessId(b.id))
        .forEach((b) => {
          batch.set(doc(db, 'businesses', b.id), sanitizeForFirestore(b));
          counts.businesses++;
        });

      params.products
        .filter((p) => !isDemoBusinessId(p.businessId))
        .forEach((p) => {
          batch.set(doc(db, 'products', p.id), sanitizeForFirestore(p));
          counts.products++;
        });

      if (params.categories) {
        params.categories
          .filter((cat) => !isDemoBusinessId(cat.businessId))
          .forEach((cat) => {
            batch.set(doc(db, 'categories', cat.id), sanitizeForFirestore(cat));
            counts.categories++;
          });
      }

      params.locations
        .filter((l) => !isDemoBusinessId(l.businessId))
        .forEach((l) => {
          batch.set(doc(db, 'locations', l.id), sanitizeForFirestore(l));
          counts.locations++;
        });

      params.cashiers
        .filter((c) => !isDemoBusinessId(c.businessId))
        .forEach((c) => {
          const maskedCashier = { ...c, pin: '••••••••' };
          batch.set(doc(db, 'cashiers', c.id), sanitizeForFirestore(maskedCashier));
          counts.cashiers++;
        });

      params.transactions
        .filter((t) => !isDemoBusinessId(t.businessId))
        .forEach((t) => {
          batch.set(doc(db, 'transactions', t.id), sanitizeForFirestore(t));
          counts.transactions++;
        });

      await batch.commit();
      return { seeded: true, counts };
    }
    return { seeded: false, counts: { existing: 1 } };
  } catch (error) {
    console.warn('Tenant data initial seed check/write in Firestore:', error);
    return { seeded: false, counts };
  }
}

// -------------------------------------------------------------
// Platform Global Settings & Branding (Super Admin, 30-min TTL Cache)
// -------------------------------------------------------------
const PLATFORM_SETTINGS_CACHE_KEY = 'sokopos_platform_settings_cache_v1';
const PLATFORM_SETTINGS_TTL_MS = 30 * 60 * 1000;

export async function getPlatformSettingsFromFirestore(forceRefresh = false): Promise<PlatformSettings | null> {
  if (typeof window !== 'undefined' && !forceRefresh) {
    try {
      const raw = localStorage.getItem(PLATFORM_SETTINGS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { data: PlatformSettings | null; fetchedAt: number };
        if (parsed && typeof parsed.fetchedAt === 'number' && Date.now() - parsed.fetchedAt < PLATFORM_SETTINGS_TTL_MS) {
          return parsed.data;
        }
      }
    } catch {
      // ignore storage cache parse error
    }
  }

  if (!db || isFirestoreQuotaCooldownActive()) return null;
  try {
    const snap = await getDoc(doc(db, 'platform_settings', 'global'));
    const data = snap.exists() ? (snap.data() as PlatformSettings) : null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          PLATFORM_SETTINGS_CACHE_KEY,
          JSON.stringify({ data, fetchedAt: Date.now() })
        );
      } catch {
        // ignore quota error
      }
    }
    return data;
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return null;
    }
    console.warn('Failed to load platform settings from Firestore:', error);
    return null;
  }
}

export async function savePlatformSettingsToFirestore(settings: PlatformSettings): Promise<void> {
  if (!db || !auth.currentUser) return;
  try {
    await setDoc(doc(db, 'platform_settings', 'global'), sanitizeForFirestore(settings), { merge: true });
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(PLATFORM_SETTINGS_CACHE_KEY);
      } catch {
        // ignore
      }
    }
  } catch (error) {
    console.warn('Failed to save platform settings to Firestore:', error);
  }
}

// -------------------------------------------------------------
// Customers & Store Credit Directory (Tenant Scoped)
// -------------------------------------------------------------
export async function saveCustomerToFirestore(customer: Customer): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(customer.businessId) || isDemoRecordId(customer.id)) return;
  const path = `customers/${customer.id}`;
  try {
    await setDoc(doc(db, 'customers', customer.id), sanitizeForFirestore(customer));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCustomerInFirestore(customerId: string, updates: Partial<Customer>): Promise<void> {
  if (!db || !auth.currentUser || isDemoRecordId(customerId) || isDemoBusinessId(updates.businessId)) return;
  const path = `customers/${customerId}`;
  try {
    await setDoc(
      doc(db, 'customers', customerId),
      sanitizeForFirestore({
        ...updates,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  if (!db || !auth.currentUser || isDemoRecordId(customerId)) return;
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
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
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
      if (!auth.currentUser || isFirestoreQuotaError(error)) {
        if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
        return;
      }
      console.warn('Firestore customer real-time subscription error:', error);
    }
  );
}

export async function getTenantCustomersFromFirestore(businessId: string): Promise<Customer[]> {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  try {
    const q = query(collection(db, 'customers'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    const customers: Customer[] = [];
    snap.forEach((d) => customers.push(d.data() as Customer));
    return customers;
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return [];
    }
    console.warn('Failed to get tenant customers from Firestore:', error);
    return [];
  }
}

// -------------------------------------------------------------
// Suppliers Management (Tenant Scoped)
// -------------------------------------------------------------
export async function saveSupplierToFirestore(supplier: Supplier): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(supplier.businessId) || isDemoRecordId(supplier.id)) return;
  const path = `suppliers/${supplier.id}`;
  try {
    await setDoc(doc(db, 'suppliers', supplier.id), sanitizeForFirestore(supplier));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateSupplierInFirestore(supplierId: string, updates: Partial<Supplier>): Promise<void> {
  if (!db || !auth.currentUser || isDemoRecordId(supplierId) || isDemoBusinessId(updates.businessId)) return;
  const path = `suppliers/${supplierId}`;
  try {
    await setDoc(
      doc(db, 'suppliers', supplierId),
      sanitizeForFirestore({
        ...updates,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSupplierFromFirestore(supplierId: string): Promise<void> {
  if (!db || !auth.currentUser || isDemoRecordId(supplierId)) return;
  const path = `suppliers/${supplierId}`;
  try {
    await deleteDoc(doc(db, 'suppliers', supplierId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToTenantSuppliers(
  businessId: string,
  onUpdate: (suppliers: Supplier[]) => void
): Unsubscribe {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return () => {};
  }
  const q = query(collection(db, 'suppliers'), where('businessId', '==', businessId));
  return onSnapshot(
    q,
    (snapshot) => {
      const suppliers: Supplier[] = [];
      snapshot.forEach((d) => suppliers.push(d.data() as Supplier));
      onUpdate(suppliers);
    },
    (error) => {
      if (!auth.currentUser || isFirestoreQuotaError(error)) {
        if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
        return;
      }
      console.warn('Firestore supplier real-time subscription error:', error);
    }
  );
}

export async function getTenantSuppliersFromFirestore(businessId: string): Promise<Supplier[]> {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  try {
    const q = query(collection(db, 'suppliers'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    const suppliers: Supplier[] = [];
    snap.forEach((d) => suppliers.push(d.data() as Supplier));
    return suppliers;
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return [];
    }
    console.warn('Failed to get tenant suppliers from Firestore:', error);
    return [];
  }
}

