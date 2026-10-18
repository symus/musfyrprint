import { NextResponse, type NextRequest } from "next/server";

import { hasLocale, LOCALE_COOKIE, matchLocale } from "@/i18n/config";

/**
 * Sends visitors without a locale prefix to /pl/... or /en/... — the saved language choice wins, then the
 * browser's Accept-Language, then Polish (the launch market).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (hasLocale(first)) return NextResponse.next();

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = saved && hasLocale(saved) ? saved : matchLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the API proxy, back office, Next internals and files with an extension.
  matcher: ["/((?!api|admin|_next|.*\\..*).*)"],
};
