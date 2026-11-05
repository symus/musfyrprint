import { describe, expect, it } from "vitest";

import { defaultSystem, formatRange, toCm, toDisplay } from "@/components/sizing/units";

describe("size units", () => {
  it("converts between centimetres and inches (half-inch precision)", () => {
    expect(toDisplay(94, "cm")).toBe(94);
    expect(toDisplay(94, "in")).toBe(37);
    expect(toDisplay(101, "in")).toBe(40);
    expect(toCm(40, "in")).toBeCloseTo(101.6);
  });

  it("formats ranges in the chosen unit and locale", () => {
    expect(formatRange({ min: 94, max: 101 }, "cm", "pl-PL")).toBe("94–101");
    expect(formatRange({ min: 94, max: 101 }, "in", "en-GB")).toBe("37–40");
    expect(formatRange(null, "cm", "en-GB")).toBe("–");
  });

  it("starts Polish visitors on EU and English visitors on UK sizes", () => {
    expect(defaultSystem("pl")).toBe("EU");
    expect(defaultSystem("en")).toBe("UK");
  });
});
