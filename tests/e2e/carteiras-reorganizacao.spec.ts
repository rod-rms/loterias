import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

test("Meus jogos salvos: agrupado por dia, data estimada e aviso de resultado pendente dentro do dialog", async ({ page }) => {
  const raw = JSON.parse(readFileSync(path.join(process.cwd(), "public/data/lotofacil/results.json"), "utf8"));
  const next = raw.latestContest + 1;

  await page.goto("/lotofacil/gerar");
  await page.getByRole("button", { name: /Gerar jogos aleatórios/ }).first().click();
  await page.getByRole("spinbutton", { name: "Concurso em que você pretende jogar", exact: true }).fill(String(next));
  await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill("3");
  await page.getByRole("button", { name: "Gerar jogos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Salvar estes jogos" }).click();
  await page.getByRole("button", { name: "Confirmar e salvar" }).click();
  await expect(page.getByText("Estes jogos foram salvos em Meus jogos salvos.")).toBeVisible();

  await page.goto("/carteiras");
  await expect(page.getByRole("region", { name: "Hoje" })).toBeVisible();
  await expect(page.getByTestId("estimated-draw")).toContainText("Sorteio estimado:");
  await page.getByRole("spinbutton", { name: /Concurso/ }).fill(String(next));
  await expect(page.getByTestId("saved-card")).toHaveCount(1);

  await page.getByRole("button", { name: "Abrir" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Detalhes dos jogos salvos" });
  await dialog.getByRole("button", { name: "Conferir resultado" }).click();
  await expect(dialog.getByTestId("no-result-yet")).toContainText(`concurso ${next} ainda não foi divulgado pela CAIXA`);
});
