import { test, expect, type Page } from "@playwright/test";

async function selectStrategy(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(name) }).first().click();
}

async function generateAndWait(page: Page) {
  await page.getByRole("button", { name: "Gerar carteira" }).click();
  await expect(page.getByRole("heading", { name: "Resultado" })).toBeVisible({ timeout: 20000 });
}

test.describe("Loterias — critical flows", () => {
  test("1. abrir home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Loterias" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lotofácil" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Mega-Sena" }).first()).toBeVisible();
  });

  test("2. gerar Lotofácil aleatória", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Aleatória distinta");
    await generateAndWait(page);
    await expect(page.getByText(/^J1$/).first()).toBeVisible();
  });

  test("3. gerar RMS para concurso com janela válida", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "RMS v2");
    // Any contest from 21 to 3779 has a full 20-contest window in the bundled dataset.
    await page.getByLabel(/Concurso-alvo/).fill("3780");
    await generateAndWait(page);
    const games = page.locator("li", { hasText: /^J\d/ });
    await expect(games).toHaveCount(6);
  });

  test("4. alterar para Mega-Sena", async ({ page }) => {
    await page.goto("/lotofacil");
    await page.getByRole("link", { name: "Mega-Sena" }).first().click();
    await expect(page).toHaveURL(/\/megasena$/);
    await expect(page.getByRole("heading", { name: "Mega-Sena" })).toBeVisible();
  });

  test("5. gerar Mega aleatória", async ({ page }) => {
    await page.goto("/megasena/gerar");
    await selectStrategy(page, "Aleatória distinta");
    await generateAndWait(page);
    await expect(page.getByText(/^J1$/).first()).toBeVisible();
  });

  test("6. gerar Mega cobertura (Quadra+)", async ({ page }) => {
    await page.goto("/megasena/gerar");
    await selectStrategy(page, "Otimizar cobertura Quadra\\+");
    await generateAndWait(page);
    await expect(page.getByText(/^J1$/).first()).toBeVisible();
  });

  test("7. salvar carteira", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Aleatória distinta");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Carteira salva em Minhas carteiras.")).toBeVisible();
  });

  test("8. abrir Minhas carteiras", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Aleatória distinta");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Carteira salva em Minhas carteiras.")).toBeVisible();

    await page.goto("/carteiras");
    await expect(page.getByRole("heading", { name: "Minhas carteiras" })).toBeVisible();
    await expect(page.getByText(/lotofacil\.uniform_random/)).toBeVisible();
  });

  test("9. exportar backup", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Aleatória distinta");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Carteira salva em Minhas carteiras.")).toBeVisible();

    await page.goto("/carteiras");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar backup" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/loterias-backup-.*\.json/);
  });

  test("10. comparar duas estratégias compatíveis", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Diversificação de carteira");
    await page.getByLabel(/Quantidade de jogos/).fill("6");
    await page.getByLabel(/Concurso-alvo/).fill("3780");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Comparar com outra estratégia" }).click();
    await page.getByRole("combobox").selectOption({ label: "RMS v2" });
    await page.getByRole("button", { name: "Gerar e comparar" }).click();
    await expect(page.getByText(/Diferenças refletem métodos distintos/)).toBeVisible({ timeout: 20000 });
  });

  test("11. validar erro de restrição impossível", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Aleatória distinta");
    // Exclude 11 numbers, leaving only 14 — impossible to form a 15-number ticket.
    const excludeButtons: number[] = Array.from({ length: 11 }, (_, i) => i + 1);
    for (const n of excludeButtons) {
      const btn = page.getByRole("button", { name: new RegExp(`Dezena ${String(n).padStart(2, "0")}`) });
      await btn.click();
      await btn.click(); // first click fixes, second click excludes
    }
    await page.getByRole("button", { name: "Gerar carteira" }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 20000 });
  });

  test("12. validar RMS bloqueada em N diferente de 6", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "RMS v2");
    // The UI locks quantity for fixed strategies; the field should not be an editable number input.
    await expect(page.getByText("Quantidade de jogos: 6")).toBeVisible();
    await expect(page.getByText("(bloqueado)")).toBeVisible();
  });

  test("13. conferir carteira contra concurso disponível", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Aleatória distinta");
    await page.getByLabel(/Concurso-alvo/).fill("100");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Carteira salva em Minhas carteiras.")).toBeVisible();

    await page.goto("/carteiras");
    await page.getByRole("button", { name: "Abrir" }).first().click();
    await page.getByRole("button", { name: "Conferir resultado" }).click();
    await expect(page.getByText(/maior pontuação \d+ acertos/)).toBeVisible();
  });
});
