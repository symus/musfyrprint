import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductCard } from "@/components/product/ProductCard";
import { ProductConfigurator } from "@/components/product/ProductConfigurator";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import type { ProductDetail, ProductSummary } from "@/lib/api/types";

const summary: ProductSummary = {
  id: "1", slug: "classic-unisex-tee", name: "Classic Unisex Tee", shortDescription: null,
  categorySlug: "t-shirts", categoryName: "T-Shirts", productFamily: "APPAREL", garmentType: "TSHIRT",
  ageGroup: "ADULT", gender: "UNISEX", fit: "REGULAR", priceFrom: { amountMinor: 5900, currency: "PLN" },
  compareAt: null, featured: true, customizable: true, isNew: true, inStock: false, ratingAvg: 4.8, ratingCount: 214,
  tags: [], colors: [{ code: "black", name: "Black", hex: "#1B1A1F" }],
};

const detail: ProductDetail = {
  id: "1", slug: "baby-bodysuit", name: "Baby Bodysuit", shortDescription: null, description: null,
  productFamily: "APPAREL", garmentType: "BODYSUIT", ageGroup: "BABY", gender: "UNISEX", fit: "REGULAR", material: null,
  priceFrom: { amountMinor: 4900, currency: "PLN" }, basePrice: { amountMinor: 4900, currency: "PLN" }, compareAt: null,
  customizable: true, featured: false, ratingAvg: 0, ratingCount: 0, tags: [], modelKey: null,
  productionTime: { minDays: 2, maxDays: 4 }, breadcrumbs: [],
  colors: [{ code: "white", name: "White", hex: "#FFFFFF" }, { code: "sky", name: "Sky Blue", hex: "#A8D8F5" }],
  sizes: [{ code: "0-3M", available: true }, { code: "3-6M", available: false }],
  variants: [
    { id: "a", sku: "BBS-WHITE-0-3M", colorCode: "white", sizeCode: "0-3M", price: { amountMinor: 4900, currency: "PLN" }, availability: "LOW_STOCK" },
    { id: "b", sku: "BBS-WHITE-3-6M", colorCode: "white", sizeCode: "3-6M", price: { amountMinor: 4900, currency: "PLN" }, availability: "OUT_OF_STOCK" },
    { id: "c", sku: "BBS-SKY-3-6M", colorCode: "sky", sizeCode: "3-6M", price: { amountMinor: 5400, currency: "PLN" }, availability: "IN_STOCK" },
  ],
  optionGroups: [], printAreas: [], printMethods: [], images: [],
};

describe("ProductCard", () => {
  it("shows name, link, badges and price", () => {
    render(<ProductCard product={summary} />);
    expect(screen.getByRole("link", { name: "Classic Unisex Tee" })).toHaveAttribute("href", "/products/classic-unisex-tee");
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByText(/59,00/)).toBeInTheDocument();
  });
});

describe("ProductConfigurator", () => {
  it("disables sold-out sizes per colour and reflects availability", async () => {
    const user = userEvent.setup();
    render(<ProductConfigurator product={detail} />);
    expect(screen.getByRole("button", { name: "3–6 months" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "0–3 months" }));
    expect(screen.getByText(/Only a few left/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sky Blue" }));
    expect(screen.getByRole("button", { name: "3–6 months" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "3–6 months" }));
    expect(screen.getByText(/54,00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Personalise/ })).toHaveAttribute("href", expect.stringContaining("color=sky"));
  });

  it("shows the approximate age-size notice only for age-based sizes", () => {
    render(<ProductConfigurator product={detail} />);
    expect(screen.getByText(/Age-based sizes are approximate/)).toBeInTheDocument();
  });

  it("does not show the notice for sticker sizes", () => {
    const sticker = { ...detail, variants: detail.variants.map((v) => ({ ...v, sizeCode: "5x5CM" })) };
    render(<ProductConfigurator product={sticker} />);
    expect(screen.queryByText(/Age-based sizes are approximate/)).not.toBeInTheDocument();
  });
});

describe("NewsletterForm", () => {
  it("requires consent before calling the API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<NewsletterForm source="test" />);
    await user.type(screen.getByLabelText("E-mail address"), "a@example.com");
    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/consent/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
