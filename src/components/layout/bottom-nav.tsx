"use client";

import Link from "next/link";
import { BarChart3, Home, Settings2, SunMedium } from "lucide-react";
import { usePathname } from "next/navigation";

import { useAppLocale } from "@/hooks/use-app-locale";
import { getBottomNavItems } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const icons = {
  home: Home,
  today: SunMedium,
  progress: BarChart3,
  settings: Settings2
};

export function BottomNav() {
  const pathname = usePathname();
  const locale = useAppLocale();
  const items = getBottomNavItems(locale);
  const hasSideFab = pathname === "/today";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[30rem] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div
        className={cn(
          "grid grid-cols-4 rounded-[30px] border border-border/80 bg-background/84 p-2 shadow-[0_24px_58px_rgba(2,8,16,0.20)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/74",
          hasSideFab && "mr-[5.5rem]"
        )}
      >
        {items.map((item) => {
          const Icon = icons[item.icon];
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-3 text-[11px] font-semibold transition duration-200",
                isActive
                  ? "bg-[#121B29] text-white shadow-[0_16px_34px_rgba(91,140,255,0.30)] ring-1 ring-[#4E7DFF]/24"
                  : "text-muted-foreground hover:bg-card hover:text-card-foreground"
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
