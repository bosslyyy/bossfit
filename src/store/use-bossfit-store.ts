"use client";

import { create } from "zustand";

import {
  createInitialPersistedState,
  DEFAULT_CLOUD_SYNC_STATE,
  DEFAULT_REMINDER_SETTINGS,
  type BossFitPersistedState
} from "@/lib/persistence";
import type { AppLocale, CloudSyncState } from "@/types/habit";

interface BossFitState {
  habits: BossFitPersistedState["habits"];
  completions: BossFitPersistedState["completions"];
  theme: BossFitPersistedState["theme"];
  locale: BossFitPersistedState["locale"];
  reminderSettings: BossFitPersistedState["reminderSettings"];
  cloudSync: CloudSyncState;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  replacePersistedState: (values: BossFitPersistedState) => void;
  setCloudSyncState: (values: Partial<CloudSyncState>) => void;
  setLocaleState: (locale: AppLocale) => void;
}

function createStoreState(): Pick<
  BossFitState,
  "habits" | "completions" | "theme" | "locale" | "reminderSettings" | "cloudSync" | "hasHydrated"
> {
  const initialState = createInitialPersistedState();

  return {
    ...initialState,
    hasHydrated: false
  };
}

export const useBossFitStore = create<BossFitState>()((set) => ({
  ...createStoreState(),
  setHasHydrated: (value) => set({ hasHydrated: value }),
  replacePersistedState: (values) =>
    set({
      habits: values.habits,
      completions: values.completions,
      theme: values.theme,
      locale: values.locale,
      reminderSettings: {
        ...DEFAULT_REMINDER_SETTINGS,
        ...values.reminderSettings
      },
      cloudSync: {
        ...DEFAULT_CLOUD_SYNC_STATE,
        ...values.cloudSync
      },
      hasHydrated: true
    }),
  setCloudSyncState: (values) =>
    set((state) => ({
      cloudSync: {
        ...DEFAULT_CLOUD_SYNC_STATE,
        ...state.cloudSync,
        ...values
      }
    })),
  setLocaleState: (locale) => set({ locale })
}));
