import { z } from "zod";

export const adminManagedRoleSchema = z.enum(["admin", "trainer", "member"]);
export const adminManagedStatusSchema = z.enum(["active", "invited", "paused", "suspended"]);
export const adminManagedAssignmentStatusSchema = z.enum(["active", "pending", "paused"]);

export const adminUpdateUserSchema = z.object({
  gymId: z.string().uuid("Gym inválido."),
  fullName: z.string().trim().min(2, "Escribe un nombre válido."),
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres.")
    .max(24, "El usuario es demasiado largo.")
    .regex(/^[a-z0-9]+$/, "Usa solo minúsculas y números.")
    .optional()
    .or(z.literal("")),
  role: adminManagedRoleSchema,
  status: adminManagedStatusSchema,
  trainerUserId: z.string().uuid("Entrenador inválido.").optional().or(z.literal("")),
  groupId: z.string().uuid("Grupo inválido.").optional().or(z.literal("")),
  assignmentStatus: adminManagedAssignmentStatusSchema.optional()
});

export const adminUpdateGroupSchema = z.object({
  gymId: z.string().uuid("Gym inválido."),
  name: z.string().trim().min(2, "El grupo debe tener al menos 2 caracteres.").max(60, "Usa un nombre más corto."),
  description: z.string().trim().max(180, "La descripción es demasiado larga.").optional().or(z.literal("")),
  trainerUserId: z.string().uuid("Entrenador inválido.").optional().or(z.literal("")),
  scheduleText: z.string().trim().max(120, "El horario es demasiado largo.").optional().or(z.literal("")),
  active: z.boolean()
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type AdminUpdateGroupInput = z.infer<typeof adminUpdateGroupSchema>;
