import { AlertTriangle, Inbox, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AdminDataState({
  title,
  description,
  actionLabel,
  onAction,
  tone = "neutral"
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "neutral" | "warning";
}) {
  const Icon = tone === "warning" ? AlertTriangle : Inbox;

  return (
    <Card className="space-y-4 border border-border bg-card text-center dark:bg-[#121922] dark:text-white">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/12 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        <h3 className="font-display text-xl font-semibold text-card-foreground dark:text-white">{title}</h3>
        <p className="mx-auto max-w-[32rem] text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={onAction}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
