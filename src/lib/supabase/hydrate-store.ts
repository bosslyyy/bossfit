import { createInitialPersistedState } from "@/lib/persistence";
import { fetchRemoteState } from "@/lib/supabase/data";
import { readCachedUserSnapshot, writeCachedUserSnapshot } from "@/lib/supabase/user-cache";
import { useBossFitStore } from "@/store/use-bossfit-store";

export async function hydrateStoreForUser(userId: string) {
  const store = useBossFitStore.getState();
  const cached = readCachedUserSnapshot(userId);
  const currentTheme = store.theme;

  const remote = await fetchRemoteState(userId);

  if (remote) {
    const syncedAt = remote.lastSyncedAt ?? remote.updatedAt ?? new Date().toISOString();
    writeCachedUserSnapshot(userId, remote.snapshot, {
      lastSyncedAt: remote.lastSyncedAt,
      updatedAt: remote.updatedAt
    });
    store.replacePersistedState({
      ...remote.snapshot,
      cloudSync: {
        userId,
        lastSyncedAt: syncedAt,
        lastLocalChangeAt: syncedAt
      }
    });
    return { source: "remote" as const };
  }

  if (cached) {
    const syncedAt = cached.lastSyncedAt ?? cached.updatedAt ?? new Date().toISOString();
    store.replacePersistedState({
      ...cached.snapshot,
      cloudSync: {
        userId,
        lastSyncedAt: syncedAt,
        lastLocalChangeAt: syncedAt
      }
    });
    return { source: "cache" as const };
  }

  const freshState = createInitialPersistedState();
  const syncedAt = new Date().toISOString();
  store.replacePersistedState({
    ...freshState,
    theme: currentTheme,
    cloudSync: {
      userId,
      lastSyncedAt: syncedAt,
      lastLocalChangeAt: syncedAt
    }
  });
  return { source: "empty" as const };
}
