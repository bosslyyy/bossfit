"use client";

import type { PropsWithChildren } from "react";

import { usePathname } from "next/navigation";

import { SupabaseAuthProvider } from "@/components/auth/supabase-auth-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SupabaseSync } from "@/components/auth/supabase-sync";
import { LocaleSync } from "@/components/i18n/locale-sync";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FloatingCreateButton } from "@/components/layout/floating-create-button";
import { NativeUpdateBanner } from "@/components/layout/native-update-banner";
import { ReminderRunner } from "@/components/pwa/reminder-runner";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ThemeSync } from "@/components/pwa/theme-sync";
import { cn } from "@/lib/utils";

const authPaths = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isGymRoute = pathname.startsWith("/gym");
  const isCoachRoute = pathname.startsWith("/coach");
  const isWideRoute = isAdminRoute || isGymRoute || isCoachRoute;
  const hideFab = isWideRoute || pathname === "/habits/new" || pathname.endsWith("/edit") || authPaths.has(pathname);
  const hideNavigation = isWideRoute || authPaths.has(pathname);
  const showNativeUpdateBanner = !isWideRoute && !authPaths.has(pathname);

  return (
    <SupabaseAuthProvider>
      <LocaleSync />
      <ThemeSync />
      <ServiceWorkerRegister />
      <AuthGuard>
        <SupabaseSync />
        <ReminderRunner />
        <div
          className={cn(
            "mx-auto min-h-screen w-full px-4 pt-[calc(1rem+env(safe-area-inset-top))]",
            isWideRoute ? "max-w-[92rem] pb-8" : "max-w-[30rem] pb-[calc(7.5rem+env(safe-area-inset-bottom))]"
          )}
        >
          {showNativeUpdateBanner ? <NativeUpdateBanner className="mb-4" /> : null}
          {children}
        </div>
        {!hideFab ? <FloatingCreateButton /> : null}
        {!hideNavigation ? <BottomNav /> : null}
      </AuthGuard>
    </SupabaseAuthProvider>
  );
}
