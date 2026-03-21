
import type { User } from "@supabase/supabase-js";

import { cleanupMemberDataForUser, cleanupTrainerLinksForUser, upsertMemberAssignment } from "@/lib/supabase/admin-route-helpers";
import { getEffectiveRoles, getPrimaryEffectiveRole, fetchSecondaryRolesByMembershipIds, fetchSecondaryRolesForMembership, replaceSecondaryRolesForMembership } from "@/lib/supabase/gym-membership-roles";
import { generateManagedAccessForPlatform } from "@/lib/supabase/managed-credentials";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";
import { fetchUserRemoteStateOrEmpty } from "@/lib/supabase/user-state-server";
import type {
  PlatformAdminAddGymMembershipByIdentifierInput,
  PlatformAdminAddMembershipInput,
  PlatformAdminContext,
  PlatformAdminCreateGymInput,
  PlatformAdminCreateManagedUserInput,
  PlatformAdminGymDetail,
  PlatformAdminGymListItem,
  PlatformAdminGymMemberItem,
  PlatformAdminMembershipStatus,
  PlatformAdminOverviewData,
  PlatformAdminUpdateGymInput,
  PlatformAdminUpdateMembershipInput,
  PlatformAdminUpdateUserInput,
  PlatformAdminUserDetail,
  PlatformAdminUserListItem,
  PlatformAdminUserMembershipItem,
  PlatformManagedUserCredentials
} from "@/types/platform-admin";

interface PlatformAdminRow {
  user_id: string;
  email: string | null;
  label: string | null;
  active: boolean;
  created_at?: string;
}

interface GymRow {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  phone: string | null;
  active: boolean;
  created_at?: string;
}

interface GymMembershipRow {
  id: string;
  gym_id: string;
  user_id: string;
  role: "owner" | "admin" | "trainer" | "member";
  status: PlatformAdminMembershipStatus;
  created_at?: string;
}

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
}

interface MemberAssignmentRow {
  id: string;
  gym_id: string;
  member_user_id: string;
  trainer_user_id: string | null;
  group_id: string | null;
  status: "active" | "pending" | "paused";
}

interface GymGroupRow {
  id: string;
  gym_id: string;
  name: string;
}

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function profileName(profile?: ProfileRow | null, fallback?: string) {
  return profile?.display_name || profile?.full_name || profile?.email || fallback || "Sin nombre";
}

function isManagedBossFitEmail(email?: string | null) {
  return Boolean(email && email.endsWith(".bossfit.app"));
}

function normalizePlatformSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeUsername(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

function roleSortValue(role: GymMembershipRow["role"]) {
  switch (role) {
    case "owner":
      return 0;
    case "admin":
      return 1;
    case "trainer":
      return 2;
    case "member":
    default:
      return 3;
  }
}

function countMembershipsWithEffectiveRole(items: Array<{ effectiveRoles: Array<GymMembershipRow["role"]> }>, role: GymMembershipRow["role"]) {
  return items.filter((item) => item.effectiveRoles.includes(role)).length;
}

async function fetchProfilesMap(supabase: ReturnType<typeof createSupabaseServiceRoleClient>, userIds: string[]) {
  const normalizedIds = uniqueIds(userIds);
  const profilesMap = new Map<string, ProfileRow>();

  if (!normalizedIds.length) {
    return profilesMap;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, display_name, username")
    .in("user_id", normalizedIds);

  if (error) {
    throw error;
  }

  for (const profile of (data ?? []) as ProfileRow[]) {
    profilesMap.set(profile.user_id, profile);
  }

  return profilesMap;
}

async function fetchPlatformAdminsMap(supabase: ReturnType<typeof createSupabaseServiceRoleClient>, userIds: string[]) {
  const normalizedIds = uniqueIds(userIds);
  const adminsMap = new Map<string, PlatformAdminRow>();

  if (!normalizedIds.length) {
    return adminsMap;
  }

  const { data, error } = await supabase
    .from("bossfit_platform_admins")
    .select("user_id, email, label, active, created_at")
    .in("user_id", normalizedIds);

  if (error) {
    throw error;
  }

  for (const row of (data ?? []) as PlatformAdminRow[]) {
    adminsMap.set(row.user_id, row);
  }

  return adminsMap;
}

async function ensureProfileForAuthUser(supabase: ReturnType<typeof createSupabaseServiceRoleClient>, user: User) {
  const fullName = (user.user_metadata?.full_name as string | undefined) || (user.user_metadata?.name as string | undefined) || null;
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null;
  const username =
    typeof user.user_metadata?.username === "string"
      ? normalizeUsername(user.user_metadata.username)
      : typeof user.user_metadata?.login_alias === "string"
        ? normalizeUsername(user.user_metadata.login_alias)
        : null;

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      display_name: displayName,
      username: username || null
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }
}

async function getPlatformAdminContextByUserId(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  userId: string,
  fallbackEmail?: string | null
): Promise<PlatformAdminContext | null> {
  const { data, error } = await supabase
    .from("bossfit_platform_admins")
    .select("user_id, email, label, active, created_at")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = (data as PlatformAdminRow | null) ?? null;
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    email: row.email || fallbackEmail || "Sin email",
    label: row.label || "Platform Admin",
    createdAt: row.created_at
  };
}

async function resolveUserIdByIdentifier(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  identifier?: string
): Promise<{ userId: string; email: string | null } | null> {
  const trimmed = identifier?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, email")
      .ilike("email", email)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile?.user_id) {
      return { userId: profile.user_id as string, email: (profile.email as string | null) ?? email };
    }

    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authError) {
      throw authError;
    }

    const match = authData.users.find((user) => user.email?.toLowerCase() === email);
    if (!match) {
      return null;
    }

    await ensureProfileForAuthUser(supabase, match);
    return { userId: match.id, email: match.email ?? email };
  }

  const username = normalizeUsername(trimmed);
  if (username.length < 3) {
    throw new Error("Escribe un usuario válido.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.user_id) {
    return null;
  }

  return { userId: data.user_id as string, email: (data.email as string | null) ?? null };
}

async function assertUniqueUsername(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  username: string,
  excludeUserId?: string
) {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return "";
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("username", normalized)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.user_id && data.user_id !== excludeUserId) {
    throw new Error("Ese usuario ya está en uso.");
  }

  return normalized;
}

async function fetchGymsMap(supabase: ReturnType<typeof createSupabaseServiceRoleClient>, gymIds: string[]) {
  const normalizedIds = uniqueIds(gymIds);
  const gymsMap = new Map<string, GymRow>();

  if (!normalizedIds.length) {
    return gymsMap;
  }

  const { data, error } = await supabase
    .from("gyms")
    .select("id, name, slug, contact_email, phone, active, created_at")
    .in("id", normalizedIds);

  if (error) {
    throw error;
  }

  for (const gym of (data ?? []) as GymRow[]) {
    gymsMap.set(gym.id, gym);
  }

  return gymsMap;
}

async function fetchGroupsMap(supabase: ReturnType<typeof createSupabaseServiceRoleClient>, groupIds: string[]) {
  const normalizedIds = uniqueIds(groupIds);
  const groupsMap = new Map<string, GymGroupRow>();

  if (!normalizedIds.length) {
    return groupsMap;
  }

  const { data, error } = await supabase
    .from("gym_groups")
    .select("id, gym_id, name")
    .in("id", normalizedIds);

  if (error) {
    throw error;
  }

  for (const row of (data ?? []) as GymGroupRow[]) {
    groupsMap.set(row.id, row);
  }

  return groupsMap;
}

async function buildPlatformUserListItem(
  user: User,
  profilesMap: Map<string, ProfileRow>,
  membershipsByUser: Map<string, GymMembershipRow[]>,
  platformAdminsMap: Map<string, PlatformAdminRow>,
  secondaryRolesByMembershipId: Map<string, GymMembershipRow["role"][]>
): Promise<PlatformAdminUserListItem> {
  const profile = profilesMap.get(user.id);
  const activeMemberships = (membershipsByUser.get(user.id) ?? []).filter((membership) => membership.status === "active");
  const roles = [
    ...new Set(
      activeMemberships.flatMap((membership) => getEffectiveRoles(membership.role, secondaryRolesByMembershipId.get(membership.id) ?? []))
    )
  ];
  const gymCount = new Set(activeMemberships.map((membership) => membership.gym_id)).size;
  const platformAdmin = platformAdminsMap.get(user.id);

  return {
    userId: user.id,
    email: profile?.email || user.email || "Sin email",
    username: profile?.username || "",
    name: profileName(profile, (user.user_metadata?.full_name as string | undefined) || user.email || "Usuario"),
    gymCount,
    roles,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? undefined,
    isManagedAccount: isManagedBossFitEmail(profile?.email || user.email),
    isPlatformAdmin: Boolean(platformAdmin?.active)
  };
}

async function getUserMembershipItems(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  userId: string,
  memberships: GymMembershipRow[]
): Promise<PlatformAdminUserMembershipItem[]> {
  const gymIds = memberships.map((membership) => membership.gym_id);
  const gymsMap = await fetchGymsMap(supabase, gymIds);
  const secondaryRolesByMembershipId = await fetchSecondaryRolesByMembershipIds(
    supabase,
    memberships.map((membership) => membership.id)
  );
  const { data: assignments, error: assignmentsError } = await supabase
    .from("member_assignments")
    .select("id, gym_id, member_user_id, trainer_user_id, group_id, status")
    .eq("member_user_id", userId)
    .in("gym_id", gymIds.length ? gymIds : ["00000000-0000-0000-0000-000000000000"]);

  if (assignmentsError) {
    throw assignmentsError;
  }

  const assignmentByGym = new Map<string, MemberAssignmentRow>();
  const assignmentRows = (assignments ?? []) as MemberAssignmentRow[];
  for (const assignment of assignmentRows) {
    assignmentByGym.set(assignment.gym_id, assignment);
  }

  const trainerProfilesMap = await fetchProfilesMap(supabase, uniqueIds(assignmentRows.map((assignment) => assignment.trainer_user_id)));
  const groupsMap = await fetchGroupsMap(supabase, uniqueIds(assignmentRows.map((assignment) => assignment.group_id)));

  return memberships
    .map((membership) => {
      const gym = gymsMap.get(membership.gym_id);
      const assignment = assignmentByGym.get(membership.gym_id);
      const trainerProfile = assignment?.trainer_user_id ? trainerProfilesMap.get(assignment.trainer_user_id) : null;
      const group = assignment?.group_id ? groupsMap.get(assignment.group_id) : null;
      const extraRoles = secondaryRolesByMembershipId.get(membership.id) ?? [];
      const effectiveRoles = getEffectiveRoles(membership.role, extraRoles);

      return {
        membershipId: membership.id,
        gymId: membership.gym_id,
        gymName: gym?.name || "Gym desconocido",
        gymSlug: gym?.slug || "gym",
        role: membership.role,
        extraRoles,
        effectiveRoles,
        status: membership.status,
        createdAt: membership.created_at,
        trainerUserId: assignment?.trainer_user_id ?? undefined,
        trainerName: trainerProfile ? profileName(trainerProfile) : undefined,
        groupId: assignment?.group_id ?? undefined,
        groupName: group?.name ?? undefined,
        assignmentStatus: assignment?.status
      } satisfies PlatformAdminUserMembershipItem;
    })
    .sort((left, right) => {
      const roleDelta = roleSortValue(getPrimaryEffectiveRole(left.role, left.extraRoles)) - roleSortValue(getPrimaryEffectiveRole(right.role, right.extraRoles));
      if (roleDelta !== 0) {
        return roleDelta;
      }

      return left.gymName.localeCompare(right.gymName, "es");
    });
}

async function fetchExistingMemberAssignment(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  gymId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("member_assignments")
    .select("id, gym_id, member_user_id, trainer_user_id, group_id, status")
    .eq("gym_id", gymId)
    .eq("member_user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MemberAssignmentRow | null) ?? null;
}

async function applyMembershipChange(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  requesterId: string,
  userId: string,
  gymId: string,
  role: PlatformAdminAddMembershipInput["role"],
  status: PlatformAdminAddMembershipInput["status"],
  extraRoles: PlatformAdminAddMembershipInput["extraRoles"] = []
) {
  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .select("id")
    .eq("id", gymId)
    .maybeSingle();

  if (gymError) {
    throw gymError;
  }

  if (!gym) {
    throw new Error("No encontramos el gym solicitado.");
  }

  const { data: currentMembership, error: membershipError } = await supabase
    .from("gym_memberships")
    .select("id, gym_id, user_id, role, status, created_at")
    .eq("gym_id", gymId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  const current = (currentMembership as GymMembershipRow | null) ?? null;
  const normalizedExtraRoles = [...new Set((extraRoles ?? []).filter((nextRole) => nextRole !== role))];
  const nextEffectiveRoles = getEffectiveRoles(role, normalizedExtraRoles);
  const currentExtraRoles = current ? await fetchSecondaryRolesForMembership(supabase, current.id) : [];
  const currentEffectiveRoles = current ? getEffectiveRoles(current.role, currentExtraRoles) : [];

  if (currentEffectiveRoles.includes("trainer") && !nextEffectiveRoles.includes("trainer")) {
    await cleanupTrainerLinksForUser(supabase, gymId, userId);
  }

  if (currentEffectiveRoles.includes("member") && !nextEffectiveRoles.includes("member")) {
    await cleanupMemberDataForUser(supabase, gymId, userId);
  }

  let persistedMembership: GymMembershipRow;

  if (current) {
    const { error: updateError } = await supabase
      .from("gym_memberships")
      .update({ role, status })
      .eq("id", current.id);

    if (updateError) {
      throw updateError;
    }

    persistedMembership = {
      ...current,
      role,
      status
    };
  } else {
    const { data: insertedMembership, error: insertError } = await supabase
      .from("gym_memberships")
      .insert({
        gym_id: gymId,
        user_id: userId,
        role,
        status,
        invited_by: requesterId
      })
      .select("id, gym_id, user_id, role, status, created_at")
      .single();

    if (insertError) {
      throw insertError;
    }

    persistedMembership = insertedMembership as GymMembershipRow;
  }

  await replaceSecondaryRolesForMembership(supabase, persistedMembership, normalizedExtraRoles);

  if (nextEffectiveRoles.includes("member")) {
    const existingAssignment = await fetchExistingMemberAssignment(supabase, gymId, userId);
    await upsertMemberAssignment(
      supabase,
      gymId,
      userId,
      existingAssignment?.trainer_user_id ?? null,
      existingAssignment?.group_id ?? null,
      existingAssignment?.status ?? "pending"
    );
  }
}

export async function requirePlatformAdminFromRequest(request: Request): Promise<{
  requester: User;
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  admin: PlatformAdminContext;
} | null> {
  const requester = await getAuthenticatedUserFromRequest(request);
  if (!requester) {
    return null;
  }

  const supabase = createSupabaseServiceRoleClient();
  const admin = await getPlatformAdminContextByUserId(supabase, requester.id, requester.email);

  if (!admin) {
    return null;
  }

  return { requester, supabase, admin };
}

export async function fetchPlatformGyms(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>
): Promise<PlatformAdminGymListItem[]> {
  const { data: gyms, error: gymsError } = await supabase
    .from("gyms")
    .select("id, name, slug, contact_email, phone, active, created_at")
    .order("created_at", { ascending: false });

  if (gymsError) {
    throw gymsError;
  }

  const gymRows = (gyms ?? []) as GymRow[];
  const gymIds = gymRows.map((gym) => gym.id);

  const membershipsByGym = new Map<string, GymMembershipRow[]>();
  let membershipRows: GymMembershipRow[] = [];
  if (gymIds.length) {
    const { data: memberships, error: membershipsError } = await supabase
      .from("gym_memberships")
      .select("id, gym_id, user_id, role, status, created_at")
      .in("gym_id", gymIds);

    if (membershipsError) {
      throw membershipsError;
    }

    membershipRows = (memberships ?? []) as GymMembershipRow[];
    for (const membership of membershipRows) {
      const list = membershipsByGym.get(membership.gym_id) ?? [];
      list.push(membership);
      membershipsByGym.set(membership.gym_id, list);
    }
  }

  const secondaryRolesByMembershipId = await fetchSecondaryRolesByMembershipIds(
    supabase,
    membershipRows.map((membership) => membership.id)
  );

  const ownerIds = uniqueIds(
    membershipRows
      .filter((membership) => membership.status === "active")
      .filter((membership) => getEffectiveRoles(membership.role, secondaryRolesByMembershipId.get(membership.id) ?? []).includes("owner"))
      .map((membership) => membership.user_id)
  );
  const profilesMap = await fetchProfilesMap(supabase, ownerIds);

  return gymRows.map((gym) => {
    const memberships = (membershipsByGym.get(gym.id) ?? [])
      .filter((membership) => membership.status === "active")
      .map((membership) => ({
        membership,
        effectiveRoles: getEffectiveRoles(membership.role, secondaryRolesByMembershipId.get(membership.id) ?? [])
      }));

    const ownerNames = memberships
      .filter((item) => item.effectiveRoles.includes("owner"))
      .map((item) => profileName(profilesMap.get(item.membership.user_id), item.membership.user_id.slice(0, 6)));

    return {
      id: gym.id,
      name: gym.name,
      slug: gym.slug,
      contactEmail: gym.contact_email || "Sin email",
      phone: gym.phone || "Sin telefono",
      active: gym.active,
      createdAt: gym.created_at,
      ownerNames,
      adminsCount: countMembershipsWithEffectiveRole(memberships, "admin"),
      trainersCount: countMembershipsWithEffectiveRole(memberships, "trainer"),
      membersCount: countMembershipsWithEffectiveRole(memberships, "member"),
      totalMemberships: memberships.length
    };
  });
}

export async function fetchPlatformUsers(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>
): Promise<PlatformAdminUserListItem[]> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw error;
  }

  const authUsers = data.users ?? [];
  const userIds = authUsers.map((user) => user.id);
  const [profilesMap, membershipsResponse, platformAdminsMap] = await Promise.all([
    fetchProfilesMap(supabase, userIds),
    supabase.from("gym_memberships").select("id, gym_id, user_id, role, status, created_at").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
    fetchPlatformAdminsMap(supabase, userIds)
  ]);

  if (membershipsResponse.error) {
    throw membershipsResponse.error;
  }

  const membershipRows = (membershipsResponse.data ?? []) as GymMembershipRow[];
  const secondaryRolesByMembershipId = await fetchSecondaryRolesByMembershipIds(
    supabase,
    membershipRows.map((membership) => membership.id)
  );

  const membershipsByUser = new Map<string, GymMembershipRow[]>();
  for (const membership of membershipRows) {
    const list = membershipsByUser.get(membership.user_id) ?? [];
    list.push(membership);
    membershipsByUser.set(membership.user_id, list);
  }

  const items = await Promise.all(
    authUsers.map((user) => buildPlatformUserListItem(user, profilesMap, membershipsByUser, platformAdminsMap, secondaryRolesByMembershipId))
  );

  return items.sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

export async function fetchPlatformOverview(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>
): Promise<PlatformAdminOverviewData> {
  const [gyms, users] = await Promise.all([fetchPlatformGyms(supabase), fetchPlatformUsers(supabase)]);

  return {
    totalGyms: gyms.length,
    activeGyms: gyms.filter((gym) => gym.active).length,
    totalUsers: users.length,
    totalMemberships: gyms.reduce((total, gym) => total + gym.totalMemberships, 0),
    recentGyms: gyms.slice(0, 6),
    recentUsers: users.slice(0, 6)
  };
}

export async function fetchPlatformUserDetail(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  userId: string
): Promise<PlatformAdminUserDetail | null> {
  const { data: authResponse, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError) {
    throw authError;
  }

  const authUser = authResponse.user;
  if (!authUser) {
    return null;
  }

  await ensureProfileForAuthUser(supabase, authUser);

  const [profilesMap, membershipsResponse, platformAdminsMap, remoteState] = await Promise.all([
    fetchProfilesMap(supabase, [userId]),
    supabase.from("gym_memberships").select("id, gym_id, user_id, role, status, created_at").eq("user_id", userId),
    fetchPlatformAdminsMap(supabase, [userId]),
    fetchUserRemoteStateOrEmpty(supabase, userId)
  ]);

  if (membershipsResponse.error) {
    throw membershipsResponse.error;
  }

  const profile = profilesMap.get(userId);
  const platformAdmin = platformAdminsMap.get(userId);
  const memberships = await getUserMembershipItems(supabase, userId, (membershipsResponse.data ?? []) as GymMembershipRow[]);

  return {
    userId,
    email: profile?.email || authUser.email || "Sin email",
    username: profile?.username || "",
    name: profileName(profile, (authUser.user_metadata?.full_name as string | undefined) || authUser.email || "Usuario"),
    fullName: profile?.full_name || (authUser.user_metadata?.full_name as string | undefined) || "",
    displayName: profile?.display_name || (authUser.user_metadata?.display_name as string | undefined) || profileName(profile),
    createdAt: authUser.created_at,
    lastSignInAt: authUser.last_sign_in_at ?? undefined,
    emailConfirmedAt: authUser.email_confirmed_at ?? undefined,
    isManagedAccount: isManagedBossFitEmail(profile?.email || authUser.email),
    isPlatformAdmin: Boolean(platformAdmin?.active),
    platformAdminActive: Boolean(platformAdmin?.active),
    platformAdminLabel: platformAdmin?.label || "",
    memberships,
    technicalState: {
      habitsCount: remoteState.habitsCount,
      completionsCount: remoteState.completionsCount,
      currentStreak: remoteState.currentStreak,
      bestStreak: remoteState.bestStreak,
      totalPoints: remoteState.totalPoints,
      level: remoteState.level,
      revision: remoteState.revision,
      lastSyncedAt: remoteState.lastSyncedAt,
      updatedAt: remoteState.updatedAt,
      lastSaveReason: remoteState.lastSaveReason
    }
  };
}

export async function fetchPlatformGymDetail(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  gymId: string
): Promise<PlatformAdminGymDetail | null> {
  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .select("id, name, slug, contact_email, phone, active, created_at")
    .eq("id", gymId)
    .maybeSingle();

  if (gymError) {
    throw gymError;
  }

  const gymRow = (gym as GymRow | null) ?? null;
  if (!gymRow) {
    return null;
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("gym_memberships")
    .select("id, gym_id, user_id, role, status, created_at")
    .eq("gym_id", gymId);

  if (membershipsError) {
    throw membershipsError;
  }

  const membershipRows = (memberships ?? []) as GymMembershipRow[];
  const userIds = membershipRows.map((membership) => membership.user_id);
  const [profilesMap, platformAdminsMap, secondaryRolesByMembershipId] = await Promise.all([
    fetchProfilesMap(supabase, userIds),
    fetchPlatformAdminsMap(supabase, userIds),
    fetchSecondaryRolesByMembershipIds(supabase, membershipRows.map((membership) => membership.id))
  ]);

  const membershipItems: PlatformAdminGymMemberItem[] = membershipRows
    .map((membership) => {
      const profile = profilesMap.get(membership.user_id);
      const platformAdmin = platformAdminsMap.get(membership.user_id);
      const extraRoles = secondaryRolesByMembershipId.get(membership.id) ?? [];
      const effectiveRoles = getEffectiveRoles(membership.role, extraRoles);
      return {
        membershipId: membership.id,
        userId: membership.user_id,
        name: profileName(profile, membership.user_id.slice(0, 6)),
        email: profile?.email || "Sin email",
        username: profile?.username || "",
        role: membership.role,
        extraRoles,
        effectiveRoles,
        status: membership.status,
        createdAt: membership.created_at,
        isManagedAccount: isManagedBossFitEmail(profile?.email),
        isPlatformAdmin: Boolean(platformAdmin?.active)
      } satisfies PlatformAdminGymMemberItem;
    })
    .sort((left, right) => {
      const roleDelta = roleSortValue(getPrimaryEffectiveRole(left.role, left.extraRoles)) - roleSortValue(getPrimaryEffectiveRole(right.role, right.extraRoles));
      if (roleDelta !== 0) {
        return roleDelta;
      }

      return left.name.localeCompare(right.name, "es");
    });

  return {
    id: gymRow.id,
    name: gymRow.name,
    slug: gymRow.slug,
    contactEmail: gymRow.contact_email || "",
    phone: gymRow.phone || "",
    active: gymRow.active,
    createdAt: gymRow.created_at,
    totalMemberships: membershipItems.length,
    ownersCount: membershipItems.filter((membership) => membership.effectiveRoles.includes("owner")).length,
    adminsCount: membershipItems.filter((membership) => membership.effectiveRoles.includes("admin")).length,
    trainersCount: membershipItems.filter((membership) => membership.effectiveRoles.includes("trainer")).length,
    membersCount: membershipItems.filter((membership) => membership.effectiveRoles.includes("member")).length,
    memberships: membershipItems
  };
}

export async function createPlatformGym(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  requesterId: string,
  input: PlatformAdminCreateGymInput
) {
  const name = input.name.trim();
  const slug = normalizePlatformSlug(input.slug || input.name);

  if (name.length < 2) {
    throw new Error("El gym debe tener al menos 2 caracteres.");
  }

  if (slug.length < 3) {
    throw new Error("Usa un slug válido para el gym.");
  }

  const owner = await resolveUserIdByIdentifier(supabase, input.ownerIdentifier);
  if (input.ownerIdentifier?.trim() && !owner) {
    throw new Error("No encontramos al owner indicado por email o usuario.");
  }

  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .insert({
      name,
      slug,
      contact_email: input.contactEmail?.trim() || null,
      phone: input.phone?.trim() || null,
      active: input.active ?? true
    })
    .select("id")
    .single();

  if (gymError) {
    throw gymError;
  }

  if (owner) {
    await applyMembershipChange(supabase, requesterId, owner.userId, gym.id as string, "owner", "active");
  }

  return fetchPlatformGymDetail(supabase, gym.id as string);
}

export async function updatePlatformGym(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  gymId: string,
  input: PlatformAdminUpdateGymInput
) {
  const name = input.name.trim();
  const slug = normalizePlatformSlug(input.slug || input.name);

  if (name.length < 2) {
    throw new Error("El gym debe tener al menos 2 caracteres.");
  }

  if (slug.length < 3) {
    throw new Error("Usa un slug válido para el gym.");
  }

  const { error } = await supabase
    .from("gyms")
    .update({
      name,
      slug,
      contact_email: input.contactEmail?.trim() || null,
      phone: input.phone?.trim() || null,
      active: input.active
    })
    .eq("id", gymId);

  if (error) {
    throw error;
  }

  return fetchPlatformGymDetail(supabase, gymId);
}

export async function createPlatformManagedUser(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  input: PlatformAdminCreateManagedUserInput
): Promise<PlatformManagedUserCredentials> {
  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    throw new Error("Escribe un nombre válido.");
  }

  const managedAccess = await generateManagedAccessForPlatform(supabase, fullName);
  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email: managedAccess.email,
    password: managedAccess.password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      display_name: fullName,
      login_alias: managedAccess.alias,
      username: managedAccess.alias
    }
  });

  if (createUserError || !createdUser.user) {
    throw createUserError ?? new Error("No se pudo crear la cuenta gestionada.");
  }

  const userId = createdUser.user.id;

  try {
    const { error: profileUpsertError } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        email: managedAccess.email,
        full_name: fullName,
        display_name: fullName,
        username: managedAccess.alias
      },
      { onConflict: "user_id" }
    );

    if (profileUpsertError) {
      throw profileUpsertError;
    }
  } catch (error) {
    await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
    throw error;
  }

  return {
    userId,
    alias: managedAccess.alias,
    email: managedAccess.email,
    password: managedAccess.password,
    fullName
  };
}

export async function updatePlatformUser(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  userId: string,
  input: PlatformAdminUpdateUserInput
) {
  const { data: authResponse, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError) {
    throw authError;
  }

  const user = authResponse.user;
  if (!user) {
    throw new Error("No encontramos esa cuenta.");
  }

  const normalizedUsername = input.username ? await assertUniqueUsername(supabase, input.username, userId) : "";
  const fullName = input.fullName.trim();

  const { data: currentProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileLookupError) {
    throw profileLookupError;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: userId,
      email: (currentProfile?.email as string | null) ?? user.email ?? null,
      full_name: fullName,
      display_name: fullName,
      username: normalizedUsername || null
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    throw profileError;
  }

  const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...user.user_metadata,
      full_name: fullName,
      display_name: fullName,
      username: normalizedUsername || undefined,
      login_alias: normalizedUsername || user.user_metadata?.login_alias
    }
  });

  if (authUpdateError) {
    throw authUpdateError;
  }

  if (input.platformAdminActive) {
    const { error: platformAdminError } = await supabase.from("bossfit_platform_admins").upsert(
      {
        user_id: userId,
        email: user.email ?? (currentProfile?.email as string | null) ?? null,
        label: input.platformAdminLabel?.trim() || "BossFit Owners",
        active: true
      },
      { onConflict: "user_id" }
    );

    if (platformAdminError) {
      throw platformAdminError;
    }
  } else {
    const { error: disablePlatformAdminError } = await supabase
      .from("bossfit_platform_admins")
      .update({ active: false, label: input.platformAdminLabel?.trim() || null })
      .eq("user_id", userId);

    if (disablePlatformAdminError) {
      throw disablePlatformAdminError;
    }
  }

  return fetchPlatformUserDetail(supabase, userId);
}

export async function addMembershipToPlatformUser(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  requesterId: string,
  userId: string,
  input: PlatformAdminAddMembershipInput
) {
  const { data: authResponse, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError) {
    throw authError;
  }

  if (!authResponse.user) {
    throw new Error("No encontramos esa cuenta.");
  }

  await applyMembershipChange(supabase, requesterId, userId, input.gymId, input.role, input.status, input.extraRoles);
  return fetchPlatformUserDetail(supabase, userId);
}

export async function updatePlatformUserMembership(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  requesterId: string,
  userId: string,
  gymId: string,
  input: PlatformAdminUpdateMembershipInput
) {
  await applyMembershipChange(supabase, requesterId, userId, gymId, input.role, input.status, input.extraRoles);
  return fetchPlatformUserDetail(supabase, userId);
}

export async function attachExistingUserToGym(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  requesterId: string,
  gymId: string,
  input: PlatformAdminAddGymMembershipByIdentifierInput
) {
  const resolved = await resolveUserIdByIdentifier(supabase, input.identifier);
  if (!resolved) {
    throw new Error("No encontramos un usuario con ese email o username.");
  }

  await applyMembershipChange(supabase, requesterId, resolved.userId, gymId, input.role, input.status, input.extraRoles);
  return fetchPlatformGymDetail(supabase, gymId);
}


