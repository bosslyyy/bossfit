import { createInitialPersistedState } from "@/lib/persistence";
import { fetchRemoteState, saveRemoteState, type BossFitRemoteState } from "@/lib/supabase/data";
import { useBossFitStore } from "@/store/use-bossfit-store";

interface StoreStateInput {
  userId: string;
  state: BossFitRemoteState;
}

export function applyRemoteStateToStore({ userId, state }: StoreStateInput) {
  const syncedAt = state.lastSyncedAt ?? state.updatedAt ?? new Date().toISOString();

  useBossFitStore.getState().replacePersistedState({
    ...state.snapshot,
    cloudSync: {
      userId,
      lastSyncedAt: syncedAt,
      lastLocalChangeAt: syncedAt,
      revision: state.revision,
      pendingRemoteReason: undefined
    }
  });
}

export function applyEmptyStateToStore(userId?: string) {
  const freshState = createInitialPersistedState();

  useBossFitStore.getState().replacePersistedState({
    ...freshState,
    cloudSync: {
      userId,
      revision: 0,
      pendingRemoteReason: undefined
    }
  });
}

export async function hydrateStoreForUser(userId: string) {
  const remote = await fetchRemoteState(userId);

  if (remote) {
    if (remote.source === "history") {
      try {
        const repaired = await saveRemoteState(userId, remote.snapshot, { reason: "recovery" });
        applyRemoteStateToStore({
          userId,
          state: {
            ...remote,
            source: "current",
            revision: repaired.revision,
            lastSyncedAt: repaired.lastSyncedAt,
            updatedAt: repaired.updatedAt,
            lastSaveReason: repaired.lastSaveReason,
            habitsCount: repaired.habitsCount,
            completionsCount: repaired.completionsCount,
            currentStreak: repaired.currentStreak,
            bestStreak: repaired.bestStreak,
            totalPoints: repaired.totalPoints,
            level: repaired.level
          }
        });

        return { source: "remote-recovery" as const };
      } catch {
        applyRemoteStateToStore({ userId, state: remote });
        return { source: "history" as const };
      }
    }

    applyRemoteStateToStore({ userId, state: remote });
    return { source: "remote" as const };
  }

  applyEmptyStateToStore(userId);
  return { source: "empty" as const };
}
