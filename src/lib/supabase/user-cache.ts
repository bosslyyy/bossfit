import { STORAGE_VERSION } from "@/lib/constants";
import { migratePersistedState } from "@/lib/persistence";
import type { BossFitRemoteSnapshot } from "@/lib/supabase/data";

const USER_SNAPSHOT_CACHE_PREFIX = "bossfit-user-cache:";

interface StoredUserSnapshotCache {
  storageVersion: number;
  snapshot: unknown;
  lastSyncedAt?: string;
  updatedAt?: string;
}

function getSafeLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getUserCacheKey(userId: string) {
  return `${USER_SNAPSHOT_CACHE_PREFIX}${userId}`;
}

export interface CachedUserSnapshot {
  snapshot: BossFitRemoteSnapshot;
  lastSyncedAt?: string;
  updatedAt?: string;
}

export function readCachedUserSnapshot(userId: string): CachedUserSnapshot | null {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(getUserCacheKey(userId));
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredUserSnapshotCache;
    const migrated = migratePersistedState(parsed.snapshot, parsed.storageVersion);

    return {
      snapshot: {
        habits: migrated.habits,
        completions: migrated.completions,
        theme: migrated.theme,
        reminderSettings: migrated.reminderSettings
      },
      lastSyncedAt: parsed.lastSyncedAt,
      updatedAt: parsed.updatedAt
    };
  } catch {
    storage.removeItem(getUserCacheKey(userId));
    return null;
  }
}

export function writeCachedUserSnapshot(
  userId: string,
  snapshot: BossFitRemoteSnapshot,
  metadata?: { lastSyncedAt?: string; updatedAt?: string }
) {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }

  const value: StoredUserSnapshotCache = {
    storageVersion: STORAGE_VERSION,
    snapshot,
    lastSyncedAt: metadata?.lastSyncedAt,
    updatedAt: metadata?.updatedAt
  };

  try {
    storage.setItem(getUserCacheKey(userId), JSON.stringify(value));
  } catch {
    // Ignore cache write failures and keep runtime sync usable.
  }
}

export function clearCachedUserSnapshot(userId: string) {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(getUserCacheKey(userId));
  } catch {
    // Ignore cache cleanup failures.
  }
}
