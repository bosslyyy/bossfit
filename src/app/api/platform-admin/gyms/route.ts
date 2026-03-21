import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseErrorInfo } from "@/lib/supabase/data";
import { createPlatformGym, fetchPlatformGyms, requirePlatformAdminFromRequest } from "@/lib/supabase/platform-admin-server";

export const runtime = "nodejs";

const createGymSchema = z.object({
  name: z.string().trim().min(2, "El gym debe tener al menos 2 caracteres.").max(80, "Usa un nombre más corto."),
  slug: z.string().trim().min(2, "Escribe un slug válido.").max(80, "El slug es demasiado largo."),
  contactEmail: z.string().trim().email("Email de contacto inválido.").optional().or(z.literal("")),
  phone: z.string().trim().max(40, "El teléfono es demasiado largo.").optional().or(z.literal("")),
  ownerIdentifier: z.string().trim().max(120, "El owner es demasiado largo.").optional().or(z.literal("")),
  active: z.boolean().optional()
});

export async function GET(request: Request) {
  try {
    const access = await requirePlatformAdminFromRequest(request);

    if (!access) {
      return NextResponse.json({ error: "No tienes acceso al panel de plataforma." }, { status: 403 });
    }

    const gyms = await fetchPlatformGyms(access.supabase);
    return NextResponse.json({ gyms });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await requirePlatformAdminFromRequest(request);

    if (!access) {
      return NextResponse.json({ error: "No tienes acceso al panel de plataforma." }, { status: 403 });
    }

    const parsed = createGymSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const gym = await createPlatformGym(access.supabase, access.requester.id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      contactEmail: parsed.data.contactEmail || undefined,
      phone: parsed.data.phone || undefined,
      ownerIdentifier: parsed.data.ownerIdentifier || undefined,
      active: parsed.data.active ?? true
    });

    return NextResponse.json({ gym });
  } catch (error) {
    const info = getSupabaseErrorInfo(error);
    return NextResponse.json({ error: info.message, details: info.details, hint: info.hint, code: info.code }, { status: 500 });
  }
}
