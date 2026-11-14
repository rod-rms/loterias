import { test, expect, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
}

test.describe("UI-001 — desktop sidebar (1280 px)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("sidebar lists modalities from the registry and the sections of the current one, with freshness and version", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar.getByRole("navigation", { name: "Modalidades" }).getByRole("link")).toHaveText(["Lotofácil", "Mega-Sena"]);
    await expect(sidebar.getByRole("navigation", { name: "Navegação principal" }).getByRole("link")).toHaveText(["Gerar jogos", "Meus jogos", "Análise de resultados", "Metodologia"]);
    await expect(sidebar.getByRole("navigation", { name: "Geral" }).getByRole("link")).toHaveText(["Todos os meus jogos", "Sobre"]);
    await expect(sidebar.getByTestId("freshness")).toContainText("Lotofácil");
    await expect(sidebar.getByTestId("freshness")).toContainText("Mega-Sena");
    await expect(sidebar).toContainText(/LotoAtlas v\d+\.\d+\.\d+/);
    await expectNoHorizontalOverflow(page);
  });

  test("keyboard: Tab reaches the sidebar links in order and Enter follows them", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    const sidebar = page.getByTestId("sidebar");
    const analise = sidebar.getByRole("link", { name: "Análise de resultados" });
    await analise.focus();
    await expect(analise).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/lotofacil\/analise$/);
    const metodologia = sidebar.getByRole("link", { name: "Metodologia" });
    await page.keyboard.press("Tab");
    await expect(metodologia).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/lotofacil\/metodologia$/);
  });

  test("the sidebar collapses to icons and expands again (state is remembered)", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    const sidebar = page.getByTestId("sidebar");
    await page.getByRole("button", { name: "Recolher menu" }).click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    await expect(sidebar.getByRole("link", { name: "Meus jogos", exact: true })).toBeVisible(); // still reachable (accessible name kept)
    await page.reload();
    await expect(page.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "true");
    await page.getByRole("button", { name: "Expandir menu" }).click();
    await expect(page.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "false");
  });

  test("switching modality keeps the section", async ({ page }) => {
    await page.goto("/lotofacil/analise");
    await page.getByRole("navigation", { name: "Modalidades" }).getByRole("link", { name: "Mega-Sena" }).click();
    await expect(page).toHaveURL(/\/megasena\/analise$/);
    await expect(page.getByRole("heading", { level: 1, name: "Análise de resultados" })).toBeVisible();
    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Metodologia" }).click();
    await page.getByRole("navigation", { name: "Modalidades" }).getByRole("link", { name: "Lotofácil" }).click();
    await expect(page).toHaveURL(/\/lotofacil\/metodologia$/);
  });

  test("home is a dashboard: one block per modality with next contest, last result and a primary button", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Lotofácil", "Mega-Sena"]) {
      const block = page.getByRole("region", { name });
      await expect(block).toContainText("Próximo concurso");
      await expect(block).toContainText("Sorteio estimado");
      await expect(block).toContainText("Último resultado");
      await expect(block.getByRole("link", { name: `Gerar jogos da ${name}` })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Jogos aguardando resultado" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Saiba mais sobre jogo responsável" })).toBeVisible();
  });
});

test.describe("UI-001 — legacy URLs keep working", () => {
  const cases: [string, RegExp][] = [
    ["/analise", /\/lotofacil\/analise$/],
    ["/analise?modalidade=megasena", /\/megasena\/analise$/],
    ["/analise?modalidade=lotofacil", /\/lotofacil\/analise$/],
    ["/lotofacil", /\/lotofacil\/gerar$/],
    ["/megasena", /\/megasena\/gerar$/],
    ["/carteiras", /\/carteiras$/],
    ["/sobre", /\/sobre$/],
    ["/lotofacil/gerar", /\/lotofacil\/gerar$/],
    ["/megasena/carteiras", /\/megasena\/carteiras$/],
    ["/lotofacil/metodologia", /\/lotofacil\/metodologia$/],
  ];
  for (const [from, to] of cases) {
    test(`${from} -> ${to}`, async ({ page }) => {
      await page.goto(from);
      await expect(page).toHaveURL(to);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }
  test("an unknown modality slug shows the not-found page", async ({ page }) => {
    await page.goto("/quina/gerar");
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  });
});

test.describe("UI-001 — mobile bottom tabs (360 px)", () => {
  test.use({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });

  test("bottom tabs navigate, the modality sheet switches modality keeping the section, and Mais opens the drawer", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    const tabs = page.getByRole("navigation", { name: "Navegação principal" });
    await tabs.getByRole("link", { name: "Análise" }).tap();
    await expect(page).toHaveURL(/\/lotofacil\/analise$/);

    await page.getByRole("button", { name: /Trocar modalidade/ }).tap();
    const sheet = page.getByRole("dialog", { name: "Escolher modalidade" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("link", { name: "Mega-Sena" }).tap();
    await expect(page).toHaveURL(/\/megasena\/analise$/);
    await expect(sheet).toHaveCount(0);

    await tabs.getByRole("button", { name: "Mais" }).tap();
    const drawer = page.getByRole("dialog", { name: "Mais" });
    await expect(drawer.getByRole("link", { name: "Metodologia" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Todos os meus jogos" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Sobre" })).toBeVisible();
    await expect(drawer.getByTestId("freshness")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("home, generate and saved games have no horizontal overflow at 360 px and keep content clear of the bottom tabs", async ({ page }) => {
    for (const path of ["/", "/lotofacil/gerar", "/megasena/carteiras", "/lotofacil/metodologia", "/sobre"]) {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    }
    await page.goto("/sobre");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.getByText("Não afiliado à CAIXA");
    const tabs = page.getByRole("navigation", { name: "Navegação principal" });
    const fb = await footer.boundingBox();
    const tb = await tabs.boundingBox();
    expect(fb!.y + 16).toBeLessThanOrEqual(tb!.y); // the footer text starts above the fixed tab bar (its bottom padding reserves the tab height)
  });
});
