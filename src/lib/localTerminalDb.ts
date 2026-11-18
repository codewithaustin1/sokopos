import { IndustrySolutionId } from '../types';
import {
  CollectionStoreKey,
  HydratedTerminalDataset,
  LargeBrandingAssetMap,
  LegacyMigrationReceipt,
  NormalizedStoreName,
  OpfsSnapshotManifest,
  OutboxCollectionName,
  OutboxMutationEntry,
  OutboxOperation,
} from '../types/storage';

const DB_NAME = 'SokoPoS_Terminal_DB';
const DB_VERSION = 1;

const NORMALIZED_STORES: NormalizedStoreName[] = [
  'products',
  'categories',
  'locations',
  'system_users',
  'customers',
  'suppliers',
  'transactions',
  'shifts',
];

const AUXILIARY_STORES = [
  'collections',
  'kv_large',
  'sync_outbox',
  'terminal_meta',
] as const;

const LEGACY_KEYS = {
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
  SALES_BACKUPS: 'sokopos_sales_backups_v2',
  CUSTOMERS: 'sokopos_customers_v1',
  SUPPLIERS: 'sokopos_suppliers_v1',
  PRICING_TIERS: 'sokopos_pricing_tiers_v3',
  BI_ROLLUPS: 'sokopos_bi_rollups_v1',
  BI_TARGETS: 'sokopos_bi_targets_v1',
  BI_SAVED_VIEWS: 'sokopos_bi_saved_views_v1',
  LOGIN_BG_GRAPHIC: 'sokopos_login_bg_graphic_v1',
  LOGIN_BG_NAME: 'sokopos_login_bg_name_v1',
  PLATFORM_LOGO: 'sokopos_platform_logo_v1',
  PLATFORM_LOGO_NAME: 'sokopos_platform_logo_name_v1',
  PLATFORM_FAVICON: 'sokopos_platform_favicon_v1',
  PLATFORM_FAVICON_NAME: 'sokopos_platform_favicon_name_v1',
} as const;

const INDUSTRY_IDS: IndustrySolutionId[] = ['retail', 'bars', 'supermarkets', 'pharmacies'];

let dbPromise: Promise<IDBDatabase> | null = null;
const memoryFallbackStore = new Map<string, any>();

export function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function reqToPromise<T = any>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
  });
}

function txDonePromise(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

export async function openTerminalDb(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    throw new Error('IndexedDB is not available in this runtime');
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      for (const storeName of NORMALIZED_STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('by_business', 'businessId', { unique: false });
          if (storeName === 'transactions') {
            store.createIndex('by_timestamp', 'timestamp', { unique: false });
          }
          if (storeName === 'shifts') {
            store.createIndex('by_opened_at', 'openedAt', { unique: false });
          }
        }
      }

      if (!db.objectStoreNames.contains('collections')) {
        db.createObjectStore('collections', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('kv_large')) {
        db.createObjectStore('kv_large', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('sync_outbox')) {
        const outboxStore = db.createObjectStore('sync_outbox', { keyPath: 'id' });
        outboxStore.createIndex('by_business', 'businessId', { unique: false });
        outboxStore.createIndex('by_status', 'status', { unique: false });
        outboxStore.createIndex('by_next_retry', 'nextRetryAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('terminal_meta')) {
        db.createObjectStore('terminal_meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB database'));
    };
  });

  return dbPromise;
}

export function createOutboxMutationId(
  collectionName: OutboxCollectionName,
  docId: string
): string {
  return `${collectionName}:${docId}`;
}

export function buildOutboxEntry(params: {
  businessId: string;
  collectionName: OutboxCollectionName;
  docId: string;
  operation: OutboxOperation;
  payload: Record<string, any>;
  label?: string;
  maxAttempts?: number;
}): OutboxMutationEntry {
  const nowIso = new Date().toISOString();
  return {
    id: createOutboxMutationId(params.collectionName, params.docId),
    businessId: params.businessId,
    collectionName: params.collectionName,
    docId: params.docId,
    operation: params.operation,
    payload: params.payload,
    status: 'pending',
    attempts: 0,
    maxAttempts: params.maxAttempts ?? 5,
    createdAt: nowIso,
    updatedAt: nowIso,
    nextRetryAt: Date.now(),
    label: params.label,
  };
}

/**
 * Syncs a React array into a normalized IndexedDB object store in one transaction.
 * Computes delta puts & deletes so high-volume arrays do not wipe unrelated data unnecessarily.
 */
export async function syncNormalizedStoreRecords<T extends { id: string }>(
  storeName: NormalizedStoreName,
  records: T[]
): Promise<void> {
  if (!isIndexedDbAvailable()) {
    memoryFallbackStore.set(`norm:${storeName}`, records);
    return;
  }
  const db = await openTerminalDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);

  const existingKeys = (await reqToPromise(store.getAllKeys())) as string[];
  const nextIds = new Set<string>();

  for (const item of records) {
    if (!item || !item.id) continue;
    nextIds.add(item.id);
    store.put(item);
  }

  for (const key of existingKeys) {
    if (!nextIds.has(key)) {
      store.delete(key);
    }
  }

  await txDonePromise(tx);
}

/**
 * Persists a structured array store (`businesses`, `pricing_tiers`, `bi_rollups`, etc.) in `collections`.
 */
export async function saveCollectionRecords<T>(
  key: CollectionStoreKey,
  data: T[]
): Promise<void> {
  if (!isIndexedDbAvailable()) {
    memoryFallbackStore.set(`col:${key}`, data);
    return;
  }
  const db = await openTerminalDb();
  const tx = db.transaction('collections', 'readwrite');
  tx.objectStore('collections').put({
    key,
    data,
    updatedAt: new Date().toISOString(),
  });
  await txDonePromise(tx);
}

/**
 * Persists a large asset (Base64 branding image / icon) in `kv_large`.
 */
export async function saveLargeKvAsset(
  key: string,
  value: string | null,
  name?: string | null
): Promise<void> {
  if (!isIndexedDbAvailable()) {
    if (value === null) {
      memoryFallbackStore.delete(`kv:${key}`);
    } else {
      memoryFallbackStore.set(`kv:${key}`, { key, value, name: name || null });
    }
    return;
  }
  const db = await openTerminalDb();
  const tx = db.transaction('kv_large', 'readwrite');
  const store = tx.objectStore('kv_large');
  if (value === null || value === '') {
    store.delete(key);
  } else {
    store.put({
      key,
      value,
      name: name || null,
      updatedAt: new Date().toISOString(),
    });
  }
  await txDonePromise(tx);
}

export async function clearAllLargeBrandingKv(): Promise<void> {
  if (!isIndexedDbAvailable()) {
    for (const k of Array.from(memoryFallbackStore.keys())) {
      if (k.startsWith('kv:')) memoryFallbackStore.delete(k);
    }
    return;
  }
  const db = await openTerminalDb();
  const tx = db.transaction('kv_large', 'readwrite');
  tx.objectStore('kv_large').clear();
  await txDonePromise(tx);
}

/**
 * Atomic dual-write: commits an entity record to its normalized object store AND inserts/coalesces
 * the corresponding mutation job in `sync_outbox` inside a single IndexedDB transaction.
 */
export async function putEntityAndEnqueueOutbox<T extends { id: string }>(
  storeName: NormalizedStoreName,
  record: T,
  outboxEntry: OutboxMutationEntry
): Promise<void> {
  if (!isIndexedDbAvailable()) {
    const existing = (memoryFallbackStore.get(`norm:${storeName}`) as T[]) || [];
    const filtered = existing.filter((r) => r.id !== record.id);
    memoryFallbackStore.set(`norm:${storeName}`, [record, ...filtered]);
    const outbox = (memoryFallbackStore.get('sync_outbox') as OutboxMutationEntry[]) || [];
    memoryFallbackStore.set('sync_outbox', [
      outboxEntry,
      ...outbox.filter((o) => o.id !== outboxEntry.id),
    ]);
    return;
  }
  const db = await openTerminalDb();
  const tx = db.transaction([storeName, 'sync_outbox'], 'readwrite');
  tx.objectStore(storeName).put(record);
  tx.objectStore('sync_outbox').put(outboxEntry);
  await txDonePromise(tx);
}

export async function enqueueOutboxMutations(entries: OutboxMutationEntry[]): Promise<void> {
  if (entries.length === 0) return;
  if (!isIndexedDbAvailable()) {
    const existing = (memoryFallbackStore.get('sync_outbox') as OutboxMutationEntry[]) || [];
    const map = new Map<string, OutboxMutationEntry>(existing.map((e) => [e.id, e]));
    entries.forEach((e) => map.set(e.id, e));
    memoryFallbackStore.set('sync_outbox', Array.from(map.values()));
    return;
  }
  const db = await openTerminalDb();
  const tx = db.transaction('sync_outbox', 'readwrite');
  const store = tx.objectStore('sync_outbox');
  for (const entry of entries) {
    store.put(entry);
  }
  await txDonePromise(tx);
}

export async function updateOutboxEntries(entries: OutboxMutationEntry[]): Promise<void> {
  if (entries.length === 0) return;
  await enqueueOutboxMutations(entries);
}

export async function removeOutboxEntries(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isIndexedDbAvailable()) {
    const existing = (memoryFallbackStore.get('sync_outbox') as OutboxMutationEntry[]) || [];
    const drop = new Set(ids);
    memoryFallbackStore.set(
      'sync_outbox',
      existing.filter((e) => !drop.has(e.id))
    );
    return;
  }
  const db = await openTerminalDb();
  const tx = db.transaction('sync_outbox', 'readwrite');
  const store = tx.objectStore('sync_outbox');
  for (const id of ids) {
    store.delete(id);
  }
  await txDonePromise(tx);
}

export async function getAllOutboxEntries(): Promise<OutboxMutationEntry[]> {
  if (!isIndexedDbAvailable()) {
    return (memoryFallbackStore.get('sync_outbox') as OutboxMutationEntry[]) || [];
  }
  const db = await openTerminalDb();
  const tx = db.transaction('sync_outbox', 'readonly');
  const rows = (await reqToPromise(tx.objectStore('sync_outbox').getAll())) as OutboxMutationEntry[];
  return rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function saveOpfsManifestList(manifests: OpfsSnapshotManifest[]): Promise<void> {
  if (!isIndexedDbAvailable()) {
    memoryFallbackStore.set('meta:opfs_manifests', manifests);
    return;
  }
  const db = await openTerminalDb();
  const tx = db.transaction('terminal_meta', 'readwrite');
  tx.objectStore('terminal_meta').put({
    key: 'opfs_manifests',
    value: manifests.slice(0, 12),
    updatedAt: new Date().toISOString(),
  });
  await txDonePromise(tx);
}

export async function getOpfsManifestList(): Promise<OpfsSnapshotManifest[]> {
  if (!isIndexedDbAvailable()) {
    return (memoryFallbackStore.get('meta:opfs_manifests') as OpfsSnapshotManifest[]) || [];
  }
  const db = await openTerminalDb();
  const tx = db.transaction('terminal_meta', 'readonly');
  const rec = await reqToPromise(tx.objectStore('terminal_meta').get('opfs_manifests'));
  return Array.isArray(rec?.value) ? rec.value : [];
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Silent, idempotent startup migration from legacy localStorage keys to IndexedDB.
 * Reads legacy payloads, populates IndexedDB stores + initial Outbox entries atomically,
 * verifies commit, and removes heavy legacy keys while retaining tiny UI/session flags.
 */
async function performSilentLegacyMigration(db: IDBDatabase): Promise<LegacyMigrationReceipt | null> {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  const checkTx = db.transaction('terminal_meta', 'readonly');
  const existingReceipt = await reqToPromise(checkTx.objectStore('terminal_meta').get('legacy_migration_v1'));
  if (existingReceipt?.value) {
    return existingReceipt.value as LegacyMigrationReceipt;
  }

  const ls = window.localStorage;
  const migratedKeys: string[] = [];
  const recordSummary: Record<string, number> = {};
  const generatedOutbox: OutboxMutationEntry[] = [];

  const readLegacyArray = <T>(key: string): T[] | null => {
    const raw = ls.getItem(key);
    if (!raw) return null;
    const parsed = safeParseJson<T[]>(raw);
    if (Array.isArray(parsed)) {
      migratedKeys.push(key);
      recordSummary[key] = parsed.length;
      return parsed;
    }
    return null;
  };

  const legacyProducts = readLegacyArray<any>(LEGACY_KEYS.PRODUCTS);
  const legacyCategories = readLegacyArray<any>(LEGACY_KEYS.CATEGORIES);
  const legacyLocations = readLegacyArray<any>(LEGACY_KEYS.LOCATIONS);
  const legacyUsers = readLegacyArray<any>(LEGACY_KEYS.SYSTEM_USERS);
  const legacyCustomers = readLegacyArray<any>(LEGACY_KEYS.CUSTOMERS);
  const legacySuppliers = readLegacyArray<any>(LEGACY_KEYS.SUPPLIERS);
  const legacyTransactions = readLegacyArray<any>(LEGACY_KEYS.TRANSACTIONS);
  const legacyShifts = readLegacyArray<any>(LEGACY_KEYS.SHIFTS);

  const legacyBusinesses = readLegacyArray<any>(LEGACY_KEYS.BUSINESSES);
  const legacySyncLogs = readLegacyArray<any>(LEGACY_KEYS.SYNC_LOGS);
  const legacySalesBackups = readLegacyArray<any>(LEGACY_KEYS.SALES_BACKUPS);
  const legacySuperAdminAudit = readLegacyArray<any>(LEGACY_KEYS.SUPER_ADMIN_AUDIT);
  const legacyAdminActivity = readLegacyArray<any>(LEGACY_KEYS.ADMIN_ACTIVITY_LOGS);
  const legacyOverrides = readLegacyArray<any>(LEGACY_KEYS.SUPERVISOR_OVERRIDES);
  const legacyVoids = readLegacyArray<any>(LEGACY_KEYS.VOID_RECORDS);
  const legacyPricing = readLegacyArray<any>(LEGACY_KEYS.PRICING_TIERS);
  const legacyBiRollups = readLegacyArray<any>(LEGACY_KEYS.BI_ROLLUPS);
  const legacyBiTargets = readLegacyArray<any>(LEGACY_KEYS.BI_TARGETS);
  const legacyBiViews = readLegacyArray<any>(LEGACY_KEYS.BI_SAVED_VIEWS);

  // Build outbox jobs from any legacy unsynced items so zero offline queue entries are lost
  legacyTransactions?.forEach((tx: any) => {
    if (tx?.id && tx?.businessId && tx.businessId !== 'biz-demo' && tx.syncedToCloud === false) {
      generatedOutbox.push(
        buildOutboxEntry({
          businessId: tx.businessId,
          collectionName: 'transactions',
          docId: tx.id,
          operation: 'upsert',
          payload: tx,
          label: `Sale ${tx.receiptNumber || tx.id}`,
        })
      );
    }
  });

  legacyProducts?.forEach((p: any) => {
    if (p?.id && p?.businessId && p.businessId !== 'biz-demo' && p.isPendingCloudSync) {
      generatedOutbox.push(
        buildOutboxEntry({
          businessId: p.businessId,
          collectionName: 'products',
          docId: p.id,
          operation: 'upsert',
          payload: p,
          label: `Product ${p.name || p.id}`,
        })
      );
    }
  });

  legacyLocations?.forEach((l: any) => {
    if (l?.id && l?.businessId && l.businessId !== 'biz-demo' && l.isPendingCloudSync) {
      generatedOutbox.push(
        buildOutboxEntry({
          businessId: l.businessId,
          collectionName: 'locations',
          docId: l.id,
          operation: 'upsert',
          payload: l,
          label: `Branch ${l.name || l.id}`,
        })
      );
    }
  });

  legacyUsers?.forEach((u: any) => {
    if (u?.id && u?.businessId && u.businessId !== 'biz-demo' && u.isPendingCloudSync) {
      generatedOutbox.push(
        buildOutboxEntry({
          businessId: u.businessId,
          collectionName: 'cashiers',
          docId: u.id,
          operation: 'upsert',
          payload: u,
          label: `Staff ${u.name || u.id}`,
        })
      );
    }
  });

  // Branding assets
  const loginBg = ls.getItem(LEGACY_KEYS.LOGIN_BG_GRAPHIC);
  const loginBgName = ls.getItem(LEGACY_KEYS.LOGIN_BG_NAME);
  const platformLogo = ls.getItem(LEGACY_KEYS.PLATFORM_LOGO);
  const platformLogoName = ls.getItem(LEGACY_KEYS.PLATFORM_LOGO_NAME);
  const platformFavicon = ls.getItem(LEGACY_KEYS.PLATFORM_FAVICON);
  const platformFaviconName = ls.getItem(LEGACY_KEYS.PLATFORM_FAVICON_NAME);

  const storeNames: string[] = [...NORMALIZED_STORES, ...AUXILIARY_STORES];
  const tx = db.transaction(storeNames, 'readwrite');

  const putNormalized = (store: NormalizedStoreName, items: any[] | null) => {
    if (!items) return;
    const os = tx.objectStore(store);
    for (const item of items) {
      if (item && item.id) os.put(item);
    }
  };

  putNormalized('products', legacyProducts);
  putNormalized('categories', legacyCategories);
  putNormalized('locations', legacyLocations);
  putNormalized('system_users', legacyUsers?.map(({ pinHint, ...rest }: any) => rest) || null);
  putNormalized('customers', legacyCustomers);
  putNormalized('suppliers', legacySuppliers);
  putNormalized('transactions', legacyTransactions);
  putNormalized('shifts', legacyShifts);

  const colStore = tx.objectStore('collections');
  const putCollection = (key: CollectionStoreKey, items: any[] | null) => {
    if (!items) return;
    colStore.put({ key, data: items, updatedAt: new Date().toISOString() });
  };

  putCollection('businesses', legacyBusinesses);
  putCollection('sync_logs', legacySyncLogs);
  putCollection('sales_backups', legacySalesBackups);
  putCollection('super_admin_audit', legacySuperAdminAudit);
  putCollection('admin_activity_logs', legacyAdminActivity);
  putCollection('supervisor_overrides', legacyOverrides);
  putCollection('void_records', legacyVoids);
  putCollection('pricing_tiers', legacyPricing);
  putCollection('bi_rollups', legacyBiRollups);
  putCollection('bi_targets', legacyBiTargets);
  putCollection('bi_saved_views', legacyBiViews);

  const kvStore = tx.objectStore('kv_large');
  if (loginBg) {
    migratedKeys.push(LEGACY_KEYS.LOGIN_BG_GRAPHIC);
    kvStore.put({ key: 'login_bg_graphic', value: loginBg, name: loginBgName || null });
  }
  if (platformLogo) {
    migratedKeys.push(LEGACY_KEYS.PLATFORM_LOGO);
    kvStore.put({ key: 'platform_logo', value: platformLogo, name: platformLogoName || null });
  }
  if (platformFavicon) {
    migratedKeys.push(LEGACY_KEYS.PLATFORM_FAVICON);
    kvStore.put({ key: 'platform_favicon', value: platformFavicon, name: platformFaviconName || null });
  }
  for (const id of INDUSTRY_IDS) {
    const imgKey = `sokopos_industry_img_${id}_v1`;
    const nameKey = `sokopos_industry_img_name_${id}_v1`;
    const url = ls.getItem(imgKey);
    const name = ls.getItem(nameKey);
    if (url) {
      migratedKeys.push(imgKey);
      kvStore.put({ key: `industry_img_${id}`, value: url, name: name || null });
    }
  }

  const outboxStore = tx.objectStore('sync_outbox');
  for (const job of generatedOutbox) {
    outboxStore.put(job);
  }

  const receipt: LegacyMigrationReceipt = {
    version: 1,
    migratedAt: new Date().toISOString(),
    migratedKeys,
    migratedOutboxCount: generatedOutbox.length,
    recordSummary,
  };

  tx.objectStore('terminal_meta').put({
    key: 'legacy_migration_v1',
    value: receipt,
    updatedAt: receipt.migratedAt,
  });

  await txDonePromise(tx);

  // Only reclaim legacy heavy localStorage keys AFTER IndexedDB commit succeeds
  for (const key of migratedKeys) {
    try {
      ls.removeItem(key);
    } catch {
      // ignore
    }
  }
  [
    LEGACY_KEYS.LOGIN_BG_NAME,
    LEGACY_KEYS.PLATFORM_LOGO_NAME,
    LEGACY_KEYS.PLATFORM_FAVICON_NAME,
    ...INDUSTRY_IDS.map((id) => `sokopos_industry_img_name_${id}_v1`),
  ].forEach((k) => {
    try {
      ls.removeItem(k);
    } catch {}
  });

  return receipt;
}

/**
 * Hydrates the entire terminal state from IndexedDB on startup, triggering
 * silent legacy localStorage migration on first run if needed.
 */
export async function hydrateTerminalDatabase(): Promise<HydratedTerminalDataset> {
  const emptyResult: HydratedTerminalDataset = {
    businesses: null,
    products: null,
    categories: null,
    locations: null,
    systemUsers: null,
    customers: null,
    suppliers: null,
    transactions: null,
    shifts: null,
    syncLogs: null,
    salesBackups: null,
    superAdminAuditLogs: null,
    adminActivityLogs: null,
    supervisorOverrideLogs: null,
    voidRecords: null,
    pricingTiers: null,
    biRollups: null,
    biTargets: null,
    biSavedViews: null,
    branding: {},
    outbox: [],
    migrationReceipt: null,
    opfsManifests: [],
  };

  if (!isIndexedDbAvailable()) {
    return emptyResult;
  }

  const db = await openTerminalDb();
  const migrationReceipt = await performSilentLegacyMigration(db);

  const allStores = [...NORMALIZED_STORES, ...AUXILIARY_STORES];
  const tx = db.transaction(allStores, 'readonly');

  const [
    products,
    categories,
    locations,
    systemUsers,
    customers,
    suppliers,
    transactions,
    shifts,
    collectionRows,
    kvRows,
    outboxRows,
    metaRows,
  ] = await Promise.all([
    reqToPromise(tx.objectStore('products').getAll()),
    reqToPromise(tx.objectStore('categories').getAll()),
    reqToPromise(tx.objectStore('locations').getAll()),
    reqToPromise(tx.objectStore('system_users').getAll()),
    reqToPromise(tx.objectStore('customers').getAll()),
    reqToPromise(tx.objectStore('suppliers').getAll()),
    reqToPromise(tx.objectStore('transactions').getAll()),
    reqToPromise(tx.objectStore('shifts').getAll()),
    reqToPromise(tx.objectStore('collections').getAll()),
    reqToPromise(tx.objectStore('kv_large').getAll()),
    reqToPromise(tx.objectStore('sync_outbox').getAll()),
    reqToPromise(tx.objectStore('terminal_meta').getAll()),
  ]);

  const colMap = new Map<string, any[]>();
  (collectionRows as Array<{ key: string; data: any[] }>).forEach((r) => {
    if (r?.key && Array.isArray(r.data)) {
      colMap.set(r.key, r.data);
    }
  });

  const branding: LargeBrandingAssetMap = { industryImages: {} };
  (kvRows as Array<{ key: string; value: string; name?: string | null }>).forEach((row) => {
    if (!row?.key) return;
    if (row.key === 'login_bg_graphic') {
      branding.loginBgGraphic = row.value;
      branding.loginBgGraphicName = row.name || null;
    } else if (row.key === 'platform_logo') {
      branding.platformLogo = row.value;
      branding.platformLogoName = row.name || null;
    } else if (row.key === 'platform_favicon') {
      branding.platformFavicon = row.value;
      branding.platformFaviconName = row.name || null;
    } else if (row.key.startsWith('industry_img_')) {
      const id = row.key.replace('industry_img_', '') as IndustrySolutionId;
      if (branding.industryImages) {
        branding.industryImages[id] = { url: row.value, name: row.name || undefined };
      }
    }
  });

  const metaMap = new Map<string, any>();
  (metaRows as Array<{ key: string; value: any }>).forEach((m) => {
    if (m?.key) metaMap.set(m.key, m.value);
  });

  const sortedTxs = Array.isArray(transactions) && transactions.length > 0
    ? [...transactions].sort(
        (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    : null;

  const sortedOutbox = Array.isArray(outboxRows)
    ? [...(outboxRows as OutboxMutationEntry[])].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    : [];

  return {
    businesses: colMap.get('businesses') ?? null,
    products: products.length > 0 ? products : null,
    categories: categories.length > 0 ? categories : null,
    locations: locations.length > 0 ? locations : null,
    systemUsers: systemUsers.length > 0 ? systemUsers : null,
    customers: customers.length > 0 ? customers : null,
    suppliers: suppliers.length > 0 ? suppliers : null,
    transactions: sortedTxs,
    shifts: shifts.length > 0 ? shifts : null,
    syncLogs: colMap.get('sync_logs') ?? null,
    salesBackups: colMap.get('sales_backups') ?? null,
    superAdminAuditLogs: colMap.get('super_admin_audit') ?? null,
    adminActivityLogs: colMap.get('admin_activity_logs') ?? null,
    supervisorOverrideLogs: colMap.get('supervisor_overrides') ?? null,
    voidRecords: colMap.get('void_records') ?? null,
    pricingTiers: colMap.get('pricing_tiers') ?? null,
    biRollups: colMap.get('bi_rollups') ?? null,
    biTargets: colMap.get('bi_targets') ?? null,
    biSavedViews: colMap.get('bi_saved_views') ?? null,
    branding,
    outbox: sortedOutbox,
    migrationReceipt: migrationReceipt || (metaMap.get('legacy_migration_v1') as LegacyMigrationReceipt) || null,
    opfsManifests: (metaMap.get('opfs_manifests') as OpfsSnapshotManifest[]) || [],
  };
}

export async function estimateBrowserStorageQuota(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  usagePct: number;
}> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usageBytes: 0, quotaBytes: 0, usagePct: 0 };
  }
  try {
    const est = await navigator.storage.estimate();
    const usageBytes = est.usage || 0;
    const quotaBytes = est.quota || 0;
    const usagePct = quotaBytes > 0 ? Number(((usageBytes / quotaBytes) * 100).toFixed(2)) : 0;
    return { usageBytes, quotaBytes, usagePct };
  } catch {
    return { usageBytes: 0, quotaBytes: 0, usagePct: 0 };
  }
}
