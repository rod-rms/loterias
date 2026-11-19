import { test, expect } from "@playwright/test";

// A realistic phone viewport/touch profile, kept on the project's default
// browser (Chromium) rather than spreading devices["iPhone 13"], which would
// force WebKit — not installed in this environment (only Chromium is, per
// the project's single "chromium" Playwright project).
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
}

test.describe("LotoAtlas — mobile critical flows (iPhone 13 viewport)", () => {
  test("home: loads, shows the LotoAtlas brand, and has no page-level horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Início" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("navigation: switching modality and opening Meus jogos salvos works without overflow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Gerar jogos da Mega-Sena/ }).click();
    await expect(page).toHaveURL(/\/megasena\/gerar$/);
    await expectNoHorizontalOverflow(page);

    // UI-001: the bottom tab "Meus jogos" opens the saved games of the current modality.
    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Meus jogos" }).click();
    await expect(page).toHaveURL(/\/megasena\/carteiras$/);
    await expectNoHorizontalOverflow(page);
  });

  test("generation form: selecting a strategy and generating games renders results without overflow", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await page.getByRole("button", { name: /Gerar jogos aleatórios/ }).click();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Gerar jogos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Jogos gerados" })).toBeVisible({ timeout: 20000 });
    await expectNoHorizontalOverflow(page);

    // Number chips (lottery numbers) must stay legible and the ticket rows must not clip.
    await expect(page.getByText("J1")).toBeVisible();
  });

  test("saved portfolios: empty state renders without overflow", async ({ page }) => {
    await page.goto("/carteiras");
    await expect(page.getByRole("heading", { name: "Meus jogos salvos" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("chrome: top bar (logo + modality pill) and bottom tabs are reachable without overlap", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header").first();
    await expect(header.getByRole("link", { name: "LotoAtlas, página inicial" })).toBeVisible();
    await expect(header.getByRole("button", { name: /Trocar modalidade/ })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Navegação principal" });
    for (const name of ["Gerar", "Meus jogos", "Análise"]) await expect(tabs.getByRole("link", { name })).toBeVisible();
    await expect(tabs.getByRole("button", { name: "Mais" })).toBeVisible();
    const tabsBox = await tabs.boundingBox();
    const headerBox = await header.boundingBox();
    expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(tabsBox!.y);
    await expect(page.getByText("Organize. Analise. Confira.")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("Mega-Sena strategy technical details: a long mono identifier wraps in a single column without page overflow", async ({ page }) => {
    await page.goto("/megasena/gerar");
    const card = page.locator('[data-testid="strategy-card-megasena.max_diversification"]');
    await card.getByRole("button", { name: "Detalhes técnicos" }).click();
    await expect(card.getByText("megasena.max_diversification")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const cardBox = await card.boundingBox();
    const identifierBox = await card.getByText("megasena.max_diversification").boundingBox();
    expect(cardBox).not.toBeNull();
    expect(identifierBox).not.toBeNull();
    // The identifier text must stay within the card's own horizontal bounds (no clipping).
    expect(identifierBox!.x + identifierBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 1);
  });

  test("Como funciona? popover near the left edge stays within the viewport", async ({ page }) => {
    await page.goto("/megasena/gerar");
    const trigger = page.getByRole("button", { name: /Como funciona\?/ }).first();
    await trigger.click();
    const popover = page.getByRole("tooltip");
    await expect(popover).toBeVisible();
    const box = await popover.boundingBox();
    const viewportWidth = page.viewportSize()?.width ?? 390;
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth);
    await expectNoHorizontalOverflow(page);
  });
});
