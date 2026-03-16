"use client";

import Link from "next/link";
import { BarChart3, Home, Settings2, SunMedium } from "lucide-react";
import { usePathname } from "next/navigation";

import { BOTTOM_NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const icons = {
  home: Home,
  today: SunMedium,
  progress: BarChart3,
  settings: Settings2
};

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[30rem] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-4 rounded-[28px] border border-border bg-card/96 p-2 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-card/92 dark:border-white/10 dark:bg-[#121922]/92">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = icons[item.icon];
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-semibold transition",
                isActive
                  ? "bg-background text-card-foreground shadow-sm ring-1 ring-border dark:bg-white dark:text-[#121922] dark:ring-white/15"
                  : "text-muted-foreground hover:bg-muted hover:text-card-foreground dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
