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
import {
  clearCachedUserSnapshot,
  readCachedUserSnapshot,
  writeCachedUserSnapshot
} from "@/lib/supabase/user-cache";
import { useBossFitStore } from "@/store/use-bossfit-store";
import type { CloudSyncState, RemoteSaveReason } from "@/types/habit";

const syncDelayMs = 650;
const initialFetchAttempts = 4;
const initialFetchRetryDelayMs = 300;
const remotePullIntervalMs = 12000;
const remotePullMinGapMs = 4000;

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

function getRemoteStamp(value: { lastSyncedAt?: string; updatedAt?: string }) {
  return value.lastSyncedAt ?? value.updatedAt ?? null;
}

function hasUnsyncedCloudChanges(
  cloudSync: CloudSyncState,
  remoteStamp?: string | null
) {
  if (!cloudSync.lastLocalChangeAt) {
    return false;
  }

  const localChangeMs = new Date(cloudSync.lastLocalChangeAt).getTime();
  const localSyncedMs = cloudSync.lastSyncedAt ? new Date(cloudSync.lastSyncedAt).getTime() : 0;
  const remoteStampMs = remoteStamp ? new Date(remoteStamp).getTime() : 0;

  return localChangeMs > Math.max(localSyncedMs, remoteStampMs);
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
  const remotePullInFlightRef = useRef(false);
  const remoteSaveInFlightRef = useRef(false);
  const lastRemotePullAtRef = useRef(0);

  const persistRemoteSnapshot = async (reasonOverride?: RemoteSaveReason) => {
    if (!hasHydrated || !isConfigured || status !== "authenticated" || !userId) {
      return null;
    }

    if (initialSyncInFlightRef.current || remoteSaveInFlightRef.current) {
      return null;
    }

    const currentState = useBossFitStore.getState();
    if (currentState.cloudSync.userId && currentState.cloudSync.userId !== userId) {
      return null;
    }

    const nextSnapshot = buildSnapshotFromStore(currentState);
    const nextSignature = JSON.stringify(nextSnapshot);
    const hasUnsyncedChanges = hasUnsyncedCloudChanges(currentState.cloudSync);

    if (!hasUnsyncedChanges && nextSignature === lastSyncedSignatureRef.current) {
      return null;
    }

    remoteSaveInFlightRef.current = true;

    try {
      const saveReason = reasonOverride ?? currentState.cloudSync.pendingRemoteReason ?? "sync";
      const saved = await saveRemoteState(userId, nextSnapshot, { reason: saveReason });
      writeCachedUserSnapshot(userId, nextSnapshot, {
        lastSyncedAt: saved.lastSyncedAt,
        updatedAt: saved.updatedAt
      });
      lastSyncedSignatureRef.current = nextSignature;
      setCloudSyncState({
        userId,
        lastSyncedAt: saved.lastSyncedAt,
        lastLocalChangeAt: saved.lastSyncedAt,
        pendingRemoteReason: undefined
      });

      return saved;
    } finally {
      remoteSaveInFlightRef.current = false;
    }
  };

  const applyRemoteState = async (remote: BossFitRemoteState, currentUserId: string) => {
    const syncedAt = remote.lastSyncedAt ?? remote.updatedAt ?? new Date().toISOString();
    const nextState: BossFitPersistedState = {
      ...remote.snapshot,
      cloudSync: {
        userId: currentUserId,
        lastSyncedAt: syncedAt,
        lastLocalChangeAt: syncedAt,
        pendingRemoteReason: undefined
      }
    };

    skipNextSyncRef.current = true;
    replacePersistedState(nextState);

    let cacheMetadata = {
      lastSyncedAt: remote.lastSyncedAt,
      updatedAt: remote.updatedAt
    };

    if (remote.source === "history") {
      try {
        const repaired = await saveRemoteState(currentUserId, remote.snapshot, { reason: "recovery" });
        cacheMetadata = {
          lastSyncedAt: repaired.lastSyncedAt,
          updatedAt: repaired.updatedAt
        };
        setCloudSyncState({
          userId: currentUserId,
          lastSyncedAt: repaired.lastSyncedAt,
          lastLocalChangeAt: repaired.lastSyncedAt,
          pendingRemoteReason: undefined
        });
      } catch (error) {
        logSupabaseError("BossFit: no se pudo reparar el snapshot remoto desde el historial.", error);
      }
    }

    writeCachedUserSnapshot(currentUserId, remote.snapshot, cacheMetadata);
    lastSyncedSignatureRef.current = JSON.stringify(remote.snapshot);
  };

  const pullRemoteStateIfNeeded = async (force = false) => {
    if (!hasHydrated || !isConfigured || status !== "authenticated" || !userId) {
      return;
    }

    if (initialSyncInFlightRef.current || remotePullInFlightRef.current) {
      return;
    }

    const nowMs = Date.now();
    if (!force && nowMs - lastRemotePullAtRef.current < remotePullMinGapMs) {
      return;
    }

    const currentState = useBossFitStore.getState();
    if (currentState.cloudSync.userId && currentState.cloudSync.userId !== userId) {
      return;
    }

    remotePullInFlightRef.current = true;
    lastRemotePullAtRef.current = nowMs;

    try {
      const localSnapshot = buildSnapshotFromStore(currentState);
      const localSignature = JSON.stringify(localSnapshot);
      const remote = await fetchRemoteState(userId);

      if (!remote) {
        return;
      }

      const remoteSignature = JSON.stringify(remote.snapshot);
      const remoteStamp = getRemoteStamp(remote);
      const localUnsynced = hasUnsyncedCloudChanges(currentState.cloudSync, remoteStamp);

      if (localUnsynced) {
        return;
      }

      const remoteStampMs = remoteStamp ? new Date(remoteStamp).getTime() : 0;
      const localSyncedMs = currentState.cloudSync.lastSyncedAt
        ? new Date(currentState.cloudSync.lastSyncedAt).getTime()
        : 0;
      const remoteHasNewerStamp = remoteStampMs > localSyncedMs;
      const remoteDiffers = remoteSignature !== localSignature;

      if (!remoteHasNewerStamp && !remoteDiffers) {
        return;
      }

      if (!remoteDiffers && remoteHasNewerStamp) {
        setCloudSyncState({
          userId,
          lastSyncedAt: remoteStamp ?? undefined,
          lastLocalChangeAt: currentState.cloudSync.lastLocalChangeAt ?? remoteStamp ?? undefined,
          pendingRemoteReason: undefined
        });
        lastSyncedSignatureRef.current = remoteSignature;
        return;
      }

      if (remoteDiffers && (remoteHasNewerStamp || !hasMeaningfulSnapshotData(localSnapshot) || force)) {
        await applyRemoteState(remote, userId);
      }
    } catch (error) {
      logSupabaseError("BossFit: no se pudo refrescar el estado remoto del usuario.", error);
    } finally {
      remotePullInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!hasHydrated || !isConfigured) {
      return;
    }

    if (status !== "authenticated" || !userId) {
      activeUserIdRef.current = null;
      lastSyncedSignatureRef.current = "";
      initialSyncInFlightRef.current = false;
      remotePullInFlightRef.current = false;
      remoteSaveInFlightRef.current = false;
      lastRemotePullAtRef.current = 0;
      return;
    }

    if (activeUserIdRef.current === userId) {
      return;
    }

    activeUserIdRef.current = userId;
    initialSyncInFlightRef.current = true;
    lastRemotePullAtRef.current = 0;
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
      const localUnsyncedAtStart =
        localStateOwnedByCurrentUser && hasUnsyncedCloudChanges(stateAtStart.cloudSync);
      const switchingUsers = Boolean(
        stateAtStart.cloudSync.userId && stateAtStart.cloudSync.userId !== userId
      );
      const canRestoreFromCache = switchingUsers || !localStateOwnedByCurrentUser;
      const shouldSeedFromCache =
        canRestoreFromCache && cachedHasMeaningfulData && !localHasMeaningfulData && !localUnsyncedAtStart;

      if (switchingUsers || shouldSeedFromCache) {
        skipNextSyncRef.current = true;

        if (canRestoreFromCache && cachedUserSnapshot && cachedHasMeaningfulData) {
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
              lastLocalChangeAt: cachedSyncedAt,
              pendingRemoteReason: undefined
            }
          });
          lastSyncedSignatureRef.current = JSON.stringify(cachedUserSnapshot.snapshot);
        } else {
          lastSyncedSignatureRef.current = emptySnapshotSignature;
          replacePersistedState({
            ...createInitialPersistedState(),
            theme: currentTheme,
            cloudSync: {
              userId,
              pendingRemoteReason: undefined
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
        const hasLocalData =
          currentStateOwnedByCurrentUser && hasMeaningfulSnapshotData(currentLocalSnapshot);
        const localUnsynced =
          currentStateOwnedByCurrentUser &&
          hasUnsyncedCloudChanges(currentState.cloudSync, remoteStamp);

        if (!remote) {
          if (hasLocalData) {
            const saved = await saveRemoteState(userId, currentLocalSnapshot, {
              reason: currentState.cloudSync.pendingRemoteReason ?? "bootstrap"
            });
            if (cancelled) {
              return;
            }

            setCloudSyncState({
              userId,
              lastSyncedAt: saved.lastSyncedAt,
              lastLocalChangeAt: saved.lastSyncedAt,
              pendingRemoteReason: undefined
            });
            writeCachedUserSnapshot(userId, currentLocalSnapshot, {
              lastSyncedAt: saved.lastSyncedAt,
              updatedAt: saved.updatedAt
            });
            lastSyncedSignatureRef.current = localSnapshotSignature;
            return;
          }

          if (canRestoreFromCache && cachedUserSnapshot && cachedHasMeaningfulData) {
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
                lastLocalChangeAt: cachedSyncedAt,
                pendingRemoteReason: undefined
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
              lastLocalChangeAt: syncedAt,
              pendingRemoteReason: undefined
            }
          });
          lastSyncedSignatureRef.current = emptySnapshotSignature;
          return;
        }

        if (localUnsynced) {
          const saved = await saveRemoteState(userId, currentLocalSnapshot, {
            reason: currentState.cloudSync.pendingRemoteReason ?? "sync"
          });
          if (cancelled) {
            return;
          }

          setCloudSyncState({
            userId,
            lastSyncedAt: saved.lastSyncedAt,
            lastLocalChangeAt: saved.lastSyncedAt,
            pendingRemoteReason: undefined
          });
          writeCachedUserSnapshot(userId, currentLocalSnapshot, {
            lastSyncedAt: saved.lastSyncedAt,
            updatedAt: saved.updatedAt
          });
          lastSyncedSignatureRef.current = localSnapshotSignature;
          return;
        }

        await applyRemoteState(remote, userId);
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
    cloudSync.pendingRemoteReason,
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

    if (snapshotSignature === lastSyncedSignatureRef.current && !hasUnsyncedCloudChanges(cloudSync)) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      if (initialSyncInFlightRef.current) {
        return;
      }

      try {
        await persistRemoteSnapshot();
      } catch (error) {
        logSupabaseError("BossFit: no se pudo guardar el progreso en Supabase.", error);
      }
    }, syncDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    cloudSync.lastLocalChangeAt,
    cloudSync.lastSyncedAt,
    cloudSync.pendingRemoteReason,
    cloudSync.userId,
    hasHydrated,
    isConfigured,
    snapshotSignature,
    status,
    userId
  ]);

  useEffect(() => {
    if (!hasHydrated || !isConfigured || status !== "authenticated" || !userId) {
      return;
    }

    const handleForegroundSync = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      void pullRemoteStateIfNeeded(true);
    };

    const handleBackgroundFlush = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        return;
      }

      void persistRemoteSnapshot("pagehide");
    };

    const handlePageHide = () => {
      void persistRemoteSnapshot("pagehide");
    };

    const intervalId = window.setInterval(() => {
      void pullRemoteStateIfNeeded(false);
    }, remotePullIntervalMs);

    window.addEventListener("focus", handleForegroundSync);
    window.addEventListener("pageshow", handleForegroundSync);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);
    document.addEventListener("visibilitychange", handleForegroundSync);
    document.addEventListener("visibilitychange", handleBackgroundFlush);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleForegroundSync);
      window.removeEventListener("pageshow", handleForegroundSync);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      document.removeEventListener("visibilitychange", handleForegroundSync);
      document.removeEventListener("visibilitychange", handleBackgroundFlush);
    };
  }, [hasHydrated, isConfigured, status, userId]);

  return null;
}
