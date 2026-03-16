import { Dumbbell, Flame, HeartPulse, Mountain, Timer, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HabitIcon as HabitIconType } from "@/types/habit";

const icons = {
  flame: Flame,
  dumbbell: Dumbbell,
  heart: HeartPulse,
  mountain: Mountain,
  bolt: Zap,
  timer: Timer
};

export function HabitIcon({ icon, className }: { icon: HabitIconType; className?: string }) {
  const Icon = icons[icon];
  return <Icon className={cn("h-5 w-5", className)} />;
}
