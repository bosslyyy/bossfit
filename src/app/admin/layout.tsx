import type { ReactNode } from "react";

import { PlatformAdminAccessGate } from "@/components/platform-admin/platform-admin-access-gate";
import { PlatformAdminShell } from "@/components/platform-admin/platform-admin-shell";

export default function PlatformAdminLayout({ children }: { children: ReactNode }) {
  return (
    <PlatformAdminAccessGate>
      <PlatformAdminShell>{children}</PlatformAdminShell>
    </PlatformAdminAccessGate>
  );
}
