import { z } from "zod";

export const platformAdminGymRoleSchema = z.enum(["owner", "admin", "trainer", "member"]);
export const platformAdminMembershipStatusSchema = z.enum(["active", "invited", "paused", "suspended"]);
const optionalExtraRolesSchema = z.array(platformAdminGymRoleSchema).optional().default([]);

export const platformAdminCreateManagedUserSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe un nombre válido.").max(80, "Usa un nombre más corto.")
});

export const platformAdminUpdateUserSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe un nombre válido.").max(80, "Usa un nombre más corto."),
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres.")
    .max(24, "El usuario es demasiado largo.")
    .regex(/^[a-z0-9]+$/, "Usa solo minúsculas y números.")
    .optional()
    .or(z.literal("")),
  platformAdminActive: z.boolean(),
  platformAdminLabel: z.string().trim().max(60, "La etiqueta es demasiado larga.").optional().or(z.literal(""))
});

export const platformAdminAddMembershipSchema = z.object({
  gymId: z.string().uuid("Gym inválido."),
  role: platformAdminGymRoleSchema,
  status: platformAdminMembershipStatusSchema,
  extraRoles: optionalExtraRolesSchema
});

export const platformAdminUpdateMembershipSchema = z.object({
  role: platformAdminGymRoleSchema,
  status: platformAdminMembershipStatusSchema,
  extraRoles: optionalExtraRolesSchema
});

export const platformAdminUpdateGymSchema = z.object({
  name: z.string().trim().min(2, "El gym debe tener al menos 2 caracteres.").max(80, "Usa un nombre más corto."),
  slug: z.string().trim().min(2, "Escribe un slug válido.").max(80, "El slug es demasiado largo."),
  contactEmail: z.string().trim().email("Email de contacto inválido.").optional().or(z.literal("")),
  phone: z.string().trim().max(40, "El teléfono es demasiado largo.").optional().or(z.literal("")),
  active: z.boolean()
});

export const platformAdminAttachUserToGymSchema = z.object({
  identifier: z.string().trim().min(3, "Escribe un email o usuario válido.").max(120, "El identificador es demasiado largo."),
  role: platformAdminGymRoleSchema,
  status: platformAdminMembershipStatusSchema,
  extraRoles: optionalExtraRolesSchema
});

export type PlatformAdminCreateManagedUserInput = z.infer<typeof platformAdminCreateManagedUserSchema>;
export type PlatformAdminUpdateUserInput = z.infer<typeof platformAdminUpdateUserSchema>;
export type PlatformAdminAddMembershipInput = z.infer<typeof platformAdminAddMembershipSchema>;
export type PlatformAdminUpdateMembershipInput = z.infer<typeof platformAdminUpdateMembershipSchema>;
export type PlatformAdminUpdateGymInput = z.infer<typeof platformAdminUpdateGymSchema>;
export type PlatformAdminAttachUserToGymInput = z.infer<typeof platformAdminAttachUserToGymSchema>;
