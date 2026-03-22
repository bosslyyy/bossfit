"use client";

import { useBossFitStore } from "@/store/use-bossfit-store";

export function useAppLocale() {
  return useBossFitStore((state) => state.locale);
}
