import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureTrainerBelongsToGym, requireAdminGymAccess } from "@/lib/supabase/admin-route-helpers";
import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { createSupabaseServiceRoleClient, getAuthenticatedUserFromRequest } from "@/lib/supabase/server-admin";

const createGroupSchema = z.object({
  gymId: z.string().uuid("Gym inválido."),
  name: z.string().trim().min(2, "El grupo debe tener al menos 2 caracteres.").max(60, "Usa un nombre más corto."),
  description: z.string().trim().max(180, "La descripción es demasiado larga.").optional().or(z.literal("")),
  trainerUserId: z.string().uuid().optional().or(z.literal("")),
  scheduleText: z.string().trim().max(120, "El horario es demasiado largo.").optional().or(z.literal("")),
  active: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const parsed = createGroupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const { gymId, name, description, trainerUserId, scheduleText, active } = parsed.data;
    const supabase = createSupabaseServiceRoleClient();

    const membership = await requireAdminGymAccess(supabase, requester.id, gymId);
    if (!membership) {
      return NextResponse.json({ error: "No tienes permisos para crear grupos en este gym." }, { status: 403 });
    }

    if (trainerUserId) {
      const trainerMembership = await ensureTrainerBelongsToGym(supabase, gymId, trainerUserId);
      if (!trainerMembership) {
        return NextResponse.json({ error: "El entrenador seleccionado no pertenece a este gym." }, { status: 400 });
      }
    }

    const { data: group, error: insertError } = await supabase
      .from("gym_groups")
      .insert({
        gym_id: gymId,
        name,
        description: description || null,
        trainer_user_id: trainerUserId || null,
        schedule_text: scheduleText || null,
        active: active ?? true
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ groupId: group.id });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    console.error("BossFit Admin: no se pudo crear el grupo.", {
      message: info.message,
      details: info.details,
      hint: info.hint,
      code: info.code,
      raw: error
    });

    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
