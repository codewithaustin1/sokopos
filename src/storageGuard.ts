/**
 * storageGuard.ts
 * Proactively guards localStorage and sessionStorage against QuotaExceededError in browser
 * and iframe environments. Prevents Firestore internal assertion failures (ID: b815)
 * caused by multi-tab coordination state exhausting browser storage quotas.
 */

if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
  try {
    const storage = window.localStorage;
    const originalSetItem = storage.setItem.bind(storage);

    // Initial eviction of obsolete or lingering Firestore client coordination records
    try {
      const keysToPurge: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (
          k &&
          (k.startsWith('firestore_clients_') ||
            k.startsWith('firestore_mutations_') ||
            k.startsWith('firestore_sequence_') ||
            k.startsWith('firestore_online_state_') ||
            k.startsWith('firestore_bundle_'))
        ) {
          keysToPurge.push(k);
        }
      }
      keysToPurge.forEach((k) => {
        try {
          storage.removeItem(k);
        } catch {}
      });
    } catch {}

    // Safe setItem wrapper with automatic pruning and crash prevention
    storage.setItem = function (key: string, value: string): void {
      try {
        originalSetItem(key, value);
      } catch (err: any) {
        const isQuota =
          err?.name === 'QuotaExceededError' ||
          err?.code === 22 ||
          err?.number === -2147024882 ||
          (err?.message && String(err.message).toLowerCase().includes('quota'));

        if (isQuota) {
          console.warn(`[StorageGuard] Quota limit encountered on "${key}". Freeing temporary records...`);
          try {
            const evictableKeys: string[] = [];
            for (let i = 0; i < storage.length; i++) {
              const k = storage.key(i);
              if (!k) continue;
              if (
                k.startsWith('firestore_') ||
                k.includes('sales_backups') ||
                k.includes('sync_logs') ||
                k.includes('admin_activity_logs') ||
                k.includes('supervisor_overrides') ||
                k.includes('sa_audit') ||
                k.includes('login_bg_graphic') ||
                k.includes('platform_logo')
              ) {
                evictableKeys.push(k);
              }
            }
            evictableKeys.forEach((k) => {
              try {
                storage.removeItem(k);
              } catch {}
            });

            // Retry saving
            originalSetItem(key, value);
            return;
          } catch {
            // Suppress the error so it does NOT crash Firestore's WebStorageSharedClientState
            // or bubble up as an unhandled rejection
            console.warn(`[StorageGuard] Key "${key}" skipped to preserve application stability.`);
            return;
          }
        }
        // If not a quota error, rethrow
        throw err;
      }
    };
  } catch (e) {
    console.warn('[StorageGuard] Initialization notice:', e);
  }
}

export {};
