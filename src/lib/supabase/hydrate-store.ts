import { createInitialPersistedState } from "@/lib/persistence";
import { fetchRemoteState, saveRemoteState } from "@/lib/supabase/data";
import { readCachedUserSnapshot, writeCachedUserSnapshot } from "@/lib/supabase/user-cache";
import { useBossFitStore } from "@/store/use-bossfit-store";

export async function hydrateStoreForUser(userId: string) {
  const store = useBossFitStore.getState();
  const cached = readCachedUserSnapshot(userId);
  const currentTheme = store.theme;

  const remote = await fetchRemoteState(userId);

  if (remote) {
    let syncedAt = remote.lastSyncedAt ?? remote.updatedAt ?? new Date().toISOString();
    let updatedAt = remote.updatedAt;

    if (remote.source === "history") {
      try {
        const repaired = await saveRemoteState(userId, remote.snapshot, { reason: "recovery" });
        syncedAt = repaired.lastSyncedAt;
        updatedAt = repaired.updatedAt;
      } catch {
        // If recovery write fails, still hydrate from the most recent remote backup.
      }
    }

    writeCachedUserSnapshot(userId, remote.snapshot, {
      lastSyncedAt: syncedAt,
      updatedAt
    });
    store.replacePersistedState({
      ...remote.snapshot,
      cloudSync: {
        userId,
        lastSyncedAt: syncedAt,
        lastLocalChangeAt: syncedAt,
        pendingRemoteReason: undefined
      }
    });
    return { source: remote.source === "history" ? ("remote-recovery" as const) : ("remote" as const) };
  }

  if (cached) {
    const syncedAt = cached.lastSyncedAt ?? cached.updatedAt ?? new Date().toISOString();
    store.replacePersistedState({
      ...cached.snapshot,
      cloudSync: {
        userId,
        lastSyncedAt: syncedAt,
        lastLocalChangeAt: syncedAt,
        pendingRemoteReason: undefined
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
      lastLocalChangeAt: syncedAt,
      pendingRemoteReason: undefined
    }
  });
  return { source: "empty" as const };
}
