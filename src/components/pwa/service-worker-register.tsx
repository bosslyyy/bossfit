"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let didRefresh = false;
    let registrationRef: ServiceWorkerRegistration | null = null;

    const handleControllerChange = () => {
      if (didRefresh) {
        return;
      }

      didRefresh = true;
      window.location.reload();
    };

    const promptWaitingWorker = (registration: ServiceWorkerRegistration | null) => {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    };

    const handleRegistration = (registration: ServiceWorkerRegistration) => {
      registrationRef = registration;
      promptWaitingWorker(registration);

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            installingWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    };

    const updateRegistration = async () => {
      try {
        const registration =
          registrationRef ?? (await navigator.serviceWorker.getRegistration("/")) ?? null;

        if (!registration) {
          return;
        }

        registrationRef = registration;
        await registration.update();
        promptWaitingWorker(registration);
      } catch {
        // Si falla la comprobacion de update, la app sigue funcionando con normalidad.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void updateRegistration();
      }
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        handleRegistration(registration);
        await updateRegistration();
      } catch {
        // Si falla el registro, BossFit sigue funcionando como web app normal.
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    window.addEventListener("focus", updateRegistration);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void register();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("focus", updateRegistration);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
