import { z } from "zod";

const weekdayEnum = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const categoryEnum = z.enum([
  "fuerza",
  "cardio",
  "movilidad",
  "abdomen",
  "piernas",
  "recuperacion"
]);
const levelEnum = z.enum(["principiante", "intermedio", "avanzado"]);
const colorEnum = z.enum(["ember", "emerald", "ocean", "sun", "rose", "graphite"]);
const iconEnum = z.enum(["flame", "dumbbell", "heart", "mountain", "bolt", "timer"]);

export const habitSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres.")
      .max(40, "Usa un nombre corto y claro."),
    category: categoryEnum.optional().or(z.literal("")),
    targetSets: z.coerce
      .number()
      .int()
      .min(1, "Debes definir al menos 1 serie.")
      .max(12, "Mantén el objetivo en 12 series o menos."),
    repsPerSet: z.coerce
      .number()
      .int()
      .min(1, "Define cuántas repeticiones harás en cada serie.")
      .max(250, "El máximo por serie es 250."),
    selectedDays: z.array(weekdayEnum).min(1, "Selecciona al menos un día."),
    color: colorEnum,
    icon: iconEnum,
    level: levelEnum.optional().or(z.literal("")),
    active: z.boolean()
  })
  .transform((values) => ({
    ...values,
    category: values.category || undefined,
    level: values.level || undefined
  }));

export type HabitFormValues = z.output<typeof habitSchema>;

export const habitDefaultValues: HabitFormValues = {
  name: "",
  category: undefined,
  targetSets: 3,
  repsPerSet: 8,
  selectedDays: ["mon", "wed", "fri"],
  color: "ember",
  icon: "flame",
  level: "principiante",
  active: true
};
