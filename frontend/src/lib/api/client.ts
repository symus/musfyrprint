"use client";

import { toApiError } from "./errors";

const XSRF_COOKIE = "XSRF-TOKEN";
const XSRF_HEADER = "X-XSRF-TOKEN";
let csrfReady: Promise<void> | null = null;

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function ensureCsrfCookie(): Promise<void> {
  if (readCookie(XSRF_COOKIE)) return;
  csrfReady ??= fetch("/api/v1/auth/csrf", { credentials: "same-origin" }).then(() => undefined);
  await csrfReady;
  csrfReady = null;
}

/**
 * Browser fetch through the same-origin /api proxy. Sends the session cookie and, for unsafe methods,
 * the double-submit CSRF header. Throws ApiError with the backend's problem details on failure.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  // Server-side validation messages follow the page language.
  if (!headers.has("Accept-Language")) headers.set("Accept-Language", document.documentElement.lang || "en");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    await ensureCsrfCookie();
    const token = readCookie(XSRF_COOKIE);
    if (token) headers.set(XSRF_HEADER, token);
  }
  const res = await fetch(path, { ...init, method, headers, credentials: "same-origin" });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const postJson = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });

export const putJson = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
