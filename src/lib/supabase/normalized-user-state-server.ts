import type { SupabaseClient } from "@supabase/supabase-js";

import { SnapshotMutationError, type CompletionMutationResult, type UndoMutationResult } from "@/lib/bossfit/snapshot-actions";
import { DEFAULT_REMINDER_SETTINGS } from "@/lib/persistence";
import type { BossFitRemoteState } from "@/lib/supabase/data";
import { syncUserProjectionFromNormalizedState } from "@/lib/supabase/user-state-server";
import { generateId } from "@/lib/utils";
import type { HabitFormValues } from "@/lib/validation/habit";
import type { Habit, ReminderSettings, ThemeMode } from "@/types/habit";

const SETTINGS_TABLE = "bossfit_user_settings";
const HABITS_TABLE = "bossfit_habits";
const COMPLETIONS_TABLE = "bossfit_habit_completions";

interface HabitRow {
  habit_id: string;
  name: string;
  category: Habit["category"] | null;
  tracking_mode: Habit["trackingMode"];
  target_sets: number;
  reps_per_set: number;
  seconds_per_set: number | null;
  rest_enabled: boolean;
  rest_seconds: number | null;
  selected_days: string[] | null;
  is_active: boolean;
  color: Habit["color"];
  icon: Habit["icon"];
  level: Habit["level"] | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface ReminderSettingsRow {
  theme: ThemeMode;
  reminder_enabled: boolean;
  reminder_time: string;
  reminder_permission: ReminderSettings["permission"];
  reminder_last_sent_date: string | null;
}

interface RpcCompletionMutationRow {
  completed_sets: number;
  just_completed?: boolean;
}

interface NormalizedActionResult<TResult> {
  state: BossFitRemoteState;
  result: TResult;
}

function normalizeReminderSettings(row: ReminderSettingsRow | null): ReminderSettings {
  return {
    ...DEFAULT_REMINDER_SETTINGS,
    enabled: row?.reminder_enabled ?? DEFAULT_REMINDER_SETTINGS.enabled,
    time: row?.reminder_time ?? DEFAULT_REMINDER_SETTINGS.time,
    permission: row?.reminder_permission ?? DEFAULT_REMINDER_SETTINGS.permission,
    lastSentDate: row?.reminder_last_sent_date ?? undefined
  };
}

async function fetchHabitRow(supabase: SupabaseClient, userId: string, habitId: string) {
  const { data, error } = await supabase
    .from(HABITS_TABLE)
    .select(
      "habit_id, name, category, tracking_mode, target_sets, reps_per_set, seconds_per_set, rest_enabled, rest_seconds, selected_days, is_active, color, icon, level, created_at, updated_at, archived_at"
    )
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as HabitRow | null) ?? null;
}

function rowToHabit(row: HabitRow): Habit {
  return {
    id: row.habit_id,
    name: row.name,
    category: row.category ?? undefined,
    trackingMode: row.tracking_mode,
    targetSets: row.target_sets,
    repsPerSet: row.reps_per_set,
    secondsPerSet: row.seconds_per_set ?? undefined,
    restEnabled: row.rest_enabled,
    restSeconds: row.rest_enabled ? row.rest_seconds ?? 60 : undefined,
    selectedDays: (row.selected_days ?? []) as Habit["selectedDays"],
    active: row.is_active,
    color: row.color,
    icon: row.icon,
    level: row.level ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function syncState(supabase: SupabaseClient, userId: string, reason: "sync" | "reset" | "recovery") {
  return syncUserProjectionFromNormalizedState(supabase, userId, { reason });
}

async function upsertReminderSettingsRow(
  supabase: SupabaseClient,
  userId: string,
  values: Partial<ReminderSettingsRow>
) {
  const { data: currentRow, error: currentError } = await supabase
    .from(SETTINGS_TABLE)
    .select("theme, reminder_enabled, reminder_time, reminder_permission, reminder_last_sent_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (currentError) {
    throw currentError;
  }

  const normalizedCurrentRow = (currentRow as ReminderSettingsRow | null) ?? null;
  const current = normalizeReminderSettings(normalizedCurrentRow);
  const currentTheme = normalizedCurrentRow?.theme ?? "light";

  const payload = {
    user_id: userId,
    theme: values.theme ?? currentTheme,
    reminder_enabled: values.reminder_enabled ?? current.enabled,
    reminder_time: values.reminder_time ?? current.time,
    reminder_permission: values.reminder_permission ?? current.permission,
    reminder_last_sent_date:
      values.reminder_last_sent_date === undefined
        ? current.lastSentDate ?? null
        : values.reminder_last_sent_date
  };

  const { error } = await supabase.from(SETTINGS_TABLE).upsert(payload, { onConflict: "user_id" });

  if (error) {
    throw error;
  }
}

export async function createUserHabit(
  supabase: SupabaseClient,
  userId: string,
  values: HabitFormValues
): Promise<NormalizedActionResult<{ habitId: string; habit: Habit }>> {
  const timestamp = new Date().toISOString();
  const habitId = generateId("habit");

  const row = {
    user_id: userId,
    habit_id: habitId,
    name: values.name,
    category: values.category ?? null,
    tracking_mode: values.trackingMode,
    target_sets: values.targetSets,
    reps_per_set: values.repsPerSet,
    seconds_per_set: values.secondsPerSet ?? null,
    rest_enabled: values.restEnabled,
    rest_seconds: values.restEnabled ? values.restSeconds ?? 60 : null,
    selected_days: values.selectedDays,
    is_active: values.active,
    color: values.color,
    icon: values.icon,
    level: values.level ?? null,
    created_at: timestamp,
    updated_at: timestamp,
    archived_at: null
  };

  const { error } = await supabase.from(HABITS_TABLE).insert(row);
  if (error) {
    throw error;
  }

  const state = await syncState(supabase, userId, "sync");
  const habit = rowToHabit(row as HabitRow);
  return {
    state,
    result: {
      habitId,
      habit
    }
  };
}

export async function updateUserHabit(
  supabase: SupabaseClient,
  userId: string,
  habitId: string,
  values: HabitFormValues
): Promise<NormalizedActionResult<{ habitId: string }>> {
  const existing = await fetchHabitRow(supabase, userId, habitId);
  if (!existing) {
    throw new SnapshotMutationError("No encontramos ese habito.");
  }

  const { error } = await supabase
    .from(HABITS_TABLE)
    .update({
      name: values.name,
      category: values.category ?? null,
      tracking_mode: values.trackingMode,
      target_sets: values.targetSets,
      reps_per_set: values.repsPerSet,
      seconds_per_set: values.secondsPerSet ?? null,
      rest_enabled: values.restEnabled,
      rest_seconds: values.restEnabled ? values.restSeconds ?? 60 : null,
      selected_days: values.selectedDays,
      is_active: values.active,
      color: values.color,
      icon: values.icon,
      level: values.level ?? null,
      updated_at: new Date().toISOString(),
      archived_at: null
    })
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .is("archived_at", null);

  if (error) {
    throw error;
  }

  const state = await syncState(supabase, userId, "sync");
  return { state, result: { habitId } };
}

export async function archiveUserHabit(
  supabase: SupabaseClient,
  userId: string,
  habitId: string
): Promise<NormalizedActionResult<{ habitId: string }>> {
  const timestamp = new Date().toISOString();
  const existing = await fetchHabitRow(supabase, userId, habitId);
  if (!existing) {
    throw new SnapshotMutationError("No encontramos ese habito.");
  }

  const { error: habitError } = await supabase
    .from(HABITS_TABLE)
    .update({
      is_active: false,
      updated_at: timestamp,
      archived_at: timestamp
    })
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .is("archived_at", null);

  if (habitError) {
    throw habitError;
  }

  const { error: completionsError } = await supabase
    .from(COMPLETIONS_TABLE)
    .update({
      deleted_at: timestamp,
      updated_at: timestamp
    })
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .is("deleted_at", null);

  if (completionsError) {
    throw completionsError;
  }

  const state = await syncState(supabase, userId, "sync");
  return { state, result: { habitId } };
}

export async function toggleUserHabitActive(
  supabase: SupabaseClient,
  userId: string,
  habitId: string
): Promise<NormalizedActionResult<{ habitId: string; active: boolean }>> {
  const existing = await fetchHabitRow(supabase, userId, habitId);
  if (!existing) {
    throw new SnapshotMutationError("No encontramos ese habito.");
  }

  const active = !existing.is_active;
  const { error } = await supabase
    .from(HABITS_TABLE)
    .update({
      is_active: active,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .is("archived_at", null);

  if (error) {
    throw error;
  }

  const state = await syncState(supabase, userId, "sync");
  return { state, result: { habitId, active } };
}

function pickFirstRpcRow<T>(data: T[] | null): T | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0] ?? null;
}

export async function completeUserHabitSet(
  supabase: SupabaseClient,
  userId: string,
  habitId: string,
  dateKey: string
): Promise<NormalizedActionResult<CompletionMutationResult>> {
  const { data, error } = await supabase.rpc("bossfit_increment_habit_completion", {
    p_user_id: userId,
    p_habit_id: habitId,
    p_date: dateKey
  });

  if (error) {
    throw error;
  }

  const row = pickFirstRpcRow(data as RpcCompletionMutationRow[] | null);
  if (!row) {
    throw new SnapshotMutationError("No encontramos ese habito.");
  }

  const state = await syncState(supabase, userId, "sync");
  return {
    state,
    result: {
      completedSets: row.completed_sets,
      justCompleted: Boolean(row.just_completed)
    }
  };
}

export async function undoUserHabitSet(
  supabase: SupabaseClient,
  userId: string,
  habitId: string,
  dateKey: string
): Promise<NormalizedActionResult<UndoMutationResult>> {
  const { data, error } = await supabase.rpc("bossfit_decrement_habit_completion", {
    p_user_id: userId,
    p_habit_id: habitId,
    p_date: dateKey
  });

  if (error) {
    throw error;
  }

  const row = pickFirstRpcRow(data as RpcCompletionMutationRow[] | null);
  if (!row) {
    throw new SnapshotMutationError("No encontramos ese habito.");
  }

  const state = await syncState(supabase, userId, "sync");
  return {
    state,
    result: {
      completedSets: row.completed_sets
    }
  };
}

export async function resetUserHabitCompletion(
  supabase: SupabaseClient,
  userId: string,
  habitId: string,
  dateKey: string
): Promise<NormalizedActionResult<{ habitId: string; dateKey: string }>> {
  const { error } = await supabase.rpc("bossfit_reset_habit_completion", {
    p_user_id: userId,
    p_habit_id: habitId,
    p_date: dateKey
  });

  if (error) {
    throw error;
  }

  const state = await syncState(supabase, userId, "sync");
  return { state, result: { habitId, dateKey } };
}

export async function setUserThemePreference(
  supabase: SupabaseClient,
  userId: string,
  theme: ThemeMode
): Promise<NormalizedActionResult<{ theme: ThemeMode }>> {
  await upsertReminderSettingsRow(supabase, userId, { theme });
  const state = await syncState(supabase, userId, "sync");
  return { state, result: { theme } };
}

export async function updateUserReminderSettingsPreference(
  supabase: SupabaseClient,
  userId: string,
  values: Partial<ReminderSettings>
): Promise<NormalizedActionResult<{ reminderSettings: ReminderSettings }>> {
  await upsertReminderSettingsRow(supabase, userId, {
    reminder_enabled: values.enabled,
    reminder_time: values.time,
    reminder_permission: values.permission,
    reminder_last_sent_date: values.lastSentDate === undefined ? undefined : values.lastSentDate
  });

  const state = await syncState(supabase, userId, "sync");
  return {
    state,
    result: {
      reminderSettings: state.snapshot.reminderSettings
    }
  };
}

export async function resetUserAppData(
  supabase: SupabaseClient,
  userId: string
): Promise<NormalizedActionResult<{ reset: true }>> {
  const timestamp = new Date().toISOString();

  const { error: habitsError } = await supabase
    .from(HABITS_TABLE)
    .update({
      is_active: false,
      updated_at: timestamp,
      archived_at: timestamp
    })
    .eq("user_id", userId)
    .is("archived_at", null);

  if (habitsError) {
    throw habitsError;
  }

  const { error: completionsError } = await supabase
    .from(COMPLETIONS_TABLE)
    .update({
      deleted_at: timestamp,
      updated_at: timestamp
    })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (completionsError) {
    throw completionsError;
  }

  const state = await syncState(supabase, userId, "reset");
  return { state, result: { reset: true } };
}





