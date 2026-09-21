import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/shared/lib/db";
import { exportBackup, importBackup, listPortfolios, previewBackup, savePortfolio, setBetSelection } from "../../src/shared/lib/portfolioStore";
import { savedPortfolioSchema } from "../../src/shared/lib/schemas";
import {
  appendBetSelectionRevision,
  describeBetComparison,
  determineResultAvailability,
  getCurrentBetTicketNumbers,
  summarizeBetSelectionResult,
  validateBetTicketNumbers,
} from "../../src/shared/lib/betSelection";
import { checkTicketsAgainstDraw } from "../../src/shared/lib/checkResult";
import type { SavedPortfolio } from "../../src/shared/types";

const SIX_TICKETS = Array.from({ length: 6 }, (_, i) => Array.from({ length: 15 }, (_, j) => ((i * 3 + j) % 25) + 1).sort((a, b) => a - b));

function makePortfolio(id: string, overrides: Partial<SavedPortfolio> = {}): SavedPortfolio {
  return {
    schemaVersion: 1,
    id,
    modality: "lotofacil",
    contest: 3780,
    strategyId: "lotofacil.rms_v2",
    strategyVersion: "2.0.0",
    engineVersion: "2.0.0",
    createdAt: "2026-09-20T00:00:00.000Z",
    price: { ticketCostBRL: 3.5, referenceDate: "2026-09-07", source: "test" },
    seed: "seed-rms",
    parameters: { numberOfTickets: 6 },
    tickets: SIX_TICKETS,
    metrics: { probability: { f11: 0.5 } },
    audit: { note: "frozen" },
    markedAsBet: false,
    ...overrides,
  };
}

const ctx = { recordedAt: "2026-09-20T10:00:00.000Z", resultAvailability: "before_result_in_dataset" as const, datasetLatestContestAtRecording: 3779 };

describe("bet selection — validation and schema", () => {
  it("accepts a valid partial and a valid all-ticket selection", () => {
    expect(validateBetTicketNumbers([1, 2, 3, 4, 5], 6)).toBeNull();
    expect(validateBetTicketNumbers([1, 2, 3, 4, 5, 6], 6)).toBeNull();
  });

  it("rejects J0, numbers above tickets.length, duplicates, and non-canonical order", () => {
    expect(validateBetTicketNumbers([0, 1], 6)).not.toBeNull();
    expect(validateBetTicketNumbers([7], 6)).not.toBeNull();
    expect(validateBetTicketNumbers([2, 2], 6)).not.toBeNull();
    expect(validateBetTicketNumbers([3, 1], 6)).not.toBeNull();
    expect(validateBetTicketNumbers([1.5], 6)).not.toBeNull();
  });

  it("the persisted-record schema rejects invalid ticket references (never trusts the UI)", () => {
    const bad = (nums: number[]) =>
      savedPortfolioSchema.safeParse(makePortfolio("x", { betSelection: { schemaVersion: 1, revisions: [{ selectedTicketNumbers: nums, recordedAt: "t", resultAvailability: "unknown" }] } }));
    expect(bad([0]).success).toBe(false);
    expect(bad([7]).success).toBe(false);
    expect(bad([1, 1]).success).toBe(false);
    expect(bad([2, 1]).success).toBe(false);
    expect(bad([1, 2, 3, 4, 5]).success).toBe(true);
    expect(bad([]).success).toBe(true);
  });

  it("the schema requires checkedResult.hitsPerTicket to cover every saved ticket", () => {
    const withShortHits = makePortfolio("y", { checkedResult: { contest: 3780, numbers: [1], checkedAt: "t", hitsPerTicket: [1, 2] } });
    expect(savedPortfolioSchema.safeParse(withShortHits).success).toBe(false);
  });
});

describe("bet selection — legacy compatibility and current-revision resolution", () => {
  it("legacy markedAsBet=true without betSelection means every ticket is bet", () => {
    expect(getCurrentBetTicketNumbers(makePortfolio("l1", { markedAsBet: true }))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("legacy markedAsBet=false without betSelection means no declaration", () => {
    expect(getCurrentBetTicketNumbers(makePortfolio("l2"))).toEqual([]);
  });

  it("the current selection is the LAST revision; an empty last revision means removed", () => {
    const first = appendBetSelectionRevision(makePortfolio("a"), [1, 2, 3, 4, 5], ctx);
    const p1 = makePortfolio("a", first);
    expect(getCurrentBetTicketNumbers(p1)).toEqual([1, 2, 3, 4, 5]);
    const removed = appendBetSelectionRevision(p1, [], ctx);
    const p2 = makePortfolio("a", removed);
    expect(getCurrentBetTicketNumbers(p2)).toEqual([]);
    expect(removed.markedAsBet).toBe(false);
    // Removing a legacy whole-portfolio bet must not fall back to "all tickets".
    const legacyRemoved = makePortfolio("b", appendBetSelectionRevision(makePortfolio("b", { markedAsBet: true }), [], ctx));
    expect(getCurrentBetTicketNumbers(legacyRemoved)).toEqual([]);
  });

  it("canonicalizes unsorted input and is append-only", () => {
    const r1 = appendBetSelectionRevision(makePortfolio("c"), [5, 1, 3, 3], ctx);
    expect(r1.betSelection.revisions[0]!.selectedTicketNumbers).toEqual([1, 3, 5]);
    const r2 = appendBetSelectionRevision(makePortfolio("c", r1), [1, 2], { ...ctx, recordedAt: "later" });
    expect(r2.betSelection.revisions).toHaveLength(2);
    expect(r2.betSelection.revisions[0]).toEqual(r1.betSelection.revisions[0]);
  });

  it("refuses to append an out-of-range revision", () => {
    expect(() => appendBetSelectionRevision(makePortfolio("d"), [7], ctx)).toThrow();
  });
});

describe("bet selection — result availability timing", () => {
  const dataset = { latestContest: 3779, draws: [{ contest: 3779, drawDate: "d", numbers: [1] }] };
  it("before_result_in_dataset when the target contest is beyond the dataset", () => {
    expect(determineResultAvailability(3780, dataset)).toBe("before_result_in_dataset");
  });
  it("after_result_in_dataset when the official result is already present", () => {
    expect(determineResultAvailability(3779, dataset)).toBe("after_result_in_dataset");
  });
  it("unknown when it cannot be determined", () => {
    expect(determineResultAvailability(undefined, dataset)).toBe("unknown");
    expect(determineResultAvailability(3780, null)).toBe("unknown");
    expect(determineResultAvailability(3000, { latestContest: 3779, draws: [] })).toBe("unknown");
  });
});

describe("bet selection — persistence (IndexedDB), invariants and backup", () => {
  beforeEach(async () => {
    await db.portfolios.clear();
  });

  it("RMS scenario: 6 saved, 5 bet — tickets/strategy/seed/metrics/audit untouched, markedAsBet=true", async () => {
    const original = makePortfolio("rms");
    await savePortfolio(original);
    await setBetSelection("rms", [1, 2, 3, 4, 5], { resultAvailability: "before_result_in_dataset", datasetLatestContestAtRecording: 3779 });
    const [saved] = await listPortfolios();
    expect(saved!.tickets).toHaveLength(6);
    expect(saved!.tickets).toEqual(original.tickets);
    expect(saved!.strategyId).toBe(original.strategyId);
    expect(saved!.strategyVersion).toBe(original.strategyVersion);
    expect(saved!.seed).toBe(original.seed);
    expect(saved!.metrics).toEqual(original.metrics);
    expect(saved!.audit).toEqual(original.audit);
    expect(getCurrentBetTicketNumbers(saved!)).toEqual([1, 2, 3, 4, 5]);
    expect(saved!.markedAsBet).toBe(true);
    expect(await listPortfolios({ markedAsBet: true })).toHaveLength(1);
  });

  it("editing after the result exists appends an after_result revision and keeps the earlier prospective one", async () => {
    await savePortfolio(makePortfolio("edit"));
    await setBetSelection("edit", [1, 2, 3, 4, 5, 6], { resultAvailability: "before_result_in_dataset" });
    await setBetSelection("edit", [1, 2, 3, 4, 5], { resultAvailability: "after_result_in_dataset", datasetLatestContestAtRecording: 3781 });
    const saved = (await listPortfolios())[0]!;
    expect(saved.betSelection!.revisions.map((r) => r.resultAvailability)).toEqual(["before_result_in_dataset", "after_result_in_dataset"]);
    expect(saved.betSelection!.revisions[0]!.selectedTicketNumbers).toHaveLength(6);
  });

  it("removing the registration appends an empty revision and clears the aggregate flag while keeping history", async () => {
    await savePortfolio(makePortfolio("rm"));
    await setBetSelection("rm", [1, 2], { resultAvailability: "unknown" });
    await setBetSelection("rm", [], { resultAvailability: "unknown" });
    const saved = (await listPortfolios())[0]!;
    expect(saved.markedAsBet).toBe(false);
    expect(saved.betSelection!.revisions).toHaveLength(2);
    expect(await listPortfolios({ markedAsBet: false })).toHaveLength(1);
  });

  it("rejects an invalid selection without modifying the stored portfolio", async () => {
    await savePortfolio(makePortfolio("inv"));
    await expect(setBetSelection("inv", [9], { resultAvailability: "unknown" })).rejects.toThrow();
    expect((await listPortfolios())[0]!.betSelection).toBeUndefined();
  });

  it("backups round-trip every revision, timestamp, availability and dataset snapshot; old backups stay valid", async () => {
    await savePortfolio(makePortfolio("rt"));
    await setBetSelection("rt", [1, 2, 3], { resultAvailability: "before_result_in_dataset", datasetLatestContestAtRecording: 3779, recordedAt: "2026-09-20T10:00:00.000Z" });
    await setBetSelection("rt", [1], { resultAvailability: "after_result_in_dataset", datasetLatestContestAtRecording: 3781, recordedAt: "2026-09-22T10:00:00.000Z" });
    await savePortfolio(makePortfolio("legacy", { markedAsBet: true }));
    const backup = JSON.parse(JSON.stringify(await exportBackup()));
    expect(previewBackup(backup)).toEqual({ valid: true, count: 2 });
    await db.portfolios.clear();
    await importBackup(backup);
    const restored = (await listPortfolios()).find((p) => p.id === "rt")!;
    expect(restored.betSelection).toEqual({
      schemaVersion: 1,
      revisions: [
        { selectedTicketNumbers: [1, 2, 3], recordedAt: "2026-09-20T10:00:00.000Z", resultAvailability: "before_result_in_dataset", datasetLatestContestAtRecording: 3779 },
        { selectedTicketNumbers: [1], recordedAt: "2026-09-22T10:00:00.000Z", resultAvailability: "after_result_in_dataset", datasetLatestContestAtRecording: 3781 },
      ],
    });
    const legacy = (await listPortfolios()).find((p) => p.id === "legacy")!;
    expect(legacy.betSelection).toBeUndefined();
    expect(getCurrentBetTicketNumbers(legacy)).toHaveLength(6);
  });

  it("an imported backup with an invalid ticket reference is rejected", () => {
    const backup = { schemaVersion: 1, exportedAt: "t", portfolios: [makePortfolio("bad", { betSelection: { schemaVersion: 1, revisions: [{ selectedTicketNumbers: [7], recordedAt: "t", resultAvailability: "unknown" }] } })] };
    expect(previewBackup(backup).valid).toBe(false);
  });
});

describe("bet selection — result comparison (derived from checkedResult + selection only)", () => {
  const modality = "lotofacil" as const;

  it("checking evaluates ALL saved tickets regardless of the bet selection", () => {
    const checked = checkTicketsAgainstDraw(SIX_TICKETS, { contest: 3780, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] });
    expect(checked.hitsPerTicket).toHaveLength(SIX_TICKETS.length);
  });

  it("no selection → no bet comparison", () => {
    const s = summarizeBetSelectionResult(modality, [12, 11, 10], []);
    expect(s.hasSelection).toBe(false);
    expect(describeBetComparison(s)).toBe("");
  });

  it("all bet → no non-bet comparison", () => {
    const s = summarizeBetSelectionResult(modality, [12, 11], [1, 2]);
    expect(s.allBet).toBe(true);
    expect(s.bestNonBet).toBeNull();
    expect(describeBetComparison(s)).toBe("");
  });

  it("non-bet ticket outperforms: factual sentence, no evaluative wording", () => {
    const s = summarizeBetSelectionResult(modality, [11, 11, 11, 11, 12, 13], [1, 2, 3, 4, 5]);
    expect(s.bestBet).toMatchObject({ ticketNumbers: [5], bestHits: 12 });
    expect(s.bestNonBet).toMatchObject({ ticketNumbers: [6], bestHits: 13 });
    expect(s.relation).toBe("non_bet_higher");
    expect(s.overallBestWasNotBet).toBe(true);
    expect(describeBetComparison(s)).toBe("J6 não foi marcado como apostado e teve 1 acerto a mais que o melhor jogo apostado.");
    expect(describeBetComparison(s)).not.toMatch(/boa decisão|decisão ruim/i);
  });

  it("bet ticket performs better", () => {
    const s = summarizeBetSelectionResult(modality, [11, 11, 11, 11, 12, 10], [1, 2, 3, 4, 5]);
    expect(s.relation).toBe("bet_higher");
    expect(s.overallBestWasNotBet).toBe(false);
    expect(describeBetComparison(s)).toBe("Nenhum jogo não apostado superou o melhor jogo apostado.");
  });

  it("equal best results are stated as a tie; ties among non-bet tickets use plural wording", () => {
    const equal = summarizeBetSelectionResult(modality, [12, 12], [1]);
    expect(equal.relation).toBe("equal");
    expect(describeBetComparison(equal)).toMatch(/mesmo número de acertos/);
    const plural = summarizeBetSelectionResult(modality, [11, 13, 13], [1]);
    expect(plural.bestNonBet!.ticketNumbers).toEqual([2, 3]);
    expect(describeBetComparison(plural)).toBe("Os jogos J2 e J3 não foram marcados como apostados e tiveram 2 acertos a mais que o melhor jogo apostado.");
  });

  it("Mega-Sena labels reuse the existing result-label rules", () => {
    const s = summarizeBetSelectionResult("megasena", [4, 5], [1]);
    expect(s.bestNonBet!.resultText).toBe("5 acertos · Quina");
  });
});
