import type {
  PlatformAdminAddGymMembershipByIdentifierInput,
  PlatformAdminAddMembershipInput,
  PlatformAdminContext,
  PlatformAdminCreateGymInput,
  PlatformAdminCreateManagedUserInput,
  PlatformAdminGymDetail,
  PlatformAdminGymListItem,
  PlatformAdminOverviewData,
  PlatformAdminUpdateGymInput,
  PlatformAdminUpdateMembershipInput,
  PlatformAdminUpdateUserInput,
  PlatformAdminUserDetail,
  PlatformAdminUserListItem,
  PlatformManagedUserCredentials
} from "@/types/platform-admin";

async function requestPlatformAdminJson<T>(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.error || "No se pudo completar la operación de plataforma.");
  }

  return payload;
}

export async function fetchPlatformAdminContext(accessToken: string) {
  const payload = await requestPlatformAdminJson<{ context: PlatformAdminContext }>("/api/platform-admin/context", accessToken);
  return payload.context;
}

export async function fetchPlatformAdminOverview(accessToken: string) {
  const payload = await requestPlatformAdminJson<{ overview: PlatformAdminOverviewData }>("/api/platform-admin/overview", accessToken);
  return payload.overview;
}

export async function fetchPlatformAdminGyms(accessToken: string) {
  const payload = await requestPlatformAdminJson<{ gyms: PlatformAdminGymListItem[] }>("/api/platform-admin/gyms", accessToken);
  return payload.gyms;
}

export async function createPlatformAdminGym(accessToken: string, input: PlatformAdminCreateGymInput) {
  const payload = await requestPlatformAdminJson<{ gym: PlatformAdminGymDetail | null }>("/api/platform-admin/gyms", accessToken, {
    method: "POST",
    body: JSON.stringify(input)
  });

  return payload.gym;
}

export async function fetchPlatformAdminGymDetail(accessToken: string, gymId: string) {
  const payload = await requestPlatformAdminJson<{ gym: PlatformAdminGymDetail | null }>(`/api/platform-admin/gyms/${gymId}`, accessToken);
  return payload.gym;
}

export async function updatePlatformAdminGym(accessToken: string, gymId: string, input: PlatformAdminUpdateGymInput) {
  const payload = await requestPlatformAdminJson<{ gym: PlatformAdminGymDetail | null }>(`/api/platform-admin/gyms/${gymId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(input)
  });

  return payload.gym;
}

export async function attachExistingUserToPlatformGym(accessToken: string, gymId: string, input: PlatformAdminAddGymMembershipByIdentifierInput) {
  const payload = await requestPlatformAdminJson<{ gym: PlatformAdminGymDetail | null }>(`/api/platform-admin/gyms/${gymId}/memberships`, accessToken, {
    method: "POST",
    body: JSON.stringify(input)
  });

  return payload.gym;
}

export async function fetchPlatformAdminUsers(accessToken: string) {
  const payload = await requestPlatformAdminJson<{ users: PlatformAdminUserListItem[] }>("/api/platform-admin/users", accessToken);
  return payload.users;
}

export async function createPlatformAdminManagedUser(accessToken: string, input: PlatformAdminCreateManagedUserInput) {
  const payload = await requestPlatformAdminJson<{ credentials: PlatformManagedUserCredentials }>("/api/platform-admin/users", accessToken, {
    method: "POST",
    body: JSON.stringify(input)
  });

  return payload.credentials;
}

export async function fetchPlatformAdminUserDetail(accessToken: string, userId: string) {
  const payload = await requestPlatformAdminJson<{ user: PlatformAdminUserDetail | null }>(`/api/platform-admin/users/${userId}`, accessToken);
  return payload.user;
}

export async function updatePlatformAdminUser(accessToken: string, userId: string, input: PlatformAdminUpdateUserInput) {
  const payload = await requestPlatformAdminJson<{ user: PlatformAdminUserDetail | null }>(`/api/platform-admin/users/${userId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(input)
  });

  return payload.user;
}

export async function addPlatformAdminUserToGym(accessToken: string, userId: string, input: PlatformAdminAddMembershipInput) {
  const payload = await requestPlatformAdminJson<{ user: PlatformAdminUserDetail | null }>(`/api/platform-admin/users/${userId}/memberships`, accessToken, {
    method: "POST",
    body: JSON.stringify(input)
  });

  return payload.user;
}

export async function updatePlatformAdminUserMembership(accessToken: string, userId: string, gymId: string, input: PlatformAdminUpdateMembershipInput) {
  const payload = await requestPlatformAdminJson<{ user: PlatformAdminUserDetail | null }>(`/api/platform-admin/users/${userId}/memberships/${gymId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(input)
  });

  return payload.user;
}
