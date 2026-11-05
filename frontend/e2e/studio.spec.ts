import { expect, test } from "@playwright/test";

// 64×64 transparent PNG: deliberately tiny so the print check flags it.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAPUlEQVR42u3OMQEAAAgDoNm/dCzhAUJIFLe9QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4N5KgAABWbWE2QAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("design studio", () => {
  test("design, check, save and reload a draft", async ({ page }) => {
    await page.goto("/en/products/classic-unisex-tee");
    await page.getByRole("link", { name: /Personalise this product/ }).click();
    await expect(page).toHaveURL(/\/en\/design\/classic-unisex-tee/);
    await expect(page.getByRole("tab", { name: /^Front/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Your design is empty.")).toBeVisible();

    // Text
    await page.getByRole("button", { name: "Text", exact: true }).first().click();
    await expect(page.getByRole("tab", { name: /^Front.*1/ })).toBeVisible();
    await expect(page.getByLabel("Font")).toBeVisible();
    await page.getByLabel("Font").selectOption({ label: "Pacifico" });

    // Upload requires the rights confirmation
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: TINY_PNG });
    await expect(page.getByText("Please confirm the artwork rights first.")).toBeVisible();
    await page.getByLabel(/I own this artwork/).check();
    await fileInput.setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: TINY_PNG });
    await expect(page.getByText(/image is far too small for this size/)).toBeVisible();

    // Undo removes the image again
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText(/image is far too small/)).toBeHidden();

    // Back print area with a template
    await page.getByRole("tab", { name: "Back" }).click();
    await page.getByRole("button", { name: /Jersey name & number/ }).click();
    await expect(page.getByRole("tab", { name: /^Back.*2/ })).toBeVisible();

    // Colour preview and save
    await page.getByRole("button", { name: "Navy" }).click();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
    await expect(page).toHaveURL(/design=[0-9a-f-]{36}/);

    // Reload restores the draft from this device
    await page.reload();
    await expect(page.getByRole("tab", { name: /^Front.*1/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Back.*2/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Navy" })).toHaveAttribute("aria-pressed", "true");

    // A second save updates the same draft (uses the edit token)
    await page.getByRole("button", { name: "Text", exact: true }).first().click();
    await page.getByRole("button", { name: /Save draft|Saved/ }).first().click();
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
    await expect(page.getByText("Couldn't save")).toBeHidden();
  });

  test("Polish studio and print-ready export @mobile", async ({ page }) => {
    await page.goto("/pl/design/die-cut-vinyl-sticker");
    await expect(page.getByRole("heading", { level: 1, name: /Naklejka winylowa/ })).toBeVisible();
    const addTab = page.getByRole("tab", { name: "Dodaj" });
    if (await addTab.isVisible()) await addTab.click(); // mobile layout uses tabs
    await page.getByRole("button", { name: "Tekst", exact: true }).first().click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Pobierz podgląd do druku/ }).click();
    expect((await download).suggestedFilename()).toBe("die-cut-vinyl-sticker-full.png");
  });
});

test.describe("3D preview", () => {
  test("opens with view controls, honest accuracy note and no errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/en/design/classic-unisex-tee?color=coral&size=L");
    await page.getByRole("button", { name: /Birthday star/ }).click();
    await page.getByRole("button", { name: "Show 3D preview" }).click();
    const preview = page.getByRole("img", { name: "3D preview" });
    await expect(preview).toBeVisible();
    // WebGL canvas or, on devices without WebGL, the flat fallback
    await expect(preview.locator("canvas").or(page.getByText(/3D preview isn't available/))).toBeVisible();
    await expect(page.getByText(/Approximate preview on a generic garment model/)).toBeVisible();
    await page.getByRole("group", { name: "3D preview" }).getByRole("button", { name: "Back" }).click();
    await page.getByRole("group", { name: "3D preview" }).getByRole("button", { name: "Side" }).click();
    expect(errors).toEqual([]);
  });
});
