import { describe, expect, it } from "vitest";
import { friendlyDayLabel, groupPortfoliosByDay } from "../../src/shared/lib/portfolioGrouping";
import type { SavedPortfolio } from "../../src/shared/types";

const NOW = new Date(2026, 8, 26, 15, 0); // 26 Sep 2026, local
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();
const p = (id: string, createdAt: string) => ({ id, createdAt }) as SavedPortfolio;

describe("portfolio day grouping", () => {
  it("labels Hoje, Ontem and full dates", () => {
    expect(friendlyDayLabel("2026-09-26", NOW)).toBe("Hoje");
    expect(friendlyDayLabel("2026-09-25", NOW)).toBe("Ontem");
    expect(friendlyDayLabel("2026-09-20", NOW)).toBe("20 de setembro de 2026");
  });
  it("groups by local calendar day preserving the newest-first order", () => {
    const groups = groupPortfoliosByDay([p("a", at(2026, 9, 26, 18)), p("b", at(2026, 9, 26, 9)), p("c", at(2026, 9, 25)), p("d", at(2026, 9, 20))], NOW);
    expect(groups.map((g) => [g.label, g.portfolios.map((x) => x.id)])).toEqual([
      ["Hoje", ["a", "b"]],
      ["Ontem", ["c"]],
      ["20 de setembro de 2026", ["d"]],
    ]);
  });
});
