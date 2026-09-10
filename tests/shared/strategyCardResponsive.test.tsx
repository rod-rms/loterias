import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StrategyCard } from "../../src/shared/components/StrategyCard";
import type { StrategyDefinition } from "../../src/shared/types";

const longIdStrategy: StrategyDefinition = {
  id: "megasena.max_diversification",
  version: "1.0.0",
  modality: "megasena",
  name: "Diversificação de carteira",
  shortDescription: "",
  status: "active",
  evidence: "mathematical",
  ticketCount: { mode: "range", min: 1, max: 100 },
  supportsBudget: false,
  supportsFixedNumbers: false,
  supportsExcludedNumbers: false,
  supportsUserSeed: false,
  supportsQualityPreset: false,
  requiresHistoricalDraws: false,
  requiresTargetContest: false,
  optimizedMetrics: ["equilíbrio de exposição", "sobreposição"],
  reportedMetrics: [],
  disclaimers: [],
  ux: {
    title: "Variar mais os jogos",
    summary: "",
    badge: "Mais diversidade",
    helpTitle: "",
    helpBody: "",
    technicalName: "Diversificação de carteira",
  },
};

/**
 * Regression test for a mobile layout defect: the "Otimiza" row used a bare
 * `col-span-2`, which forces CSS Grid to create an implicit second column
 * even when the grid's own template is `grid-cols-1` (a single-span=2 child
 * is enough to make the browser add an implicit track) — so on narrow
 * screens the technical-details block silently rendered as two columns
 * again and overflowed with long mono identifiers like
 * "megasena.max_diversification". The grid must default to one column and
 * only widen at `sm:`, and the "Otimiza" row must not force a column back in
 * below that breakpoint.
 */
describe("StrategyCard — technical details responsive grid", () => {
  it("uses a single-column grid by default, widening only at the sm breakpoint, with safe wrapping for long identifiers", () => {
    render(<StrategyCard strategy={longIdStrategy} selected={false} onSelect={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Detalhes técnicos" }));

    const identifierLabel = screen.getByText("Identificador:");
    const dl = identifierLabel.closest("dl");
    expect(dl).not.toBeNull();
    expect(dl!.className).toContain("grid-cols-1");
    expect(dl!.className).toContain("sm:grid-cols-2");
    expect(dl!.className).not.toMatch(/(?<!sm:)\bgrid-cols-2\b/);
    expect(dl!.className).toContain("[overflow-wrap:anywhere]");

    expect(screen.getByText("megasena.max_diversification")).toBeInTheDocument();

    // The "Otimiza" row must only span 2 columns from sm: up — never
    // unconditionally, which would force an implicit second column at
    // grid-cols-1 and reintroduce the overflow.
    const optimizeLabel = screen.getByText("Otimiza:");
    const optimizeRow = optimizeLabel.closest("div");
    expect(optimizeRow).not.toBeNull();
    expect(optimizeRow!.className).not.toMatch(/(?<!sm:)\bcol-span-2\b/);
    expect(optimizeRow!.className).toContain("sm:col-span-2");
  });
});
