import type { SupabaseClient, User } from "@supabase/supabase-js";

import { toDateKey } from "@/lib/date";
import { findActiveMembershipByRoles } from "@/lib/supabase/gym-membership-roles";
import type {
  AdminGroupDetail,
  AdminGroupMemberListItem,
  AdminUserDetail,
  AdminUserDetailStats,
  AssignmentStatus,
  GymRole,
  MembershipStatus
} from "@/lib/supabase/admin";
import { fetchUserRemoteStateOrEmpty } from "@/lib/supabase/user-state-server";
import type { WeekdayKey } from "@/types/habit";

interface GymMembershipRow {
  id: string;
  gym_id: string;
  user_id: string;
  role: GymRole;
  status: MembershipStatus;
  created_at?: string;
}

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  username?: string | null;
}

interface MemberAssignmentRow {
  id: string;
  gym_id: string;
  member_user_id: string;
  trainer_user_id: string | null;
  group_id: string | null;
  status: AssignmentStatus;
  assigned_at: string;
}

interface GymGroupRow {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  trainer_user_id: string | null;
  schedule_text: string | null;
  active: boolean;
  created_at?: string;
}

interface PlanAssignmentRow {
  id: string;
  member_user_id: string;
  plan_template_id: string;
  active: boolean;
}

interface PlanTemplateRow {
  id: string;
  name: string;
}

interface GroupMembershipRow {
  id: string;
  group_id: string;
  user_id: string;
  assigned_by?: string | null;
}

function getTodayWeekdayKey(date = new Date()): WeekdayKey {
  const day = date.getDay();
  return (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[day];
}

export function profileName(profile?: ProfileRow | null, fallback?: string) {
  return profile?.display_name || profile?.full_name || profile?.email || fallback || "Sin nombre";
}

export function extractAliasFromEmail(email?: string | null) {
  if (!email || !email.includes("@")) {
    return undefined;
  }

  return email.split("@")[0] || undefined;
}

export function isManagedBossFitEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return email.endsWith(".bossfit.app");
}

export async function requireAdminGymAccess(supabase: SupabaseClient, requesterId: string, gymId: string) {
  const { data, error } = await supabase
    .from("gym_memberships")
    .select("id, gym_id, user_id, role, status, created_at")
    .eq("gym_id", gymId)
    .eq("user_id", requesterId)
    .eq("status", "active");

  if (error) {
    throw error;
  }

  const match = await findActiveMembershipByRoles(supabase, (data ?? []) as GymMembershipRow[], ["owner", "admin"]);
  return match?.membership ?? null;
}

export async function ensureTrainerBelongsToGym(supabase: SupabaseClient, gymId: string, trainerUserId: string) {
  const { data, error } = await supabase
    .from("gym_memberships")
    .select("id, gym_id, user_id, role, status, created_at")
    .eq("gym_id", gymId)
    .eq("user_id", trainerUserId)
    .eq("status", "active");

  if (error) {
    throw error;
  }

  const match = await findActiveMembershipByRoles(supabase, (data ?? []) as GymMembershipRow[], ["trainer"]);
  return match?.membership ?? null;
}

export async function ensureGroupBelongsToGym(supabase: SupabaseClient, gymId: string, groupId: string) {
  const { data, error } = await supabase
    .from("gym_groups")
    .select("id")
    .eq("gym_id", gymId)
    .eq("id", groupId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function fetchProfilesMap(supabase: SupabaseClient, userIds: string[]) {
  const normalizedIds = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, ProfileRow>();

  if (!normalizedIds.length) {
    return map;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, display_name, username")
    .in("user_id", normalizedIds);

  if (error) {
    throw error;
  }

  for (const profile of (data ?? []) as ProfileRow[]) {
    map.set(profile.user_id, profile);
  }

  return map;
}

async function fetchGroupNameMap(supabase: SupabaseClient, gymId: string, groupIds: string[]) {
  const normalizedIds = [...new Set(groupIds.filter(Boolean))];
  const map = new Map<string, string>();

  if (!normalizedIds.length) {
    return map;
  }

  const { data, error } = await supabase
    .from("gym_groups")
    .select("id, name")
    .eq("gym_id", gymId)
    .in("id", normalizedIds);

  if (error) {
    throw error;
  }

  for (const group of (data ?? []) as Array<Pick<GymGroupRow, "id" | "name">>) {
    map.set(group.id, group.name);
  }

  return map;
}

function buildUserStats(remoteState: Awaited<ReturnType<typeof fetchUserRemoteStateOrEmpty>>): AdminUserDetailStats {
  const snapshot = remoteState.snapshot;
  const todayKey = getTodayWeekdayKey();
  const todayIso = toDateKey();
  const activeHabits = snapshot.habits.filter((habit) => habit.active);
  const scheduledToday = activeHabits.filter((habit) => habit.selectedDays.includes(todayKey)).length;
  const completionMap = new Map<string, number>();

  for (const completion of snapshot.completions) {
    if (completion.date !== todayIso) {
      continue;
    }

    completionMap.set(completion.habitId, completion.completedSets);
  }

  const todayCompleted = activeHabits.filter((habit) => {
    if (!habit.selectedDays.includes(todayKey)) {
      return false;
    }

    return (completionMap.get(habit.id) ?? 0) >= habit.targetSets;
  }).length;

  return {
    habitsCount: remoteState.habitsCount,
    activeHabits: activeHabits.length,
    completionsCount: remoteState.completionsCount,
    currentStreak: remoteState.currentStreak,
    bestStreak: remoteState.bestStreak,
    totalPoints: remoteState.totalPoints,
    level: remoteState.level,
    lastSyncedAt: remoteState.lastSyncedAt,
    updatedAt: remoteState.updatedAt,
    lastSaveReason: remoteState.lastSaveReason,
    todayScheduled: scheduledToday,
    todayCompleted
  };
}

export async function getAdminUserDetail(
  supabase: SupabaseClient,
  gymId: string,
  userId: string
): Promise<AdminUserDetail | null> {
  const { data: membership, error: membershipError } = await supabase
    .from("gym_memberships")
    .select("id, gym_id, user_id, role, status, created_at")
    .eq("gym_id", gymId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  const membershipRow = membership as GymMembershipRow | null;
  if (!membershipRow) {
    return null;
  }

  const [profilesMap, authUserResponse, remoteState, assignmentResponse, groupMembershipsResponse, activePlanResponse] =
    await Promise.all([
      fetchProfilesMap(supabase, [userId]),
      supabase.auth.admin.getUserById(userId),
      fetchUserRemoteStateOrEmpty(supabase, userId),
      supabase
        .from("member_assignments")
        .select("id, gym_id, member_user_id, trainer_user_id, group_id, status, assigned_at")
        .eq("gym_id", gymId)
        .eq("member_user_id", userId)
        .maybeSingle(),
      supabase
        .from("group_memberships")
        .select("id, group_id, user_id")
        .eq("user_id", userId),
      supabase
        .from("plan_assignments")
        .select("id, member_user_id, plan_template_id, active")
        .eq("gym_id", gymId)
        .eq("member_user_id", userId)
        .eq("active", true)
        .limit(1)
    ]);

  if (authUserResponse.error) {
    throw authUserResponse.error;
  }
  if (assignmentResponse.error) {
    throw assignmentResponse.error;
  }
  if (groupMembershipsResponse.error) {
    throw groupMembershipsResponse.error;
  }
  if (activePlanResponse.error) {
    throw activePlanResponse.error;
  }

  const profile = profilesMap.get(userId) ?? null;
  const authUser = authUserResponse.data.user as User | null;
  const assignment = (assignmentResponse.data as MemberAssignmentRow | null) ?? null;
  const groupMemberships = (groupMembershipsResponse.data ?? []) as GroupMembershipRow[];
  const activePlan = ((activePlanResponse.data ?? []) as PlanAssignmentRow[])[0] ?? null;

  const trainerIds = assignment?.trainer_user_id ? [assignment.trainer_user_id] : [];
  const groupIds = [assignment?.group_id, ...groupMemberships.map((item) => item.group_id)].filter(Boolean) as string[];
  const [trainerProfilesMap, groupNameMap] = await Promise.all([
    fetchProfilesMap(supabase, trainerIds),
    fetchGroupNameMap(supabase, gymId, groupIds)
  ]);

  let activePlanName = "Sin plan";
  if (activePlan?.plan_template_id) {
    const { data: template, error: templateError } = await supabase
      .from("plan_templates")
      .select("id, name")
      .eq("gym_id", gymId)
      .eq("id", activePlan.plan_template_id)
      .maybeSingle();

    if (templateError) {
      throw templateError;
    }

    activePlanName = (template as PlanTemplateRow | null)?.name ?? "Plan activo";
  }

  let trainerLoad: AdminUserDetail["trainerLoad"];
  if (membershipRow.role === "trainer") {
    const [{ count: membersCount, error: membersCountError }, { count: groupsCount, error: groupsCountError }] = await Promise.all([
      supabase
        .from("member_assignments")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("trainer_user_id", userId),
      supabase
        .from("gym_groups")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("trainer_user_id", userId)
    ]);

    if (membersCountError) {
      throw membersCountError;
    }
    if (groupsCountError) {
      throw groupsCountError;
    }

    trainerLoad = {
      membersCount: membersCount ?? 0,
      groupsCount: groupsCount ?? 0
    };
  }

  return {
    userId,
    membershipId: membershipRow.id,
    gymId,
    role: membershipRow.role,
    status: membershipRow.status,
    fullName: profile?.full_name || profile?.display_name || authUser?.user_metadata?.full_name || authUser?.email || "Sin nombre",
    displayName: profile?.display_name || profile?.full_name || authUser?.email || "Sin nombre",
    email: profile?.email || authUser?.email || "Sin email",
    username: profile?.username || "",
    joinedAt: membershipRow.created_at,
    authCreatedAt: authUser?.created_at,
    lastSignInAt: authUser?.last_sign_in_at ?? undefined,
    alias: extractAliasFromEmail(profile?.email || authUser?.email),
    isManagedAccount: isManagedBossFitEmail(profile?.email || authUser?.email),
    assignment: assignment
      ? {
          id: assignment.id,
          trainerUserId: assignment.trainer_user_id ?? undefined,
          trainerName: assignment.trainer_user_id
            ? profileName(trainerProfilesMap.get(assignment.trainer_user_id), "Sin entrenador")
            : "Sin entrenador",
          groupId: assignment.group_id ?? undefined,
          groupName: assignment.group_id ? groupNameMap.get(assignment.group_id) ?? "Sin grupo" : "Sin grupo",
          status: assignment.status
        }
      : null,
    activePlanName,
    groups: groupMemberships.map((membership) => ({
      id: membership.group_id,
      name: groupNameMap.get(membership.group_id) ?? "Grupo"
    })),
    stats: buildUserStats(remoteState),
    habits: remoteState.snapshot.habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      targetSets: habit.targetSets,
      repsPerSet: habit.repsPerSet,
      trackingMode: habit.trackingMode,
      secondsPerSet: habit.secondsPerSet,
      selectedDays: habit.selectedDays,
      active: habit.active,
      category: habit.category,
      level: habit.level
    })),
    trainerLoad
  };
}

export async function getAdminGroupDetail(
  supabase: SupabaseClient,
  gymId: string,
  groupId: string
): Promise<AdminGroupDetail | null> {
  const { data: group, error: groupError } = await supabase
    .from("gym_groups")
    .select("id, gym_id, name, description, trainer_user_id, schedule_text, active, created_at")
    .eq("gym_id", gymId)
    .eq("id", groupId)
    .maybeSingle();

  if (groupError) {
    throw groupError;
  }

  const groupRow = (group as GymGroupRow | null) ?? null;
  if (!groupRow) {
    return null;
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("group_memberships")
    .select("id, group_id, user_id")
    .eq("group_id", groupId);

  if (membershipsError) {
    throw membershipsError;
  }

  const memberRows = (memberships ?? []) as GroupMembershipRow[];
  const userIds = memberRows.map((item) => item.user_id);
  const [profilesMap, trainerProfilesMap, gymMembershipsResponse, assignmentRowsResponse] = await Promise.all([
    fetchProfilesMap(supabase, userIds),
    fetchProfilesMap(supabase, groupRow.trainer_user_id ? [groupRow.trainer_user_id] : []),
    supabase
      .from("gym_memberships")
      .select("id, gym_id, user_id, role, status, created_at")
      .eq("gym_id", gymId)
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("member_assignments")
      .select("id, gym_id, member_user_id, trainer_user_id, group_id, status, assigned_at")
      .eq("gym_id", gymId)
      .eq("group_id", groupId)
  ]);

  if (gymMembershipsResponse.error) {
    throw gymMembershipsResponse.error;
  }
  if (assignmentRowsResponse.error) {
    throw assignmentRowsResponse.error;
  }

  const membershipByUser = new Map<string, GymMembershipRow>();
  for (const membership of (gymMembershipsResponse.data ?? []) as GymMembershipRow[]) {
    membershipByUser.set(membership.user_id, membership);
  }

  const assignmentByUser = new Map<string, MemberAssignmentRow>();
  for (const assignment of (assignmentRowsResponse.data ?? []) as MemberAssignmentRow[]) {
    assignmentByUser.set(assignment.member_user_id, assignment);
  }

  const members: AdminGroupMemberListItem[] = memberRows.map((membership) => {
    const memberProfile = profilesMap.get(membership.user_id);
    const gymMembership = membershipByUser.get(membership.user_id);
    const assignment = assignmentByUser.get(membership.user_id);

    return {
      userId: membership.user_id,
      membershipId: gymMembership?.id ?? membership.id,
      name: profileName(memberProfile, `Usuario ${membership.user_id.slice(0, 6)}`),
      email: memberProfile?.email ?? "Sin email",
      status: gymMembership?.status ?? "active",
      assignmentStatus: assignment?.status ?? "unassigned"
    };
  });

  return {
    id: groupRow.id,
    gymId,
    name: groupRow.name,
    description: groupRow.description || "",
    scheduleText: groupRow.schedule_text || "",
    trainerUserId: groupRow.trainer_user_id ?? undefined,
    trainerName: groupRow.trainer_user_id
      ? profileName(trainerProfilesMap.get(groupRow.trainer_user_id), "Sin entrenador")
      : "Sin entrenador",
    active: groupRow.active,
    createdAt: groupRow.created_at,
    membersCount: members.length,
    members
  };
}

export async function cleanupMemberDataForUser(supabase: SupabaseClient, gymId: string, userId: string) {
  const { data: gymGroups, error: gymGroupsError } = await supabase
    .from("gym_groups")
    .select("id")
    .eq("gym_id", gymId);

  if (gymGroupsError) {
    throw gymGroupsError;
  }

  const groupIds = (gymGroups ?? []).map((group) => group.id);

  const { error: assignmentsError } = await supabase
    .from("member_assignments")
    .delete()
    .eq("gym_id", gymId)
    .eq("member_user_id", userId);

  if (assignmentsError) {
    throw assignmentsError;
  }

  if (groupIds.length) {
    const { error: groupMembershipsError } = await supabase
      .from("group_memberships")
      .delete()
      .eq("user_id", userId)
      .in("group_id", groupIds);

    if (groupMembershipsError) {
      throw groupMembershipsError;
    }
  }

  const { error: plansError } = await supabase
    .from("plan_assignments")
    .delete()
    .eq("gym_id", gymId)
    .eq("member_user_id", userId);

  if (plansError) {
    throw plansError;
  }
}

export async function cleanupTrainerLinksForUser(supabase: SupabaseClient, gymId: string, userId: string) {
  const { error: groupsError } = await supabase
    .from("gym_groups")
    .update({ trainer_user_id: null })
    .eq("gym_id", gymId)
    .eq("trainer_user_id", userId);

  if (groupsError) {
    throw groupsError;
  }

  const { error: assignmentsError } = await supabase
    .from("member_assignments")
    .update({ trainer_user_id: null, status: "pending" })
    .eq("gym_id", gymId)
    .eq("trainer_user_id", userId);

  if (assignmentsError) {
    throw assignmentsError;
  }
}

export async function replaceUserGroupMembership(
  supabase: SupabaseClient,
  gymId: string,
  userId: string,
  groupId: string | null,
  assignedBy: string
) {
  const { data: gymGroups, error: gymGroupsError } = await supabase
    .from("gym_groups")
    .select("id")
    .eq("gym_id", gymId);

  if (gymGroupsError) {
    throw gymGroupsError;
  }

  const gymGroupIds = (gymGroups ?? []).map((group) => group.id);
  if (gymGroupIds.length) {
    const { error: cleanupError } = await supabase
      .from("group_memberships")
      .delete()
      .eq("user_id", userId)
      .in("group_id", gymGroupIds);

    if (cleanupError) {
      throw cleanupError;
    }
  }

  if (!groupId) {
    return;
  }

  const { error: insertError } = await supabase.from("group_memberships").insert({
    group_id: groupId,
    user_id: userId,
    assigned_by: assignedBy
  });

  if (insertError) {
    throw insertError;
  }
}

export async function upsertMemberAssignment(
  supabase: SupabaseClient,
  gymId: string,
  userId: string,
  trainerUserId: string | null,
  groupId: string | null,
  status: AssignmentStatus
) {
  const { data: currentAssignment, error: currentAssignmentError } = await supabase
    .from("member_assignments")
    .select("id")
    .eq("gym_id", gymId)
    .eq("member_user_id", userId)
    .maybeSingle();

  if (currentAssignmentError) {
    throw currentAssignmentError;
  }

  if (currentAssignment) {
    const { error: updateError } = await supabase
      .from("member_assignments")
      .update({ trainer_user_id: trainerUserId, group_id: groupId, status })
      .eq("id", currentAssignment.id);

    if (updateError) {
      throw updateError;
    }

    return currentAssignment.id;
  }

  const { data: insertedAssignment, error: insertError } = await supabase
    .from("member_assignments")
    .insert({
      gym_id: gymId,
      member_user_id: userId,
      trainer_user_id: trainerUserId,
      group_id: groupId,
      status
    })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertedAssignment.id as string;
}

export async function stripGroupFromAssignments(supabase: SupabaseClient, gymId: string, groupId: string) {
  const { data: assignments, error: assignmentsError } = await supabase
    .from("member_assignments")
    .select("id, trainer_user_id, status")
    .eq("gym_id", gymId)
    .eq("group_id", groupId);

  if (assignmentsError) {
    throw assignmentsError;
  }

  for (const assignment of (assignments ?? []) as Array<{ id: string; trainer_user_id: string | null; status: AssignmentStatus }>) {
    const nextStatus: AssignmentStatus = assignment.trainer_user_id ? assignment.status : "pending";
    const { error: updateError } = await supabase
      .from("member_assignments")
      .update({ group_id: null, status: nextStatus })
      .eq("id", assignment.id);

    if (updateError) {
      throw updateError;
    }
  }
}



