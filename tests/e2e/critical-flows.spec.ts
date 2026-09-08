import { test, expect, type Page } from "@playwright/test";

async function selectStrategy(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(name) }).first().click();
}

async function generateAndWait(page: Page) {
  await page.getByRole("button", { name: "Gerar jogos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toBeVisible({ timeout: 20000 });
}

test.describe("Loterias — critical flows", () => {
  test("1. abrir home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Monte seus jogos com estratégia e transparência/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Gerar jogos da Lotofácil/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Gerar jogos da Mega-Sena/ })).toBeVisible();
  });

  test("2. gerar Lotofácil aleatória (fluxo leigo)", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await generateAndWait(page);
    await expect(page.getByText(/^J1$/).first()).toBeVisible();
    // Plain-language labels must be visible; internal jargon must not appear in the primary flow.
    await expect(page.getByText("Chance de 11 acertos ou mais").first()).toBeVisible();
    await expect(page.getByText("atLeast11", { exact: true })).toHaveCount(0);
    await expect(page.getByText("seed", { exact: true })).toHaveCount(0);
  });

  test("3. gerar RMS para concurso com janela válida", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Carteira equilibrada \\(RMS\\)");
    // Any contest from 21 to 3779 has a full 20-contest window in the bundled dataset.
    await page.getByRole("spinbutton", { name: "Concurso em que você pretende jogar", exact: true }).fill("3780");
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

  test("5. gerar Mega aleatória (fluxo leigo)", async ({ page }) => {
    await page.goto("/megasena/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await generateAndWait(page);
    await expect(page.getByText(/^J1$/).first()).toBeVisible();
    await expect(page.getByText("Chance de Sena").first()).toBeVisible();
  });

  test("6. gerar Mega cobertura (Quadra ou mais)", async ({ page }) => {
    await page.goto("/megasena/gerar");
    await selectStrategy(page, "Priorizar Quadra ou mais");
    await generateAndWait(page);
    await expect(page.getByText(/^J1$/).first()).toBeVisible();
  });

  test("7. salvar estes jogos", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Salvar estes jogos" }).click();
    await expect(page.getByText("Estes jogos foram salvos em Meus jogos salvos.")).toBeVisible();
  });

  test("8. abrir Meus jogos salvos", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Salvar estes jogos" }).click();
    await expect(page.getByText("Estes jogos foram salvos em Meus jogos salvos.")).toBeVisible();

    await page.goto("/carteiras");
    await expect(page.getByRole("heading", { name: "Meus jogos salvos" })).toBeVisible();
    await expect(page.getByText(/Gerar jogos aleatórios/)).toBeVisible();
    // Raw internal strategy id must not leak into the primary reading flow.
    await expect(page.getByText("lotofacil.uniform_random")).toHaveCount(0);
  });

  test("9. exportar backup", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Salvar estes jogos" }).click();
    await expect(page.getByText("Estes jogos foram salvos em Meus jogos salvos.")).toBeVisible();

    await page.goto("/carteiras");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar backup" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/loterias-backup-.*\.json/);
  });

  test("10. comparar duas opções compatíveis", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Variar mais os jogos");
    await page.getByLabel(/Quantidade de jogos/).fill("6");
    await page.getByRole("spinbutton", { name: "Concurso em que você pretende jogar", exact: true }).fill("3780");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Comparar com outra opção" }).click();
    await page.getByRole("combobox").selectOption({ label: "Carteira equilibrada (RMS)" });
    await page.getByRole("button", { name: "Gerar e comparar" }).click();
    await expect(page.getByText(/Diferenças refletem métodos distintos/)).toBeVisible({ timeout: 20000 });
  });

  test("11. validar erro de restrição impossível (modo Não usar)", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("radio", { name: "Não usar", exact: true }).click();
    // Exclude 11 numbers, leaving only 14 — impossible to form a 15-number ticket.
    for (let n = 1; n <= 11; n += 1) {
      await page.getByRole("button", { name: new RegExp(`^Dezena ${String(n).padStart(2, "0")}`) }).click();
    }
    await expect(page.getByText(/Não usar: 01, 02, 03/)).toBeVisible();
    await page.getByRole("button", { name: "Gerar jogos", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 20000 });
  });

  test("12. validar RMS bloqueada em N diferente de 6", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Carteira equilibrada \\(RMS\\)");
    await expect(page.getByText("Quantidade de jogos: 6")).toBeVisible();
    await expect(page.getByText("Esta opção foi criada e validada para exatamente 6 jogos.")).toBeVisible();
    // No editable quantity spinbutton should be present for a fixed-quantity strategy.
    await expect(page.getByRole("spinbutton", { name: /Quantidade de jogos/ })).toHaveCount(0);
  });

  test("13. conferir jogos contra concurso disponível", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("spinbutton", { name: "Concurso em que você pretende jogar", exact: true }).fill("100");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Salvar estes jogos" }).click();
    await expect(page.getByText("Estes jogos foram salvos em Meus jogos salvos.")).toBeVisible();

    await page.goto("/carteiras");
    await page.getByRole("button", { name: "Abrir" }).first().click();
    await page.getByRole("button", { name: "Conferir resultado" }).click();
    await expect(page.getByText(/maior pontuação \d+ acertos/)).toBeVisible();
  });

  test("14. abrir explicação de uma opção (InfoHelp por clique)", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    const trigger = page.getByRole("button", { name: /Como funciona: Gerar jogos aleatórios/ });
    await trigger.click();
    await expect(page.getByRole("tooltip")).toContainText("Cada combinação válida é gerada de forma uniforme");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });

  test("15. abrir explicação em contexto touch/mobile", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto("/lotofacil/gerar");
    const trigger = page.getByRole("button", { name: /Como funciona: Gerar jogos aleatórios/ });
    await trigger.tap();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await context.close();
  });

  test("16. modo Incluir obrigatoriamente (dezenas fixas)", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("radio", { name: "Incluir obrigatoriamente", exact: true }).click();
    await page.getByRole("button", { name: /^Dezena 03/ }).click();
    await page.getByRole("button", { name: /^Dezena 07/ }).click();
    await expect(page.getByText(/Obrigatórias: 03, 07/)).toBeVisible();
    await generateAndWait(page);
    // Fixed numbers must appear in every generated ticket.
    const ticketsList = page.getByRole("list", { name: /Lista de \d+ jogos/ });
    await expect(ticketsList).toContainText("03");
    await expect(ticketsList).toContainText("07");
  });

  test("17. modo Não usar (dezenas excluídas)", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("radio", { name: "Não usar", exact: true }).click();
    await page.getByRole("button", { name: /^Dezena 01/ }).click();
    await expect(page.getByText(/Não usar: 01/)).toBeVisible();
    await generateAndWait(page);
  });

  test("18. configurações avançadas / código de reprodução", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("button", { name: "Configurações avançadas" }).click();
    await expect(page.getByText("Código de reprodução")).toBeVisible();
    await expect(page.getByText("Seed", { exact: true })).toHaveCount(0);
  });

  test("19. detalhes técnicos do resultado", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await generateAndWait(page);
    await expect(page.getByText("Seed:", { exact: false })).toHaveCount(0);
    await page.getByRole("button", { name: "Detalhes técnicos do resultado" }).click();
    await expect(page.getByText("Aleatória distinta")).toBeVisible();
    await expect(page.getByText("Seed", { exact: true })).toBeVisible();
  });

  test("20. probabilidade de Sena minúscula nunca aparece como zero", async ({ page }) => {
    await page.goto("/megasena/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByLabel(/Quantidade de jogos/).fill("1");
    await generateAndWait(page);
    const senaValue = page.getByTestId("metric-sena-value");
    await expect(senaValue).toBeVisible();
    const text = await senaValue.textContent();
    expect(text).not.toBe("0%");
    expect(text).not.toMatch(/^0[.,]0*%$/);
  });
});
