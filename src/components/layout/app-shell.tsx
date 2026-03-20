"use client";

import type { PropsWithChildren } from "react";

import { usePathname } from "next/navigation";

import { AuthGuard } from "@/components/auth/auth-guard";
import { SupabaseAuthProvider } from "@/components/auth/supabase-auth-provider";
import { SupabaseSync } from "@/components/auth/supabase-sync";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FloatingCreateButton } from "@/components/layout/floating-create-button";
import { ReminderRunner } from "@/components/pwa/reminder-runner";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ThemeSync } from "@/components/pwa/theme-sync";
import { cn } from "@/lib/utils";

const authPaths = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isCoachRoute = pathname.startsWith("/coach");
  const isWideRoute = isAdminRoute || isCoachRoute;
  const hideFab = isWideRoute || pathname === "/habits/new" || pathname.endsWith("/edit") || authPaths.has(pathname);
  const hideNavigation = isWideRoute || authPaths.has(pathname);

  return (
    <SupabaseAuthProvider>
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
          {children}
        </div>
        {!hideFab ? <FloatingCreateButton /> : null}
        {!hideNavigation ? <BottomNav /> : null}
      </AuthGuard>
    </SupabaseAuthProvider>
  );
}
