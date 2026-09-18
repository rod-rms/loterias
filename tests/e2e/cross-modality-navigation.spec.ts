import { test, expect } from "@playwright/test";

/**
 * Regression coverage for a production data-integrity bug: navigating
 * Lotofácil -> Mega-Sena -> generate -> edit config (stale warning) ->
 * browser Back left the Mega-Sena result rendered underneath the Lotofácil
 * strategy cards, because GerarPage is reused (not remounted) across the
 * modality route change. See src/app/pages/GerarPage.tsx and
 * src/shared/lib/useGenerationWorker.ts for the fix.
 */
test.describe("LotoAtlas — cross-modality generation state isolation", () => {
  test("A) Lotofácil -> Mega-Sena -> generate -> edit config -> browser Back: no Mega-Sena result leaks onto the Lotofácil page", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await expect(page.getByRole("heading", { name: "Gerar jogos da Lotofácil" })).toBeVisible();

    await page.getByRole("link", { name: "Mega-Sena" }).click();
    await expect(page).toHaveURL(/\/megasena\/gerar$/);

    await page.getByRole("button", { name: /Gerar jogos aleatórios/ }).click();
    await page.getByRole("button", { name: "Gerar jogos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toBeVisible({ timeout: 20000 });

    // Edit the configuration after generating, so the stale-result warning appears.
    const quantityInput = page.getByRole("spinbutton", { name: /Quantidade de jogos/ });
    await quantityInput.fill("9");
    await expect(page.getByText(/Você alterou a configuração depois de gerar estes jogos/)).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/lotofacil\/gerar$/);

    await expect(page.getByRole("heading", { name: "Gerar jogos da Lotofácil" })).toBeVisible();
    await expect(page.getByText("Gerar jogos aleatórios")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toHaveCount(0);
    await expect(page.getByText(/Você alterou a configuração depois de gerar estes jogos/)).toHaveCount(0);
    // No leftover Mega-Sena strategy identifier/result section.
    await expect(page.getByText(/Priorizar Quadra ou mais/)).toHaveCount(0);

    // Selecting a Lotofácil strategy keeps the page internally consistent.
    await page.getByRole("button", { name: /Gerar jogos aleatórios/ }).click();
    await expect(page.getByRole("heading", { name: "2. Quantos jogos você quer gerar?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toHaveCount(0);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
  });

  test("B) reverse direction: Mega-Sena -> Lotofácil -> generate -> Back/Forward never shows a Lotofácil result on the Mega-Sena page", async ({ page }) => {
    await page.goto("/megasena/gerar");
    await page.getByRole("link", { name: "Lotofácil" }).click();
    await expect(page).toHaveURL(/\/lotofacil\/gerar$/);

    await page.getByRole("button", { name: /Gerar jogos aleatórios/ }).click();
    await page.getByRole("button", { name: "Gerar jogos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toBeVisible({ timeout: 20000 });

    await page.goBack();
    await expect(page).toHaveURL(/\/megasena\/gerar$/);
    await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toHaveCount(0);
    await expect(page.getByText(/Gerar jogos aleatórios/)).toBeVisible();

    // Forward returns to the Lotofácil route; a fresh page (no restored
    // result is expected — only that nothing from Mega-Sena ever leaks in).
    await page.goForward();
    await expect(page).toHaveURL(/\/lotofacil\/gerar$/);
    await expect(page.getByText(/Priorizar Quadra ou mais/)).toHaveCount(0);

    // Going back again must still show no leaked result on Mega-Sena.
    await page.goBack();
    await expect(page).toHaveURL(/\/megasena\/gerar$/);
    await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toHaveCount(0);
    await expect(page.getByText(/Gerar jogos aleatórios/)).toBeVisible();
  });
});
