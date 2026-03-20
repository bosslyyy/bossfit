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
const trackingModeEnum = z.enum(["reps", "timer"]);

export const habitSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres.")
      .max(40, "Usa un nombre corto y claro."),
    category: categoryEnum.optional().or(z.literal("")),
    trackingMode: trackingModeEnum.default("reps"),
    targetSets: z.coerce
      .number()
      .int()
      .min(1, "Debes definir al menos 1 serie.")
      .max(999, "Puedes programar hasta 999 series por hábito."),
    repsPerSet: z.coerce
      .number()
      .int()
      .min(1, "Define cuántas repeticiones harás en cada serie.")
      .max(2500, "El máximo por serie es 2500.")
      .optional(),
    secondsPerSet: z.coerce
      .number()
      .int()
      .min(5, "El tiempo mínimo por serie es 5 segundos.")
      .max(7200, "El tiempo máximo por serie es 7200 segundos.")
      .optional(),
    selectedDays: z.array(weekdayEnum).min(1, "Selecciona al menos un día."),
    color: colorEnum,
    icon: iconEnum,
    level: levelEnum.optional().or(z.literal("")),
    active: z.boolean()
  })
  .superRefine((values, context) => {
    if (values.trackingMode === "reps" && typeof values.repsPerSet !== "number") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repsPerSet"],
        message: "Define cuántas repeticiones harás en cada serie."
      });
    }

    if (values.trackingMode === "timer" && typeof values.secondsPerSet !== "number") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secondsPerSet"],
        message: "Define el tiempo de cada serie en segundos."
      });
    }
  })
  .transform((values) => ({
    ...values,
    category: values.category || undefined,
    level: values.level || undefined,
    repsPerSet: values.trackingMode === "reps" ? values.repsPerSet ?? 8 : values.repsPerSet ?? 1,
    secondsPerSet: values.trackingMode === "timer" ? values.secondsPerSet ?? 60 : undefined
  }));

export type HabitFormValues = z.output<typeof habitSchema>;

export const habitDefaultValues: HabitFormValues = {
  name: "",
  category: undefined,
  trackingMode: "reps",
  targetSets: 3,
  repsPerSet: 8,
  secondsPerSet: 60,
  selectedDays: ["mon", "wed", "fri"],
  color: "ember",
  icon: "flame",
  level: "principiante",
  active: true
};
