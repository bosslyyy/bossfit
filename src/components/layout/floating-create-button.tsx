import Link from "next/link";
import { Plus } from "lucide-react";

export function FloatingCreateButton() {
  return (
    <Link
      href="/habits/new"
      aria-label="Crear hábito"
      className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-soft transition hover:scale-[1.03] active:scale-[0.97]"
    >
      <Plus className="h-6 w-6" />
    </Link>
  );
}
