import { toDateKey } from "@/lib/date";
import type { AppLocale, ReminderPermissionState, ReminderSettings } from "@/types/habit";

export interface ReminderSupport {
  supported: boolean;
  permission: ReminderPermissionState;
  platformHint: string;
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneMatch = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const navigatorStandalone =
    typeof window.navigator !== "undefined" && "standalone" in window.navigator
      ? Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
      : false;

  return standaloneMatch || navigatorStandalone;
}

export function getReminderSupport(locale: AppLocale = "es"): ReminderSupport {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return {
      supported: false,
      permission: "unsupported",
      platformHint:
        locale === "en"
          ? "This browser does not expose the Notifications API for BossFit."
          : "Este navegador no expone la Notifications API para BossFit."
    };
  }

  const isiOS = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  const standalone = isStandaloneMode();

  if (isiOS && !standalone) {
    return {
      supported: true,
      permission: Notification.permission,
      platformHint:
        locale === "en"
          ? "On iPhone and iPad, reminders are more reliable if BossFit is installed on the home screen."
          : "En iPhone y iPad los recordatorios son más fiables si BossFit está instalada en la pantalla de inicio."
    };
  }

  return {
    supported: true,
    permission: Notification.permission,
    platformHint:
      locale === "en"
        ? "Reminders work while BossFit is open. Without a backend or remote push there is no guaranteed persistent scheduling."
        : "Los recordatorios funcionan mientras BossFit esté abierta. Sin backend ni push remoto no hay programación persistente garantizada."
  };
}

export async function requestReminderPermission() {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.requestPermission();
}

export function isReminderDue(settings: ReminderSettings, now: Date = new Date()) {
  if (!settings.enabled) {
    return false;
  }

  const [targetHour, targetMinute] = settings.time.split(":").map(Number);
  const todayKey = toDateKey(now);

  return (
    Number.isFinite(targetHour) &&
    Number.isFinite(targetMinute) &&
    now.getHours() === targetHour &&
    now.getMinutes() === targetMinute &&
    settings.lastSentDate !== todayKey
  );
}

export function getReminderPermissionLabel(permission: ReminderPermissionState, locale: AppLocale = "es") {
  if (permission === "unsupported") {
    return locale === "en" ? "Unsupported" : "No compatible";
  }

  if (permission === "granted") {
    return locale === "en" ? "Allowed" : "Permitidas";
  }

  if (permission === "denied") {
    return locale === "en" ? "Blocked" : "Bloqueadas";
  }

  return locale === "en" ? "Not set" : "Sin configurar";
}
