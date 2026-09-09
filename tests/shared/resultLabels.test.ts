import { describe, expect, it } from "vitest";
import { getResultLabel, summarizeBestTickets } from "../../src/shared/lib/resultLabels";

describe("getResultLabel", () => {
  it("returns null for Mega-Sena hit counts below 4", () => {
    expect(getResultLabel("megasena", 0)).toBeNull();
    expect(getResultLabel("megasena", 3)).toBeNull();
  });

  it("returns Quadra/Quina/Sena for Mega-Sena", () => {
    expect(getResultLabel("megasena", 4)).toBe("Quadra");
    expect(getResultLabel("megasena", 5)).toBe("Quina");
    expect(getResultLabel("megasena", 6)).toBe("Sena");
  });

  it("returns null for Lotofácil hit counts below 11", () => {
    expect(getResultLabel("lotofacil", 0)).toBeNull();
    expect(getResultLabel("lotofacil", 10)).toBeNull();
  });

  it("returns '11 acertos'..'15 acertos' for Lotofácil", () => {
    expect(getResultLabel("lotofacil", 11)).toBe("11 acertos");
    expect(getResultLabel("lotofacil", 12)).toBe("12 acertos");
    expect(getResultLabel("lotofacil", 13)).toBe("13 acertos");
    expect(getResultLabel("lotofacil", 14)).toBe("14 acertos");
    expect(getResultLabel("lotofacil", 15)).toBe("15 acertos");
  });

  it("never uses prize/payout wording", () => {
    for (const hits of [4, 5, 6]) {
      const label = getResultLabel("megasena", hits)!;
      expect(label).not.toMatch(/premi|ganhou|vencedora/i);
    }
  });
});

describe("summarizeBestTickets", () => {
  it("handles a single best ticket", () => {
    const summary = summarizeBestTickets("megasena", [3, 3, 4, 3]);
    expect(summary.bestHits).toBe(4);
    expect(summary.bestTicketNumbers).toEqual([3]);
    expect(summary.label).toBe("Quadra");
    expect(summary.sentence).toBe("J3 foi o melhor jogo, com 4 acertos · Quadra.");
  });

  it("handles two tied best tickets", () => {
    const summary = summarizeBestTickets("megasena", [3, 4, 3, 3, 4]);
    expect(summary.bestTicketNumbers).toEqual([2, 5]);
    expect(summary.sentence).toBe("J2 e J5 foram os melhores jogos, com 4 acertos cada · Quadra.");
  });

  it("handles three or more tied best tickets", () => {
    const summary = summarizeBestTickets("megasena", [3, 4, 3, 4, 3, 4]);
    expect(summary.bestTicketNumbers).toEqual([2, 4, 6]);
    expect(summary.sentence).toBe("J2, J4 e J6 tiveram a maior pontuação, com 4 acertos cada · Quadra.");
  });

  it("handles every ticket tied", () => {
    const summary = summarizeBestTickets("lotofacil", [12, 12, 12]);
    expect(summary.bestTicketNumbers).toEqual([1, 2, 3]);
    expect(summary.label).toBe("12 acertos");
    expect(summary.sentence).toContain("tiveram a maior pontuação");
  });

  it("omits the label suffix when the score is below the labeled threshold", () => {
    const summary = summarizeBestTickets("megasena", [2, 3, 1]);
    expect(summary.label).toBeNull();
    expect(summary.sentence).toBe("J2 foi o melhor jogo, com 3 acertos.");
    expect(summary.sentence).not.toContain("·");
  });

  it("returns an empty summary for no tickets", () => {
    const summary = summarizeBestTickets("megasena", []);
    expect(summary.bestHits).toBe(0);
    expect(summary.bestTicketNumbers).toEqual([]);
    expect(summary.sentence).toBe("");
  });

  it("never uses prize/payout wording in the sentence", () => {
    const summary = summarizeBestTickets("megasena", [6]);
    expect(summary.sentence).not.toMatch(/premi|ganhou|vencedora/i);
  });
});
