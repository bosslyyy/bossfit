import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { findActiveMembershipByRoles } from "@/lib/supabase/gym-membership-roles";
import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import type { CoachAlert, CoachMemberDetailResponse, CoachMessage, CoachNote } from "@/types/coach";
import type { HabitFormValues } from "@/lib/validation/habit";
import type { CompletionCalendarEntry, Habit } from "@/types/habit";

export type CoachRole = "trainer";

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
}

interface GymMembershipRow {
  id: string;
  gym_id: string;
  user_id: string;
  role: CoachRole;
  status: "active" | "invited" | "paused" | "suspended";
}

interface GymRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface CoachGymContext {
  gymId: string;
  gymName: string;
  gymSlug: string;
  gymActive: boolean;
  role: CoachRole;
  userId: string;
  membershipId: string;
  userEmail?: string;
  displayName?: string;
}

export interface CoachSummary {
  assignedMembers: number;
  completedToday: number;
  activeToday: number;
  averageCompliance: number;
  averageStreak: number;
}

export interface CoachMemberOverview {
  userId: string;
  assignmentId: string;
  name: string;
  email: string;
  groupName: string;
  planName: string;
  assignmentStatus: string;
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  level: number;
  weeklyCompliance: number;
  lastActivityLabel: string;
  activeHabits: number;
  completedToday: number;
  scheduledToday: number;
  recentDays: CompletionCalendarEntry[];
  habits: Habit[];
}

export interface CoachOverviewResponse {
  context: CoachGymContext;
  summary: CoachSummary;
  members: CoachMemberOverview[];
}

function getSupabase() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  return supabase;
}

function mapError(error: unknown) {
  const info = getSupabaseErrorInfo(error);
  return new Error(info.message);
}

function profileName(profile?: ProfileRow | null, fallback?: string) {
  return profile?.display_name || profile?.full_name || profile?.email || fallback || "Sin nombre";
}

export async function fetchActiveCoachGymContext(userId: string): Promise<CoachGymContext | null> {
  const supabase = getSupabase();
  const { data: memberships, error: membershipsError } = await supabase
    .from("gym_memberships")
    .select("id, gym_id, user_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipsError) {
    throw mapError(membershipsError);
  }

  const match = await findActiveMembershipByRoles(supabase, (memberships ?? []) as GymMembershipRow[], ["trainer"]);
  const membership = match?.membership;
  if (!membership) {
    return null;
  }

  const [{ data: gym, error: gymError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("gyms").select("id, name, slug, active").eq("id", membership.gym_id).maybeSingle(),
    supabase.from("profiles").select("user_id, email, full_name, display_name").eq("user_id", userId).maybeSingle()
  ]);

  if (gymError) {
    throw mapError(gymError);
  }

  if (profileError) {
    throw mapError(profileError);
  }

  const gymRow = gym as GymRow | null;
  const profileRow = profile as ProfileRow | null;

  if (!gymRow) {
    return null;
  }

  return {
    gymId: gymRow.id,
    gymName: gymRow.name,
    gymSlug: gymRow.slug,
    gymActive: gymRow.active,
    role: "trainer",
    userId,
    membershipId: membership.id,
    userEmail: profileRow?.email ?? undefined,
    displayName: profileName(profileRow)
  };
}

async function requestCoachJson<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; details?: string | null; hint?: string | null; code?: string | null }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "No se pudo completar la operación del panel coach.");
  }

  return payload as T;
}

export function fetchCoachOverview(accessToken: string, gymId: string) {
  const params = new URLSearchParams({
    gymId,
    t: Date.now().toString()
  });

  return requestCoachJson<CoachOverviewResponse>(`/api/coach/overview?${params.toString()}`, accessToken);
}

export function fetchCoachMemberDetail(accessToken: string, memberUserId: string, month?: string) {
  const params = new URLSearchParams({ t: Date.now().toString() });
  if (month) {
    params.set("month", month);
  }

  return requestCoachJson<CoachMemberDetailResponse>(`/api/coach/members/${memberUserId}/detail?${params.toString()}`, accessToken);
}

export function createCoachHabit(accessToken: string, memberUserId: string, values: HabitFormValues) {
  return requestCoachJson<{ habit: Habit }>(`/api/coach/members/${memberUserId}/habits`, accessToken, {
    method: "POST",
    body: JSON.stringify(values)
  });
}

export function updateCoachHabit(
  accessToken: string,
  memberUserId: string,
  habitId: string,
  values: HabitFormValues
) {
  return requestCoachJson<{ habit: Habit }>(`/api/coach/members/${memberUserId}/habits`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ habitId, values })
  });
}

export function deleteCoachHabit(accessToken: string, memberUserId: string, habitId: string) {
  const path = `/api/coach/members/${memberUserId}/habits?habitId=${encodeURIComponent(habitId)}`;
  return requestCoachJson<{ success: true }>(path, accessToken, {
    method: "DELETE"
  });
}

export function createCoachNote(accessToken: string, memberUserId: string, values: Omit<CoachNote, "id" | "createdAt" | "updatedAt" | "archivedAt">) {
  return requestCoachJson<{ notes: CoachNote[] }>(`/api/coach/members/${memberUserId}/notes`, accessToken, {
    method: "POST",
    body: JSON.stringify(values)
  });
}

export function updateCoachNote(accessToken: string, memberUserId: string, payload: { noteId: string; title?: string; body?: string; noteType?: CoachNote["noteType"]; pinned?: boolean; archived?: boolean; }) {
  return requestCoachJson<{ notes: CoachNote[] }>(`/api/coach/members/${memberUserId}/notes`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function createCoachAlert(accessToken: string, memberUserId: string, values: { title: string; body: string; severity: CoachAlert["severity"]; expiresAt?: string | null; }) {
  return requestCoachJson<{ alerts: CoachAlert[] }>(`/api/coach/members/${memberUserId}/alerts`, accessToken, {
    method: "POST",
    body: JSON.stringify(values)
  });
}

export function updateCoachAlert(accessToken: string, memberUserId: string, payload: { alertId: string; title?: string; body?: string; severity?: CoachAlert["severity"]; expiresAt?: string | null; archived?: boolean; dismissed?: boolean; markRead?: boolean; }) {
  return requestCoachJson<{ alerts: CoachAlert[] }>(`/api/coach/members/${memberUserId}/alerts`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function sendCoachMessage(accessToken: string, memberUserId: string, body: string) {
  return requestCoachJson<{ messages: CoachMessage[] }>(`/api/coach/members/${memberUserId}/messages`, accessToken, {
    method: "POST",
    body: JSON.stringify({ body })
  });
}

