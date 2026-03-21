"use client";

import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { fetchRemoteState, logSupabaseError } from "@/lib/supabase/data";
import { applyEmptyStateToStore, applyRemoteStateToStore, hydrateStoreForUser } from "@/lib/supabase/hydrate-store";
import { useBossFitStore } from "@/store/use-bossfit-store";

const initialFetchAttempts = 4;
const initialFetchRetryDelayMs = 300;
const remotePullIntervalMs = 12000;
const remotePullMinGapMs = 4000;

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

export function SupabaseSync() {
  const { user, status, isConfigured } = useSupabaseAuth();
  const userId = user?.id ?? null;
  const { hasHydrated, cloudSync } = useBossFitStore(
    useShallow((state) => ({
      hasHydrated: state.hasHydrated,
      cloudSync: state.cloudSync
    }))
  );

  const activeUserIdRef = useRef<string | null>(null);
  const initialSyncInFlightRef = useRef(false);
  const remotePullInFlightRef = useRef(false);
  const lastRemotePullAtRef = useRef(0);
  const lastAppliedSignatureRef = useRef("");

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    if (status !== "authenticated" || !userId) {
      activeUserIdRef.current = null;
      initialSyncInFlightRef.current = false;
      remotePullInFlightRef.current = false;
      lastRemotePullAtRef.current = 0;
      lastAppliedSignatureRef.current = "";
      applyEmptyStateToStore();
      return;
    }

    if (activeUserIdRef.current === userId && hasHydrated) {
      return;
    }

    activeUserIdRef.current = userId;
    initialSyncInFlightRef.current = true;
    let cancelled = false;

    const initialSync = async () => {
      try {
        for (let attempt = 0; attempt < initialFetchAttempts; attempt += 1) {
          const result = await hydrateStoreForUser(userId);
          if (cancelled) {
            return;
          }

          if (result.source !== "empty" || attempt === initialFetchAttempts - 1) {
            const currentState = useBossFitStore.getState();
            lastAppliedSignatureRef.current = JSON.stringify({
              habits: currentState.habits,
              completions: currentState.completions,
              theme: currentState.theme,
              reminderSettings: currentState.reminderSettings,
              revision: currentState.cloudSync.revision ?? 0
            });
            return;
          }

          await wait(initialFetchRetryDelayMs * (attempt + 1));
        }
      } catch (error) {
        logSupabaseError("BossFit: no se pudo cargar el estado inicial desde Supabase.", error);
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
  }, [hasHydrated, isConfigured, status, userId]);

  useEffect(() => {
    if (!hasHydrated || !isConfigured || status !== "authenticated" || !userId) {
      return;
    }

    const pullRemoteStateIfNeeded = async (force = false) => {
      if (initialSyncInFlightRef.current || remotePullInFlightRef.current) {
        return;
      }

      const nowMs = Date.now();
      if (!force && nowMs - lastRemotePullAtRef.current < remotePullMinGapMs) {
        return;
      }

      remotePullInFlightRef.current = true;
      lastRemotePullAtRef.current = nowMs;

      try {
        const remote = await fetchRemoteState(userId);
        if (!remote) {
          return;
        }

        const nextSignature = JSON.stringify({
          ...remote.snapshot,
          revision: remote.revision,
          lastSyncedAt: remote.lastSyncedAt,
          updatedAt: remote.updatedAt
        });
        const currentRevision = cloudSync.revision ?? 0;
        const currentSyncedAt = cloudSync.lastSyncedAt ?? "";
        const remoteSyncedAt = remote.lastSyncedAt ?? remote.updatedAt ?? "";
        const shouldApply =
          force ||
          remote.revision > currentRevision ||
          remoteSyncedAt > currentSyncedAt ||
          nextSignature !== lastAppliedSignatureRef.current;

        if (!shouldApply) {
          return;
        }

        applyRemoteStateToStore({ userId, state: remote });
        lastAppliedSignatureRef.current = nextSignature;
      } catch (error) {
        logSupabaseError("BossFit: no se pudo refrescar el estado remoto del usuario.", error);
      } finally {
        remotePullInFlightRef.current = false;
      }
    };

    const handleForegroundSync = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      void pullRemoteStateIfNeeded(true);
    };

    const intervalId = window.setInterval(() => {
      void pullRemoteStateIfNeeded(false);
    }, remotePullIntervalMs);

    window.addEventListener("focus", handleForegroundSync);
    window.addEventListener("pageshow", handleForegroundSync);
    document.addEventListener("visibilitychange", handleForegroundSync);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleForegroundSync);
      window.removeEventListener("pageshow", handleForegroundSync);
      document.removeEventListener("visibilitychange", handleForegroundSync);
    };
  }, [cloudSync.lastSyncedAt, cloudSync.revision, hasHydrated, isConfigured, status, userId]);

  return null;
}
