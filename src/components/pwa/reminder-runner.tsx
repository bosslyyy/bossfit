"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { toDateKey } from "@/lib/date";
import { getDashboardSnapshot } from "@/lib/habit-logic";
import { getReminderSupport, isReminderDue } from "@/lib/reminders";
import { useBossFitStore } from "@/store/use-bossfit-store";

export function ReminderRunner() {
  const { habits, completions, reminderSettings, hasHydrated, updateReminderSettings } = useBossFitStore(
    useShallow((state) => ({
      habits: state.habits,
      completions: state.completions,
      reminderSettings: state.reminderSettings,
      hasHydrated: state.hasHydrated,
      updateReminderSettings: state.updateReminderSettings
    }))
  );

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const support = getReminderSupport();
    if (support.permission !== reminderSettings.permission) {
      updateReminderSettings({
        permission: support.permission,
        enabled: support.permission === "granted" ? reminderSettings.enabled : false
      });
    }
  }, [hasHydrated, reminderSettings.enabled, reminderSettings.permission, updateReminderSettings]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const support = getReminderSupport();
    if (!support.supported || reminderSettings.permission !== "granted" || !reminderSettings.enabled) {
      return;
    }

    const notifyIfNeeded = () => {
      const now = new Date();
      if (!isReminderDue(reminderSettings, now)) {
        return;
      }

      const snapshot = getDashboardSnapshot(habits, completions, now);
      if (!snapshot.scheduledHabits.length || snapshot.pendingHabits <= 0) {
        updateReminderSettings({ lastSentDate: toDateKey(now) });
        return;
      }

      const body =
        snapshot.pendingHabits === snapshot.scheduledHabits.length
          ? `Tienes ${snapshot.scheduledHabits.length} hábitos listos para hoy.`
          : `Te quedan ${snapshot.pendingHabits} hábitos para cerrar el día.`;

      new Notification("BossFit", {
        body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: `bossfit-${toDateKey(now)}`
      });

      updateReminderSettings({ lastSentDate: toDateKey(now) });
    };

    notifyIfNeeded();
    const timer = window.setInterval(notifyIfNeeded, 60000);
    return () => window.clearInterval(timer);
  }, [hasHydrated, habits, completions, reminderSettings, updateReminderSettings]);

  return null;
}
