import { NextResponse } from "next/server";
import { z } from "zod";

import { SnapshotMutationError } from "@/lib/bossfit/snapshot-actions";
import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import {
  completeUserHabitSet,
  createUserHabit,
  archiveUserHabit,
  resetUserAppData,
  resetUserHabitCompletion,
  setUserLocalePreference,
  setUserThemePreference,
  toggleUserHabitActive,
  undoUserHabitSet,
  updateUserHabit,
  updateUserReminderSettingsPreference
} from "@/lib/supabase/normalized-user-state-server";
import {
  createSupabaseServiceRoleClient,
  getAuthenticatedUserFromRequest
} from "@/lib/supabase/server-admin";
import { habitSchema } from "@/lib/validation/habit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate"
};

function mapActionSchemaErrorMessage(info: ReturnType<typeof getSupabaseErrorInfo>) {
  const source = `${info.code ?? ""} ${info.message} ${info.details ?? ""} ${info.hint ?? ""}`.toLowerCase();

  if (
    (source.includes("42703") || source.includes("42p01") || source.includes("pgrst")) &&
    (source.includes("rest_enabled") ||
      source.includes("rest_seconds") ||
      source.includes("locale") ||
      source.includes("bossfit_habits") ||
      source.includes("bossfit_user_settings") ||
      source.includes("bossfit_habit_completions"))
  ) {
    return "Falta actualizar la base de datos de BossFit. Ejecuta el schema.sql más reciente en Supabase y vuelve a intentar.";
  }

  return info.message;
}

const reminderPermissionSchema = z.enum(["default", "granted", "denied", "unsupported"]);
const reminderSettingsPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    permission: reminderPermissionSchema.optional(),
    lastSentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
  })
  .partial();

const themeSchema = z.enum(["light", "dark"]);
const localeSchema = z.enum(["es", "en"]);
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function POST(request: Request) {
  try {
    const requester = await getAuthenticatedUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401, headers: noStoreHeaders });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const type = typeof body.type === "string" ? body.type : null;
    if (!type) {
      return NextResponse.json({ error: "Falta el tipo de accion." }, { status: 400, headers: noStoreHeaders });
    }

    const supabase = createSupabaseServiceRoleClient();

    switch (type) {
      case "create_habit": {
        const parsed = habitSchema.safeParse(body.values);
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
            { status: 400, headers: noStoreHeaders }
          );
        }

        const outcome = await createUserHabit(supabase, requester.id, parsed.data);
        return NextResponse.json({ userId: requester.id, state: outcome.state, result: outcome.result }, { headers: noStoreHeaders });
      }

      case "update_habit": {
        const habitId = typeof body.habitId === "string" ? body.habitId : null;
        if (!habitId) {
          return NextResponse.json({ error: "Falta habitId." }, { status: 400, headers: noStoreHeaders });
        }

        const parsed = habitSchema.safeParse(body.values);
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
            { status: 400, headers: noStoreHeaders }
          );
        }

        const outcome = await updateUserHabit(supabase, requester.id, habitId, parsed.data);
        return NextResponse.json({ userId: requester.id, state: outcome.state, result: outcome.result }, { headers: noStoreHeaders });
      }

      case "delete_habit": {
        const habitId = typeof body.habitId === "string" ? body.habitId : null;
        if (!habitId) {
          return NextResponse.json({ error: "Falta habitId." }, { status: 400, headers: noStoreHeaders });
        }

        const outcome = await archiveUserHabit(supabase, requester.id, habitId);
        return NextResponse.json({ userId: requester.id, state: outcome.state, result: outcome.result }, { headers: noStoreHeaders });
      }

      case "toggle_habit_active": {
        const habitId = typeof body.habitId === "string" ? body.habitId : null;
        if (!habitId) {
          return NextResponse.json({ error: "Falta habitId." }, { status: 400, headers: noStoreHeaders });
        }

        const outcome = await toggleUserHabitActive(supabase, requester.id, habitId);
        return NextResponse.json({ userId: requester.id, state: outcome.state, result: outcome.result }, { headers: noStoreHeaders });
      }

      case "complete_set": {
        const habitId = typeof body.habitId === "string" ? body.habitId : null;
        const parsedDateKey = dateKeySchema.safeParse(body.dateKey);
        if (!habitId) {
          return NextResponse.json({ error: "Falta habitId." }, { status: 400, headers: noStoreHeaders });
        }
        if (!parsedDateKey.success) {
          return NextResponse.json({ error: "Falta una fecha valida para registrar la serie." }, { status: 400, headers: noStoreHeaders });
        }

        const outcome = await completeUserHabitSet(supabase, requester.id, habitId, parsedDateKey.data);
        return NextResponse.json({ userId: requester.id, state: outcome.state, result: outcome.result }, { headers: noStoreHeaders });
      }

      case "undo_set": {
        const habitId = typeof body.habitId === "string" ? body.habitId : null;
        const parsedDateKey = dateKeySchema.safeParse(body.dateKey);
        if (!habitId) {
          return NextResponse.json({ error: "Falta habitId." }, { status: 400, headers: noStoreHeaders });
        }
        if (!parsedDateKey.success) {
          return NextResponse.json({ error: "Falta una fecha valida para deshacer la serie." }, { status: 400, headers: noStoreHeaders });
        }

        const outcome = await undoUserHabitSet(supabase, requester.id, habitId, parsedDateKey.data);
        return NextResponse.json({ userId: requester.id, state: outcome.state, result: outcome.result }, { headers: noStoreHeaders });
      }

      case "reset_completion": {
        const habitId = typeof body.habitId === "string" ? body.habitId : null;
        const parsedDateKey = dateKeySchema.safeParse(body.dateKey);
        if (!habitId) {
          return NextResponse.json({ error: "Falta habitId." }, { status: 400, headers: noStoreHeaders });
        }
        if (!parsedDateKey.success) {
          return NextResponse.json({ error: "Falta una fecha valida para reiniciar la serie." }, { status: 400, headers: noStoreHeaders });
        }

        const outcome = await resetUserHabitCompletion(supabase, requester.id, habitId, parsedDateKey.data);
        return NextResponse.json({ userId: requester.id, state: outcome.state, result: outcome.result }, { headers: noStoreHeaders });
      }

      case "set_theme": {
        const parsed = themeSchema.safeParse(body.theme);
        if (!parsed.success) {
          return NextResponse.json({ error: "Tema invalido." }, { status: 400, headers: noStoreHeaders });
        }

        const outcome = await setUserThemePreference(supabase, requester.id, parsed.data);
        return NextResponse.json({ userId: requester.id, state: outcome.state, result: outcome.result }, { headers: noStoreHeaders });
      }

      case "set_locale": {
        const parsed = localeSchema.safeParse(body.locale);
        if (!parsed.success) {
          return NextResponse.json({ error: "Idioma invalido." }, { status: 400, headers: noStoreHeaders });
        }

        const outcome = await setUserLocalePreference(supabase, requester.id, parsed.data);
        return NextResponse.json({ userId: requester.id, state: outcome.state, result: outcome.result }, { headers: noStoreHeaders });
      }

      case "update_reminder_settings": {
        const parsed = reminderSettingsPatchSchema.safeParse(body.values);
        if (!parsed.success) {
          return NextResponse.json({ error: "Configuracion de recordatorio invalida." }, { status: 400, headers: noStoreHeaders });
        }

        const outcome = await updateUserReminderSettingsPreference(supabase, requester.id, parsed.data);
        return NextResponse.json({ userId: requester.id, state: outcome.state, result: outcome.result }, { headers: noStoreHeaders });
      }

      case "reset_app_data": {
        const outcome = await resetUserAppData(supabase, requester.id);
        return NextResponse.json({ userId: requester.id, state: outcome.state, result: outcome.result }, { headers: noStoreHeaders });
      }

      default:
        return NextResponse.json({ error: "Accion no soportada." }, { status: 400, headers: noStoreHeaders });
    }
  } catch (error) {
    if (error instanceof SnapshotMutationError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
    }

    const info = getSupabaseErrorInfo(error);
    return NextResponse.json(
      {
        error: mapActionSchemaErrorMessage(info),
        details: info.details,
        hint: info.hint,
        code: info.code
      },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
