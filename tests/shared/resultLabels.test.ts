import { describe, expect, it } from "vitest";
import { getResultLabel, formatHitResult, formatHitsCount, summarizeBestTickets } from "../../src/shared/lib/resultLabels";

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

  it("never duplicates the Lotofácil hit-count phrase in the sentence (e.g. '12 acertos · 12 acertos')", () => {
    for (const hits of [11, 12, 13, 14, 15]) {
      const single = summarizeBestTickets("lotofacil", [hits, hits - 1]);
      expect(single.sentence).not.toContain(`${hits} acertos · ${hits} acertos`);
      expect(single.sentence).toBe(`J1 foi o melhor jogo, com ${hits} acertos.`);

      const tied = summarizeBestTickets("lotofacil", [hits, hits, hits - 1]);
      expect(tied.sentence).not.toContain(`${hits} acertos · ${hits} acertos`);
      expect(tied.sentence).toBe(`J1 e J2 foram os melhores jogos, com ${hits} acertos cada.`);
    }
  });

  it("uses singular '1 acerto' for a single best ticket with exactly one hit", () => {
    const summary = summarizeBestTickets("megasena", [1, 0, 0]);
    expect(summary.sentence).toBe("J1 foi o melhor jogo, com 1 acerto.");
  });

  it("uses singular '1 acerto' (not '1 acertos') for tied best tickets with exactly one hit", () => {
    const summary = summarizeBestTickets("megasena", [1, 0, 1, 0]);
    expect(summary.bestTicketNumbers).toEqual([1, 3]);
    expect(summary.sentence).toBe("J1 e J3 foram os melhores jogos, com 1 acerto cada.");
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

describe("formatHitsCount", () => {
  it("uses singular for exactly one hit and plural otherwise", () => {
    expect(formatHitsCount(0)).toBe("0 acertos");
    expect(formatHitsCount(1)).toBe("1 acerto");
    expect(formatHitsCount(2)).toBe("2 acertos");
    expect(formatHitsCount(15)).toBe("15 acertos");
  });
});

describe("formatHitResult — the per-ticket/summary formatter, never duplicating the label", () => {
  it("Mega-Sena: plain hit count below 4, then Quadra/Quina/Sena appended for 4-6", () => {
    expect(formatHitResult("megasena", 3)).toBe("3 acertos");
    expect(formatHitResult("megasena", 4)).toBe("4 acertos · Quadra");
    expect(formatHitResult("megasena", 5)).toBe("5 acertos · Quina");
    expect(formatHitResult("megasena", 6)).toBe("6 acertos · Sena");
  });

  it("Mega-Sena: singular '1 acerto', no label", () => {
    expect(formatHitResult("megasena", 1)).toBe("1 acerto");
  });

  it("Lotofácil: never appends a duplicated 'X acertos · X acertos' suffix, for any labeled hit count", () => {
    for (const hits of [10, 11, 12, 13, 14, 15]) {
      const formatted = formatHitResult("lotofacil", hits);
      expect(formatted).not.toMatch(/acertos.*·.*acertos/);
      expect(formatted).toBe(`${hits} acertos`);
    }
  });

  it("Lotofácil: singular '1 acerto' still applies", () => {
    expect(formatHitResult("lotofacil", 1)).toBe("1 acerto");
  });
});
