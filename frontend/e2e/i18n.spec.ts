import { expect, test } from "@playwright/test";

test.describe("languages", () => {
  test("Polish browsers land on /pl with Polish UI and catalogue content @mobile", async ({ browser }) => {
    const context = await browser.newContext({ locale: "pl-PL", extraHTTPHeaders: { "Accept-Language": "pl-PL,pl;q=0.9" } });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/pl$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Twoje pomysły");
    await expect(page.getByRole("heading", { name: "Gotowe na Twój projekt" })).toBeVisible();
    await expect(page.getByText("Bluza z kapturem").first()).toBeVisible();
    await context.close();
  });

  test("English browsers land on /en", async ({ browser }) => {
    const context = await browser.newContext({ locale: "en-GB", extraHTTPHeaders: { "Accept-Language": "en-GB,en;q=0.9" } });
    const page = await context.newPage();
    await page.goto("/shop");
    await expect(page).toHaveURL(/\/en\/shop$/);
    await expect(page.getByRole("heading", { level: 1, name: "Shop all" })).toBeVisible();
    await context.close();
  });

  test("language switcher keeps the page and remembers the choice", async ({ page }) => {
    await page.goto("/en/products/pullover-hoodie");
    await expect(page.getByRole("heading", { level: 1, name: "Pullover Hoodie" })).toBeVisible();
    await page.getByRole("navigation", { name: "Language" }).getByRole("link", { name: "pl" }).click();
    await expect(page).toHaveURL(/\/pl\/products\/pullover-hoodie$/);
    await expect(page.getByRole("heading", { level: 1, name: "Bluza z kapturem" })).toBeVisible();
    await expect(page.getByText("Przód").first()).toBeVisible();
    await page.goto("/");
    await expect(page).toHaveURL(/\/pl$/);
  });

  test("Polish search, filters and validation messages", async ({ page }) => {
    await page.goto("/pl");
    await page.getByRole("combobox", { name: "Szukaj produktów" }).first().fill("naklejk");
    await expect(page.getByRole("option", { name: /Naklejka/ }).first()).toBeVisible();

    await page.goto("/pl/custom-orders");
    await page.getByLabel("Imię i nazwisko *").fill("Test");
    await page.getByLabel("E-mail *").fill("test@example.com");
    await page.getByLabel("Produkt *").selectOption("Bluza z kapturem");
    await page.getByLabel("Ilość (min. 10) *").fill("3");
    await page.getByRole("button", { name: "Poproś o wycenę" }).click();
    await expect(page.getByText(/musi być|większ|równ/i).first()).toBeVisible();
  });
});
