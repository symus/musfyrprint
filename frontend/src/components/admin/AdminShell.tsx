"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, MessageSquareQuote, Package, ScrollText } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { postJson } from "@/lib/api/client";
import { hasRole, useStaffSession } from "./useSession";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "DESIGNER", "PRODUCTION", "SUPPORT"] },
  { href: "/admin/products", label: "Products", icon: Package, roles: ["ADMIN", "DESIGNER"] },
  { href: "/admin/quotes", label: "Quote requests", icon: MessageSquareQuote, roles: ["ADMIN", "SUPPORT"] },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, roles: ["ADMIN"] },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const session = useStaffSession();
  const pathname = usePathname();
  const router = useRouter();

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center text-ink-soft" aria-busy="true">Checking your session…</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-cloud md:flex-row">
      <aside className="border-b border-line bg-white p-4 md:w-64 md:border-b-0 md:border-r">
        <Link href="/admin" aria-label="Admin home"><Logo /></Link>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-ink-soft">Back office</p>
        <nav aria-label="Admin" className="mt-6">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV.filter((n) => hasRole(session, ...n.roles)).map((n) => {
              const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${active ? "bg-ink text-paper" : "hover:bg-cloud"}`}
                  >
                    <n.icon size={18} aria-hidden="true" /> {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-6 border-t border-line pt-4 text-sm">
          <p className="font-semibold">{session.user.displayName}</p>
          <p className="text-xs text-ink-soft">{session.user.roles.join(", ")}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet hover:underline"
            onClick={async () => {
              await postJson("/api/v1/auth/logout", {}).catch(() => undefined);
              router.replace("/admin/login");
            }}
          >
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>
      <main id="main" className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
