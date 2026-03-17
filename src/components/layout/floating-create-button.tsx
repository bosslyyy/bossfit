import Link from "next/link";
import { Plus } from "lucide-react";

export function FloatingCreateButton() {
  return (
    <Link
      href="/habits/new"
      aria-label="Crear hábito"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[#0F1621] text-[#4E7DFF] shadow-[0_24px_48px_rgba(2,8,16,0.34)] ring-1 ring-white/6 transition hover:scale-[1.03] hover:bg-[#131D2C] active:scale-[0.97]"
    >
      <Plus className="h-8 w-8" />
    </Link>
  );
}
