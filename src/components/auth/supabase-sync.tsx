"use client";

import { useEffect, useMemo, useRef } from "react";

import { useShallow } from "zustand/react/shallow";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { createInitialPersistedState, type BossFitPersistedState } from "@/lib/persistence";
import {
  createEmptyRemoteSnapshot,
  fetchRemoteState,
  hasMeaningfulSnapshotData,
  logSupabaseError,
  saveRemoteState,
  toRemoteSnapshot,
  type BossFitRemoteState,
  type BossFitRemoteSnapshot
} from "@/lib/supabase/data";
import { clearCachedUserSnapshot, readCachedUserSnapshot, writeCachedUserSnapshot } from "@/lib/supabase/user-cache";
import { useBossFitStore } from "@/store/use-bossfit-store";

const syncDelayMs = 900;
const initialFetchAttempts = 4;
const initialFetchRetryDelayMs = 300;

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function buildSnapshotFromStore(state: ReturnType<typeof useBossFitStore.getState>): BossFitRemoteSnapshot {
  return toRemoteSnapshot({
    habits: state.habits,
    completions: state.completions,
    theme: state.theme,
    reminderSettings: state.reminderSettings
  });
}

export function SupabaseSync() {
  const { user, status, isConfigured } = useSupabaseAuth();
  const userId = user?.id ?? null;
  const {
    habits,
    completions,
    theme,
    reminderSettings,
    cloudSync,
    hasHydrated,
    replacePersistedState,
    setCloudSyncState
  } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      completions: state.completions,
      theme: state.theme,
      reminderSettings: state.reminderSettings,
      cloudSync: state.cloudSync,
      hasHydrated: state.hasHydrated,
      replacePersistedState: state.replacePersistedState,
      setCloudSyncState: state.setCloudSyncState
    }))
  );

  const remoteSnapshot = useMemo(
    () =>
      toRemoteSnapshot({
        habits,
        completions,
        theme,
        reminderSettings
      }),
    [completions, habits, reminderSettings, theme]
  );
  const snapshotSignature = useMemo(() => JSON.stringify(remoteSnapshot), [remoteSnapshot]);
  const emptySnapshotSignature = useMemo(() => JSON.stringify(createEmptyRemoteSnapshot()), []);
  const activeUserIdRef = useRef<string | null>(null);
  const lastSyncedSignatureRef = useRef<string>("");
  const skipNextSyncRef = useRef(false);
  const initialSyncInFlightRef = useRef(false);

  useEffect(() => {
    if (!hasHydrated || !isConfigured) {
      return;
    }

    if (status !== "authenticated" || !userId) {
      activeUserIdRef.current = null;
      lastSyncedSignatureRef.current = "";
      initialSyncInFlightRef.current = false;
      return;
    }

    if (activeUserIdRef.current === userId) {
      return;
    }

    activeUserIdRef.current = userId;
    initialSyncInFlightRef.current = true;
    let cancelled = false;

    const initialSync = async () => {
      const stateAtStart = useBossFitStore.getState();
      const currentTheme = stateAtStart.theme;
      const cachedUserSnapshot = readCachedUserSnapshot(userId);
      const cachedHasMeaningfulData = Boolean(
        cachedUserSnapshot && hasMeaningfulSnapshotData(cachedUserSnapshot.snapshot)
      );
      const localStateOwnedByCurrentUser = stateAtStart.cloudSync.userId === userId;
      const localSnapshotAtStart = localStateOwnedByCurrentUser
        ? buildSnapshotFromStore(stateAtStart)
        : createEmptyRemoteSnapshot();
      const localHasMeaningfulData =
        localStateOwnedByCurrentUser && hasMeaningfulSnapshotData(localSnapshotAtStart);
      const switchingUsers = Boolean(
        stateAtStart.cloudSync.userId && stateAtStart.cloudSync.userId !== userId
      );
      const shouldSeedFromCache = cachedHasMeaningfulData && !localHasMeaningfulData;

      if (switchingUsers || shouldSeedFromCache) {
        skipNextSyncRef.current = true;

        if (cachedUserSnapshot && cachedHasMeaningfulData) {
          const cachedSyncedAt =
            cachedUserSnapshot.lastSyncedAt ??
            cachedUserSnapshot.updatedAt ??
            stateAtStart.cloudSync.lastSyncedAt ??
            new Date().toISOString();

          replacePersistedState({
            ...cachedUserSnapshot.snapshot,
            cloudSync: {
              userId,
              lastSyncedAt: cachedSyncedAt,
              lastLocalChangeAt: cachedSyncedAt
            }
          });
          lastSyncedSignatureRef.current = JSON.stringify(cachedUserSnapshot.snapshot);
        } else {
          lastSyncedSignatureRef.current = emptySnapshotSignature;
          replacePersistedState({
            ...createInitialPersistedState(),
            theme: currentTheme,
            cloudSync: {
              userId
            }
          });
        }
      }

      try {
        let remote: BossFitRemoteState | null = null;

        for (let attempt = 0; attempt < initialFetchAttempts; attempt += 1) {
          remote = await fetchRemoteState(userId);

          if (cancelled || remote) {
            break;
          }

          if (attempt < initialFetchAttempts - 1) {
            await wait(initialFetchRetryDelayMs * (attempt + 1));
          }
        }

        if (cancelled) {
          return;
        }

        const currentState = useBossFitStore.getState();
        const currentStateOwnedByCurrentUser = currentState.cloudSync.userId === userId;
        const currentLocalSnapshot = currentStateOwnedByCurrentUser
          ? buildSnapshotFromStore(currentState)
          : createEmptyRemoteSnapshot();
        const localSnapshotSignature = JSON.stringify(currentLocalSnapshot);
        const remoteStamp = remote?.lastSyncedAt ?? remote?.updatedAt;
        const hasLocalData = currentStateOwnedByCurrentUser && hasMeaningfulSnapshotData(currentLocalSnapshot);
        const localUnsynced =
          currentStateOwnedByCurrentUser &&
          Boolean(currentState.cloudSync.lastLocalChangeAt) &&
          (!remoteStamp ||
            new Date(currentState.cloudSync.lastLocalChangeAt as string).getTime() >
              new Date(remoteStamp).getTime());

        if (!remote) {
          if (hasLocalData) {
            const saved = await saveRemoteState(userId, currentLocalSnapshot);
            if (cancelled) {
              return;
            }

            setCloudSyncState({
              userId,
              lastSyncedAt: saved.lastSyncedAt,
              lastLocalChangeAt: saved.lastSyncedAt
            });
            writeCachedUserSnapshot(userId, currentLocalSnapshot, {
              lastSyncedAt: saved.lastSyncedAt,
              updatedAt: saved.updatedAt
            });
            lastSyncedSignatureRef.current = localSnapshotSignature;
            return;
          }

          if (cachedUserSnapshot && cachedHasMeaningfulData) {
            const cachedSyncedAt =
              cachedUserSnapshot.lastSyncedAt ??
              cachedUserSnapshot.updatedAt ??
              new Date().toISOString();

            skipNextSyncRef.current = true;
            replacePersistedState({
              ...cachedUserSnapshot.snapshot,
              cloudSync: {
                userId,
                lastSyncedAt: cachedSyncedAt,
                lastLocalChangeAt: cachedSyncedAt
              }
            });
            lastSyncedSignatureRef.current = JSON.stringify(cachedUserSnapshot.snapshot);
            return;
          }

          skipNextSyncRef.current = true;
          const freshState = createInitialPersistedState();
          const syncedAt = new Date().toISOString();
          clearCachedUserSnapshot(userId);
          replacePersistedState({
            ...freshState,
            theme: currentTheme,
            cloudSync: {
              userId,
              lastSyncedAt: syncedAt,
              lastLocalChangeAt: syncedAt
            }
          });
          lastSyncedSignatureRef.current = emptySnapshotSignature;
          return;
        }

        if (localUnsynced) {
          const saved = await saveRemoteState(userId, currentLocalSnapshot);
          if (cancelled) {
            return;
          }

          setCloudSyncState({
            userId,
            lastSyncedAt: saved.lastSyncedAt,
            lastLocalChangeAt: saved.lastSyncedAt
          });
          writeCachedUserSnapshot(userId, currentLocalSnapshot, {
            lastSyncedAt: saved.lastSyncedAt,
            updatedAt: saved.updatedAt
          });
          lastSyncedSignatureRef.current = localSnapshotSignature;
          return;
        }

        skipNextSyncRef.current = true;
        const syncedAt = remote.lastSyncedAt ?? remote.updatedAt ?? new Date().toISOString();
        const nextState: BossFitPersistedState = {
          ...remote.snapshot,
          cloudSync: {
            userId,
            lastSyncedAt: syncedAt,
            lastLocalChangeAt: syncedAt
          }
        };

        replacePersistedState(nextState);
        writeCachedUserSnapshot(userId, remote.snapshot, {
          lastSyncedAt: remote.lastSyncedAt,
          updatedAt: remote.updatedAt
        });
        lastSyncedSignatureRef.current = JSON.stringify(remote.snapshot);
      } catch (error) {
        logSupabaseError("BossFit: no se pudo sincronizar el estado inicial con Supabase.", error);
      } finally {
        if (!cancelled && activeUserIdRef.current === userId) {
          initialSyncInFlightRef.current = false;
        }
      }
    };

    void initialSync();

    return () => {
      cancelled = true;
      if (activeUserIdRef.current === userId) {
        initialSyncInFlightRef.current = false;
      }
    };
  }, [
    emptySnapshotSignature,
    hasHydrated,
    isConfigured,
    replacePersistedState,
    setCloudSyncState,
    status,
    userId
  ]);

  useEffect(() => {
    if (!hasHydrated || !isConfigured || status !== "authenticated" || !userId) {
      return;
    }

    if (initialSyncInFlightRef.current) {
      return;
    }

    if (cloudSync.userId && cloudSync.userId !== userId) {
      return;
    }

    writeCachedUserSnapshot(userId, remoteSnapshot, {
      lastSyncedAt: cloudSync.lastSyncedAt,
      updatedAt: cloudSync.lastLocalChangeAt ?? cloudSync.lastSyncedAt
    });
  }, [
    cloudSync.lastLocalChangeAt,
    cloudSync.lastSyncedAt,
    cloudSync.userId,
    hasHydrated,
    isConfigured,
    remoteSnapshot,
    status,
    userId
  ]);

  useEffect(() => {
    if (!hasHydrated || !isConfigured || status !== "authenticated" || !userId) {
      return;
    }

    if (initialSyncInFlightRef.current) {
      return;
    }

    if (cloudSync.userId && cloudSync.userId !== userId) {
      return;
    }

    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    if (snapshotSignature === lastSyncedSignatureRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      if (initialSyncInFlightRef.current) {
        return;
      }

      try {
        const saved = await saveRemoteState(userId, remoteSnapshot);
        writeCachedUserSnapshot(userId, remoteSnapshot, {
          lastSyncedAt: saved.lastSyncedAt,
          updatedAt: saved.updatedAt
        });
        lastSyncedSignatureRef.current = snapshotSignature;
        setCloudSyncState({
          userId,
          lastSyncedAt: saved.lastSyncedAt,
          lastLocalChangeAt: saved.lastSyncedAt
        });
      } catch (error) {
        logSupabaseError("BossFit: no se pudo guardar el progreso en Supabase.", error);
      }
    }, syncDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    cloudSync.userId,
    hasHydrated,
    isConfigured,
    remoteSnapshot,
    setCloudSyncState,
    snapshotSignature,
    status,
    userId
  ]);

  return null;
}
