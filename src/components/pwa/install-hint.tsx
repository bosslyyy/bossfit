import { Download, Share2 } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function InstallHint() {
  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Instala BossFit</CardTitle>
            <CardDescription>Se siente mejor como app real en iPhone y Android.</CardDescription>
          </div>
        </div>
        <div className="rounded-[22px] bg-black/5 p-4 text-sm text-foreground/70 dark:bg-white/5">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Share2 className="h-4 w-4" />
            En iPhone: abre Safari, toca Compartir y elige “Agregar a pantalla de inicio”.
          </p>
        </div>
      </div>
    </Card>
  );
}
