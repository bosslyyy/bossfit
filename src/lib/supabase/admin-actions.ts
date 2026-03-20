import type { AdminGroupDetail, AdminUserDetail, AssignmentStatus, GymRole, MembershipStatus } from "@/lib/supabase/admin";

export interface AdminGroupCreateInput {
  gymId: string;
  name: string;
  description?: string;
  trainerUserId?: string;
  scheduleText?: string;
  active?: boolean;
}

export interface AdminAssignmentUpdateInput {
  trainerUserId?: string;
  groupId?: string;
  status: AssignmentStatus;
}

export interface AdminCredentialResetResult {
  userId: string;
  alias: string;
  email: string;
  password: string;
  role: "owner" | "admin" | "trainer" | "member";
  fullName: string;
}

export interface AdminUserUpdateInput {
  gymId: string;
  fullName: string;
  username?: string;
  role: Exclude<GymRole, "owner">;
  status: MembershipStatus;
  trainerUserId?: string;
  groupId?: string;
  assignmentStatus?: AssignmentStatus;
}

export interface AdminGroupUpdateInput {
  gymId: string;
  name: string;
  description?: string;
  trainerUserId?: string;
  scheduleText?: string;
  active: boolean;
}

async function requestAdminJson<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
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
    throw new Error(payload?.error || "No se pudo completar la operación administrativa.");
  }

  return payload as T;
}

export function createAdminGroup(accessToken: string, values: AdminGroupCreateInput) {
  return requestAdminJson<{ groupId: string }>("/api/admin/groups", accessToken, {
    method: "POST",
    body: JSON.stringify(values)
  });
}

export function updateAdminAssignment(accessToken: string, assignmentId: string, values: AdminAssignmentUpdateInput) {
  return requestAdminJson<{ success: true }>(`/api/admin/assignments/${assignmentId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(values)
  });
}

export function resetAdminUserCredentials(accessToken: string, userId: string) {
  return requestAdminJson<{ credentials: AdminCredentialResetResult }>(`/api/admin/users/${userId}/credentials`, accessToken, {
    method: "POST"
  });
}

export function fetchAdminUserDetail(accessToken: string, userId: string, gymId: string) {
  return requestAdminJson<{ detail: AdminUserDetail }>(`/api/admin/users/${userId}?gymId=${encodeURIComponent(gymId)}`, accessToken);
}

export function updateAdminUser(accessToken: string, userId: string, values: AdminUserUpdateInput) {
  return requestAdminJson<{ detail: AdminUserDetail }>(`/api/admin/users/${userId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(values)
  });
}

export function deleteAdminUser(accessToken: string, userId: string, gymId: string) {
  return requestAdminJson<{ success: true; deletedScope: "account" | "gym" }>(
    `/api/admin/users/${userId}?gymId=${encodeURIComponent(gymId)}`,
    accessToken,
    {
      method: "DELETE"
    }
  );
}

export function fetchAdminGroupDetail(accessToken: string, groupId: string, gymId: string) {
  return requestAdminJson<{ detail: AdminGroupDetail }>(`/api/admin/groups/${groupId}?gymId=${encodeURIComponent(gymId)}`, accessToken);
}

export function updateAdminGroup(accessToken: string, groupId: string, values: AdminGroupUpdateInput) {
  return requestAdminJson<{ detail: AdminGroupDetail | null }>(`/api/admin/groups/${groupId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(values)
  });
}

export function deleteAdminGroup(accessToken: string, groupId: string, gymId: string) {
  return requestAdminJson<{ success: true }>(`/api/admin/groups/${groupId}?gymId=${encodeURIComponent(gymId)}`, accessToken, {
    method: "DELETE"
  });
}
