"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { toDateKey } from "@/lib/date";
import { getDashboardSnapshot } from "@/lib/habit-logic";
import { getReminderSupport, isReminderDue } from "@/lib/reminders";
import { updateReminderSettingsAction } from "@/lib/supabase/user-state-actions";
import { useBossFitStore } from "@/store/use-bossfit-store";

export function ReminderRunner() {
  const { habits, completions, reminderSettings, hasHydrated } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      completions: state.completions,
      reminderSettings: state.reminderSettings,
      hasHydrated: state.hasHydrated
    }))
  );

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const support = getReminderSupport();
    if (support.permission !== reminderSettings.permission) {
      void updateReminderSettingsAction({
        permission: support.permission,
        enabled: support.permission === "granted" ? reminderSettings.enabled : false
      });
    }
  }, [hasHydrated, reminderSettings.enabled, reminderSettings.permission]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const support = getReminderSupport();
    if (!support.supported || reminderSettings.permission !== "granted" || !reminderSettings.enabled) {
      return;
    }

    const notifyIfNeeded = async () => {
      const now = new Date();
      if (!isReminderDue(reminderSettings, now)) {
        return;
      }

      const snapshot = getDashboardSnapshot(habits, completions, now);
      if (!snapshot.scheduledHabits.length || snapshot.pendingHabits <= 0) {
        await updateReminderSettingsAction({ lastSentDate: toDateKey(now) });
        return;
      }

      const body =
        snapshot.pendingHabits === snapshot.scheduledHabits.length
          ? `Tienes ${snapshot.scheduledHabits.length} ejercicios listos para hoy.`
          : `Te quedan ${snapshot.pendingHabits} ejercicios para cerrar el día.`;

      new Notification("BossFit", {
        body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: `bossfit-${toDateKey(now)}`
      });

      await updateReminderSettingsAction({ lastSentDate: toDateKey(now) });
    };

    void notifyIfNeeded();
    const timer = window.setInterval(() => {
      void notifyIfNeeded();
    }, 60000);
    return () => window.clearInterval(timer);
  }, [completions, habits, hasHydrated, reminderSettings]);

  return null;
}

