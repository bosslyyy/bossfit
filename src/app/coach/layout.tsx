import type { PropsWithChildren } from "react";

import { CoachAccessGate } from "@/components/coach/coach-access-gate";
import { CoachShell } from "@/components/coach/coach-shell";

export default function CoachLayout({ children }: PropsWithChildren) {
  return (
    <CoachAccessGate>
      <CoachShell>{children}</CoachShell>
    </CoachAccessGate>
  );
}
