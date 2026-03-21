import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPrimaryEffectiveRole, findActiveMembershipByRoles, fetchSecondaryRolesByMembershipIds, getEffectiveRoles } from "@/lib/supabase/gym-membership-roles";
import { getSupabaseErrorInfo } from "@/lib/supabase/data";

export type GymRole = "owner" | "admin" | "trainer" | "member";
export type MembershipStatus = "active" | "invited" | "paused" | "suspended";
export type AssignmentStatus = "active" | "pending" | "paused";

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
}

interface GymRow {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  phone: string | null;
  active: boolean;
}

interface GymMembershipRow {
  id: string;
  gym_id: string;
  user_id: string;
  role: GymRole;
  status: MembershipStatus;
  created_at?: string;
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

interface MemberAssignmentRow {
  id: string;
  gym_id: string;
  member_user_id: string;
  trainer_user_id: string | null;
  group_id: string | null;
  status: AssignmentStatus;
  assigned_at: string;
}

interface GroupMembershipRow {
  id: string;
  group_id: string;
  user_id: string;
}

interface PlanTemplateRow {
  id: string;
  name: string;
}

interface PlanAssignmentRow {
  id: string;
  member_user_id: string;
  plan_template_id: string;
  active: boolean;
}

export interface AdminGymContext {
  gymId: string;
  gymName: string;
  gymSlug: string;
  gymActive: boolean;
  role: GymRole;
  userId: string;
  membershipId: string;
  userEmail?: string;
  displayName?: string;
}

export interface AdminDashboardMetric {
  label: string;
  value: string;
  helper: string;
  tone: "accent" | "success" | "warning" | "neutral";
}

export interface AdminDashboardAlert {
  title: string;
  detail: string;
  tone: "warning" | "success" | "neutral";
}

export interface AdminDashboardActivity {
  title: string;
  detail: string;
  time: string;
}

export interface AdminDashboardData {
  metrics: AdminDashboardMetric[];
  alerts: AdminDashboardAlert[];
  recentActivity: AdminDashboardActivity[];
}

export interface AdminMemberListItem {
  userId: string;
  membershipId: string;
  name: string;
  email: string;
  status: MembershipStatus;
  assignmentStatus: AssignmentStatus | "unassigned";
  trainerName: string;
  groupName: string;
  planName: string;
  joinedAt?: string;
}

export interface AdminTrainerListItem {
  userId: string;
  membershipId: string;
  name: string;
  email: string;
  status: MembershipStatus;
  membersCount: number;
  groupsCount: number;
}

export interface AdminGroupListItem {
  id: string;
  name: string;
  description: string;
  trainerName: string;
  scheduleText: string;
  membersCount: number;
  active: boolean;
}

export interface AdminAssignmentListItem {
  id: string;
  memberUserId: string;
  trainerUserId?: string;
  groupId?: string;
  memberName: string;
  memberEmail: string;
  trainerName: string;
  groupName: string;
  planName: string;
  status: AssignmentStatus;
  assignedAt: string;
}

export interface AdminUserAssignmentDetail {
  id: string;
  trainerUserId?: string;
  trainerName: string;
  groupId?: string;
  groupName: string;
  status: AssignmentStatus;
}

export interface AdminUserDetailStats {
  habitsCount: number;
  activeHabits: number;
  completionsCount: number;
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  level: number;
  lastSyncedAt?: string;
  updatedAt?: string;
  lastSaveReason?: string;
  todayScheduled: number;
  todayCompleted: number;
}

export interface AdminGroupMembershipDetail {
  id: string;
  name: string;
}

export interface AdminUserDetail {
  userId: string;
  membershipId: string;
  gymId: string;
  role: GymRole;
  status: MembershipStatus;
  fullName: string;
  displayName: string;
  email: string;
  username: string;
  joinedAt?: string;
  authCreatedAt?: string;
  lastSignInAt?: string;
  alias?: string;
  isManagedAccount: boolean;
  assignment: AdminUserAssignmentDetail | null;
  activePlanName: string;
  groups: AdminGroupMembershipDetail[];
  stats: AdminUserDetailStats;
  habits: Array<{
    id: string;
    name: string;
    targetSets: number;
    repsPerSet: number;
    trackingMode: "reps" | "timer";
    secondsPerSet?: number;
    selectedDays: string[];
    active: boolean;
    category?: string;
    level?: string;
  }>;
  trainerLoad?: {
    membersCount: number;
    groupsCount: number;
  };
}

export interface AdminGroupMemberListItem {
  userId: string;
  membershipId: string;
  name: string;
  email: string;
  status: MembershipStatus;
  assignmentStatus: AssignmentStatus | 'unassigned';
}

export interface AdminGroupDetail {
  id: string;
  gymId: string;
  name: string;
  description: string;
  scheduleText: string;
  trainerUserId?: string;
  trainerName: string;
  active: boolean;
  createdAt?: string;
  membersCount: number;
  members: AdminGroupMemberListItem[];
}

const rolePriority: Record<GymRole, number> = {
  owner: 0,
  admin: 1,
  trainer: 2,
  member: 3
};

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

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function formatRelativeDate(value?: string) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function profileName(profile?: ProfileRow | null, fallback?: string) {
  return profile?.display_name || profile?.full_name || profile?.email || fallback || "Sin nombre";
}

async function fetchProfilesMap(userIds: string[]) {
  const normalizedIds = uniqueIds(userIds);
  const profilesMap = new Map<string, ProfileRow>();

  if (!normalizedIds.length) {
    return profilesMap;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, display_name")
    .in("user_id", normalizedIds);

  if (error) {
    throw mapError(error);
  }

  for (const profile of (data ?? []) as ProfileRow[]) {
    profilesMap.set(profile.user_id, profile);
  }

  return profilesMap;
}

async function fetchPlanMaps(gymId: string, memberIds: string[]) {
  const supabase = getSupabase();
  const normalizedIds = uniqueIds(memberIds);
  const activePlansByMember = new Map<string, PlanAssignmentRow>();
  const planNameById = new Map<string, string>();

  if (!normalizedIds.length) {
    return { activePlansByMember, planNameById };
  }

  const { data: planAssignments, error: assignmentsError } = await supabase
    .from("plan_assignments")
    .select("id, member_user_id, plan_template_id, active")
    .eq("gym_id", gymId)
    .eq("active", true)
    .in("member_user_id", normalizedIds);

  if (assignmentsError) {
    throw mapError(assignmentsError);
  }

  const templateIds = uniqueIds(((planAssignments ?? []) as PlanAssignmentRow[]).map((item) => item.plan_template_id));

  for (const assignment of (planAssignments ?? []) as PlanAssignmentRow[]) {
    if (!activePlansByMember.has(assignment.member_user_id)) {
      activePlansByMember.set(assignment.member_user_id, assignment);
    }
  }

  if (templateIds.length) {
    const { data: templates, error: templatesError } = await supabase
      .from("plan_templates")
      .select("id, name")
      .eq("gym_id", gymId)
      .in("id", templateIds);

    if (templatesError) {
      throw mapError(templatesError);
    }

    for (const template of (templates ?? []) as PlanTemplateRow[]) {
      planNameById.set(template.id, template.name);
    }
  }

  return { activePlansByMember, planNameById };
}

export async function fetchActiveAdminGymContext(userId: string): Promise<AdminGymContext | null> {
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

  const match = await findActiveMembershipByRoles(supabase, (memberships ?? []) as GymMembershipRow[], ["owner", "admin"]);
  const membership = match?.membership;

  if (!membership || !match) {
    return null;
  }

  const [{ data: gym, error: gymError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from("gyms")
      .select("id, name, slug, contact_email, phone, active")
      .eq("id", membership.gym_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("user_id, email, full_name, display_name")
      .eq("user_id", userId)
      .maybeSingle()
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
    role: getPrimaryEffectiveRole(membership.role, match.extraRoles),
    userId,
    membershipId: membership.id,
    userEmail: profileRow?.email ?? undefined,
    displayName: profileName(profileRow)
  };
}

export async function fetchAdminMembers(gymId: string): Promise<AdminMemberListItem[]> {
  const supabase = getSupabase();
  const { data: memberships, error: membershipsError } = await supabase
    .from("gym_memberships")
    .select("id, gym_id, user_id, role, status, created_at")
    .eq("gym_id", gymId)
    .eq("role", "member")
    .order("created_at", { ascending: false });

  if (membershipsError) {
    throw mapError(membershipsError);
  }

  const membershipRows = (memberships ?? []) as GymMembershipRow[];
  const memberIds = membershipRows.map((item) => item.user_id);

  const [{ data: assignments, error: assignmentsError }, profilesMap, { activePlansByMember, planNameById }] =
    await Promise.all([
      supabase
        .from("member_assignments")
        .select("id, gym_id, member_user_id, trainer_user_id, group_id, status, assigned_at")
        .eq("gym_id", gymId)
        .in("member_user_id", memberIds),
      fetchProfilesMap(memberIds),
      fetchPlanMaps(gymId, memberIds)
    ]);

  if (assignmentsError) {
    throw mapError(assignmentsError);
  }

  const assignmentRows = (assignments ?? []) as MemberAssignmentRow[];
  const assignmentsByMember = new Map<string, MemberAssignmentRow>();
  for (const assignment of assignmentRows) {
    assignmentsByMember.set(assignment.member_user_id, assignment);
  }

  const trainerIds = uniqueIds(assignmentRows.map((item) => item.trainer_user_id));
  const groupIds = uniqueIds(assignmentRows.map((item) => item.group_id));
  const trainerProfilesMap = await fetchProfilesMap(trainerIds);
  const groupNameById = new Map<string, string>();

  if (groupIds.length) {
    const { data: groups, error: groupsError } = await supabase
      .from("gym_groups")
      .select("id, name")
      .eq("gym_id", gymId)
      .in("id", groupIds);

    if (groupsError) {
      throw mapError(groupsError);
    }

    for (const group of (groups ?? []) as Pick<GymGroupRow, "id" | "name">[]) {
      groupNameById.set(group.id, group.name);
    }
  }

  return membershipRows.map((membership) => {
    const profile = profilesMap.get(membership.user_id);
    const assignment = assignmentsByMember.get(membership.user_id);
    const activePlan = activePlansByMember.get(membership.user_id);

    return {
      userId: membership.user_id,
      membershipId: membership.id,
      name: profileName(profile, `Usuario ${membership.user_id.slice(0, 6)}`),
      email: profile?.email ?? "Sin email",
      status: membership.status,
      assignmentStatus: assignment?.status ?? "unassigned",
      trainerName: assignment?.trainer_user_id
        ? profileName(trainerProfilesMap.get(assignment.trainer_user_id), "Sin entrenador")
        : "Sin entrenador",
      groupName: assignment?.group_id ? groupNameById.get(assignment.group_id) ?? "Sin grupo" : "Sin grupo",
      planName: activePlan ? planNameById.get(activePlan.plan_template_id) ?? "Plan activo" : "Sin plan",
      joinedAt: membership.created_at
    };
  });
}

export async function fetchAdminTrainers(gymId: string): Promise<AdminTrainerListItem[]> {
  const supabase = getSupabase();
  const { data: memberships, error: membershipsError } = await supabase
    .from("gym_memberships")
    .select("id, gym_id, user_id, role, status, created_at")
    .eq("gym_id", gymId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipsError) {
    throw mapError(membershipsError);
  }

  const membershipRows = (memberships ?? []) as GymMembershipRow[];
  const secondaryRolesByMembershipId = await fetchSecondaryRolesByMembershipIds(
    supabase,
    membershipRows.map((membership) => membership.id)
  );
  const trainerMembershipRows = membershipRows.filter((membership) =>
    getEffectiveRoles(membership.role, secondaryRolesByMembershipId.get(membership.id) ?? []).includes("trainer")
  );
  const trainerIds = trainerMembershipRows.map((item) => item.user_id);

  const [{ data: groups, error: groupsError }, { data: assignments, error: assignmentsError }, profilesMap] =
    await Promise.all([
      trainerIds.length
        ? supabase
            .from("gym_groups")
            .select("id, trainer_user_id")
            .eq("gym_id", gymId)
            .in("trainer_user_id", trainerIds)
        : Promise.resolve({ data: [], error: null }),
      trainerIds.length
        ? supabase
            .from("member_assignments")
            .select("id, trainer_user_id")
            .eq("gym_id", gymId)
            .in("trainer_user_id", trainerIds)
        : Promise.resolve({ data: [], error: null }),
      fetchProfilesMap(trainerIds)
    ]);

  if (groupsError) {
    throw mapError(groupsError);
  }

  if (assignmentsError) {
    throw mapError(assignmentsError);
  }

  const groupsCountByTrainer = new Map<string, number>();
  for (const group of (groups ?? []) as Array<{ id: string; trainer_user_id: string | null }>) {
    if (!group.trainer_user_id) {
      continue;
    }

    groupsCountByTrainer.set(group.trainer_user_id, (groupsCountByTrainer.get(group.trainer_user_id) ?? 0) + 1);
  }

  const membersCountByTrainer = new Map<string, number>();
  for (const assignment of (assignments ?? []) as Array<{ id: string; trainer_user_id: string | null }>) {
    if (!assignment.trainer_user_id) {
      continue;
    }

    membersCountByTrainer.set(
      assignment.trainer_user_id,
      (membersCountByTrainer.get(assignment.trainer_user_id) ?? 0) + 1
    );
  }

  return trainerMembershipRows.map((membership) => {
    const profile = profilesMap.get(membership.user_id);
    return {
      userId: membership.user_id,
      membershipId: membership.id,
      name: profileName(profile, "Coach " + membership.user_id.slice(0, 6)),
      email: profile?.email ?? "Sin email",
      status: membership.status,
      membersCount: membersCountByTrainer.get(membership.user_id) ?? 0,
      groupsCount: groupsCountByTrainer.get(membership.user_id) ?? 0
    };
  });
}

export async function fetchAdminGroups(gymId: string): Promise<AdminGroupListItem[]> {
  const supabase = getSupabase();
  const { data: groups, error: groupsError } = await supabase
    .from("gym_groups")
    .select("id, gym_id, name, description, trainer_user_id, schedule_text, active, created_at")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: true });

  if (groupsError) {
    throw mapError(groupsError);
  }

  const groupRows = (groups ?? []) as GymGroupRow[];
  const groupIds = groupRows.map((item) => item.id);
  const trainerIds = uniqueIds(groupRows.map((item) => item.trainer_user_id));

  const [{ data: memberships, error: membershipsError }, trainerProfilesMap] = await Promise.all([
    supabase.from("group_memberships").select("id, group_id, user_id").in("group_id", groupIds),
    fetchProfilesMap(trainerIds)
  ]);

  if (membershipsError) {
    throw mapError(membershipsError);
  }

  const membersCountByGroup = new Map<string, number>();
  for (const membership of (memberships ?? []) as GroupMembershipRow[]) {
    membersCountByGroup.set(membership.group_id, (membersCountByGroup.get(membership.group_id) ?? 0) + 1);
  }

  return groupRows.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description || "Sin descripción",
    trainerName: group.trainer_user_id
      ? profileName(trainerProfilesMap.get(group.trainer_user_id), "Sin entrenador")
      : "Sin entrenador",
    scheduleText: group.schedule_text || "Horario no definido",
    membersCount: membersCountByGroup.get(group.id) ?? 0,
    active: group.active
  }));
}

export async function fetchAdminAssignments(gymId: string): Promise<AdminAssignmentListItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("member_assignments")
    .select("id, gym_id, member_user_id, trainer_user_id, group_id, status, assigned_at")
    .eq("gym_id", gymId)
    .order("assigned_at", { ascending: false });

  if (error) {
    throw mapError(error);
  }

  const assignmentRows = (data ?? []) as MemberAssignmentRow[];
  const memberIds = assignmentRows.map((item) => item.member_user_id);
  const trainerIds = uniqueIds(assignmentRows.map((item) => item.trainer_user_id));
  const groupIds = uniqueIds(assignmentRows.map((item) => item.group_id));

  const [{ activePlansByMember, planNameById }, memberProfilesMap, trainerProfilesMap] = await Promise.all([
    fetchPlanMaps(gymId, memberIds),
    fetchProfilesMap(memberIds),
    fetchProfilesMap(trainerIds)
  ]);

  const groupNameById = new Map<string, string>();
  if (groupIds.length) {
    const { data: groups, error: groupsError } = await supabase
      .from("gym_groups")
      .select("id, name")
      .eq("gym_id", gymId)
      .in("id", groupIds);

    if (groupsError) {
      throw mapError(groupsError);
    }

    for (const group of (groups ?? []) as Pick<GymGroupRow, "id" | "name">[]) {
      groupNameById.set(group.id, group.name);
    }
  }

  return assignmentRows.map((assignment) => {
    const plan = activePlansByMember.get(assignment.member_user_id);
    const memberProfile = memberProfilesMap.get(assignment.member_user_id);

    return {
      id: assignment.id,
      memberUserId: assignment.member_user_id,
      trainerUserId: assignment.trainer_user_id ?? undefined,
      groupId: assignment.group_id ?? undefined,
      memberName: profileName(memberProfile, `Usuario ${assignment.member_user_id.slice(0, 6)}`),
      memberEmail: memberProfile?.email ?? "Sin email",
      trainerName: assignment.trainer_user_id
        ? profileName(trainerProfilesMap.get(assignment.trainer_user_id), "Sin entrenador")
        : "Sin entrenador",
      groupName: assignment.group_id ? groupNameById.get(assignment.group_id) ?? "Sin grupo" : "Sin grupo",
      planName: plan ? planNameById.get(plan.plan_template_id) ?? "Plan activo" : "Sin plan",
      status: assignment.status,
      assignedAt: assignment.assigned_at
    };
  });
}

export async function fetchAdminDashboardData(gymId: string): Promise<AdminDashboardData> {
  const [members, trainers, groups, assignments] = await Promise.all([
    fetchAdminMembers(gymId),
    fetchAdminTrainers(gymId),
    fetchAdminGroups(gymId),
    fetchAdminAssignments(gymId)
  ]);

  const membersWithoutTrainer = members.filter((member) => member.trainerName === "Sin entrenador").length;
  const membersWithoutGroup = members.filter((member) => member.groupName === "Sin grupo").length;
  const groupsWithoutTrainer = groups.filter((group) => group.trainerName === "Sin entrenador").length;
  const assignedMembers = assignments.filter((assignment) => assignment.trainerName !== "Sin entrenador").length;

  const metrics: AdminDashboardMetric[] = [
    {
      label: "Miembros activos",
      value: String(members.length),
      helper: `${assignedMembers} ya tienen coach principal`,
      tone: "accent"
    },
    {
      label: "Entrenadores",
      value: String(trainers.length),
      helper: `${groups.length} grupos creados en el gym`,
      tone: "success"
    },
    {
      label: "Sin grupo",
      value: String(membersWithoutGroup),
      helper: "Miembros pendientes de ubicar en un bloque",
      tone: membersWithoutGroup > 0 ? "warning" : "success"
    },
    {
      label: "Sin entrenador",
      value: String(membersWithoutTrainer),
      helper: "Miembros que aún requieren seguimiento principal",
      tone: membersWithoutTrainer > 0 ? "warning" : "neutral"
    }
  ];

  const alerts: AdminDashboardAlert[] = [];

  if (membersWithoutTrainer > 0) {
    alerts.push({
      title: "Miembros sin coach",
      detail: `${membersWithoutTrainer} miembros siguen sin entrenador asignado.`,
      tone: "warning"
    });
  }

  if (membersWithoutGroup > 0) {
    alerts.push({
      title: "Miembros sin grupo",
      detail: `${membersWithoutGroup} miembros no tienen grupo principal todavía.`,
      tone: "warning"
    });
  }

  if (groupsWithoutTrainer > 0) {
    alerts.push({
      title: "Grupos sin responsable",
      detail: `${groupsWithoutTrainer} grupos siguen sin entrenador asignado.`,
      tone: "neutral"
    });
  }

  if (!alerts.length) {
    alerts.push({
      title: "Operación estable",
      detail: "Todos los grupos y asignaciones principales están cubiertos por ahora.",
      tone: "success"
    });
  }

  const recentActivity = assignments.slice(0, 4).map((assignment) => ({
    title: `${assignment.memberName} está en ${assignment.groupName}`,
    detail: `${assignment.trainerName} · ${assignment.planName}`,
    time: formatRelativeDate(assignment.assignedAt)
  }));

  return {
    metrics,
    alerts,
    recentActivity
  };
}


