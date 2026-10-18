import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("storefront", () => {
  test("homepage shows hero, CTAs and live catalogue @mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your Ideas");
    await expect(page.getByRole("link", { name: "Design Your Own", exact: true })).toHaveAttribute("href", "/design");
    await expect(page.getByRole("link", { name: /Shop Products/ })).toHaveAttribute("href", "/shop");
    await expect(page.getByRole("heading", { name: "Ready for your design" })).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test("homepage has no serious accessibility violations @mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("article").first()).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test("category filters update the URL and results", async ({ page }) => {
    await page.goto("/category/t-shirts");
    await expect(page.getByRole("heading", { level: 1, name: "T-Shirts" })).toBeVisible();
    await page.getByRole("button", { name: "Black", exact: true }).first().click();
    await expect(page).toHaveURL(/color=black/);
    await page.getByLabel("Sort by").selectOption("PRICE_ASC");
    await expect(page).toHaveURL(/sort=PRICE_ASC/);
    await expect(page.locator("article h3").first()).toHaveText("Organic Tank Top");
  });

  test("search autocomplete tolerates typos", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("combobox", { name: "Search products" }).first();
    await search.fill("hodie");
    await page.getByRole("option", { name: /Pullover Hoodie/ }).click();
    await expect(page).toHaveURL(/\/products\/pullover-hoodie/);
  });

  test("product page variant selection reflects stock and price", async ({ page }) => {
    await page.goto("/products/classic-unisex-tee");
    await expect(page.getByRole("heading", { level: 1, name: "Classic Unisex Tee" })).toBeVisible();
    await page.getByRole("button", { name: "Navy" }).click();
    await page.getByRole("button", { name: "2XL" }).click();
    await expect(page.getByText(/In stock · SKU CUT-NAVY-2XL/)).toBeVisible();
    await expect(page.getByText("65,00 zł").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Personalise this product/ })).toHaveAttribute("href", /color=navy&size=2XL/);
  });

  test("unknown product shows the not-found page", async ({ page }) => {
    await page.goto("/products/does-not-exist");
    await expect(page.getByRole("heading", { name: /peeled off/ })).toBeVisible();
  });

  test("bulk quote form validates and submits", async ({ page }) => {
    await page.goto("/custom-orders");
    await page.getByLabel("Your name *").fill("E2E Tester");
    await page.getByLabel("E-mail *").fill("e2e@example.com");
    await page.getByLabel("Product *").selectOption("Pullover Hoodie");
    await page.getByLabel("Quantity (min. 10) *").fill("5");
    await page.getByRole("button", { name: "Request quote" }).click();
    await expect(page.getByText(/must be greater than or equal to 10/)).toBeVisible();
    await page.getByLabel("Quantity (min. 10) *").fill("40");
    await page.getByRole("button", { name: "Request quote" }).click();
    await expect(page.getByText(/Your reference is Q-/)).toBeVisible();
  });
});
