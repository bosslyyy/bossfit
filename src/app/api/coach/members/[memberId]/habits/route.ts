import { NextResponse } from "next/server";

import { SnapshotMutationError } from "@/lib/bossfit/snapshot-actions";
import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import {
  archiveUserHabit,
  createUserHabit,
  updateUserHabit
} from "@/lib/supabase/normalized-user-state-server";
import { findActiveMembershipByRoles } from "@/lib/supabase/gym-membership-roles";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";
import { habitSchema } from "@/lib/validation/habit";

interface RouteContext {
  params: Promise<{
    memberId: string;
  }>;
}

function mapCoachSchemaErrorMessage(info: ReturnType<typeof getSupabaseErrorInfo>) {
  const source = `${info.code ?? ""} ${info.message} ${info.details ?? ""} ${info.hint ?? ""}`.toLowerCase();

  if (
    (source.includes("42703") || source.includes("42p01") || source.includes("pgrst")) &&
    (source.includes("rest_enabled") ||
      source.includes("rest_seconds") ||
      source.includes("bossfit_habits") ||
      source.includes("bossfit_user_settings") ||
      source.includes("bossfit_habit_completions"))
  ) {
    return "Falta actualizar la base de datos de BossFit. Ejecuta el schema.sql más reciente en Supabase y vuelve a intentar.";
  }

  return info.message;
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
    .eq("status", "active")
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    return {
      error: NextResponse.json({ error: "No puedes gestionar los ejercicios de este alumno." }, { status: 403 })
    } as const;
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("gym_memberships")
    .select("id, gym_id, user_id, role, status, created_at")
    .eq("gym_id", assignment.gym_id)
    .eq("user_id", requester.id)
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

    const outcome = await createUserHabit(auth.supabase, memberId, parsed.data);
    return NextResponse.json({ habit: outcome.result.habit, state: outcome.state });
  } catch (error) {
    if (error instanceof SnapshotMutationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const info = getSupabaseErrorInfo(error);
    console.error("BossFit Coach: no se pudo crear el entrenamiento del alumno.", {
      message: mapCoachSchemaErrorMessage(info),
      details: info.details,
      hint: info.hint,
      code: info.code,
      raw: error
    });

    return NextResponse.json({ error: mapCoachSchemaErrorMessage(info), details: info.details, hint: info.hint, code: info.code }, { status: 500 });
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

    const outcome = await updateUserHabit(auth.supabase, memberId, body.habitId, parsed.data);
    return NextResponse.json({ habitId: body.habitId, state: outcome.state });
  } catch (error) {
    if (error instanceof SnapshotMutationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const info = getSupabaseErrorInfo(error);
    console.error("BossFit Coach: no se pudo actualizar el entrenamiento del alumno.", {
      message: mapCoachSchemaErrorMessage(info),
      details: info.details,
      hint: info.hint,
      code: info.code,
      raw: error
    });

    return NextResponse.json({ error: mapCoachSchemaErrorMessage(info), details: info.details, hint: info.hint, code: info.code }, { status: 500 });
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

    const outcome = await archiveUserHabit(auth.supabase, memberId, habitId);
    return NextResponse.json({ success: true, state: outcome.state });
  } catch (error) {
    if (error instanceof SnapshotMutationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const info = getSupabaseErrorInfo(error);
    console.error("BossFit Coach: no se pudo eliminar el entrenamiento del alumno.", {
      message: mapCoachSchemaErrorMessage(info),
      details: info.details,
      hint: info.hint,
      code: info.code,
      raw: error
    });

    return NextResponse.json({ error: mapCoachSchemaErrorMessage(info), details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}



