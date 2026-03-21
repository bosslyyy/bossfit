import type { SupabaseClient } from "@supabase/supabase-js";

export type EffectiveGymRole = "owner" | "admin" | "trainer" | "member";

interface BaseMembershipRow {
  id: string;
  gym_id: string;
  user_id: string;
  role: EffectiveGymRole;
  status: string;
}

interface GymMembershipRoleRow {
  membership_id: string;
  gym_id: string;
  user_id: string;
  role: EffectiveGymRole;
}

const rolePriority: Record<EffectiveGymRole, number> = {
  owner: 0,
  admin: 1,
  trainer: 2,
  member: 3
};

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function isMissingSecondaryRolesSchema(error: unknown) {
  const source = JSON.stringify(error).toLowerCase();
  return source.includes("42p01") || source.includes("pgrst205") || source.includes("gym_membership_roles");
}

export function getEffectiveRoles(primaryRole: EffectiveGymRole, extraRoles: EffectiveGymRole[] = []) {
  return [...new Set([primaryRole, ...extraRoles])].sort((left, right) => rolePriority[left] - rolePriority[right]);
}

export function getPrimaryEffectiveRole(primaryRole: EffectiveGymRole, extraRoles: EffectiveGymRole[] = []) {
  return getEffectiveRoles(primaryRole, extraRoles)[0] ?? primaryRole;
}

export async function fetchSecondaryRolesByMembershipIds(
  supabase: SupabaseClient,
  membershipIds: string[]
): Promise<Map<string, EffectiveGymRole[]>> {
  const ids = uniqueIds(membershipIds);
  const map = new Map<string, EffectiveGymRole[]>();

  if (!ids.length) {
    return map;
  }

  try {
    const { data, error } = await supabase
      .from("gym_membership_roles")
      .select("membership_id, gym_id, user_id, role")
      .in("membership_id", ids);

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as GymMembershipRoleRow[]) {
      const current = map.get(row.membership_id) ?? [];
      current.push(row.role);
      map.set(row.membership_id, [...new Set(current)]);
    }

    return map;
  } catch (error) {
    if (isMissingSecondaryRolesSchema(error)) {
      return map;
    }

    throw error;
  }
}

export async function fetchSecondaryRolesForMembership(
  supabase: SupabaseClient,
  membershipId: string
): Promise<EffectiveGymRole[]> {
  const map = await fetchSecondaryRolesByMembershipIds(supabase, [membershipId]);
  return map.get(membershipId) ?? [];
}

export async function fetchActiveMembershipsWithRoles<TMembership extends BaseMembershipRow>(
  supabase: SupabaseClient,
  memberships: TMembership[]
) {
  const rolesMap = await fetchSecondaryRolesByMembershipIds(
    supabase,
    memberships.map((membership) => membership.id)
  );

  return memberships.map((membership) => {
    const extraRoles = rolesMap.get(membership.id) ?? [];
    return {
      membership,
      extraRoles,
      effectiveRoles: getEffectiveRoles(membership.role, extraRoles),
      primaryEffectiveRole: getPrimaryEffectiveRole(membership.role, extraRoles)
    };
  });
}

export async function findActiveMembershipByRoles<TMembership extends BaseMembershipRow>(
  supabase: SupabaseClient,
  memberships: TMembership[],
  requiredRoles: EffectiveGymRole[]
) {
  const hydrated = await fetchActiveMembershipsWithRoles(supabase, memberships);
  const required = new Set(requiredRoles);

  const candidates = hydrated.filter((item) => item.effectiveRoles.some((role) => required.has(role)));
  candidates.sort((left, right) => rolePriority[left.primaryEffectiveRole] - rolePriority[right.primaryEffectiveRole]);

  return candidates[0] ?? null;
}

export async function membershipHasRole(
  supabase: SupabaseClient,
  membershipId: string,
  primaryRole: EffectiveGymRole,
  role: EffectiveGymRole
) {
  if (primaryRole === role) {
    return true;
  }

  const extraRoles = await fetchSecondaryRolesForMembership(supabase, membershipId);
  return extraRoles.includes(role);
}

export async function replaceSecondaryRolesForMembership(
  supabase: SupabaseClient,
  membership: Pick<BaseMembershipRow, "id" | "gym_id" | "user_id" | "role">,
  nextRoles: EffectiveGymRole[]
) {
  const roles = [...new Set(nextRoles.filter((role) => role !== membership.role))];

  try {
    const { error: deleteError } = await supabase
      .from("gym_membership_roles")
      .delete()
      .eq("membership_id", membership.id);

    if (deleteError) {
      throw deleteError;
    }

    if (!roles.length) {
      return;
    }

    const rows = roles.map((role) => ({
      membership_id: membership.id,
      gym_id: membership.gym_id,
      user_id: membership.user_id,
      role
    }));

    const { error: insertError } = await supabase.from("gym_membership_roles").insert(rows);
    if (insertError) {
      throw insertError;
    }
  } catch (error) {
    if (isMissingSecondaryRolesSchema(error)) {
      return;
    }

    throw error;
  }
}
