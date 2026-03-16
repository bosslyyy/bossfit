"use client";

import type { PropsWithChildren } from "react";

import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/layout/bottom-nav";
import { FloatingCreateButton } from "@/components/layout/floating-create-button";
import { ReminderRunner } from "@/components/pwa/reminder-runner";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ThemeSync } from "@/components/pwa/theme-sync";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const hideFab = pathname === "/habits/new" || pathname.endsWith("/edit");

  return (
    <>
      <ThemeSync />
      <ServiceWorkerRegister />
      <ReminderRunner />
      <div className="mx-auto min-h-screen w-full max-w-[30rem] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        {children}
      </div>
      {!hideFab ? <FloatingCreateButton /> : null}
      <BottomNav />
    </>
  );
}
