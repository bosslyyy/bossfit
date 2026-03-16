import type { DailyCompletion, Habit } from "@/types/habit";

export const MOCK_HABITS: Habit[] = [
  {
    id: "habit-lagartijas",
    name: "Lagartijas",
    category: "fuerza",
    targetSets: 3,
    repsPerSet: 8,
    selectedDays: ["mon", "wed", "fri"],
    active: true,
    color: "ember",
    icon: "flame",
    level: "principiante",
    createdAt: "2026-01-05T08:00:00.000Z",
    updatedAt: "2026-01-05T08:00:00.000Z"
  },
  {
    id: "habit-movilidad",
    name: "Movilidad de cadera",
    category: "movilidad",
    targetSets: 2,
    repsPerSet: 12,
    selectedDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    active: true,
    color: "emerald",
    icon: "mountain",
    level: "principiante",
    createdAt: "2026-01-07T07:30:00.000Z",
    updatedAt: "2026-01-07T07:30:00.000Z"
  },
  {
    id: "habit-core-boss",
    name: "Core Boss",
    category: "abdomen",
    targetSets: 4,
    repsPerSet: 20,
    selectedDays: ["tue", "thu", "sat"],
    active: true,
    color: "ocean",
    icon: "bolt",
    level: "intermedio",
    createdAt: "2026-01-09T18:15:00.000Z",
    updatedAt: "2026-01-09T18:15:00.000Z"
  }
];

export const MOCK_COMPLETIONS: DailyCompletion[] = [];

export function createMockState() {
  return {
    habits: MOCK_HABITS,
    completions: MOCK_COMPLETIONS
  };
}
