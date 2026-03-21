import type { SupabaseClient } from "@supabase/supabase-js";

import { STORAGE_VERSION } from "@/lib/constants";
import type { BossFitRemoteSnapshot, BossFitRemoteState, SaveRemoteStateOptions } from "@/lib/supabase/data";
import {
  RemoteStateConflictError,
  fetchUserRemoteStateOrEmpty,
  saveUserRemoteStateWithClient
} from "@/lib/supabase/user-state-server";

interface MutationContext<TResult> {
  current: BossFitRemoteState;
  snapshot: BossFitRemoteSnapshot;
  result: TResult;
}

interface MutateUserStateOptions<TResult> {
  reason?: SaveRemoteStateOptions["reason"];
  maxAttempts?: number;
  mutate: (current: BossFitRemoteState) => {
    snapshot: BossFitRemoteSnapshot;
    result: TResult;
  };
}

async function ensureCurrentState(supabase: SupabaseClient, userId: string) {
  const current = await fetchUserRemoteStateOrEmpty(supabase, userId);

  if (current.source !== "history") {
    return current;
  }

  const repaired = await saveUserRemoteStateWithClient(supabase, userId, current.snapshot, {
    reason: "recovery"
  });

  return {
    ...current,
    source: "current" as const,
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
  } satisfies BossFitRemoteState;
}

export async function mutateUserStateWithRetries<TResult>(
  supabase: SupabaseClient,
  userId: string,
  options: MutateUserStateOptions<TResult>
): Promise<MutationContext<TResult>> {
  const maxAttempts = Math.max(options.maxAttempts ?? 3, 1);
  let lastConflict: RemoteStateConflictError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = await ensureCurrentState(supabase, userId);
    const next = options.mutate(current);
    const expectedRevision = current.revision > 0 ? current.revision : undefined;

    try {
      const saved = await saveUserRemoteStateWithClient(supabase, userId, next.snapshot, {
        reason: options.reason,
        expectedRevision
      });

      return {
        current: {
          snapshot: next.snapshot,
          storageVersion: STORAGE_VERSION,
          revision: saved.revision,
          lastSyncedAt: saved.lastSyncedAt,
          updatedAt: saved.updatedAt,
          lastSaveReason: saved.lastSaveReason,
          source: "current",
          habitsCount: saved.habitsCount,
          completionsCount: saved.completionsCount,
          currentStreak: saved.currentStreak,
          bestStreak: saved.bestStreak,
          totalPoints: saved.totalPoints,
          level: saved.level
        },
        snapshot: next.snapshot,
        result: next.result
      };
    } catch (error) {
      if (error instanceof RemoteStateConflictError) {
        lastConflict = error;
        continue;
      }

      throw error;
    }
  }

  throw lastConflict ?? new Error("No se pudo guardar el estado del usuario despues de varios intentos.");
}
