"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Session } from "@/lib/api/types";

const STAFF = ["ADMIN", "DESIGNER", "PRODUCTION", "SUPPORT"];

/** Client-side session check for the admin UI. Authorisation is always enforced again by the API. */
export function useStaffSession() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Session>("/api/v1/auth/me")
      .then((s) => {
        if (cancelled) return;
        if (!s.user.roles.some((r) => STAFF.includes(r))) router.replace("/admin/login?reason=forbidden");
        else setSession(s);
      })
      .catch((e) => {
        if (!cancelled && e instanceof ApiError && e.status === 401) router.replace("/admin/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return session;
}

export const hasRole = (session: Session | null, ...roles: string[]) =>
  Boolean(session?.user.roles.some((r) => roles.includes(r)));
