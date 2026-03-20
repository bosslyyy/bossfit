import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";
import { fetchRemoteSnapshotForUser, saveRemoteSnapshotForUser } from "@/lib/supabase/server-state";
import { habitSchema } from "@/lib/validation/habit";

interface RouteContext {
  params: Promise<{
    memberId: string;
  }>;
}

async function assertTrainerCanManageMember(request: Request, memberId: string) {
  const requester = await getAuthenticatedUserFromRequest(request);
  if (!requester) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 401 }) } as const;
  }

  const supabase = createSupabaseServiceRoleClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("member_assignments")
    .select("id, gym_id, trainer_user_id, member_user_id, status")
    .eq("member_user_id", memberId)
    .eq("trainer_user_id", requester.id)
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    return {
      error: NextResponse.json({ error: "No puedes gestionar los hábitos de este alumno." }, { status: 403 })
    } as const;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("gym_memberships")
    .select("id")
    .eq("gym_id", assignment.gym_id)
    .eq("user_id", requester.id)
    .eq("role", "trainer")
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    return {
      error: NextResponse.json({ error: "Tu cuenta no tiene acceso activo como entrenador." }, { status: 403 })
    } as const;
  }

  return { requester, supabase, assignment } as const;
}

async function readDeleteHabitId(request: Request) {
  const url = new URL(request.url);
  const habitIdFromQuery = url.searchParams.get("habitId");
  if (habitIdFromQuery) {
    return habitIdFromQuery;
  }

  try {
    const body = (await request.json()) as { habitId?: string };
    return body.habitId ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { memberId } = await context.params;
    const auth = await assertTrainerCanManageMember(request, memberId);
    if ("error" in auth) {
      return auth.error;
    }

    const body = await request.json();
    const parsed = habitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const remoteState = await fetchRemoteSnapshotForUser(auth.supabase, memberId);
    const now = new Date().toISOString();
    const nextHabit = {
      id: `habit-${randomUUID()}`,
      name: parsed.data.name,
      category: parsed.data.category,
      trackingMode: parsed.data.trackingMode,
      targetSets: parsed.data.targetSets,
      repsPerSet: parsed.data.repsPerSet,
      secondsPerSet: parsed.data.secondsPerSet,
      selectedDays: parsed.data.selectedDays,
      active: parsed.data.active,
      color: parsed.data.color,
      icon: parsed.data.icon,
      level: parsed.data.level,
      createdAt: now,
      updatedAt: now
    };

    await saveRemoteSnapshotForUser(auth.supabase, memberId, {
      ...remoteState.snapshot,
      habits: [nextHabit, ...remoteState.snapshot.habits]
    });

    return NextResponse.json({ habit: nextHabit });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    console.error("BossFit Coach: no se pudo crear el entrenamiento del alumno.", {
      message: info.message,
      details: info.details,
      hint: info.hint,
      code: info.code,
      raw: error
    });

    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { memberId } = await context.params;
    const auth = await assertTrainerCanManageMember(request, memberId);
    if ("error" in auth) {
      return auth.error;
    }

    const body = (await request.json()) as { habitId?: string; values?: unknown };
    if (!body.habitId) {
      return NextResponse.json({ error: "Falta habitId." }, { status: 400 });
    }

    const parsed = habitSchema.safeParse(body.values);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const remoteState = await fetchRemoteSnapshotForUser(auth.supabase, memberId);
    const targetHabit = remoteState.snapshot.habits.find((habit) => habit.id === body.habitId);

    if (!targetHabit) {
      return NextResponse.json({ error: "No encontramos ese entrenamiento en el alumno." }, { status: 404 });
    }

    const updatedHabit = {
      ...targetHabit,
      ...parsed.data,
      updatedAt: new Date().toISOString()
    };

    await saveRemoteSnapshotForUser(auth.supabase, memberId, {
      ...remoteState.snapshot,
      habits: remoteState.snapshot.habits.map((habit) => (habit.id === body.habitId ? updatedHabit : habit))
    });

    return NextResponse.json({ habit: updatedHabit });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    console.error("BossFit Coach: no se pudo actualizar el entrenamiento del alumno.", {
      message: info.message,
      details: info.details,
      hint: info.hint,
      code: info.code,
      raw: error
    });

    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { memberId } = await context.params;
    const auth = await assertTrainerCanManageMember(request, memberId);
    if ("error" in auth) {
      return auth.error;
    }

    const habitId = await readDeleteHabitId(request);
    if (!habitId) {
      return NextResponse.json({ error: "Falta habitId." }, { status: 400 });
    }

    const remoteState = await fetchRemoteSnapshotForUser(auth.supabase, memberId);
    const nextHabits = remoteState.snapshot.habits.filter((habit) => habit.id !== habitId);

    if (nextHabits.length === remoteState.snapshot.habits.length) {
      return NextResponse.json({ error: "No encontramos ese entrenamiento en el alumno." }, { status: 404 });
    }

    const nextCompletions = remoteState.snapshot.completions.filter((completion) => completion.habitId !== habitId);

    await saveRemoteSnapshotForUser(auth.supabase, memberId, {
      ...remoteState.snapshot,
      habits: nextHabits,
      completions: nextCompletions
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    console.error("BossFit Coach: no se pudo eliminar el entrenamiento del alumno.", {
      message: info.message,
      details: info.details,
      hint: info.hint,
      code: info.code,
      raw: error
    });

    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
