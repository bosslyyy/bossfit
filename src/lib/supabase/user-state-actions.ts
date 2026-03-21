import type { HabitFormValues } from "@/lib/validation/habit";
import type { ReminderSettings, ThemeMode } from "@/types/habit";
import { toDateKey } from "@/lib/date";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { applyRemoteStateToStore } from "@/lib/supabase/hydrate-store";
import { getSupabaseErrorInfo, type BossFitRemoteState } from "@/lib/supabase/data";

interface ActionResponse<TResult> {
  userId: string;
  state: BossFitRemoteState;
  result: TResult;
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("No hay una sesion activa para actualizar tu cuenta.");
  }

  return accessToken;
}

async function runUserStateAction<TResult>(body: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/user-state/actions", {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(getSupabaseErrorInfo(payload).message);
  }

  const parsed = payload as unknown as ActionResponse<TResult>;
  applyRemoteStateToStore({ userId: parsed.userId, state: parsed.state });
  return parsed.result;
}

export function createHabitAction(values: HabitFormValues) {
  return runUserStateAction<{ habitId: string }>({
    type: "create_habit",
    values
  });
}

export function updateHabitAction(habitId: string, values: HabitFormValues) {
  return runUserStateAction<{ habitId: string }>({
    type: "update_habit",
    habitId,
    values
  });
}

export function deleteHabitAction(habitId: string) {
  return runUserStateAction<{ habitId: string }>({
    type: "delete_habit",
    habitId
  });
}

export function toggleHabitActiveAction(habitId: string) {
  return runUserStateAction<{ habitId: string; active: boolean }>({
    type: "toggle_habit_active",
    habitId
  });
}

export function completeSetAction(habitId: string, dateKey?: string) {
  return runUserStateAction<{ completedSets: number; justCompleted: boolean }>({
    type: "complete_set",
    habitId,
    dateKey: dateKey ?? toDateKey()
  });
}

export function undoSetAction(habitId: string, dateKey?: string) {
  return runUserStateAction<{ completedSets: number }>({
    type: "undo_set",
    habitId,
    dateKey: dateKey ?? toDateKey()
  });
}

export function resetCompletionAction(habitId: string, dateKey?: string) {
  return runUserStateAction<{ habitId: string; dateKey: string }>({
    type: "reset_completion",
    habitId,
    dateKey: dateKey ?? toDateKey()
  });
}

export function setThemeAction(theme: ThemeMode) {
  return runUserStateAction<{ theme: ThemeMode }>({
    type: "set_theme",
    theme
  });
}

export function updateReminderSettingsAction(values: Partial<ReminderSettings>) {
  return runUserStateAction<{ reminderSettings: ReminderSettings }>({
    type: "update_reminder_settings",
    values
  });
}

export function resetAppDataAction() {
  return runUserStateAction<{ reset: true }>({
    type: "reset_app_data"
  });
}
