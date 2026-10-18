import "server-only";

import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ApiError, toApiError } from "./errors";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8080";

/**
 * Server-side GET against the Spring Boot API. Runs at request time (never during `next build`), so the
 * storefront always shows live catalogue data and builds do not depend on a running backend.
 * The backend caches hot catalogue reads itself.
 */
export async function apiGet<T>(path: string, init?: { notFoundOn404?: boolean }): Promise<T> {
  await connection();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404 && init?.notFoundOn404 !== false) {
    notFound();
  }
  if (!res.ok) {
    throw await toApiError(res);
  }
  return (await res.json()) as T;
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function query(params: Record<string, string | number | boolean | string[] | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, v));
    else sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
