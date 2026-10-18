import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@musfyr.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "ChangeMe-Admin-2026!";

test.describe("back office", () => {
  test("admin pages require sign-in", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("wrong password shows a generic error", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("E-mail").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText("Invalid email or password");
  });

  test("admin creates, stocks and publishes a product", async ({ page }) => {
    const slug = `e2e-tee-${Date.now()}`;
    await page.goto("/admin/login");
    await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.goto("/admin/products/new");
    await page.getByLabel("Name *").fill("E2E Tee");
    await page.getByLabel("URL slug *").fill(slug);
    await page.getByLabel("Category *").selectOption({ label: "T-Shirts" });
    await page.getByLabel("Base price (major units) *").fill("61.50");
    await page.getByRole("button", { name: /Black/ }).click();
    await page.getByRole("button", { name: "Create draft" }).click();

    await expect(page.getByText("Status: DRAFT")).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("at least one active variant");

    await page.getByLabel("Sizes (supplier codes)").fill("M, L");
    await page.getByLabel("SKU prefix").fill(`E${Date.now() % 100_000_000}`);
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(page.locator("td.font-mono", { hasText: /-BLACK-M$/ })).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Status changed to ACTIVE.")).toBeVisible();

    await page.goto(`/products/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: "E2E Tee" })).toBeVisible();
    await expect(page.getByText("61,50 zł").first()).toBeVisible();
  });
});
