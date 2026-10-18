import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-ink-soft" aria-busy="true">Loading…</div>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
