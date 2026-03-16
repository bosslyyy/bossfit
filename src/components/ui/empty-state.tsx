import Link from "next/link";
import { Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <Card className="overflow-hidden bg-mesh">
      <div className="flex flex-col items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/12 text-accent">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {actionLabel && actionHref ? (
          <Link href={actionHref} className={buttonVariants({ variant: "primary" })}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
