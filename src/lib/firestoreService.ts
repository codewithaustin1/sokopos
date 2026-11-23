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
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  Unsubscribe,
  DocumentReference,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  Business,
  BusinessLegalConsent,
  Product,
  Category,
  Location,
  Cashier,
  Customer,
  Supplier,
  Transaction,
  SyncLogEvent,
  StoreSalesBackup,
  PlatformSettings,
  PlatformPricingConfig,
  PricingTier,
  DEFAULT_PRICING_TIERS,
  BrandingSlotAsset,
  BrandingSlotId,
  IndustrySolutionId,
} from '../types';
import {
  AnalyticsDailyRollup,
  AnalyticsTarget,
  AnalyticsSavedView,
} from '../types/reporting';

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

function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
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
}

export function logFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  if (isFirestoreQuotaError(error)) {
    markFirestoreQuotaExceeded();
    return;
  }
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isFirestoreQuotaError(error)) {
    markFirestoreQuotaExceeded();
    throw error instanceof Error ? error : new Error(String(error));
  }
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
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

const SUPER_ADMIN_EMAIL = 'upfrontretaile@gmail.com';
const SUPER_ADMIN_UID = 'ulGLrKgcsrWyqcGRJ6DzvHoEYY12';
const FIRESTORE_BATCH_LIMIT = 400;

export function isCurrentUserSuperAdmin(): boolean {
  const user = auth.currentUser;
  if (!user) return false;
  if (user.uid === SUPER_ADMIN_UID) return true;
  const cleanEmail = (user.email || '').trim().toLowerCase();
  return Boolean(user.emailVerified && cleanEmail === SUPER_ADMIN_EMAIL);
}

const PROTECTED_BUSINESS_FIELD_KEYS = [
  'plan',
  'status',
  'subscription',
  'referredByCode',
  'referredAt',
  'paystackSubaccountCode',
  'paystackSettlementBank',
  'paystackSettlementAccountMask',
  'paystackSubaccountStatus',
  'paystackSubaccountVerifiedAt',
  'paystackFeeBearer',
] as const;

export function stripProtectedBusinessFields<T extends Record<string, any>>(payload: T): Partial<T> {
  const clean: Record<string, any> = { ...payload };
  for (const key of PROTECTED_BUSINESS_FIELD_KEYS) {
    delete clean[key];
  }
  return clean as Partial<T>;
}

async function commitBatchDeletes(refs: DocumentReference[]): Promise<number> {
  if (!db || !Array.isArray(refs) || refs.length === 0) return 0;
  let deleted = 0;
  for (let i = 0; i < refs.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = refs.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

// -------------------------------------------------------------
// Tenant Businesses Firestore API
// -------------------------------------------------------------
export async function getBusinessesFromFirestore(): Promise<Business[]> {
  if (!db || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  if (!isCurrentUserSuperAdmin()) {
    return getBusinessesByOwnerEmailFromFirestore(auth.currentUser.email || '');
  }
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
    logFirestoreErrorInfo(error, OperationType.GET, path);
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

    if (results.length === 0 && cleanEmail !== lowerEmail && isCurrentUserSuperAdmin()) {
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
  if (!isCurrentUserSuperAdmin()) {
    const res = await ensureBusinessDocInFirestore(biz, biz.ownerEmail || auth.currentUser.email || '');
    if (!res.ok) {
      throw new Error(res.error || 'Could not save business document to Firestore.');
    }
    return;
  }
  const path = `businesses/${biz.id}`;
  const normalizedBiz: Business = {
    ...biz,
    ownerEmail: (biz.ownerEmail || '').trim().toLowerCase(),
  };
  try {
    await setDoc(doc(db, 'businesses', biz.id), sanitizeForFirestore(normalizedBiz));
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
  const sanitizedUpdates = isCurrentUserSuperAdmin()
    ? {
        ...updates,
        ...(typeof updates.ownerEmail === 'string' ? { ownerEmail: updates.ownerEmail.trim().toLowerCase() } : {}),
      }
    : stripProtectedBusinessFields(
        typeof updates.ownerEmail === 'string'
          ? { ...updates, ownerEmail: updates.ownerEmail.trim().toLowerCase() }
          : updates
      );
  const cleaned = sanitizeForFirestore(sanitizedUpdates);
  if (!cleaned || Object.keys(cleaned).length === 0) return;
  try {
    await setDoc(doc(db, 'businesses', businessId), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveBusinessLegalConsentToFirestore(
  biz: Business,
  legalConsent: BusinessLegalConsent
): Promise<void> {
  if (!db) {
    throw new Error('Cloud database service is unavailable.');
  }
  if (!auth.currentUser) {
    throw new Error('An active verified merchant sign-in session is required to record legal consent in Firestore.');
  }
  if (!biz?.id || isDemoBusinessId(biz.id)) {
    throw new Error('Legal consent is only recorded for live merchant stores.');
  }

  const ensureRes = await ensureBusinessDocInFirestore(
    biz,
    biz.ownerEmail || auth.currentUser.email || ''
  );
  if (!ensureRes.ok) {
    throw new Error(ensureRes.error || 'Could not initialize business record in Firestore.');
  }

  const path = `businesses/${biz.id}`;
  try {
    await setDoc(
      doc(db, 'businesses', biz.id),
      sanitizeForFirestore({ legalConsent }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function ensureBusinessDocInFirestore(
  biz: Business,
  ownerEmail: string
): Promise<{ ok: boolean; error?: string }> {
  if (!db || !auth.currentUser) {
    return { ok: false, error: 'Firebase session is not active.' };
  }
  if (!biz?.id || isDemoBusinessId(biz.id)) {
    return { ok: false, error: 'Demo stores cannot be synced for live billing.' };
  }
  const normalizedOwnerEmail = ownerEmail.trim().toLowerCase();
  try {
    const docRef = doc(db, 'businesses', biz.id);
    let existing: Business | null = null;
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        existing = snap.data() as Business;
      }
    } catch (getErr: any) {
      // Firestore rules require `resource != null` on `get` when `users/{uid}` is not linked yet.
      // Treat permission-denied/not-found on initial lookup as non-existent so create can proceed.
      const code = String(getErr?.code || '').toLowerCase();
      if (!code.includes('permission-denied') && !code.includes('not-found')) {
        throw getErr;
      }
    }
    const nowIso = new Date().toISOString();

    if (existing) {
      const existingOwner = String(existing.ownerEmail || '').trim().toLowerCase();
      const callerEmail = String(auth.currentUser.email || '').trim().toLowerCase();
      if (existingOwner && existingOwner !== normalizedOwnerEmail && callerEmail !== 'upfrontretaile@gmail.com') {
        return {
          ok: false,
          error: `Store "${biz.name}" is registered under a different owner (${existingOwner}).`,
        };
      }
      await setDoc(
        docRef,
        sanitizeForFirestore({
          name: biz.name,
          code: biz.code,
          ownerName: biz.ownerName || existing.ownerName || 'Business Owner',
          lastLoginAt: nowIso,
        }),
        { merge: true }
      );
      return { ok: true };
    }

    const {
      plan: _omitPlan,
      status: _omitStatus,
      subscription: _omitSub,
      referredByCode: _omitRef,
      referredAt: _omitRefAt,
      paystackSubaccountCode: _omitPsCode,
      paystackSettlementBank: _omitPsBank,
      paystackSettlementAccountMask: _omitPsMask,
      paystackSubaccountStatus: _omitPsStatus,
      paystackSubaccountVerifiedAt: _omitPsVerifiedAt,
      paystackFeeBearer: _omitPsBearer,
      ...safeProfile
    } = biz;

    await setDoc(
      docRef,
      sanitizeForFirestore({
        ...safeProfile,
        id: biz.id,
        ownerEmail: normalizedOwnerEmail,
        plan: 'free',
        status: 'active',
        lastLoginAt: nowIso,
      })
    );
    return { ok: true };
  } catch (error: any) {
    console.warn(`ensureBusinessDocInFirestore failed for ${biz.id}:`, error);
    logFirestoreErrorInfo(error, OperationType.WRITE, `businesses/${biz.id}`);
    return {
      ok: false,
      error: error?.message || 'Could not sync store record to cloud database.',
    };
  }
}

export async function deleteBusinessFromFirestore(businessId: string): Promise<void> {
  if (!db || !auth.currentUser || isDemoBusinessId(businessId)) return;
  const path = `businesses/${businessId}`;
  try {
    await deleteDoc(doc(db, 'businesses', businessId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
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
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return { purgedRecords: 0 };
  }
  let purgedRecords = 0;
  const collectionsToPurge = [
    'products',
    'categories',
    'locations',
    'cashiers',
    'transactions',
    'customers',
    'suppliers',
    'stock_transfers',
    'sync_logs',
    'purged_sales_backups',
    'analytics_daily_rollups',
    'analytics_targets',
    'analytics_saved_views',
  ];

  for (const collName of collectionsToPurge) {
    try {
      const q = query(collection(db, collName), where('businessId', '==', businessId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        purgedRecords += await commitBatchDeletes(snap.docs.map((d) => d.ref));
      }
    } catch (err) {
      if (isFirestoreQuotaError(err)) {
        markFirestoreQuotaExceeded();
        break;
      }
      logFirestoreErrorInfo(err, OperationType.DELETE, collName);
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
}): Promise<boolean> {
  if (!db || !auth.currentUser) return false;
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
    return true;
  } catch (error) {
    logFirestoreErrorInfo(error, OperationType.WRITE, path);
    return false;
  }
}

// -------------------------------------------------------------
// Tenant Products Firestore API (Row-Level Security Scoped)
// -------------------------------------------------------------
export interface ProductDeltaEvent {
  upserts: Product[];
  deletedIds: string[];
  isFullSync: boolean;
  isFromCache?: boolean;
  maxUpdatedAt?: string;
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
    return snap.docs.map((d) => d.data() as Product).filter((p) => !p.isDeleted);
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
      return fallbackSnap.docs.map((d) => d.data() as Product).filter((p) => !p.isDeleted);
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

/**
 * Cursor-based incremental product listener.
 * When `sinceIso` is provided, listens only to documents updated after `(sinceIso - 60s)`
 * to eliminate full catalog re-reads across reloads. Gracefully falls back to full tenant
 * subscription if the composite index (`businessId` + `updatedAt`) is not yet deployed.
 */
export function subscribeToTenantProductsDelta(
  businessId: string,
  sinceIso: string | null | undefined,
  onDelta: (event: ProductDeltaEvent) => void
): Unsubscribe {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return () => {};
  }

  let activeUnsub: Unsubscribe | null = null;
  let disposed = false;

  const attach = (useDeltaQuery: boolean) => {
    if (disposed || !db || !auth.currentUser || isFirestoreQuotaCooldownActive()) return;

    const path = 'products';
    const sinceMs = sinceIso ? new Date(sinceIso).getTime() : NaN;
    const canUseDelta = useDeltaQuery && Number.isFinite(sinceMs) && sinceMs > 0;
    const effectiveSinceIso = canUseDelta
      ? new Date(Math.max(0, sinceMs - 60_000)).toISOString()
      : null;

    const q = effectiveSinceIso
      ? query(
          collection(db, path),
          where('businessId', '==', businessId),
          where('updatedAt', '>', effectiveSinceIso)
        )
      : query(collection(db, path), where('businessId', '==', businessId));

    activeUnsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const isFromCache = snap.metadata.fromCache;
        const upserts: Product[] = [];
        const deletedIds: string[] = [];
        let maxUpdatedAt = '';

        for (const docSnap of snap.docs) {
          const prod = docSnap.data() as Product;
          if (prod.updatedAt && prod.updatedAt > maxUpdatedAt) {
            maxUpdatedAt = prod.updatedAt;
          }
          if (prod.isDeleted) {
            deletedIds.push(prod.id || docSnap.id);
          } else {
            upserts.push(prod);
          }
        }

        if (!maxUpdatedAt && !isFromCache) {
          maxUpdatedAt = new Date().toISOString();
        }

        onDelta({
          upserts,
          deletedIds,
          isFullSync: !effectiveSinceIso,
          isFromCache,
          maxUpdatedAt: maxUpdatedAt || undefined,
        });
      },
      (error: any) => {
        if (!auth.currentUser || isFirestoreQuotaError(error)) {
          if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
          return;
        }
        if (
          effectiveSinceIso &&
          (error?.code === 'failed-precondition' || String(error?.message || '').includes('index'))
        ) {
          console.warn('Products delta index missing; falling back to standard tenant products stream.');
          if (activeUnsub) {
            activeUnsub();
            activeUnsub = null;
          }
          attach(false);
          return;
        }
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch (err) {
          console.warn(`Firestore products delta subscription notice on "${path}":`, err);
        }
      }
    );
  };

  attach(Boolean(sinceIso));

  return () => {
    disposed = true;
    if (activeUnsub) {
      activeUnsub();
      activeUnsub = null;
    }
  };
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  if (!db || !auth.currentUser || product.businessId === 'biz-demo' || product.id.startsWith('prod-demo-')) return;
  const path = `products/${product.id}`;
  const payload: Product = {
    ...product,
    updatedAt: product.updatedAt || new Date().toISOString(),
    isDeleted: false,
  };
  try {
    await setDoc(doc(db, 'products', product.id), sanitizeForFirestore(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchSaveProductsToFirestore(products: Product[]): Promise<void> {
  if (!db || !auth.currentUser || !Array.isArray(products) || products.length === 0 || isFirestoreQuotaCooldownActive()) return;
  const eligible = products.filter(
    (p) => p.id && !p.id.startsWith('prod-demo-') && p.businessId !== 'biz-demo'
  );
  const nowIso = new Date().toISOString();
  for (let i = 0; i < eligible.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = eligible.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((product) => {
      batch.set(
        doc(db, 'products', product.id),
        sanitizeForFirestore({
          ...product,
          updatedAt: product.updatedAt || nowIso,
          isDeleted: false,
        })
      );
    });
    try {
      await batch.commit();
    } catch (error) {
      if (isFirestoreQuotaError(error)) {
        markFirestoreQuotaExceeded();
        return;
      }
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  }
}

export async function batchUpdateProductsInFirestore(
  items: Array<{ id: string; updates: Partial<Product> }>
): Promise<void> {
  if (!db || !auth.currentUser || !Array.isArray(items) || items.length === 0 || isFirestoreQuotaCooldownActive()) return;
  const eligible = items.filter(
    (item) => item.id && !item.id.startsWith('prod-demo-') && item.updates.businessId !== 'biz-demo'
  );
  const nowIso = new Date().toISOString();
  for (let i = 0; i < eligible.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = eligible.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach(({ id, updates }) => {
      batch.set(
        doc(db, 'products', id),
        sanitizeForFirestore({
          ...updates,
          updatedAt: updates.updatedAt || nowIso,
        }),
        { merge: true }
      );
    });
    try {
      await batch.commit();
    } catch (error) {
      if (isFirestoreQuotaError(error)) {
        markFirestoreQuotaExceeded();
        return;
      }
      handleFirestoreError(error, OperationType.UPDATE, 'products');
    }
  }
}

export async function batchDeleteProductsFromFirestore(productIds: string[]): Promise<void> {
  if (!db || !auth.currentUser || !Array.isArray(productIds) || productIds.length === 0 || isFirestoreQuotaCooldownActive()) return;
  const eligible = productIds.filter((id) => id && !id.startsWith('prod-demo-'));
  const nowIso = new Date().toISOString();
  try {
    for (let i = 0; i < eligible.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = eligible.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        batch.update(doc(db, 'products', id), { isDeleted: true, updatedAt: nowIso });
      });
      try {
        await batch.commit();
      } catch (batchErr: any) {
        if (batchErr?.code === 'not-found') {
          await Promise.all(
            chunk.map((id) =>
              updateDoc(doc(db, 'products', id), { isDeleted: true, updatedAt: nowIso }).catch((err: any) => {
                if (err?.code === 'not-found') return;
                throw err;
              })
            )
          );
        } else {
          throw batchErr;
        }
      }
    }
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, 'products');
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

// -------------------------------------------------------------
// Tenant Locations Firestore API
// -------------------------------------------------------------
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

    // Only Super Admin can write directly to private credentials subcollection; staff PINs use server vault
    if (
      isCurrentUserSuperAdmin() &&
      cashier.pin &&
      cashier.pin !== '••••••••' &&
      !cashier.pin.startsWith('[PROTECTED')
    ) {
      await setDoc(doc(db, 'cashiers', cashier.id, 'private', 'credentials'), {
        cashierId: cashier.id,
        businessId: cashier.businessId,
        hash: cashier.pin,
        updatedAt: new Date().toISOString(),
      }).catch((err) => {
        logFirestoreErrorInfo(err, OperationType.WRITE, `cashiers/${cashier.id}/private/credentials`);
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// Tenant Transactions Firestore API (30-Day Live Window + On-Demand Range)
// -------------------------------------------------------------
let hasLoggedTxIndexHint = false;

function sortTransactionsNewestFirst(txs: Transaction[]): Transaction[] {
  return txs.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
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
        const fallbackQ = query(
          collection(db, path),
          where('businessId', '==', businessId),
          limit(Math.max(maxDocs, 2000))
        );
        const fallbackSnap = await getDocs(fallbackQ);
        return sortTransactionsNewestFirst(
          fallbackSnap.docs
            .map((d) => d.data() as Transaction)
            .filter((tx) => tx.timestamp >= startIso && tx.timestamp <= endIso)
        ).slice(0, maxDocs);
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
  const { windowDays = 7, maxDocs = 200 } = options;
  const cutoffIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const path = 'transactions';

  let activeUnsub: Unsubscribe = () => {};
  let disposed = false;

  const attachFallbackListener = () => {
    if (disposed || !db || !auth.currentUser) return;
    const fallbackQ = query(
      collection(db, path),
      where('businessId', '==', businessId),
      limit(Math.max(maxDocs, 2000))
    );
    activeUnsub = onSnapshot(
      fallbackQ,
      (snap) => {
        const docs = sortTransactionsNewestFirst(
          snap.docs
            .map((d) => d.data() as Transaction)
            .filter((tx) => !tx.timestamp || tx.timestamp >= cutoffIso)
        ).slice(0, maxDocs);
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
          : item.collectionName === 'products'
          ? { ...item.data, updatedAt: item.data.updatedAt || new Date().toISOString(), isDeleted: Boolean(item.data.isDeleted) }
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
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function purgeTenantTransactionsFromFirestore(businessId: string): Promise<number> {
  if (!db || !businessId || !auth.currentUser || isDemoBusinessId(businessId) || isFirestoreQuotaCooldownActive()) return 0;
  const path = 'transactions';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    if (snap.empty) return 0;
    return await commitBatchDeletes(snap.docs.map((d) => d.ref));
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return 0;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Tenant Sync Logs Firestore API
// -------------------------------------------------------------
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
  if (!db || !auth.currentUser || !isCurrentUserSuperAdmin() || isFirestoreQuotaCooldownActive()) {
    return { seeded: false, counts };
  }
  try {
    // Point lookup on flagship doc instead of scanning the entire businesses collection
    const upfrontSnap = await getDoc(doc(db, 'businesses', 'biz-upfront'));
    if (!upfrontSnap.exists()) {
      const ops: Array<{ ref: DocumentReference; data: Record<string, any> }> = [];

      params.businesses
        .filter((b) => !isDemoBusinessId(b.id))
        .forEach((b) => {
          ops.push({
            ref: doc(db, 'businesses', b.id),
            data: sanitizeForFirestore({
              ...b,
              ownerEmail: (b.ownerEmail || '').trim().toLowerCase(),
            }),
          });
          counts.businesses++;
        });

      params.products
        .filter((p) => !isDemoBusinessId(p.businessId))
        .forEach((p) => {
          ops.push({ ref: doc(db, 'products', p.id), data: sanitizeForFirestore(p) });
          counts.products++;
        });

      if (params.categories) {
        params.categories
          .filter((cat) => !isDemoBusinessId(cat.businessId))
          .forEach((cat) => {
            ops.push({ ref: doc(db, 'categories', cat.id), data: sanitizeForFirestore(cat) });
            counts.categories++;
          });
      }

      params.locations
        .filter((l) => !isDemoBusinessId(l.businessId))
        .forEach((l) => {
          ops.push({ ref: doc(db, 'locations', l.id), data: sanitizeForFirestore(l) });
          counts.locations++;
        });

      params.cashiers
        .filter((c) => !isDemoBusinessId(c.businessId))
        .forEach((c) => {
          const maskedCashier = { ...c, pin: '••••••••' };
          ops.push({ ref: doc(db, 'cashiers', c.id), data: sanitizeForFirestore(maskedCashier) });
          counts.cashiers++;
        });

      params.transactions
        .filter((t) => !isDemoBusinessId(t.businessId))
        .forEach((t) => {
          ops.push({ ref: doc(db, 'transactions', t.id), data: sanitizeForFirestore(t) });
          counts.transactions++;
        });

      for (let i = 0; i < ops.length; i += FIRESTORE_BATCH_LIMIT) {
        const chunk = ops.slice(i, i + FIRESTORE_BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach(({ ref, data }) => batch.set(ref, data));
        await batch.commit();
      }
      return { seeded: true, counts };
    }
    return { seeded: false, counts: { existing: 1 } };
  } catch (error) {
    logFirestoreErrorInfo(error, OperationType.WRITE, 'seed_initial_tenant_data');
    return { seeded: false, counts };
  }
}

// -------------------------------------------------------------
// Platform Global Settings & Per-Slot Branding (Super Admin, 24h TTL Cache)
// -------------------------------------------------------------
const PLATFORM_SETTINGS_CACHE_KEY = 'sokopos_platform_settings_cache_v2';
const PLATFORM_SETTINGS_TTL_MS = 24 * 60 * 60 * 1000;
let inFlightPlatformSettingsPromise: Promise<PlatformSettings | null> | null = null;

const BRANDING_SLOT_DOC_MAP: Record<BrandingSlotId, string> = {
  logo: 'branding_logo',
  favicon: 'branding_favicon',
  hero: 'branding_hero',
  industry_retail: 'branding_industry_retail',
  industry_bars: 'branding_industry_bars',
  industry_supermarkets: 'branding_industry_supermarkets',
  industry_pharmacies: 'branding_industry_pharmacies',
};

const ALL_BRANDING_SLOTS: BrandingSlotId[] = [
  'logo',
  'favicon',
  'hero',
  'industry_retail',
  'industry_bars',
  'industry_supermarkets',
  'industry_pharmacies',
];

async function getBrandingSlotDoc(slotId: BrandingSlotId): Promise<BrandingSlotAsset | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'platform_settings', BRANDING_SLOT_DOC_MAP[slotId]));
    return snap.exists() ? (snap.data() as BrandingSlotAsset) : null;
  } catch {
    return null;
  }
}

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
  if (!forceRefresh && inFlightPlatformSettingsPromise) {
    return inFlightPlatformSettingsPromise;
  }

  const fetchPromise = (async (): Promise<PlatformSettings | null> => {
    try {
      const [globalSnap, ...slotDocs] = await Promise.all([
        getDoc(doc(db, 'platform_settings', 'global')).catch(() => null),
        ...ALL_BRANDING_SLOTS.map((slotId) => getBrandingSlotDoc(slotId)),
      ]);

      const globalData = globalSnap && globalSnap.exists() ? (globalSnap.data() as PlatformSettings) : null;
      const slotMap = new Map<BrandingSlotId, BrandingSlotAsset>();
      ALL_BRANDING_SLOTS.forEach((slotId, index) => {
        const docData = slotDocs[index];
        if (docData) slotMap.set(slotId, docData);
      });

      const hasAnyDoc = Boolean(globalData || slotMap.size > 0);
      if (!hasAnyDoc) return null;

      const logoSlot = slotMap.get('logo');
      const faviconSlot = slotMap.get('favicon');
      const heroSlot = slotMap.get('hero');

      const industryEntries: Array<[IndustrySolutionId, BrandingSlotId]> = [
        ['retail', 'industry_retail'],
        ['bars', 'industry_bars'],
        ['supermarkets', 'industry_supermarkets'],
        ['pharmacies', 'industry_pharmacies'],
      ];

      const industryImages: Partial<Record<IndustrySolutionId, { url: string | null; name?: string }>> = {};
      for (const [indId, slotId] of industryEntries) {
        const slot = slotMap.get(slotId);
        if (slot !== undefined) {
          industryImages[indId] = {
            url: slot.assetUrl ?? null,
            name: slot.assetName || undefined,
          };
        } else if (globalData?.industryImages?.[indId]) {
          industryImages[indId] = globalData.industryImages[indId];
        }
      }

      const merged: PlatformSettings = {
        ...(globalData || {}),
        platformLogo: logoSlot !== undefined ? (logoSlot.assetUrl ?? null) : (globalData?.platformLogo ?? undefined),
        platformLogoName: logoSlot !== undefined ? (logoSlot.assetName || '') : (globalData?.platformLogoName ?? undefined),
        platformFavicon: faviconSlot !== undefined ? (faviconSlot.assetUrl ?? null) : (globalData?.platformFavicon ?? undefined),
        platformFaviconName: faviconSlot !== undefined ? (faviconSlot.assetName || '') : (globalData?.platformFaviconName ?? undefined),
        loginBgGraphic: heroSlot !== undefined ? (heroSlot.assetUrl ?? null) : (globalData?.loginBgGraphic ?? undefined),
        loginBgGraphicName: heroSlot !== undefined ? (heroSlot.assetName || '') : (globalData?.loginBgGraphicName ?? undefined),
        industryImages,
      };

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            PLATFORM_SETTINGS_CACHE_KEY,
            JSON.stringify({ data: merged, fetchedAt: Date.now() })
          );
        } catch {
          // ignore quota error
        }
      }
      return merged;
    } catch (error) {
      if (isFirestoreQuotaError(error)) {
        markFirestoreQuotaExceeded();
        return null;
      }
      console.warn('Failed to load platform settings from Firestore:', error);
      return null;
    } finally {
      inFlightPlatformSettingsPromise = null;
    }
  })();

  if (!forceRefresh) {
    inFlightPlatformSettingsPromise = fetchPromise;
  }
  return fetchPromise;
}

export async function saveBrandingSlotToFirestore(
  slotAsset: BrandingSlotAsset
): Promise<{ ok: boolean; error?: string }> {
  if (!db) {
    return { ok: false, error: 'Database client is not initialized.' };
  }
  if (!auth.currentUser) {
    return { ok: false, error: 'Sign in with a verified Platform Support Google account to sync branding to cloud.' };
  }

  const docId = BRANDING_SLOT_DOC_MAP[slotAsset.slotId];
  const nowIso = slotAsset.updatedAt || new Date().toISOString();

  try {
    await setDoc(
      doc(db, 'platform_settings', docId),
      sanitizeForFirestore({
        slotId: slotAsset.slotId,
        assetUrl: slotAsset.assetUrl ?? null,
        assetName: slotAsset.assetName || '',
        width: slotAsset.width,
        height: slotAsset.height,
        format: slotAsset.format,
        updatedAt: nowIso,
        updatedBy: slotAsset.updatedBy || auth.currentUser.email || 'super_admin',
      }),
      { merge: true }
    );

    // Keep global doc slim by clearing legacy base64 blobs once per-slot doc is authoritative
    if (slotAsset.slotId === 'logo' || slotAsset.slotId === 'favicon' || slotAsset.slotId === 'hero') {
      const legacyClear: Partial<PlatformSettings> = {
        updatedAt: nowIso,
        updatedBy: slotAsset.updatedBy || auth.currentUser.email || 'super_admin',
      };
      if (slotAsset.slotId === 'logo') {
        legacyClear.platformLogo = null;
        legacyClear.platformLogoName = '';
      } else if (slotAsset.slotId === 'favicon') {
        legacyClear.platformFavicon = null;
        legacyClear.platformFaviconName = '';
      } else if (slotAsset.slotId === 'hero') {
        legacyClear.loginBgGraphic = null;
        legacyClear.loginBgGraphicName = '';
      }
      await setDoc(doc(db, 'platform_settings', 'global'), sanitizeForFirestore(legacyClear), { merge: true }).catch(() => undefined);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(PLATFORM_SETTINGS_CACHE_KEY);
      } catch {
        // ignore storage errors
      }
    }
    return { ok: true };
  } catch (error: any) {
    logFirestoreErrorInfo(error, OperationType.WRITE, `platform_settings/${docId}`);
    const message = error?.message || 'Failed to persist branding slot asset to Firestore.';
    return { ok: false, error: message };
  }
}

export async function clearAllBrandingSlotsInFirestore(
  updatedBy?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!db) {
    return { ok: false, error: 'Database client is not initialized.' };
  }
  if (!auth.currentUser) {
    return { ok: false, error: 'Sign in with a verified Platform Support Google account to reset cloud branding.' };
  }

  const nowIso = new Date().toISOString();
  const actor = updatedBy || auth.currentUser.email || 'super_admin';

  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'platform_settings', 'global'),
      sanitizeForFirestore({
        loginBgGraphic: null,
        loginBgGraphicName: '',
        platformLogo: null,
        platformLogoName: '',
        platformFavicon: null,
        platformFaviconName: '',
        updatedAt: nowIso,
        updatedBy: actor,
      }),
      { merge: true }
    );

    for (const slotId of ALL_BRANDING_SLOTS) {
      batch.set(
        doc(db, 'platform_settings', BRANDING_SLOT_DOC_MAP[slotId]),
        sanitizeForFirestore({
          slotId,
          assetUrl: null,
          assetName: '',
          updatedAt: nowIso,
          updatedBy: actor,
        }),
        { merge: true }
      );
    }

    await batch.commit();

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(PLATFORM_SETTINGS_CACHE_KEY);
      } catch {
        // ignore storage errors
      }
    }
    return { ok: true };
  } catch (error: any) {
    logFirestoreErrorInfo(error, OperationType.WRITE, 'platform_settings');
    const message = error?.message || 'Failed to reset platform branding slots in Firestore.';
    return { ok: false, error: message };
  }
}

// -------------------------------------------------------------
// Global Pricing Tiers (platform_settings/pricing_tiers, 24h On-Demand Cache)
// -------------------------------------------------------------
const PRICING_TIERS_DOC_ID = 'pricing_tiers';
const PRICING_TIERS_CACHE_KEY = 'sokopos_pricing_tiers_cache_v1';
const PRICING_TIERS_TTL_MS = 24 * 60 * 60 * 1000;
let inFlightPricingTiersPromise: Promise<{
  tiers: PricingTier[];
  updatedAt?: string;
  updatedBy?: string;
} | null> | null = null;

function normalizePricingTiersArray(rawTiers: unknown): PricingTier[] | null {
  if (!Array.isArray(rawTiers) || rawTiers.length === 0) return null;

  const byId = new Map<string, any>();
  for (const item of rawTiers) {
    if (item && typeof item === 'object' && typeof item.id === 'string') {
      byId.set(item.id.toLowerCase(), item);
    }
  }
  if (byId.size === 0) return null;

  const merged: PricingTier[] = DEFAULT_PRICING_TIERS.map((defTier) => {
    const remote = byId.get(defTier.id.toLowerCase());
    if (!remote) return defTier;

    const monthlyPrice =
      typeof remote.monthlyPrice === 'number' && Number.isFinite(remote.monthlyPrice) && remote.monthlyPrice >= 0
        ? remote.monthlyPrice
        : defTier.monthlyPrice;
    const annualPrice =
      typeof remote.annualPrice === 'number' && Number.isFinite(remote.annualPrice) && remote.annualPrice >= 0
        ? remote.annualPrice
        : defTier.annualPrice;
    const consultationFee =
      typeof remote.consultationFee === 'number' &&
      Number.isFinite(remote.consultationFee) &&
      remote.consultationFee >= 0
        ? remote.consultationFee
        : defTier.consultationFee;

    return {
      ...defTier,
      ...remote,
      id: defTier.id,
      monthlyPrice,
      annualPrice,
      ...(consultationFee !== undefined ? { consultationFee } : {}),
      maxBranches:
        typeof remote.maxBranches === 'number' && Number.isFinite(remote.maxBranches)
          ? remote.maxBranches
          : defTier.maxBranches,
      maxStaffUsers:
        typeof remote.maxStaffUsers === 'number' && Number.isFinite(remote.maxStaffUsers)
          ? remote.maxStaffUsers
          : defTier.maxStaffUsers,
      features: Array.isArray(remote.features)
        ? remote.features.filter((f: unknown) => typeof f === 'string' && f.trim().length > 0)
        : defTier.features,
      isPopular: typeof remote.isPopular === 'boolean' ? remote.isPopular : defTier.isPopular,
      isActive: typeof remote.isActive === 'boolean' ? remote.isActive : defTier.isActive,
    };
  });

  return merged;
}

export async function getPricingTiersFromFirestore(forceRefresh = false): Promise<{
  tiers: PricingTier[];
  updatedAt?: string;
  updatedBy?: string;
} | null> {
  if (typeof window !== 'undefined' && !forceRefresh) {
    try {
      const raw = localStorage.getItem(PRICING_TIERS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          payload: { tiers: PricingTier[]; updatedAt?: string; updatedBy?: string };
          fetchedAt: number;
        };
        if (
          parsed?.payload?.tiers &&
          typeof parsed.fetchedAt === 'number' &&
          Date.now() - parsed.fetchedAt < PRICING_TIERS_TTL_MS
        ) {
          return parsed.payload;
        }
      }
    } catch {
      // ignore storage cache parse error
    }
  }

  if (!db || isFirestoreQuotaCooldownActive()) return null;
  if (!forceRefresh && inFlightPricingTiersPromise) {
    return inFlightPricingTiersPromise;
  }

  const fetchPromise = (async () => {
    try {
      const snap = await getDoc(doc(db, 'platform_settings', PRICING_TIERS_DOC_ID));
      if (!snap.exists()) return null;
      const data = snap.data() as Partial<PlatformPricingConfig>;
      const normalized = normalizePricingTiersArray(data?.tiers);
      if (!normalized) return null;
      const payload = {
        tiers: normalized,
        updatedAt: data?.updatedAt,
        updatedBy: data?.updatedBy,
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            PRICING_TIERS_CACHE_KEY,
            JSON.stringify({ payload, fetchedAt: Date.now() })
          );
        } catch {
          // ignore storage quota errors
        }
      }
      return payload;
    } catch (error) {
      if (isFirestoreQuotaError(error)) {
        markFirestoreQuotaExceeded();
        return null;
      }
      console.warn('Failed to fetch global pricing tiers from Firestore:', error);
      return null;
    } finally {
      inFlightPricingTiersPromise = null;
    }
  })();

  if (!forceRefresh) {
    inFlightPricingTiersPromise = fetchPromise;
  }
  return fetchPromise;
}

export async function savePricingTiersToFirestore(
  tiers: PricingTier[],
  updatedBy?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!db) {
    return { ok: false, error: 'Database client is not initialized.' };
  }
  if (!auth.currentUser) {
    return { ok: false, error: 'Sign in with a verified Platform Support Google account to sync pricing globally.' };
  }

  const nowIso = new Date().toISOString();
  const actor = updatedBy || auth.currentUser.email || 'super_admin';
  try {
    await setDoc(
      doc(db, 'platform_settings', PRICING_TIERS_DOC_ID),
      sanitizeForFirestore({
        id: PRICING_TIERS_DOC_ID,
        tiers,
        updatedAt: nowIso,
        updatedBy: actor,
      }),
      { merge: true }
    );
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          PRICING_TIERS_CACHE_KEY,
          JSON.stringify({
            payload: { tiers, updatedAt: nowIso, updatedBy: actor },
            fetchedAt: Date.now(),
          })
        );
      } catch {
        // ignore storage errors
      }
    }
    return { ok: true };
  } catch (error: any) {
    logFirestoreErrorInfo(error, OperationType.WRITE, `platform_settings/${PRICING_TIERS_DOC_ID}`);
    const message = error?.message || 'Failed to persist global pricing tiers to Firestore.';
    return { ok: false, error: message };
  }
}

// -------------------------------------------------------------
// Customers & Store Credit Directory (Tenant Scoped)
// -------------------------------------------------------------
export async function getTenantCustomersFromFirestore(businessId: string): Promise<Customer[]> {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  try {
    const q = query(collection(db, 'customers'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    const customers: Customer[] = [];
    snap.forEach((d) => customers.push(d.data() as Customer));
    return customers;
  } catch (error) {
    if (!auth.currentUser || isFirestoreQuotaError(error)) {
      if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, 'customers');
  }
}

// -------------------------------------------------------------
// Suppliers Management (Tenant Scoped)
// -------------------------------------------------------------
export async function getTenantSuppliersFromFirestore(businessId: string): Promise<Supplier[]> {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) return [];
  try {
    const q = query(collection(db, 'suppliers'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    const suppliers: Supplier[] = [];
    snap.forEach((d) => suppliers.push(d.data() as Supplier));
    return suppliers;
  } catch (error) {
    if (!auth.currentUser || isFirestoreQuotaError(error)) {
      if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, 'suppliers');
  }
}

export interface PaymentRecordSnapshot {
  reference: string;
  provider: 'paystack' | 'daraja';
  flowType: 'subscription' | 'pos_sale';
  channel: 'mpesa_stk' | 'card';
  amountKes: number;
  status: 'pending' | 'pay_offline' | 'success' | 'failed' | 'abandoned';
  businessId: string;
  planId?: string;
  billingCycle?: 'monthly' | 'annual';
  mpesaReceiptNumber?: string;
  phone?: string;
  resolvedBy?: string;
  gatewayResponse?: string;
  paidAt?: string;
  updatedAt?: string;
}

export function subscribeToBusinessDocument(
  businessId: string,
  onUpdate: (business: Business) => void
): Unsubscribe {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return () => {};
  }
  const path = `businesses/${businessId}`;
  return onSnapshot(
    doc(db, 'businesses', businessId),
    (snap) => {
      if (!snap.exists()) return;
      onUpdate({ ...(snap.data() as Business), id: snap.id });
    },
    (error) => {
      if (!auth.currentUser || isFirestoreQuotaError(error)) {
        if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
        return;
      }
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        console.warn(`Firestore business subscription notice on "${path}":`, err);
      }
    }
  );
}

export function subscribeToPaymentRecord(
  reference: string,
  onUpdate: (record: PaymentRecordSnapshot) => void
): Unsubscribe {
  if (!db || !reference || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return () => {};
  }
  const path = `payment_records/${reference}`;
  return onSnapshot(
    doc(db, 'payment_records', reference),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Record<string, any>;
      onUpdate({
        reference: String(data.reference || snap.id),
        provider: data.provider === 'daraja' ? 'daraja' : 'paystack',
        flowType: data.flowType === 'pos_sale' ? 'pos_sale' : 'subscription',
        channel: data.channel === 'card' ? 'card' : 'mpesa_stk',
        amountKes: Number(data.amountKes || 0),
        status: (data.status as PaymentRecordSnapshot['status']) || 'pending',
        businessId: String(data.businessId || ''),
        planId: data.planId ? String(data.planId) : undefined,
        billingCycle: data.billingCycle === 'annual' ? 'annual' : 'monthly',
        mpesaReceiptNumber: data.mpesaReceiptNumber ? String(data.mpesaReceiptNumber) : undefined,
        phone: data.phone ? String(data.phone) : undefined,
        resolvedBy: data.resolvedBy ? String(data.resolvedBy) : undefined,
        gatewayResponse: data.gatewayResponse ? String(data.gatewayResponse) : undefined,
        paidAt: data.paidAt ? String(data.paidAt) : undefined,
        updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
      });
    },
    (error) => {
      if (!auth.currentUser || isFirestoreQuotaError(error)) {
        if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
        return;
      }
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        console.warn(`Firestore payment record subscription notice on "${path}":`, err);
      }
    }
  );
}

// -------------------------------------------------------------
// Business Intelligence Suite (Daily Rollups, Targets, Saved Views)
// -------------------------------------------------------------
function pickRollupDoc(r: AnalyticsDailyRollup): AnalyticsDailyRollup {
  return {
    id: r.id,
    businessId: r.businessId,
    locationId: r.locationId,
    locationName: (r.locationName || 'Main Branch').slice(0, 160),
    dateKey: r.dateKey,
    grossSales: Number(r.grossSales || 0),
    refundsTotal: Number(r.refundsTotal || 0),
    discountsTotal: Number(r.discountsTotal || 0),
    netSales: Number(r.netSales || 0),
    taxTotal: Number(r.taxTotal || 0),
    cogsTotal: Number(r.cogsTotal || 0),
    grossProfit: Number(r.grossProfit || 0),
    operatingExpenses: Number(r.operatingExpenses || 0),
    transactionCount: Number(r.transactionCount || 0),
    unitsSold: Number(r.unitsSold || 0),
    mpesaTotal: Number(r.mpesaTotal || 0),
    cashTotal: Number(r.cashTotal || 0),
    cardTotal: Number(r.cardTotal || 0),
    storeCreditTotal: Number(r.storeCreditTotal || 0),
    uncostedRevenue: Number(r.uncostedRevenue || 0),
    updatedAt: r.updatedAt || new Date().toISOString(),
  };
}

export async function getTenantAnalyticsRollupsFromFirestore(
  businessId: string
): Promise<AnalyticsDailyRollup[]> {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return [];
  }
  const path = 'analytics_daily_rollups';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId), limit(400));
    const snap = await getDocs(q);
    const items: AnalyticsDailyRollup[] = [];
    snap.forEach((d) => items.push(d.data() as AnalyticsDailyRollup));
    items.sort((a, b) => (b.dateKey || '').localeCompare(a.dateKey || ''));
    return items;
  } catch (error) {
    if (!auth.currentUser || isFirestoreQuotaError(error)) {
      if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function upsertAnalyticsDailyRollupsBatch(
  rollups: AnalyticsDailyRollup[]
): Promise<number> {
  if (!db || !auth.currentUser || !rollups || rollups.length === 0 || isFirestoreQuotaCooldownActive()) {
    return 0;
  }
  const eligible = rollups.filter(
    (r) =>
      r.id &&
      r.businessId &&
      !isDemoBusinessId(r.businessId) &&
      !isDemoRecordId(r.id) &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(r.dateKey)
  );
  if (eligible.length === 0) return 0;

  let committed = 0;
  const CHUNK = 400;
  for (let i = 0; i < eligible.length; i += CHUNK) {
    const chunk = eligible.slice(i, i + CHUNK);
    const batch = writeBatch(db);
    for (const r of chunk) {
      batch.set(
        doc(db, 'analytics_daily_rollups', r.id),
        sanitizeForFirestore(pickRollupDoc(r)),
        { merge: true }
      );
    }
    try {
      await batch.commit();
      committed += chunk.length;
    } catch (error) {
      if (isFirestoreQuotaError(error)) {
        markFirestoreQuotaExceeded();
        return committed;
      }
      handleFirestoreError(error, OperationType.WRITE, 'analytics_daily_rollups');
    }
  }
  return committed;
}

export async function getTenantAnalyticsTargetsFromFirestore(
  businessId: string
): Promise<AnalyticsTarget[]> {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return [];
  }
  const path = 'analytics_targets';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId), limit(100));
    const snap = await getDocs(q);
    const items: AnalyticsTarget[] = [];
    snap.forEach((d) => items.push(d.data() as AnalyticsTarget));
    return items;
  } catch (error) {
    if (!auth.currentUser || isFirestoreQuotaError(error)) {
      if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getTenantAnalyticsSavedViewsFromFirestore(
  businessId: string
): Promise<AnalyticsSavedView[]> {
  if (!db || !businessId || isDemoBusinessId(businessId) || !auth.currentUser || isFirestoreQuotaCooldownActive()) {
    return [];
  }
  const path = 'analytics_saved_views';
  try {
    const q = query(collection(db, path), where('businessId', '==', businessId), limit(100));
    const snap = await getDocs(q);
    const items: AnalyticsSavedView[] = [];
    snap.forEach((d) => items.push(d.data() as AnalyticsSavedView));
    items.sort(
      (a, b) =>
        Number(b.isPinned) - Number(a.isPinned) ||
        (b.updatedAt || '').localeCompare(a.updatedAt || '')
    );
    return items;
  } catch (error) {
    if (!auth.currentUser || isFirestoreQuotaError(error)) {
      if (isFirestoreQuotaError(error)) markFirestoreQuotaExceeded();
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export type OutboxDispatchResult =
  | { status: 'acked' }
  | { status: 'skipped_offline_or_quota'; reason: string }
  | { status: 'failed'; retryable: boolean; error: string; errorCode: string };

/**
 * Dispatches a single transactional Sync Outbox mutation to Firestore with
 * strict sanitization, demo-tenant exclusion, cashier PIN masking, and quota guards.
 */
export async function flushOutboxMutationToFirestore(entry: {
  businessId: string;
  collectionName: string;
  docId: string;
  operation: 'upsert' | 'delete';
  payload: Record<string, any>;
}): Promise<OutboxDispatchResult> {
  if (!db || !auth.currentUser) {
    return { status: 'skipped_offline_or_quota', reason: 'Unauthenticated or offline' };
  }
  if (isDemoBusinessId(entry.businessId) || isDemoRecordId(entry.docId)) {
    return { status: 'acked' };
  }
  if (isFirestoreQuotaCooldownActive()) {
    return {
      status: 'skipped_offline_or_quota',
      reason: 'Firestore quota cooldown active',
    };
  }

  const path = `${entry.collectionName}/${entry.docId}`;
  try {
    if (entry.operation === 'delete') {
      if (entry.collectionName === 'products') {
        try {
          await updateDoc(doc(db, 'products', entry.docId), {
            isDeleted: true,
            updatedAt: new Date().toISOString(),
          });
        } catch (delErr: any) {
          if (delErr?.code !== 'not-found') throw delErr;
        }
        return { status: 'acked' };
      }
      await deleteDoc(doc(db, entry.collectionName, entry.docId));
      return { status: 'acked' };
    }

    const rawPayload = { ...entry.payload };
    if (entry.collectionName === 'transactions') {
      rawPayload.syncedToCloud = true;
      rawPayload.syncTimestamp = rawPayload.syncTimestamp || new Date().toISOString();
    } else if (
      entry.collectionName === 'products' ||
      entry.collectionName === 'locations' ||
      entry.collectionName === 'cashiers'
    ) {
      rawPayload.isPendingCloudSync = false;
      if (entry.collectionName === 'products') {
        rawPayload.updatedAt = rawPayload.updatedAt || new Date().toISOString();
        rawPayload.isDeleted = Boolean(rawPayload.isDeleted);
      }
    }

    if (entry.collectionName === 'cashiers') {
      rawPayload.pin = '••••••••';
    }

    const cleanPayload = sanitizeForFirestore(rawPayload);
    await setDoc(doc(db, entry.collectionName, entry.docId), cleanPayload, { merge: true });
    return { status: 'acked' };
  } catch (error: any) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return {
        status: 'skipped_offline_or_quota',
        reason: 'Firestore daily quota exhausted; cooled down for 5 minutes',
      };
    }

    const code = String(error?.code || 'unknown');
    const message = error instanceof Error ? error.message : String(error);
    const nonRetryable =
      code === 'permission-denied' ||
      code === 'invalid-argument' ||
      message.includes('Missing or insufficient permissions');

    try {
      handleFirestoreError(
        error,
        entry.operation === 'delete' ? OperationType.DELETE : OperationType.WRITE,
        path
      );
    } catch (wrappedErr: any) {
      return {
        status: 'failed',
        retryable: !nonRetryable,
        error: wrappedErr?.message || message,
        errorCode: code,
      };
    }

    return {
      status: 'failed',
      retryable: !nonRetryable,
      error: message,
      errorCode: code,
    };
  }
}
