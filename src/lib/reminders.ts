import { toDateKey } from "@/lib/date";
import type { ReminderPermissionState, ReminderSettings } from "@/types/habit";

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

export function getReminderSupport(): ReminderSupport {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return {
      supported: false,
      permission: "unsupported",
      platformHint: "Este navegador no expone la Notifications API para BossFit."
    };
  }

  const isiOS = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  const standalone = isStandaloneMode();

  if (isiOS && !standalone) {
    return {
      supported: true,
      permission: Notification.permission,
      platformHint:
        "En iPhone y iPad los recordatorios son más fiables si BossFit está instalada en la pantalla de inicio."
    };
  }

  return {
    supported: true,
    permission: Notification.permission,
    platformHint:
      "Los recordatorios funcionan mientras BossFit esté abierta. Sin backend ni push remoto no hay programación persistente garantizada."
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

export function getReminderPermissionLabel(permission: ReminderPermissionState) {
  if (permission === "unsupported") {
    return "No compatible";
  }

  if (permission === "granted") {
    return "Permitidas";
  }

  if (permission === "denied") {
    return "Bloqueadas";
  }

  return "Sin configurar";
}

