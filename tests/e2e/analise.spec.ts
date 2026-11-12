import { test, expect, type Page } from "@playwright/test";

// 360 px is the narrowest phone width the page must support (ANL-003).
test.use({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
}

test.describe("Análise de resultados (360 px, real artifacts)", () => {
  test("loads from the navigation: short answer, charts, prospective card, disclaimer and audit footer, no horizontal overflow", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/");
    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Análise" }).click();
    await expect(page).toHaveURL(/\/analise$/);
    await expect(page.getByRole("heading", { level: 1, name: "Análise de resultados" })).toBeVisible();
    await expect(page.getByTestId("short-answer")).toContainText("Em 440 sorteios passados");
    await expect(page.getByTestId("short-answer")).toContainText("Nenhuma estratégia aumenta a chance de ganhar");
    await expect(page.getByTestId("short-answer")).toContainText(/de \d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}/);
    for (const id of ["media", "premios", "melhor-pior"]) await expect(page.getByTestId(`chart-${id}`)).toBeVisible();
    await expect(page.getByTestId("ledger-card")).toContainText(/\d+ sorteios? registrados?/);
    await expect(page.getByTestId("analysis-disclaimer")).toContainText("não garantem nem preveem sorteios futuros");
    await expect(page.getByTestId("audit-footer")).toContainText("bt-lotofacil-3388-3827");
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test("Mega-Sena view, info button by tap inside the viewport, technical details collapsed then open, export offers CSV", async ({ page }) => {
    await page.goto("/analise?modalidade=megasena");
    await expect(page.getByTestId("short-answer")).toContainText("Em 135 sorteios passados");
    await expect(page.getByTestId("short-answer")).toContainText("raros demais");
    const card = page.getByTestId("chart-media");
    await card.getByRole("button", { name: /Ajuda sobre/ }).tap();
    const tip = card.getByRole("tooltip");
    await expect(tip).toContainText("variação normal do acaso");
    const box = await tip.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    await page.keyboard.press("Escape");
    await expect(tip).toHaveCount(0);

    await expect(page.getByTestId("technical-details")).toHaveCount(0);
    await page.getByRole("button", { name: /Detalhes técnicos/ }).click();
    await expect(page.getByTestId("technical-details")).toContainText("Bonferroni");
    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "CSV" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^analise-backtest-megasena-bt-megasena-2950-3084-.*\.csv$/);
    await expectNoHorizontalOverflow(page);
  });
});
