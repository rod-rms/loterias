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
    await expect(page.getByRole("heading", { name: "Monte seus jogos com estratégia e transparência" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("navigation: switching modality and opening Meus jogos salvos works without overflow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Gerar jogos da Mega-Sena/ }).click();
    await expect(page).toHaveURL(/\/megasena\/gerar$/);
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: "Meus jogos salvos" }).first().click();
    await expect(page).toHaveURL(/\/carteiras$/);
    await expectNoHorizontalOverflow(page);
  });

  test("generation form: selecting a strategy and generating games renders results without overflow", async ({ page }) => {
    await page.goto("/lotofacil/gerar");
    await page.getByRole("button", { name: /Gerar jogos aleatórios/ }).click();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Gerar jogos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Seus jogos estão prontos" })).toBeVisible({ timeout: 20000 });
    await expectNoHorizontalOverflow(page);

    // Number chips (lottery numbers) must stay legible and the ticket rows must not clip.
    await expect(page.getByText("J1")).toBeVisible();
  });

  test("saved portfolios: empty state renders without overflow", async ({ page }) => {
    await page.goto("/carteiras");
    await expect(page.getByRole("heading", { name: "Meus jogos salvos" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("header: brand, navigation, and modality switcher are all reachable in their own rows, with no overlap", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "LotoAtlas — página inicial" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Meus jogos salvos" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Sobre" })).toBeVisible();
    await expect(header.getByRole("navigation", { name: "Alternar modalidade" })).toBeVisible();

    // The tagline is reserved for Home/institutional/social contexts, never the nav header.
    await expect(header.getByText("Organize. Analise. Confira.")).toHaveCount(0);

    const logoBox = await header.getByRole("link", { name: "LotoAtlas — página inicial" }).boundingBox();
    const navBox = await header.getByRole("link", { name: "Sobre" }).boundingBox();
    const switcherBox = await header.getByRole("navigation", { name: "Alternar modalidade" }).boundingBox();
    expect(logoBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(switcherBox).not.toBeNull();
    // Logo (row 1) and the modality switcher (row 2) must not vertically overlap.
    expect(switcherBox!.y).toBeGreaterThanOrEqual(logoBox!.y + logoBox!.height - 1);

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
