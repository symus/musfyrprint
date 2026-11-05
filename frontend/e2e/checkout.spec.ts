import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Real commerce flow against the running stack: server-priced cart, checkout, the Przelewy24 test page
 * (backend SIMULATOR mode – no money moves) and a signed, verified payment notification.
 */
test.describe("cart and checkout", () => {
  test("guest buys a blank tee and pays with the Przelewy24 test page", async ({ page }) => {
    await page.goto("/en/products/classic-unisex-tee");
    await page.getByRole("button", { name: "Navy" }).click();
    await page.getByRole("button", { name: /^(M|.+ \(M\))$/ }).click();
    await page.getByLabel("Quantity").fill("2");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to cart")).toBeVisible();
    await expect(page.getByRole("link", { name: /Cart: 2 items/ })).toBeVisible();

    await page.getByRole("link", { name: /Cart: 2 items/ }).click();
    await expect(page).toHaveURL(/\/en\/cart$/);
    await expect(page.getByTestId("cart-line")).toHaveCount(1);
    const before = await page.getByTestId("order-total").textContent();
    await page.getByLabel("Discount code").fill("WELCOME10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("WELCOME10")).toBeVisible();
    await expect(page.getByText("Discount", { exact: true })).toBeVisible();
    expect(await page.getByTestId("order-total").textContent()).not.toBe(before);
    await expect(page.getByText(/exempt from VAT/)).toBeVisible();

    await page.getByRole("link", { name: "Go to checkout" }).click();
    await page.getByLabel("E-mail *").fill(`guest-${Date.now()}@example.com`);
    await page.getByLabel("Full name *").fill("Anna Kowalska");
    await page.getByLabel("Street and number *").fill("ul. Floriańska 1");
    await page.getByLabel("Postal code *").fill("31-019");
    await page.getByLabel("City *").fill("Kraków");
    await page.getByLabel("Phone *").fill("+48 600 100 200");

    // Paczkomat needs a locker code; the server validates its format
    await page.getByRole("radio", { name: /Paczkomat|InPost Locker/i }).check();
    await page.getByLabel("Paczkomat code *").fill("bad");
    await page.getByLabel(/I accept the/).check();
    await page.getByRole("button", { name: "Pay with Przelewy24" }).click();
    await expect(page.getByText("Please correct the highlighted fields.")).toBeVisible();
    await page.getByLabel("Paczkomat code *").fill("KRA01M");
    await page.getByRole("button", { name: "Pay with Przelewy24" }).click();

    // Przelewy24 test page (served by the backend in SIMULATOR mode)
    await expect(page).toHaveURL(/p24-simulator\/trnRequest\//);
    await page.getByRole("button", { name: /Pay \(test/ }).click();

    await expect(page).toHaveURL(/\/en\/checkout\/complete\?order=MP-\d+&t=/);
    await expect(page.getByRole("heading", { name: "Thank you for your order!" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("order-status").first()).toHaveText("Paid – in queue");
    await expect(page.getByText(/Paczkomat: KRA01M/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Cart: 0 items/ })).toBeVisible();
  });

  test("declined payment can be retried", async ({ page }) => {
    await page.goto("/en/products/classic-unisex-tee");
    await page.getByRole("button", { name: /^(L|.+ \(L\))$/ }).click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to cart")).toBeVisible();
    await page.goto("/en/checkout");
    await page.getByLabel("E-mail *").fill(`decline-${Date.now()}@example.com`);
    await page.getByLabel("Full name *").fill("Jan Nowak");
    await page.getByLabel("Street and number *").fill("ul. Długa 5");
    await page.getByLabel("Postal code *").fill("00-950");
    await page.getByLabel("City *").fill("Warszawa");
    await page.getByLabel("Phone *").fill("600100200");
    await page.getByRole("radio", { name: /DPD/ }).check();
    await page.getByLabel(/I accept the/).check();
    await page.getByRole("button", { name: "Pay with Przelewy24" }).click();
    await expect(page).toHaveURL(/p24-simulator\/trnRequest\//);
    await page.getByRole("button", { name: /Cancel|Decline|Odrzuć|Anuluj/i }).click();

    await expect(page.getByRole("button", { name: "Try paying again" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Try paying again" }).click();
    await expect(page).toHaveURL(/p24-simulator\/trnRequest\//);
    await page.getByRole("button", { name: /Pay \(test/ }).click();
    await expect(page.getByRole("heading", { name: "Thank you for your order!" })).toBeVisible({ timeout: 15_000 });
  });

  test("designed product goes to the cart from the studio", async ({ page }) => {
    await page.goto("/en/design/classic-unisex-tee?color=coral&size=L");
    await page.getByRole("button", { name: /Birthday star/ }).click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to cart")).toBeVisible({ timeout: 15_000 });
    await page.goto("/en/cart");
    await expect(page.getByText(/Your design · Print areas: FRONT/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit design" })).toHaveAttribute("href", /design=[0-9a-f-]{36}/);
  });
});

test("cart, checkout and account pages have no serious accessibility violations @mobile", async ({ page }) => {
  await page.goto("/pl/products/classic-unisex-tee");
  await page.getByRole("button", { name: /^(M|.+ \(M\))$/ }).click();
  await page.getByRole("button", { name: "Dodaj do koszyka" }).click();
  await expect(page.getByText("Dodano do koszyka")).toBeVisible();
  for (const [path, ready] of [["/pl/cart", "cart-line"], ["/pl/checkout", "order-total"]] as const) {
    await page.goto(path);
    await expect(page.getByTestId(ready).first()).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  }
  await page.goto("/pl/account");
  await expect(page.getByRole("tab", { name: "Zaloguj się" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});

test.describe("customer account", () => {
  test("register, keep the cart, update profile and sign out @mobile", async ({ page }) => {
    await page.goto("/pl/products/classic-unisex-tee");
    await page.getByRole("button", { name: /^(M|.+ \(M\))$/ }).click();
    await page.getByRole("button", { name: "Dodaj do koszyka" }).click();
    await expect(page.getByText("Dodano do koszyka")).toBeVisible();

    await page.goto("/pl/account");
    await page.getByRole("tab", { name: "Załóż konto" }).click();
    await page.getByLabel("Imię", { exact: true }).fill("Ola Test");
    await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(`ola-${Date.now()}@example.com`);
    await page.getByLabel("Hasło", { exact: true }).fill("Bezpieczne-Haslo-2026");
    await page.getByLabel(/Akceptuję/).check();
    await page.getByRole("button", { name: "Załóż konto" }).last().click();

    await expect(page.getByText(/Potwierdź swój adres e-mail|Potwierdź adres e-mail/)).toBeVisible();
    await expect(page.getByText("Nie masz jeszcze zamówień.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Koszyk: 1/ })).toBeVisible(); // guest cart merged

    await page.getByLabel("Telefon").fill("+48 500 600 700");
    await page.getByRole("button", { name: "Zapisz" }).first().click();
    await expect(page.getByText("Zapisano")).toBeVisible();

    await page.getByRole("button", { name: "Wyloguj się" }).click();
    await expect(page.getByRole("tab", { name: "Zaloguj się" })).toBeVisible();
  });
});
