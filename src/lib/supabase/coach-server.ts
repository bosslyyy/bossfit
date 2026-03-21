import type { SupabaseClient } from "@supabase/supabase-js";

import { findActiveMembershipByRoles } from "@/lib/supabase/gym-membership-roles";

import { toDateKey } from "@/lib/date";
import { getHabitHistory, getHabitProgress, getHabitsForDate } from "@/lib/habit-logic";
import {
  getBossProfile,
  getChartData,
  getCompletionCalendarData,
  getMonthlyCalendarDays,
  getMonthlyHeadline,
  getWeeklySummaryFromTimeline
} from "@/lib/progress-analytics";
import { createEmptyRemoteSnapshot } from "@/lib/supabase/data";
import { fetchRemoteSnapshotForUser } from "@/lib/supabase/server-state";
import type {
  CoachAlert,
  CoachMemberDetailResponse,
  CoachMessage,
  CoachNote,
  MemberInboxResponse
} from "@/types/coach";

interface AssignmentRow {
  id: string;
  gym_id: string;
  member_user_id: string;
  trainer_user_id: string | null;
  group_id: string | null;
  status: "active" | "pending" | "paused";
  assigned_at: string;
}

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
}

interface GymRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

interface GroupRow {
  id: string;
  name: string;
}

interface PlanAssignmentRow {
  member_user_id: string;
  plan_template_id: string;
  active: boolean;
}

interface PlanTemplateRow {
  id: string;
  name: string;
}

interface CoachNoteRow {
  id: string;
  title: string;
  body: string;
  note_type: CoachNote["noteType"];
  pinned: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface AlertRow {
  id: string;
  title: string;
  body: string;
  severity: CoachAlert["severity"];
  created_at: string;
  updated_at: string;
  read_at: string | null;
  dismissed_at: string | null;
  expires_at: string | null;
  archived_at: string | null;
}

interface MessageRow {
  id: string;
  body: string;
  sender_user_id: string;
  sender_role: CoachMessage["senderRole"];
  created_at: string;
  updated_at: string;
  read_at: string | null;
  deleted_at: string | null;
}

export interface CoachMemberAccessContext {
  assignment: AssignmentRow;
  gym: GymRow;
  memberProfile: ProfileRow | null;
  coachProfile: ProfileRow | null;
  group: GroupRow | null;
  planName: string;
}

function profileName(profile?: ProfileRow | null, fallback?: string) {
  return profile?.display_name || profile?.full_name || profile?.email || fallback || "Sin nombre";
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Sin actividad aún";
  }

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getLastActivityLabel(snapshot: Awaited<ReturnType<typeof fetchRemoteSnapshotForUser>>["snapshot"]) {
  const candidates = [
    ...snapshot.completions.flatMap((completion) => [completion.completedAt, completion.updatedAt]),
    ...snapshot.habits.flatMap((habit) => [habit.updatedAt, habit.createdAt])
  ].filter((value): value is string => Boolean(value));

  const latest = candidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  return formatDateTime(latest);
}

function toCoachNote(row: CoachNoteRow): CoachNote {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    noteType: row.note_type,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined
  };
}

function toCoachAlert(row: AlertRow): CoachAlert {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    severity: row.severity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readAt: row.read_at ?? undefined,
    dismissedAt: row.dismissed_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    archivedAt: row.archived_at ?? undefined
  };
}

function toCoachMessage(row: MessageRow): CoachMessage {
  return {
    id: row.id,
    body: row.body,
    senderUserId: row.sender_user_id,
    senderRole: row.sender_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readAt: row.read_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined
  };
}

export async function getCoachMemberAccessContext(
  supabase: SupabaseClient,
  coachUserId: string,
  memberUserId: string
): Promise<CoachMemberAccessContext | null> {
  const { data: assignment, error: assignmentError } = await supabase
    .from("member_assignments")
    .select("id, gym_id, member_user_id, trainer_user_id, group_id, status, assigned_at")
    .eq("member_user_id", memberUserId)
    .eq("trainer_user_id", coachUserId)
    .eq("status", "active")
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    return null;
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("gym_memberships")
    .select("id, gym_id, user_id, role, status, created_at")
    .eq("gym_id", assignment.gym_id)
    .eq("user_id", coachUserId)
    .eq("status", "active");

  if (membershipError) {
    throw membershipError;
  }

  const membership = await findActiveMembershipByRoles(
    supabase,
    (memberships ?? []) as Array<{ id: string; gym_id: string; user_id: string; role: "owner" | "admin" | "trainer" | "member"; status: string }>,
    ["trainer"]
  );

  if (!membership) {
    return null;
  }

  const [{ data: gym, error: gymError }, { data: profiles, error: profilesError }, { data: group, error: groupError }, { data: planAssignment, error: planAssignmentError }] = await Promise.all([
    supabase.from("gyms").select("id, name, slug, active").eq("id", assignment.gym_id).maybeSingle(),
    supabase
      .from("profiles")
      .select("user_id, email, full_name, display_name, username")
      .in("user_id", [coachUserId, memberUserId]),
    assignment.group_id
      ? supabase.from("gym_groups").select("id, name").eq("id", assignment.group_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("plan_assignments")
      .select("member_user_id, plan_template_id, active")
      .eq("gym_id", assignment.gym_id)
      .eq("member_user_id", memberUserId)
      .eq("active", true)
      .maybeSingle()
  ]);

  if (gymError) throw gymError;
  if (profilesError) throw profilesError;
  if (groupError) throw groupError;
  if (planAssignmentError) throw planAssignmentError;
  if (!gym) {
    return null;
  }

  let planName = "Sin plan";
  if (planAssignment?.plan_template_id) {
    const { data: planTemplate, error: planTemplateError } = await supabase
      .from("plan_templates")
      .select("id, name")
      .eq("id", planAssignment.plan_template_id)
      .maybeSingle();

    if (planTemplateError) {
      throw planTemplateError;
    }

    planName = (planTemplate as PlanTemplateRow | null)?.name ?? "Plan activo";
  }

  const profileMap = new Map<string, ProfileRow>();
  for (const profile of ((profiles ?? []) as ProfileRow[])) {
    profileMap.set(profile.user_id, profile);
  }

  return {
    assignment: assignment as AssignmentRow,
    gym: gym as GymRow,
    memberProfile: profileMap.get(memberUserId) ?? null,
    coachProfile: profileMap.get(coachUserId) ?? null,
    group: (group as GroupRow | null) ?? null,
    planName
  };
}

export async function fetchCoachNotesForMember(supabase: SupabaseClient, memberUserId: string) {
  const { data, error } = await supabase
    .from("bossfit_coach_notes")
    .select("id, title, body, note_type, pinned, created_at, updated_at, archived_at")
    .eq("member_user_id", memberUserId)
    .is("archived_at", null)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as CoachNoteRow[]).map(toCoachNote);
}

export async function fetchCoachAlertsForMember(supabase: SupabaseClient, memberUserId: string) {
  const { data, error } = await supabase
    .from("bossfit_member_alerts")
    .select("id, title, body, severity, created_at, updated_at, read_at, dismissed_at, expires_at, archived_at")
    .eq("member_user_id", memberUserId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as AlertRow[]).map(toCoachAlert);
}

export async function fetchCoachMessagesForMember(supabase: SupabaseClient, memberUserId: string) {
  const { data, error } = await supabase
    .from("bossfit_member_messages")
    .select("id, body, sender_user_id, sender_role, created_at, updated_at, read_at, deleted_at")
    .eq("member_user_id", memberUserId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(80);

  if (error) throw error;
  return ((data ?? []) as MessageRow[]).map(toCoachMessage);
}

export async function buildCoachMemberDetail(
  supabase: SupabaseClient,
  access: CoachMemberAccessContext,
  monthAnchor: Date = new Date()
): Promise<CoachMemberDetailResponse> {
  const [{ snapshot, lastSyncedAt, updatedAt }, notes, alerts, messages] = await Promise.all([
    fetchRemoteSnapshotForUser(supabase, access.assignment.member_user_id),
    fetchCoachNotesForMember(supabase, access.assignment.member_user_id),
    fetchCoachAlertsForMember(supabase, access.assignment.member_user_id),
    fetchCoachMessagesForMember(supabase, access.assignment.member_user_id)
  ]);

  const resolvedSnapshot = snapshot ?? createEmptyRemoteSnapshot();
  const today = new Date();
  const todayHabits = getHabitsForDate(resolvedSnapshot.habits, today)
    .map((habit) => {
      const progress = getHabitProgress(habit, resolvedSnapshot.completions, today);
      return {
        habitId: habit.id,
        name: habit.name,
        trackingMode: habit.trackingMode,
        targetSets: habit.targetSets,
        repsPerSet: habit.repsPerSet,
        secondsPerSet: habit.secondsPerSet,
        completedSets: progress.completedSets,
        remainingSets: progress.remainingSets,
        isCompleted: progress.isCompleted,
        color: habit.color,
        icon: habit.icon,
        updatedAt: habit.updatedAt
      };
    })
    .sort((left, right) => {
      if (left.isCompleted !== right.isCompleted) {
        return left.isCompleted ? 1 : -1;
      }
      return left.name.localeCompare(right.name, "es");
    });

  const bossProfile = getBossProfile(resolvedSnapshot.habits, resolvedSnapshot.completions, today);
  const weeklySummary = getWeeklySummaryFromTimeline(resolvedSnapshot.habits, resolvedSnapshot.completions, today);
  const recentDays = getCompletionCalendarData(resolvedSnapshot.habits, resolvedSnapshot.completions, 7, today);
  const chartData = getChartData(resolvedSnapshot.habits, resolvedSnapshot.completions, 7, today);
  const calendarDays = getMonthlyCalendarDays(resolvedSnapshot.habits, resolvedSnapshot.completions, monthAnchor, today);
  const monthLabel = getMonthlyHeadline(monthAnchor);
  const todayCompleted = todayHabits.filter((habit) => habit.isCompleted).length;
  const habitHistory = resolvedSnapshot.habits
    .filter((habit) => habit.active)
    .slice(0, 6)
    .map((habit) => ({
      habit,
      history: getHabitHistory(habit, resolvedSnapshot.completions, 7, today)
    }));

  return {
    member: {
      userId: access.assignment.member_user_id,
      assignmentId: access.assignment.id,
      name: profileName(access.memberProfile, `Alumno ${access.assignment.member_user_id.slice(0, 6)}`),
      email: access.memberProfile?.email ?? "Sin email",
      username: access.memberProfile?.username ?? undefined,
      groupName: access.group?.name ?? "Sin grupo",
      planName: access.planName,
      assignmentStatus: access.assignment.status,
      joinedAt: access.assignment.assigned_at,
      currentStreak: bossProfile.currentStreak,
      bestStreak: bossProfile.bestStreak,
      totalPoints: bossProfile.totalPoints,
      level: bossProfile.levelProgress.level,
      weeklyCompliance: weeklySummary.compliance,
      lastActivityLabel: getLastActivityLabel(resolvedSnapshot),
      activeHabits: resolvedSnapshot.habits.filter((habit) => habit.active).length,
      completedToday: todayCompleted,
      scheduledToday: todayHabits.length
    },
    bossProfile,
    weeklySummary,
    recentDays,
    chartData,
    calendarDays,
    monthLabel,
    liveToday: {
      dateKey: toDateKey(today),
      completedSets: todayHabits.reduce((total, habit) => total + habit.completedSets, 0),
      totalSets: todayHabits.reduce((total, habit) => total + habit.targetSets, 0),
      habits: todayHabits
    },
    habitHistory,
    habits: [...resolvedSnapshot.habits].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    notes,
    alerts,
    messages,
    lastSyncedAt,
    updatedAt
  };
}

export async function getMemberInboxContext(supabase: SupabaseClient, memberUserId: string) {
  const { data: assignment, error: assignmentError } = await supabase
    .from("member_assignments")
    .select("id, gym_id, member_user_id, trainer_user_id, group_id, status, assigned_at")
    .eq("member_user_id", memberUserId)
    .eq("status", "active")
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment || !assignment.trainer_user_id) {
    return null;
  }

  const [{ data: gym, error: gymError }, { data: coachProfile, error: coachProfileError }, { data: group, error: groupError }] = await Promise.all([
    supabase.from("gyms").select("id, name, slug, active").eq("id", assignment.gym_id).maybeSingle(),
    supabase
      .from("profiles")
      .select("user_id, email, full_name, display_name, username")
      .eq("user_id", assignment.trainer_user_id)
      .maybeSingle(),
    assignment.group_id
      ? supabase.from("gym_groups").select("id, name").eq("id", assignment.group_id).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  if (gymError) throw gymError;
  if (coachProfileError) throw coachProfileError;
  if (groupError) throw groupError;
  if (!gym) {
    return null;
  }

  return {
    assignment: assignment as AssignmentRow,
    gym: gym as GymRow,
    coachProfile: (coachProfile as ProfileRow | null) ?? null,
    group: (group as GroupRow | null) ?? null
  };
}

export async function buildMemberInboxData(
  supabase: SupabaseClient,
  memberUserId: string
): Promise<MemberInboxResponse> {
  const context = await getMemberInboxContext(supabase, memberUserId);
  if (!context) {
    return {
      coach: null,
      alerts: [],
      messages: [],
      unreadAlerts: 0,
      unreadMessages: 0
    };
  }

  const [alerts, messages] = await Promise.all([
    fetchCoachAlertsForMember(supabase, memberUserId),
    fetchCoachMessagesForMember(supabase, memberUserId)
  ]);

  const visibleAlerts = alerts.filter((alert) => !alert.archivedAt && !alert.dismissedAt);
  const visibleMessages = messages.filter((message) => !message.deletedAt);

  return {
    coach: {
      userId: context.assignment.trainer_user_id as string,
      name: profileName(context.coachProfile, "Coach activo"),
      email: context.coachProfile?.email ?? "Sin email",
      gymName: context.gym.name,
      groupName: context.group?.name ?? "Sin grupo"
    },
    alerts: visibleAlerts,
    messages: visibleMessages,
    unreadAlerts: visibleAlerts.filter((alert) => !alert.readAt).length,
    unreadMessages: visibleMessages.filter((message) => message.senderRole === "coach" && !message.readAt).length
  };
}

export async function markMemberInboxItemsRead(supabase: SupabaseClient, memberUserId: string) {
  const timestamp = new Date().toISOString();

  const [{ error: alertError }, { error: messageError }] = await Promise.all([
    supabase
      .from("bossfit_member_alerts")
      .update({ read_at: timestamp })
      .eq("member_user_id", memberUserId)
      .is("read_at", null)
      .is("archived_at", null)
      .is("dismissed_at", null),
    supabase
      .from("bossfit_member_messages")
      .update({ read_at: timestamp })
      .eq("member_user_id", memberUserId)
      .eq("sender_role", "coach")
      .is("read_at", null)
      .is("deleted_at", null)
  ]);

  if (alertError) throw alertError;
  if (messageError) throw messageError;
}

