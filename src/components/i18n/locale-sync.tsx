"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { readLocaleCookie, writeLocaleCookie } from "@/lib/i18n";
import { useBossFitStore } from "@/store/use-bossfit-store";

export function LocaleSync() {
  const { locale, setLocaleState, userId } = useBossFitStore(
    useShallow((state) => ({
      locale: state.locale,
      setLocaleState: state.setLocaleState,
      userId: state.cloudSync.userId
    }))
  );

  useEffect(() => {
    if (userId) {
      return;
    }

    const cookieLocale = readLocaleCookie();
    if (cookieLocale && cookieLocale !== locale) {
      setLocaleState(cookieLocale);
    }
  }, [locale, setLocaleState, userId]);

  useEffect(() => {
    writeLocaleCookie(locale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return null;
}
