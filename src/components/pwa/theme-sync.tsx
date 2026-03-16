"use client";

import { useEffect } from "react";

import { useBossFitStore } from "@/store/use-bossfit-store";

export function ThemeSync() {
  const theme = useBossFitStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
