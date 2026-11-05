import { expect, test } from "@playwright/test";

test.describe("size guide", () => {
  test("regional labels, units and size finder select a size @mobile", async ({ page }) => {
    await page.goto("/pl/products/womens-fitted-tee");
    // EU labels on the size buttons for Polish visitors
    await expect(page.getByRole("button", { name: /^36/ })).toBeVisible();

    await page.getByRole("button", { name: "Tabela rozmiarów" }).click();
    const dialog = page.getByRole("dialog", { name: "Tabela rozmiarów" });
    await expect(dialog.getByText(/Wymiary orientacyjne/)).toBeVisible();
    await dialog.getByRole("button", { name: "Wlk. Bryt." }).click();
    await expect(dialog.getByRole("rowheader", { name: /8–10/ })).toBeVisible();
    await dialog.getByRole("button", { name: "in", exact: true }).click();
    await expect(dialog.getByRole("columnheader", { name: /Klatka piersiowa \(in\)/ })).toBeVisible();
    await dialog.getByRole("button", { name: "cm", exact: true }).click();

    await dialog.getByLabel("Wzrost (cm)").fill("166");
    await dialog.getByLabel("Klatka piersiowa (cm)").fill("90");
    await dialog.getByRole("button", { name: "Dobierz rozmiar" }).click();
    await expect(dialog.getByText(/Polecamy rozmiar 12/)).toBeVisible();
    await dialog.getByRole("button", { name: /Wybierz 12/ }).click();

    await expect(dialog).toBeHidden();
    // UK system is remembered and the recommended size is selected
    await expect(page.getByRole("button", { name: /^12/ })).toHaveAttribute("aria-pressed", "true");
  });
});
