import {
  getOpfsManifestList,
  hydrateTerminalDatabase,
  saveOpfsManifestList,
} from './localTerminalDb';
import { OpfsSnapshotManifest } from '../types/storage';

const OPFS_SNAPSHOT_DIR = 'sokopos-snapshots';
const MAX_OPFS_SNAPSHOTS = 12;

export function isOpfsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.storage) &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

export async function computeSha256Hex(bytes: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic checksum if subtle crypto is unavailable in an insecure preview context
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < bytes.length; i++) {
    h1 ^= bytes[i];
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= bytes[i] + ((h1 >>> 0) & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  ).repeat(4);
}

async function compressUtf8ToGzip(rawBytes: Uint8Array): Promise<{
  bytes: Uint8Array;
  compression: 'gzip' | 'raw_json';
}> {
  if (typeof CompressionStream === 'undefined') {
    return { bytes: rawBytes, compression: 'raw_json' };
  }
  try {
    const stream = new Blob([
      rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength) as ArrayBuffer,
    ])
      .stream()
      .pipeThrough(new CompressionStream('gzip'));
    const compressedBuffer = await new Response(stream).arrayBuffer();
    return { bytes: new Uint8Array(compressedBuffer), compression: 'gzip' };
  } catch {
    return { bytes: rawBytes, compression: 'raw_json' };
  }
}

export interface SnapshotPayloadInput {
  businessId: string;
  businessName: string;
  trigger: 'migration' | 'shift_close' | 'manual';
  data: {
    businesses: any[];
    products: any[];
    categories: any[];
    locations: any[];
    systemUsers: any[];
    customers: any[];
    suppliers: any[];
    transactions: any[];
    shifts: any[];
    biRollups: any[];
    biTargets: any[];
    biSavedViews: any[];
    outbox: any[];
  };
}

export async function createOpfsBinarySnapshot(
  input: SnapshotPayloadInput
): Promise<OpfsSnapshotManifest | null> {
  if (!isOpfsSupported()) return null;

  try {
    const now = new Date();
    const createdAt = now.toISOString();
    const safeBiz = (input.businessId || 'tenant').replace(/[^a-zA-Z0-9_-]/g, '');
    const stamp = createdAt.replace(/[:.]/g, '-');

    const envelope = {
      format: 'sokopos-terminal-archive-v1',
      createdAt,
      businessId: input.businessId,
      businessName: input.businessName,
      trigger: input.trigger,
      data: input.data,
    };

    const jsonText = JSON.stringify(envelope);
    const rawBytes = new TextEncoder().encode(jsonText);
    const { bytes: archiveBytes, compression } = await compressUtf8ToGzip(rawBytes);
    const sha256 = await computeSha256Hex(archiveBytes);
    const ext = compression === 'gzip' ? 'sokopos.json.gz' : 'sokopos.json';
    const fileName = `${safeBiz}_${stamp}_${input.trigger}.${ext}`;

    const root = await navigator.storage.getDirectory();
    const snapDir = await root.getDirectoryHandle(OPFS_SNAPSHOT_DIR, { create: true });
    const fileHandle = await snapDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    const copy = new Uint8Array(archiveBytes.byteLength);
    copy.set(archiveBytes);
    await writable.write(copy.buffer as ArrayBuffer);
    await writable.close();

    const manifest: OpfsSnapshotManifest = {
      fileName,
      businessId: input.businessId,
      businessName: input.businessName,
      createdAt,
      trigger: input.trigger,
      byteSize: archiveBytes.byteLength,
      uncompressedSize: rawBytes.byteLength,
      compression,
      sha256,
      recordCounts: {
        products: input.data.products.length,
        transactions: input.data.transactions.length,
        shifts: input.data.shifts.length,
        customers: input.data.customers.length,
        suppliers: input.data.suppliers.length,
        outbox: input.data.outbox.length,
      },
    };

    const existingManifests = await getOpfsManifestList();
    const updatedManifests = [
      manifest,
      ...existingManifests.filter((m) => m.fileName !== fileName),
    ];

    // Prune excess old OPFS files cleanly
    const toRemove = updatedManifests.slice(MAX_OPFS_SNAPSHOTS);
    const retained = updatedManifests.slice(0, MAX_OPFS_SNAPSHOTS);
    for (const stale of toRemove) {
      try {
        await snapDir.removeEntry(stale.fileName);
      } catch {
        // file may already be pruned
      }
    }

    await saveOpfsManifestList(retained);
    return manifest;
  } catch (err) {
    console.warn('[OPFS Archive] Snapshot creation skipped:', err);
    return null;
  }
}

export async function verifyOpfsSnapshot(fileName: string): Promise<{
  ok: boolean;
  computedSha256: string;
  expectedSha256: string;
  byteSize: number;
}> {
  const manifests = await getOpfsManifestList();
  const manifest = manifests.find((m) => m.fileName === fileName);
  const expectedSha256 = manifest?.sha256 || '';

  if (!isOpfsSupported()) {
    return { ok: false, computedSha256: '', expectedSha256, byteSize: 0 };
  }

  try {
    const root = await navigator.storage.getDirectory();
    const snapDir = await root.getDirectoryHandle(OPFS_SNAPSHOT_DIR);
    const fileHandle = await snapDir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const computedSha256 = await computeSha256Hex(bytes);
    return {
      ok: Boolean(expectedSha256 && computedSha256 === expectedSha256),
      computedSha256,
      expectedSha256,
      byteSize: bytes.byteLength,
    };
  } catch (err) {
    console.warn('[OPFS Archive] Verification notice:', err);
    return { ok: false, computedSha256: '', expectedSha256, byteSize: 0 };
  }
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadOpfsSnapshotFile(fileName: string): Promise<boolean> {
  if (!isOpfsSupported()) return false;
  try {
    const root = await navigator.storage.getDirectory();
    const snapDir = await root.getDirectoryHandle(OPFS_SNAPSHOT_DIR);
    const fileHandle = await snapDir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    triggerBlobDownload(file, fileName);
    return true;
  } catch (err) {
    console.warn('[OPFS Archive] Download notice:', err);
    return false;
  }
}

/**
 * One-click portable merchant archive exported straight from IndexedDB (with in-memory fallback).
 */
export async function exportFullStoreArchive(params: {
  businessId: string;
  businessName: string;
  fallbackSnapshot: SnapshotPayloadInput['data'];
}): Promise<{ fileName: string; sha256: string; byteSize: number; recordTotal: number }> {
  const hydrated = await hydrateTerminalDatabase();
  const bizFilter = <T extends { businessId?: string }>(arr: T[] | null, fallback: T[]): T[] => {
    const source = arr && arr.length > 0 ? arr : fallback;
    return source.filter((item) => !item.businessId || item.businessId === params.businessId);
  };

  const payloadData = {
    products: bizFilter(hydrated.products, params.fallbackSnapshot.products),
    categories: bizFilter(hydrated.categories, params.fallbackSnapshot.categories),
    locations: bizFilter(hydrated.locations, params.fallbackSnapshot.locations),
    cashiers: bizFilter(hydrated.systemUsers, params.fallbackSnapshot.systemUsers),
    customers: bizFilter(hydrated.customers, params.fallbackSnapshot.customers),
    suppliers: bizFilter(hydrated.suppliers, params.fallbackSnapshot.suppliers),
    transactions: bizFilter(hydrated.transactions, params.fallbackSnapshot.transactions),
    shifts: bizFilter(hydrated.shifts, params.fallbackSnapshot.shifts),
    biRollups: bizFilter(hydrated.biRollups, params.fallbackSnapshot.biRollups),
    biTargets: bizFilter(hydrated.biTargets, params.fallbackSnapshot.biTargets),
    biSavedViews: bizFilter(hydrated.biSavedViews, params.fallbackSnapshot.biSavedViews),
    pendingOutbox: (hydrated.outbox.length > 0 ? hydrated.outbox : params.fallbackSnapshot.outbox).filter(
      (o: any) => o.businessId === params.businessId
    ),
  };

  const exportedAt = new Date().toISOString();
  const bodyJson = JSON.stringify(payloadData);
  const rawBytes = new TextEncoder().encode(bodyJson);
  const sha256 = await computeSha256Hex(rawBytes);

  const archiveEnvelope = {
    format: 'sokopos-sovereign-store-export-v1',
    exportedAt,
    businessId: params.businessId,
    businessName: params.businessName,
    storageEngine: 'IndexedDB + OPFS',
    sha256,
    recordCounts: {
      products: payloadData.products.length,
      categories: payloadData.categories.length,
      locations: payloadData.locations.length,
      cashiers: payloadData.cashiers.length,
      customers: payloadData.customers.length,
      suppliers: payloadData.suppliers.length,
      transactions: payloadData.transactions.length,
      shifts: payloadData.shifts.length,
      biRollups: payloadData.biRollups.length,
      pendingOutbox: payloadData.pendingOutbox.length,
    },
    data: payloadData,
  };

  const formattedJson = JSON.stringify(archiveEnvelope, null, 2);
  const slug = (params.businessName || params.businessId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'store';
  const datePart = exportedAt.slice(0, 10);
  const fileName = `sokopos-store-backup_${slug}_${datePart}.json`;

  const blob = new Blob([formattedJson], { type: 'application/json;charset=utf-8' });
  triggerBlobDownload(blob, fileName);

  const recordTotal = Object.values(archiveEnvelope.recordCounts).reduce((s, n) => s + n, 0);
  return {
    fileName,
    sha256,
    byteSize: blob.size,
    recordTotal,
  };
}
