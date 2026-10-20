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

test("Detalhes abre logo abaixo do cartão clicado (não no fim da página)", async ({ page }) => {
  for (const n of ["2", "3"]) {
    await page.goto("/lotofacil/gerar");
    await page.getByRole("button", { name: /Gerar jogos aleatórios/ }).first().click();
    await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill(n);
    await page.getByRole("button", { name: "Gerar jogos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "Salvar estes jogos" }).click();
    await page.getByRole("button", { name: "Confirmar e salvar" }).click();
    await expect(page.getByText("Estes jogos foram salvos em Meus jogos salvos.")).toBeVisible();
  }
  await page.goto("/carteiras");
  const cards = page.getByTestId("saved-card");
  await expect(cards).toHaveCount(2);
  await cards.first().getByRole("button", { name: "Abrir" }).click();
  const dialog = page.getByRole("dialog", { name: "Detalhes dos jogos salvos" });
  const first = await cards.first().boundingBox();
  const second = await cards.nth(1).boundingBox();
  const box = await dialog.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(first!.y + first!.height - 1);
  // the second card is pushed below the panel, i.e. the panel is not at the page bottom
  expect(second!.y).toBeGreaterThanOrEqual(box!.y + box!.height - 1);
});

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "phone", width: 390, height: 844 },
]) {
  test(`Editar jogos apostados / Registrar aposta abrem o editor logo abaixo do cartão clicado, não no fim da página (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const n of ["2", "3", "4"]) {
      await page.goto("/lotofacil/gerar");
      await page.getByRole("button", { name: /Gerar jogos aleatórios/ }).first().click();
      await page.getByRole("spinbutton", { name: /Quantidade de jogos/ }).fill(n);
      await page.getByRole("button", { name: "Gerar jogos", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toBeVisible({ timeout: 20000 });
      await page.getByRole("button", { name: "Salvar estes jogos" }).click();
      // keep the bet registration off so every card starts as "Registrar aposta"
      await page.getByRole("checkbox", { name: /Registrar também quais jogos foram apostados/ }).uncheck();
      await page.getByRole("button", { name: "Confirmar e salvar" }).click();
      await expect(page.getByText("Estes jogos foram salvos em Meus jogos salvos.")).toBeVisible();
    }

    await page.goto("/carteiras");
    const cards = page.getByTestId("saved-card");
    await expect(cards).toHaveCount(3);
    const middle = cards.nth(1);
    const editor = page.getByRole("dialog", { name: "Registrar jogos apostados" });

    async function expectEditorDirectlyBelow(card: typeof middle) {
      await expect(editor).toHaveCount(1);
      await expect(editor).toBeInViewport();
      await expect(editor.getByRole("heading", { name: "Jogos apostados" })).toBeFocused();
      const cardBox = (await card.boundingBox())!;
      const editorBox = (await editor.boundingBox())!;
      const lastBox = (await cards.nth(2).boundingBox())!;
      const firstBox = (await cards.first().boundingBox())!;
      expect(editorBox.y).toBeGreaterThanOrEqual(cardBox.y + cardBox.height - 1); // right below ITS card
      expect(lastBox.y).toBeGreaterThanOrEqual(editorBox.y + editorBox.height - 1); // the card after is pushed below it, so it is not at the page bottom
      expect(editorBox.y).toBeLessThan(lastBox.y);
      expect(firstBox.y + firstBox.height).toBeLessThanOrEqual(editorBox.y + 1); // and not above the cards before it
      // not hidden under the sticky day-group heading
      const heading = (await page.locator("section[aria-label] > h2").first().boundingBox())!;
      expect(editorBox.y).toBeGreaterThanOrEqual(heading.y + heading.height - 1);
    }

    // 1) "Registrar aposta" (no bet yet) on the middle card
    await middle.getByRole("button", { name: "Registrar aposta" }).click();
    await expectEditorDirectlyBelow(middle);

    // save a registration (J1 only) so the same card now offers "Editar jogos apostados"
    for (const box of await editor.getByRole("checkbox").all()) {
      if ((await box.getAttribute("aria-label")) !== "J1 apostado") await box.uncheck();
    }
    await editor.getByRole("button", { name: "Salvar registro" }).click();
    await expect(editor).toHaveCount(0);

    // 2) "Editar jogos apostados" on the same middle card
    await middle.getByRole("button", { name: "Editar jogos apostados" }).click();
    await expectEditorDirectlyBelow(middle);

    // The Abrir details panel is unchanged: with both open, the editor comes first, then the details.
    await middle.getByRole("button", { name: "Abrir" }).click();
    const details = page.getByRole("dialog", { name: "Detalhes dos jogos salvos" });
    const editorBox = (await editor.boundingBox())!;
    const detailsBox = (await details.boundingBox())!;
    expect(detailsBox.y).toBeGreaterThanOrEqual(editorBox.y + editorBox.height - 1);
  });
}
