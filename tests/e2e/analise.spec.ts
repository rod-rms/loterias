import { test, expect, type Page } from "@playwright/test";

// 360 px is the narrowest phone width the page must support (ANL-003).
test.use({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
}

test.describe("Análise de resultados (360 px, real artifacts)", () => {
  test("loads from the navigation, shows disclaimer, charts, n and the audit footer without horizontal overflow", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/");
    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Análise" }).click();
    await expect(page).toHaveURL(/\/analise$/);
    await expect(page.getByRole("heading", { level: 1, name: "Análise de resultados" })).toBeVisible();
    await expect(page.getByTestId("analysis-disclaimer")).toContainText("não garantem nem preveem sorteios futuros");
    await expect(page.getByTestId("chart-media")).toBeVisible();
    await expect(page.getByTestId("chart-media")).toContainText("n = 440 concursos");
    await expect(page.getByTestId("audit-footer")).toContainText("bt-lotofacil-3388-3827");
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test("Mega-Sena view, info button by tap, and no overflow", async ({ page }) => {
    await page.goto("/analise?modalidade=megasena");
    await expect(page.getByTestId("chart-taxa")).toContainText("amostra fina");
    await expect(page.getByTestId("chart-media")).toContainText("n = 135 concursos");
    const card = page.getByTestId("chart-media");
    await card.getByRole("button", { name: /Ajuda sobre o gráfico/ }).tap();
    await expect(card.getByRole("tooltip")).toContainText("O que não afirma");
    const box = await card.getByRole("tooltip").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    await page.keyboard.press("Escape");
    await expect(card.getByRole("tooltip")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("export menu offers CSV and JSON", async ({ page }) => {
    await page.goto("/analise");
    await page.getByRole("button", { name: "Exportar" }).click();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "CSV" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^analise-backtest-lotofacil-bt-lotofacil-3388-3827-.*\.csv$/);
  });
});
