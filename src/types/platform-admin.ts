export type PlatformAdminGymRole = "owner" | "admin" | "trainer" | "member";
export type PlatformAdminMembershipStatus = "active" | "invited" | "paused" | "suspended";

export interface PlatformAdminContext {
  userId: string;
  email: string;
  label: string;
  createdAt?: string;
}

export interface PlatformAdminGymListItem {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  phone: string;
  active: boolean;
  createdAt?: string;
  ownerNames: string[];
  adminsCount: number;
  trainersCount: number;
  membersCount: number;
  totalMemberships: number;
}

export interface PlatformAdminUserListItem {
  userId: string;
  email: string;
  username: string;
  name: string;
  gymCount: number;
  roles: string[];
  createdAt?: string;
  lastSignInAt?: string;
  isManagedAccount: boolean;
  isPlatformAdmin: boolean;
}

export interface PlatformAdminOverviewData {
  totalGyms: number;
  activeGyms: number;
  totalUsers: number;
  totalMemberships: number;
  recentGyms: PlatformAdminGymListItem[];
  recentUsers: PlatformAdminUserListItem[];
}

export interface PlatformAdminCreateGymInput {
  name: string;
  slug: string;
  contactEmail?: string;
  phone?: string;
  ownerIdentifier?: string;
  active?: boolean;
}

export interface PlatformAdminUserMembershipItem {
  membershipId: string;
  gymId: string;
  gymName: string;
  gymSlug: string;
  role: PlatformAdminGymRole;
  extraRoles: PlatformAdminGymRole[];
  effectiveRoles: PlatformAdminGymRole[];
  status: PlatformAdminMembershipStatus;
  createdAt?: string;
  trainerUserId?: string;
  trainerName?: string;
  groupId?: string;
  groupName?: string;
  assignmentStatus?: "active" | "pending" | "paused";
}

export interface PlatformAdminUserDetail {
  userId: string;
  email: string;
  username: string;
  name: string;
  fullName: string;
  displayName: string;
  createdAt?: string;
  lastSignInAt?: string;
  emailConfirmedAt?: string;
  isManagedAccount: boolean;
  isPlatformAdmin: boolean;
  platformAdminActive: boolean;
  platformAdminLabel: string;
  memberships: PlatformAdminUserMembershipItem[];
  technicalState: {
    habitsCount: number;
    completionsCount: number;
    currentStreak: number;
    bestStreak: number;
    totalPoints: number;
    level: number;
    revision: number;
    lastSyncedAt?: string;
    updatedAt?: string;
    lastSaveReason?: string;
  };
}

export interface PlatformAdminGymMemberItem {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  username: string;
  role: PlatformAdminGymRole;
  extraRoles: PlatformAdminGymRole[];
  effectiveRoles: PlatformAdminGymRole[];
  status: PlatformAdminMembershipStatus;
  createdAt?: string;
  isManagedAccount: boolean;
  isPlatformAdmin: boolean;
}

export interface PlatformAdminGymDetail {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  phone: string;
  active: boolean;
  createdAt?: string;
  totalMemberships: number;
  ownersCount: number;
  adminsCount: number;
  trainersCount: number;
  membersCount: number;
  memberships: PlatformAdminGymMemberItem[];
}

export interface PlatformAdminCreateManagedUserInput {
  fullName: string;
}

export interface PlatformManagedUserCredentials {
  userId: string;
  alias: string;
  email: string;
  password: string;
  fullName: string;
}

export interface PlatformAdminUpdateUserInput {
  fullName: string;
  username?: string;
  platformAdminActive: boolean;
  platformAdminLabel?: string;
}

export interface PlatformAdminAddMembershipInput {
  gymId: string;
  role: PlatformAdminGymRole;
  status: PlatformAdminMembershipStatus;
  extraRoles?: PlatformAdminGymRole[];
}

export interface PlatformAdminUpdateMembershipInput {
  role: PlatformAdminGymRole;
  status: PlatformAdminMembershipStatus;
  extraRoles?: PlatformAdminGymRole[];
}

export interface PlatformAdminUpdateGymInput {
  name: string;
  slug: string;
  contactEmail?: string;
  phone?: string;
  active: boolean;
}

export interface PlatformAdminAddGymMembershipByIdentifierInput {
  identifier: string;
  role: PlatformAdminGymRole;
  status: PlatformAdminMembershipStatus;
  extraRoles?: PlatformAdminGymRole[];
}
