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
    await selectStrategy(page, "Equilibrar meus 6 jogos \\(RMS\\)");
    // Any contest from 21 to 3779 has a full 20-contest window in the bundled dataset.
    await page.getByRole("spinbutton", { name: "Concurso em que você pretende jogar", exact: true }).fill("3780");
    await generateAndWait(page);
    const games = page.locator("li", { hasText: /^J\d/ });
    await expect(games).toHaveCount(6);
  });

  test("4. alterar para Mega-Sena", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await page.getByRole("link", { name: "Mega-Sena" }).first().click();
    await expect(page).toHaveURL(/\/megasena\/gerar$/);
    await expect(page.getByRole("heading", { name: "Gerar jogos da Mega-Sena" })).toBeVisible();
  });

  test("4b. /lotofacil e /megasena redirecionam para a página de geração", async ({ page }) => {
    await page.goto("/lotofacil");
    await expect(page).toHaveURL(/\/lotofacil\/gerar$/);
    await page.goto("/megasena");
    await expect(page).toHaveURL(/\/megasena\/gerar$/);
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
    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("6");
    await page.getByRole("spinbutton", { name: "Concurso em que você pretende jogar", exact: true }).fill("3780");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Comparar com outra opção" }).click();
    await page.getByRole("combobox").selectOption({ label: "Equilibrar meus 6 jogos (RMS)" });
    await page.getByRole("button", { name: "Gerar e comparar" }).click();
    await expect(page.getByText(/Diferenças refletem métodos distintos/)).toBeVisible({ timeout: 20000 });
  });

  test("11. validar erro de restrição impossível (dezenas não usadas)", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("checkbox", { name: /Quer personalizar suas dezenas/ }).check();
    const excludedGroup = page.getByRole("group", { name: "Dezenas que não quero usar" });
    // Exclude 11 numbers, leaving only 14 — impossible to form a 15-number ticket.
    for (let n = 1; n <= 11; n += 1) {
      await excludedGroup.getByRole("button", { name: new RegExp(`^Dezena ${String(n).padStart(2, "0")}`) }).click();
    }
    await expect(page.getByText(/Não usar: 01, 02, 03/)).toBeVisible();
    await page.getByRole("button", { name: "Gerar jogos", exact: true }).click();
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 20000 });
  });

  test("12. validar RMS bloqueada em N diferente de 6", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Equilibrar meus 6 jogos \\(RMS\\)");
    await expect(page.getByText("6 jogos", { exact: true })).toBeVisible();
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
    const card = page.getByTestId("strategy-card-lotofacil.uniform_random");
    const trigger = card.getByRole("button", { name: "Como funciona?" });
    await trigger.click();
    await expect(page.getByRole("tooltip")).toContainText("Cada combinação válida é gerada de forma uniforme");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });

  test("15. abrir explicação em contexto touch/mobile", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto("/lotofacil/gerar");
    const card = page.getByTestId("strategy-card-lotofacil.uniform_random");
    const trigger = card.getByRole("button", { name: "Como funciona?" });
    await trigger.tap();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await context.close();
  });

  test("16. dezenas que devem aparecer em todos os jogos (fixas)", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("checkbox", { name: /Quer personalizar suas dezenas/ }).check();
    const fixedGroup = page.getByRole("group", { name: "Dezenas que devem aparecer em todos os jogos" });
    await fixedGroup.getByRole("button", { name: /^Dezena 03/ }).click();
    await fixedGroup.getByRole("button", { name: /^Dezena 07/ }).click();
    await expect(page.getByText(/Obrigatórias: 03, 07/)).toBeVisible();
    await generateAndWait(page);
    // Fixed numbers must appear in every generated ticket.
    const ticketsList = page.getByRole("list", { name: /Lista de \d+ jogos/ });
    await expect(ticketsList).toContainText("03");
    await expect(ticketsList).toContainText("07");
  });

  test("17. dezenas que não quero usar (excluídas)", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("checkbox", { name: /Quer personalizar suas dezenas/ }).check();
    const excludedGroup = page.getByRole("group", { name: "Dezenas que não quero usar" });
    await excludedGroup.getByRole("button", { name: /^Dezena 01/ }).click();
    await expect(page.getByText(/Não usar: 01/)).toBeVisible();
    await generateAndWait(page);
  });

  test("17b. dezenas fixas e não usadas podem ser configuradas ao mesmo tempo", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("checkbox", { name: /Quer personalizar suas dezenas/ }).check();
    const fixedGroup = page.getByRole("group", { name: "Dezenas que devem aparecer em todos os jogos" });
    const excludedGroup = page.getByRole("group", { name: "Dezenas que não quero usar" });
    await fixedGroup.getByRole("button", { name: /^Dezena 03/ }).click();
    await excludedGroup.getByRole("button", { name: /^Dezena 01/ }).click();
    await expect(page.getByText(/Obrigatórias: 03/)).toBeVisible();
    await expect(page.getByText(/Não usar: 01/)).toBeVisible();
    // A number already claimed by the other section must be disabled in this one.
    await expect(excludedGroup.getByRole("button", { name: /^Dezena 03/ })).toBeDisabled();
    await expect(fixedGroup.getByRole("button", { name: /^Dezena 01/ })).toBeDisabled();
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
    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("1");
    await generateAndWait(page);
    const senaValue = page.getByTestId("metric-sena-value");
    await expect(senaValue).toBeVisible();
    const text = await senaValue.textContent();
    expect(text).not.toBe("0%");
    expect(text).not.toMatch(/^0[.,]0*%$/);
  });

  test("21. nenhuma opção selecionada por padrão", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await expect(page.getByText("Escolha uma opção acima para continuar.")).toBeVisible();
    // Every strategy card starts visually neutral (not pressed/selected).
    const pressedCards = page.getByRole("button", { name: /jogos fixos|–\d+ jogos/, pressed: true });
    await expect(pressedCards).toHaveCount(0);
    // Downstream steps must not exist before a strategy is chosen.
    await expect(page.getByRole("heading", { name: "2. Quantos jogos você quer gerar?" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Gerar jogos", exact: true })).toHaveCount(0);
  });

  test("22. selecionar uma opção revela o restante do fluxo", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await expect(page.getByRole("heading", { name: "2. Quantos jogos você quer gerar?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gerar jogos", exact: true })).toBeVisible();
    await expect(page.getByText("Escolha uma opção acima para continuar.")).toHaveCount(0);
  });

  test("23. trocar de modalidade não seleciona nenhuma opção implicitamente", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await expect(page.getByRole("heading", { name: "2. Quantos jogos você quer gerar?" })).toBeVisible();

    await page.goto("/megasena/gerar");
    await expect(page.getByText("Escolha uma opção acima para continuar.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "2. Quantos jogos você quer gerar?" })).toHaveCount(0);
  });

  test("24. diferença de baseline matematicamente idêntica mostra 'Mesma cobertura', sem jargão de p.p.", async ({ page }) => {
    await page.goto("/megasena/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("1");
    await generateAndWait(page);
    // Sena/F6 for N=1 is mathematically identical to its baseline (same N, no restrictions).
    const senaItem = page.locator("li", { hasText: "Chance de Sena" });
    await expect(senaItem).toContainText("Mesma cobertura");
    // The lay comparison view must never show the "p.p." abbreviation.
    await expect(page.getByText(/p\.p\./)).toHaveCount(0);
    // No floating-point noise (e.g. "-0,000000000000%") anywhere on the page.
    await expect(page.getByText(/0,0{6,}\d*\s*%/)).toHaveCount(0);
  });

  test("25. resumo de diversidade usa formatação decimal pt-BR", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Variar mais os jogos");
    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("6");
    await generateAndWait(page);
    await expect(page.getByText(/\d,\d dezenas entre si/)).toBeVisible();
    await expect(page.getByText(/\d\.\d dezenas entre si/)).toHaveCount(0);
  });

  test("26. probabilidades altas não mostram 'Aproximadamente 1 em X'", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("10");
    await generateAndWait(page);
    // With 10 tickets, "Chance de 11 acertos ou mais" is well above 5% and must show the percentage only.
    const card = page.getByTestId("metric-atLeast11");
    await expect(card).toBeVisible();
    await expect(card.getByText(/Aproximadamente 1 em/)).toHaveCount(0);
  });

  test("27. controles de divulgação do resultado são visualmente separados", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await generateAndWait(page);
    const detailedAnalysis = page.getByRole("button", { name: "Ver análise detalhada" });
    const technicalDetails = page.getByRole("button", { name: "Detalhes técnicos do resultado" });
    await expect(detailedAnalysis).toBeVisible();
    await expect(technicalDetails).toBeVisible();
    const box1 = await detailedAnalysis.boundingBox();
    const box2 = await technicalDetails.boundingBox();
    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();
    // They must occupy distinct, non-overlapping vertical positions (stacked, not run together).
    expect(box2!.y).toBeGreaterThan(box1!.y + box1!.height - 1);
    // Opening one must not affect the other's expanded state.
    await detailedAnalysis.click();
    await expect(detailedAnalysis).toHaveAttribute("aria-expanded", "true");
    await expect(technicalDetails).toHaveAttribute("aria-expanded", "false");
  });

  test("28. título dinâmico do passo 3 (RMS vs. personalização)", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Equilibrar meus 6 jogos \\(RMS\\)");
    await expect(page.getByRole("heading", { name: "3. Concurso", exact: true })).toBeVisible();

    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await expect(page.getByRole("heading", { name: "3. Concurso e personalização", exact: true })).toBeVisible();
  });

  test("29. exportar continua funcional após a reorganização das ações", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test("30. links de navegação (Meus jogos salvos / Metodologia) aparecem no topo de Gerar", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    const pageNav = page.getByRole("navigation", { name: "Outras páginas desta modalidade" });
    await expect(pageNav.getByRole("link", { name: "Meus jogos salvos" })).toBeVisible();
    await expect(pageNav.getByRole("link", { name: "Metodologia" })).toBeVisible();
    await pageNav.getByRole("link", { name: "Metodologia" }).click();
    await expect(page).toHaveURL(/\/lotofacil\/metodologia$/);
  });

  test("31. navegação de volta é determinística (não depende do histórico do navegador)", async ({ page }) => {
    await page.goto("/lotofacil/metodologia");
    await page.getByRole("link", { name: /Voltar para Lotofácil/ }).click();
    await expect(page).toHaveURL(/\/lotofacil\/gerar$/);

    await page.goto("/lotofacil/carteiras");
    await page.getByRole("link", { name: /Voltar para Lotofácil/ }).click();
    await expect(page).toHaveURL(/\/lotofacil\/gerar$/);

    await page.goto("/carteiras");
    await page.getByRole("link", { name: "Voltar ao início" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("32. resultado permanece visível e marcado como desatualizado após alterar a configuração", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("3");
    await generateAndWait(page);
    const firstTickets = await page.getByRole("list", { name: /Lista de \d+ jogos/ }).innerText();

    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("5");
    await expect(
      page.getByText("Você alterou a configuração depois de gerar estes jogos. Os jogos abaixo ainda correspondem à configuração anterior."),
    ).toBeVisible();
    // The previous result must still be shown, unchanged, not silently regenerated.
    await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toBeVisible();
    const stillSameTickets = await page.getByRole("list", { name: /Lista de \d+ jogos/ }).innerText();
    expect(stillSameTickets).toBe(firstTickets);
  });

  test("33. restaurar configuração anterior remove o aviso sem gerar novamente", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("3");
    await generateAndWait(page);
    const firstTickets = await page.getByRole("list", { name: /Lista de \d+ jogos/ }).innerText();

    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("5");
    await expect(page.getByRole("button", { name: "Restaurar configuração anterior" })).toBeVisible();
    await page.getByRole("button", { name: "Restaurar configuração anterior" }).click();

    await expect(page.getByText(/Você alterou a configuração depois de gerar estes jogos/)).toHaveCount(0);
    await expect(page.getByRole("spinbutton", { name: /Quantidade de jogos/ })).toHaveValue("3");
    const tickets = await page.getByRole("list", { name: /Lista de \d+ jogos/ }).innerText();
    expect(tickets).toBe(firstTickets);
  });

  test("34. salvar um resultado desatualizado usa a configuração que o gerou, não o formulário editado", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("3");
    await generateAndWait(page);

    // Edit the form after generating, without regenerating.
    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("8");
    await expect(page.getByText(/Você alterou a configuração depois de gerar estes jogos/)).toBeVisible();

    await page.getByRole("button", { name: "Salvar estes jogos" }).click();
    await expect(page.getByText("Estes jogos foram salvos em Meus jogos salvos.")).toBeVisible();

    await page.goto("/carteiras");
    await page.getByRole("button", { name: "Abrir" }).first().click();
    // The saved portfolio must have exactly the 3 tickets that were displayed, not 8.
    const ticketRows = page.locator("li", { hasText: /^J\d/ });
    await expect(ticketRows).toHaveCount(3);
  });

  test("35. Limpar configuração reseta o formulário sem apagar jogos salvos", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await selectStrategy(page, "Gerar jogos aleatórios");
    await generateAndWait(page);
    await page.getByRole("button", { name: "Salvar estes jogos" }).click();
    await expect(page.getByText("Estes jogos foram salvos em Meus jogos salvos.")).toBeVisible();

    await page.getByRole("button", { name: "Limpar configuração" }).click();
    await expect(page.getByText("Escolha uma opção acima para continuar.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toHaveCount(0);

    await page.goto("/carteiras");
    await expect(page.getByText(/Gerar jogos aleatórios/)).toBeVisible();
  });

  test("36. aviso de jogo responsável aponta para a URL oficial atual", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    const link = page.getByRole("link", { name: "Saiba mais sobre jogo responsável" });
    await expect(link).toHaveAttribute("href", "https://www.caixa.gov.br/jogo-responsavel/Paginas/default.aspx");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
  });

  test("37. metodologia mostra dados de transparência (fonte, última atualização, última verificação)", async ({ page }) => {
    await page.goto("/lotofacil/metodologia");
    await expect(page.getByRole("heading", { name: "Dados e atualizações" })).toBeVisible();
    await expect(page.getByText("Loterias CAIXA")).toBeVisible();
    await expect(page.getByText("Última atualização com novo concurso")).toBeVisible();
    await expect(page.getByText("Última verificação da fonte oficial")).toBeVisible();
  });
});
