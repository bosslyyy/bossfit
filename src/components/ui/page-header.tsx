"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useAppLocale } from "@/hooks/use-app-locale";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  backHref,
  action,
  className
}: {
  title: string;
  description?: string;
  backHref?: string;
  action?: ReactNode;
  className?: string;
}) {
  const locale = useAppLocale();
  const backLabel = locale === "en" ? "Back" : "Volver";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          {backHref ? (
            <Link href={backHref} className={buttonVariants({ variant: "ghost", size: "default", className: "-ml-3 h-10 px-3" })}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              {backLabel}
            </Link>
          ) : null}
          <div className="space-y-1">
            <h1 className="font-display text-[clamp(1.8rem,6vw,2.6rem)] font-semibold leading-none text-foreground">
              {title}
            </h1>
            {description ? <p className="max-w-[32rem] text-sm text-foreground/65">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}
