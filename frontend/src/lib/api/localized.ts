import { getLocale } from "@/i18n/server";
import { apiGet } from "./server";

/** apiGet with Accept-Language set from the current [locale] route segment. */
export async function getLocalized<T>(path: string, init?: { notFoundOn404?: boolean }): Promise<T> {
  return apiGet<T>(path, { ...init, lang: await getLocale() });
}
