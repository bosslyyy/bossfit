"use client";

import { useEffect, useState } from "react";

import { X } from "lucide-react";

import { useAppLocale } from "@/hooks/use-app-locale";
import {
  ANDROID_APK_DOWNLOAD_URL,
  ANDROID_APP_PACKAGE,
  ANDROID_MIN_NATIVE_VERSION_CODE
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

function parseNativeVersionFromQuery() {
  if (typeof window === "undefined") {
    return Number.NaN;
  }

  const params = new URLSearchParams(window.location.search);
  const raw = params.get("apkv") ?? params.get("appv") ?? params.get("nativev") ?? "";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isRunningInsideAndroidApp() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }

  const referrer = document.referrer || "";
  if (referrer.startsWith(`android-app://${ANDROID_APP_PACKAGE}`)) {
    return true;
  }

  const params = new URLSearchParams(window.location.search);
  const source = (params.get("source") ?? params.get("src") ?? "").toLowerCase();
  const runtime = (params.get("runtime") ?? "").toLowerCase();
  return source === "apk" || source === "android" || runtime === "twa";
}

export function NativeUpdateBanner({ className }: { className?: string }) {
  const locale = useAppLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isRunningInsideAndroidApp()) {
      return;
    }

    const currentVersion = parseNativeVersionFromQuery();
    const needsUpgrade = !Number.isFinite(currentVersion) || currentVersion < ANDROID_MIN_NATIVE_VERSION_CODE;

    setShow(needsUpgrade);
  }, []);

  if (!show) {
    return null;
  }

  const copy =
    locale === "en"
      ? {
          title: "Android app update available",
          description: "Install the latest APK to get the new icon and wrapper improvements.",
          cta: "Update APK",
          dismiss: "Dismiss",
          version: `Required native version: v${ANDROID_MIN_NATIVE_VERSION_CODE}+`
        }
      : {
          title: "Actualizacion disponible de Android",
          description: "Instala la APK mas reciente para tener el nuevo icono y mejoras del contenedor.",
          cta: "Actualizar APK",
          dismiss: "Cerrar",
          version: `Version nativa requerida: v${ANDROID_MIN_NATIVE_VERSION_CODE}+`
        };

  return (
    <div className={cn("rounded-3xl border border-accent/30 bg-accent/10 p-4 text-card-foreground", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{copy.title}</p>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
          <p className="text-xs text-muted-foreground">{copy.version}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl"
          aria-label={copy.dismiss}
          onClick={() => setShow(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3">
        <a
          href={ANDROID_APK_DOWNLOAD_URL}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "primary", className: "w-full" })}
        >
          {copy.cta}
        </a>
      </div>
    </div>
  );
}
