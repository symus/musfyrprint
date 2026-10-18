import { connection } from "next/server";

/**
 * Same-origin reverse proxy to the Spring Boot API.
 *
 * Keeping the API on the storefront's origin lets the session cookie stay HttpOnly + SameSite=Lax and avoids
 * CORS for browsers. The target is read at runtime (API_INTERNAL_URL) so one image works in every environment.
 * In production a load balancer can route /api/* straight to the backend instead; this handler then idles.
 */
const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8080";
const FORWARD_REQUEST_HEADERS = ["accept", "content-type", "cookie", "x-xsrf-token", "x-request-id", "authorization", "accept-language", "user-agent"];
const FORWARD_RESPONSE_HEADERS = ["content-type", "cache-control", "retry-after", "x-request-id", "location"];
const MAX_BODY_BYTES = 1_000_000;

async function proxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  await connection();
  const { path } = await params;
  if (path[0] !== "v1") {
    return Response.json({ title: "Not Found", status: 404 }, { status: 404 });
  }
  const url = new URL(request.url);
  const target = `${API_BASE}/api/${path.map(encodeURIComponent).join("/")}${url.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const clientIp = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

  let body: ArrayBuffer | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) {
      return Response.json({ title: "Payload Too Large", status: 413 }, { status: 413 });
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, { method: request.method, headers, body, redirect: "manual", cache: "no-store" });
  } catch {
    return Response.json(
      { title: "Service Unavailable", status: 503, detail: "The shop service is temporarily unavailable." },
      { status: 503 },
    );
  }

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }
  return new Response(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
