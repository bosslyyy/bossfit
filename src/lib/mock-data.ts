import type { DailyCompletion, Habit } from "@/types/habit";

export const MOCK_HABITS: Habit[] = [];

export const MOCK_COMPLETIONS: DailyCompletion[] = [];

export function createMockState() {
  return {
    habits: [...MOCK_HABITS],
    completions: [...MOCK_COMPLETIONS]
  };
}
