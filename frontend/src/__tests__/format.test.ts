import { describe, expect, it } from "vitest";

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
    ["3-6M", "3–6 months"],
    ["2Y", "2 years"],
    ["15-16Y", "15–16 years"],
    ["7.5x7.5CM", "7.5 × 7.5 cm"],
    ["ONE_SIZE", "One size"],
    ["XL", "XL"],
  ])("%s -> %s", (code, label) => expect(sizeLabel(code)).toBe(label));
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
