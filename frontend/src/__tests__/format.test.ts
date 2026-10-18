import { describe, expect, it } from "vitest";

import en from "@/i18n/messages/en";
import pl from "@/i18n/messages/pl";
import { matchLocale, localePath } from "@/i18n/config";
import { plural } from "@/i18n/format";
import { formatMoney } from "@/lib/format/money";
import { sizeLabel } from "@/lib/format/labels";
import { hrefWith, toApiParams } from "@/lib/catalog-params";

describe("formatMoney", () => {
  it("formats minor units without floating point drift", () => {
    expect(formatMoney({ amountMinor: 5900, currency: "PLN" }, "pl-PL")).toMatch(/59,00\s?zł/);
    expect(formatMoney({ amountMinor: 1999, currency: "EUR" }, "en-GB")).toBe("€19.99");
  });

  it("respects zero-decimal currencies", () => {
    expect(formatMoney({ amountMinor: 1200, currency: "JPY" }, "en-GB")).toBe("JP¥1,200");
  });
});

describe("sizeLabel", () => {
  it.each([
    ["3-6M", "3–6 months", "3–6 mies."],
    ["2Y", "2 years", "2 lat"],
    ["15-16Y", "15–16 years", "15–16 lat"],
    ["7.5x7.5CM", "7.5 × 7.5 cm", "7.5 × 7.5 cm"],
    ["ONE_SIZE", "One size", "Jeden rozmiar"],
    ["XL", "XL", "XL"],
  ])("%s -> %s / %s", (code, enLabel, plLabel) => {
    expect(sizeLabel(en, code)).toBe(enLabel);
    expect(sizeLabel(pl, code)).toBe(plLabel);
  });
});

describe("i18n", () => {
  it("uses Polish plural forms", () => {
    expect(plural("pl-PL", 1, pl.common.products)).toBe("1 produkt");
    expect(plural("pl-PL", 3, pl.common.products)).toBe("3 produkty");
    expect(plural("pl-PL", 5, pl.common.products)).toBe("5 produktów");
    expect(plural("en-GB", 5, en.common.products)).toBe("5 products");
  });

  it("matches Accept-Language with Polish as default", () => {
    expect(matchLocale("en-US,en;q=0.9")).toBe("en");
    expect(matchLocale("de-DE,pl;q=0.8,en;q=0.5")).toBe("pl");
    expect(matchLocale("fr-FR")).toBe("pl");
    expect(matchLocale(null)).toBe("pl");
  });

  it("prefixes paths with the locale", () => {
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("pl", "/shop?q=x")).toBe("/pl/shop?q=x");
  });

  it("has a Polish string for every English key", () => {
    const keys = (o: object, prefix = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    const plKeys = new Set(keys(pl));
    expect(keys(en).filter((k) => !plKeys.has(k) && !k.endsWith(".few") && !k.endsWith(".many"))).toEqual([]);
  });
});

describe("catalogue params", () => {
  it("converts storefront prices to minor units and clamps paging", () => {
    const p = toApiParams({ minPrice: "49.5", maxPrice: "abc", page: "3", color: ["black", "white"] });
    expect(p.minPrice).toBe(4950);
    expect(p.maxPrice).toBeUndefined();
    expect(p.page).toBe(2);
    expect(p.color).toEqual(["black", "white"]);
    expect(p.sort).toBe("FEATURED");
  });

  it("defaults to relevance sort for searches and ignores unknown sorts", () => {
    expect(toApiParams({ q: "hoodie" }).sort).toBe("RELEVANCE");
    expect(toApiParams({ sort: "DROP TABLE" }).sort).toBe("FEATURED");
  });

  it("fixed route filters override query params", () => {
    expect((toApiParams({ category: "x" }, { category: "stickers" }) as Record<string, unknown>).category).toBe("stickers");
  });

  it("builds pagination links and resets page on filter change", () => {
    expect(hrefWith("/shop", { q: "tee", page: "2" }, { page: "3" })).toBe("/shop?q=tee&page=3");
    expect(hrefWith("/shop", { q: "tee", page: "2" }, { fit: "SLIM" })).toBe("/shop?q=tee&fit=SLIM");
  });
});
