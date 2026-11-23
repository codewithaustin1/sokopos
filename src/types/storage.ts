import {
  AdminActivityEntry,
  Business,
  Cashier,
  Category,
  Customer,
  IndustrySolutionId,
  Location,
  PricingTier,
  Product,
  ShiftSession,
  StoreSalesBackup,
  SuperAdminAuditEntry,
  SupervisorOverrideAuditEntry,
  Supplier,
  SyncLogEvent,
  Transaction,
  VoidRecord,
} from '../types';
import {
  AnalyticsDailyRollup,
  AnalyticsSavedView,
  AnalyticsTarget,
} from './reporting';

export type NormalizedStoreName =
  | 'products'
  | 'categories'
  | 'locations'
  | 'system_users'
  | 'customers'
  | 'suppliers'
  | 'transactions'
  | 'shifts';

export type CollectionStoreKey =
  | 'businesses'
  | 'sync_logs'
  | 'sales_backups'
  | 'super_admin_audit'
  | 'admin_activity_logs'
  | 'supervisor_overrides'
  | 'void_records'
  | 'pricing_tiers'
  | 'bi_rollups'
  | 'bi_targets'
  | 'bi_saved_views';

export type OutboxCollectionName =
  | 'transactions'
  | 'products'
  | 'locations'
  | 'cashiers'
  | 'categories'
  | 'customers'
  | 'suppliers'
  | 'stock_transfers'
  | 'analytics_daily_rollups'
  | 'analytics_targets'
  | 'analytics_saved_views'
  | 'etims_sales'
  | 'etims_credit_notes';

export type OutboxStatus = 'pending' | 'in_flight' | 'retry_scheduled' | 'dead_letter';

export type OutboxOperation = 'upsert' | 'delete';

export interface OutboxMutationEntry {
  id: string;
  businessId: string;
  collectionName: OutboxCollectionName;
  docId: string;
  operation: OutboxOperation;
  payload: Record<string, any>;
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  nextRetryAt: number;
  lastError?: string;
  errorCode?: string;
  label?: string;
}

export interface LargeBrandingAssetMap {
  loginBgGraphic?: string | null;
  loginBgGraphicName?: string | null;
  platformLogo?: string | null;
  platformLogoName?: string | null;
  platformFavicon?: string | null;
  platformFaviconName?: string | null;
  industryImages?: Partial<Record<IndustrySolutionId, { url: string; name?: string }>>;
}

export interface LegacyMigrationReceipt {
  version: number;
  migratedAt: string;
  migratedKeys: string[];
  migratedOutboxCount: number;
  recordSummary: Record<string, number>;
}

export interface OpfsSnapshotManifest {
  fileName: string;
  businessId: string;
  businessName: string;
  createdAt: string;
  trigger: 'migration' | 'shift_close' | 'manual';
  byteSize: number;
  uncompressedSize: number;
  compression: 'gzip' | 'raw_json';
  sha256: string;
  recordCounts: {
    products: number;
    transactions: number;
    shifts: number;
    customers: number;
    suppliers: number;
    outbox: number;
  };
}

export interface StorageQuotaTelemetry {
  engine: 'IndexedDB + OPFS' | 'IndexedDB (OPFS Restricted)';
  usageBytes: number;
  quotaBytes: number;
  usagePct: number;
  opfsSupported: boolean;
  migratedFromLocalStorageAt: string | null;
  migratedKeysCount: number;
  lastSnapshot: OpfsSnapshotManifest | null;
}

export interface HydratedTerminalDataset {
  businesses: Business[] | null;
  products: Product[] | null;
  categories: Category[] | null;
  locations: Location[] | null;
  systemUsers: Cashier[] | null;
  customers: Customer[] | null;
  suppliers: Supplier[] | null;
  transactions: Transaction[] | null;
  shifts: ShiftSession[] | null;
  syncLogs: SyncLogEvent[] | null;
  salesBackups: StoreSalesBackup[] | null;
  superAdminAuditLogs: SuperAdminAuditEntry[] | null;
  adminActivityLogs: AdminActivityEntry[] | null;
  supervisorOverrideLogs: SupervisorOverrideAuditEntry[] | null;
  voidRecords: VoidRecord[] | null;
  pricingTiers: PricingTier[] | null;
  biRollups: AnalyticsDailyRollup[] | null;
  biTargets: AnalyticsTarget[] | null;
  biSavedViews: AnalyticsSavedView[] | null;
  branding: LargeBrandingAssetMap;
  outbox: OutboxMutationEntry[];
  migrationReceipt: LegacyMigrationReceipt | null;
  opfsManifests: OpfsSnapshotManifest[];
}
