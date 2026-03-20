import { z } from "zod";

export const adminUserRoleSchema = z.enum(["admin", "trainer", "member"]);

export const adminCreateUserSchema = z.object({
  gymId: z.string().uuid(),
  fullName: z.string().trim().min(2, "Escribe un nombre válido."),
  role: adminUserRoleSchema,
  trainerUserId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional()
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
