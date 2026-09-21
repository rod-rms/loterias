import { test, expect } from "@playwright/test";

/**
 * Per-ticket bet registration: saving preserves ALL generated tickets, real
 * bets are an explicit opt-in, and every generated ticket (bet or not) is
 * still checked. A historical contest (100) is used so its official result is
 * already in the local dataset and the flow is deterministic.
 */
test.describe("LotoAtlas — per-ticket bet registration and full-portfolio checking", () => {
  test("save 6 tickets, register 5 as bet, check: all 6 shown, J6 'Não apostado', factual comparison", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await page.getByRole("button", { name: /Gerar jogos aleatórios/ }).first().click();
    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("6");
    await page.getByRole("spinbutton", { name: "Concurso em que você pretende jogar", exact: true }).fill("100");
    await page.getByRole("button", { name: "Gerar jogos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: "Salvar estes jogos" }).click();
    await expect(page.getByText("Todos os 6 jogos gerados serão salvos.")).toBeVisible();
    await page.getByRole("checkbox", { name: /Registrar também quais jogos foram apostados/ }).check();
    for (let n = 1; n <= 6; n += 1) await expect(page.getByRole("checkbox", { name: `J${n} apostado` })).toBeChecked();
    for (let n = 1; n <= 6; n += 1) await page.getByRole("checkbox", { name: `J${n} apostado` }).uncheck();
    await expect(page.getByText("Selecione ao menos um jogo apostado ou desative o registro de aposta.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar carteira" })).toBeDisabled();
    for (let n = 1; n <= 5; n += 1) await page.getByRole("checkbox", { name: `J${n} apostado` }).check();
    await expect(page.getByText("5 de 6 jogos marcados como apostados")).toBeVisible();
    await page.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText(/5 de 6 jogos registrados como apostados/)).toBeVisible();

    await page.goto("/carteiras");
    await expect(page.getByTestId("bet-status")).toHaveText("5/6 apostados");
    await expect(page.getByText(/Carteira gerada: 6 jogos/)).toBeVisible();

    await page.getByRole("button", { name: "Abrir" }).first().click();
    await page.getByRole("button", { name: "Conferir resultado" }).click();
    await expect(page.getByText("Resultado oficial — Concurso 100")).toBeVisible();

    const ticketList = page.getByRole("list", { name: "Lista de 6 jogos" });
    await expect(ticketList.locator(":scope > li")).toHaveCount(6);
    for (let n = 1; n <= 5; n += 1) await expect(page.getByTestId(`ticket-badge-J${n}`)).toHaveText("Apostado");
    await expect(page.getByTestId("ticket-badge-J6")).toHaveText("Não apostado");
    await expect(ticketList.locator(":scope > li").nth(5)).toContainText("acertos");

    const comparison = page.getByTestId("bet-comparison");
    await expect(comparison).toContainText("Melhor entre os apostados");
    await expect(comparison).toContainText("Melhor entre os não apostados");
    await expect(page.getByText("Melhor da carteira gerada")).toBeVisible();
    await expect(page.getByText(/boa decisão|decisão ruim|vencedor|ganhou/i)).toHaveCount(0);
  });
});
