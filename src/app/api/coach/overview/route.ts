import { NextResponse } from "next/server";

import { getCompletionCalendarData, getWeeklySummaryFromTimeline, getBossProfile } from "@/lib/progress-analytics";
import { getSupabaseErrorInfo, createEmptyRemoteSnapshot } from "@/lib/supabase/data";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";
import { fetchRemoteSnapshotForUser } from "@/lib/supabase/server-state";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AssignmentRow {
  id: string;
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

function getLastActivityLabel(
  snapshot: Awaited<ReturnType<typeof fetchRemoteSnapshotForUser>>["snapshot"]
) {
  const candidates = [
    ...snapshot.completions.flatMap((completion) => [completion.completedAt, completion.updatedAt]),
    ...snapshot.habits.flatMap((habit) => [habit.updatedAt, habit.createdAt])
  ].filter((value): value is string => Boolean(value));

  const latest = candidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  return formatDateTime(latest);
}

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate"
};

export async function GET(request: Request) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401, headers: noStoreHeaders });
    }

    const gymId = new URL(request.url).searchParams.get("gymId");
    if (!gymId) {
      return NextResponse.json({ error: "Falta gymId." }, { status: 400, headers: noStoreHeaders });
    }

    const supabase = createSupabaseServiceRoleClient();

    const { data: membership, error: membershipError } = await supabase
      .from("gym_memberships")
      .select("id, gym_id, user_id, role, status")
      .eq("gym_id", gymId)
      .eq("user_id", requester.id)
      .eq("status", "active")
      .eq("role", "trainer")
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!membership) {
      return NextResponse.json({ error: "Tu cuenta no tiene acceso al panel coach." }, { status: 403, headers: noStoreHeaders });
    }

    const [{ data: gym, error: gymError }, { data: profile, error: profileError }, { data: assignments, error: assignmentsError }] =
      await Promise.all([
        supabase.from("gyms").select("id, name, slug, active").eq("id", gymId).maybeSingle(),
        supabase.from("profiles").select("user_id, email, full_name, display_name").eq("user_id", requester.id).maybeSingle(),
        supabase
          .from("member_assignments")
          .select("id, member_user_id, trainer_user_id, group_id, status, assigned_at")
          .eq("gym_id", gymId)
          .eq("trainer_user_id", requester.id)
          .order("assigned_at", { ascending: false })
      ]);

    if (gymError) {
      throw gymError;
    }

    if (profileError) {
      throw profileError;
    }

    if (assignmentsError) {
      throw assignmentsError;
    }

    if (!gym) {
      return NextResponse.json({ error: "No encontramos el gym del entrenador." }, { status: 404, headers: noStoreHeaders });
    }

    const assignmentRows = (assignments ?? []) as AssignmentRow[];
    const memberIds = [...new Set(assignmentRows.map((assignment) => assignment.member_user_id))];
    const groupIds = [...new Set(assignmentRows.map((assignment) => assignment.group_id).filter(Boolean))] as string[];

    const [memberProfilesResult, groupsResult, planAssignmentsResult, remoteStates] = await Promise.all([
      memberIds.length
        ? supabase.from("profiles").select("user_id, email, full_name, display_name").in("user_id", memberIds)
        : Promise.resolve({ data: [], error: null }),
      groupIds.length
        ? supabase.from("gym_groups").select("id, name").eq("gym_id", gymId).in("id", groupIds)
        : Promise.resolve({ data: [], error: null }),
      memberIds.length
        ? supabase
            .from("plan_assignments")
            .select("member_user_id, plan_template_id, active")
            .eq("gym_id", gymId)
            .eq("active", true)
            .in("member_user_id", memberIds)
        : Promise.resolve({ data: [], error: null }),
      Promise.all(memberIds.map((memberId) => fetchRemoteSnapshotForUser(supabase, memberId)))
    ]);

    if (memberProfilesResult.error) {
      throw memberProfilesResult.error;
    }

    if (groupsResult.error) {
      throw groupsResult.error;
    }

    if (planAssignmentsResult.error) {
      throw planAssignmentsResult.error;
    }

    const planAssignments = (planAssignmentsResult.data ?? []) as PlanAssignmentRow[];
    const templateIds = [...new Set(planAssignments.map((assignment) => assignment.plan_template_id))];

    const { data: planTemplates, error: planTemplatesError } = templateIds.length
      ? await supabase.from("plan_templates").select("id, name").eq("gym_id", gymId).in("id", templateIds)
      : { data: [], error: null };

    if (planTemplatesError) {
      throw planTemplatesError;
    }

    const memberProfileMap = new Map<string, ProfileRow>();
    for (const profileRow of (memberProfilesResult.data ?? []) as ProfileRow[]) {
      memberProfileMap.set(profileRow.user_id, profileRow);
    }

    const groupNameById = new Map<string, string>();
    for (const groupRow of (groupsResult.data ?? []) as GroupRow[]) {
      groupNameById.set(groupRow.id, groupRow.name);
    }

    const planNameById = new Map<string, string>();
    for (const planTemplate of (planTemplates ?? []) as PlanTemplateRow[]) {
      planNameById.set(planTemplate.id, planTemplate.name);
    }

    const activePlanByMember = new Map<string, PlanAssignmentRow>();
    for (const planAssignment of planAssignments) {
      if (!activePlanByMember.has(planAssignment.member_user_id)) {
        activePlanByMember.set(planAssignment.member_user_id, planAssignment);
      }
    }

    const snapshotByMemberId = new Map<string, Awaited<ReturnType<typeof fetchRemoteSnapshotForUser>>>();
    memberIds.forEach((memberId, index) => {
      snapshotByMemberId.set(memberId, remoteStates[index]);
    });

    const members = assignmentRows.map((assignment) => {
      const snapshotState = snapshotByMemberId.get(assignment.member_user_id);
      const snapshot = snapshotState?.snapshot ?? createEmptyRemoteSnapshot();
      const bossProfile = getBossProfile(snapshot.habits, snapshot.completions, new Date());
      const weeklySummary = getWeeklySummaryFromTimeline(snapshot.habits, snapshot.completions, new Date());
      const recentDays = getCompletionCalendarData(snapshot.habits, snapshot.completions, 7, new Date());
      const today = recentDays[recentDays.length - 1];
      const memberProfile = memberProfileMap.get(assignment.member_user_id);
      const activePlan = activePlanByMember.get(assignment.member_user_id);

      return {
        userId: assignment.member_user_id,
        assignmentId: assignment.id,
        name: profileName(memberProfile, `Alumno ${assignment.member_user_id.slice(0, 6)}`),
        email: memberProfile?.email ?? "Sin email",
        groupName: assignment.group_id ? groupNameById.get(assignment.group_id) ?? "Sin grupo" : "Sin grupo",
        planName: activePlan ? planNameById.get(activePlan.plan_template_id) ?? "Plan activo" : "Sin plan",
        assignmentStatus: assignment.status,
        currentStreak: bossProfile.currentStreak,
        bestStreak: bossProfile.bestStreak,
        totalPoints: bossProfile.totalPoints,
        level: bossProfile.levelProgress.level,
        weeklyCompliance: weeklySummary.compliance,
        lastActivityLabel: getLastActivityLabel(snapshot),
        activeHabits: snapshot.habits.filter((habit) => habit.active).length,
        completedToday: today?.completed ?? 0,
        scheduledToday: today?.scheduled ?? 0,
        recentDays,
        habits: [...snapshot.habits].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      };
    });

    const completedToday = members.filter(
      (member) => member.scheduledToday > 0 && member.completedToday === member.scheduledToday
    ).length;
    const activeToday = members.filter((member) => member.completedToday > 0).length;
    const averageCompliance = members.length
      ? Math.round(members.reduce((total, member) => total + member.weeklyCompliance, 0) / members.length)
      : 0;
    const averageStreak = members.length
      ? Math.round(members.reduce((total, member) => total + member.currentStreak, 0) / members.length)
      : 0;

    return NextResponse.json(
      {
        context: {
          gymId: gym.id,
          gymName: gym.name,
          gymSlug: gym.slug,
          gymActive: gym.active,
          role: membership.role,
          userId: requester.id,
          membershipId: membership.id,
          userEmail: (profile as ProfileRow | null)?.email ?? undefined,
          displayName: profileName(profile as ProfileRow | null)
        },
        summary: {
          assignedMembers: members.length,
          completedToday,
          activeToday,
          averageCompliance,
          averageStreak
        },
        members
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    console.error("BossFit Coach: no se pudo cargar el panel del entrenador.", {
      message: info.message,
      details: info.details,
      hint: info.hint,
      code: info.code,
      raw: error
    });

    return NextResponse.json(
      {
        error: info.message,
        details: info.details,
        hint: info.hint,
        code: info.code
      },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
