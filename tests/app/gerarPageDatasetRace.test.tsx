import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { StrategyDefinition } from "../../src/shared/types";

/**
 * Regression test for the dataset-loading validation race (v1.1.1 review
 * fix): target-contest validation must not be bypassable while the
 * modality dataset is still in flight. Before the fix, `contestValidation`
 * was simply `null` while `dataset` was null, so `validateBeforeGenerate()`
 * fell straight through to the overlap/range checks and let generation
 * proceed with an unvalidated contest number.
 */

const fakeStrategy: StrategyDefinition = {
  id: "megasena.uniform_random",
  version: "1",
  modality: "megasena",
  name: "Uniform random",
  shortDescription: "",
  status: "active",
  evidence: "baseline",
  ticketCount: { mode: "range", min: 1, max: 50 },
  supportsBudget: false,
  supportsFixedNumbers: false,
  supportsExcludedNumbers: false,
  supportsUserSeed: false,
  supportsQualityPreset: false,
  requiresHistoricalDraws: false,
  requiresTargetContest: false,
  optimizedMetrics: [],
  reportedMetrics: [],
  disclaimers: [],
  ux: { title: "Gerar jogos aleatórios", summary: "", badge: "", helpTitle: "", helpBody: "", technicalName: "Uniform random" },
};

vi.mock("../../src/shared/lib/strategyRegistry", () => ({
  strategyRegistry: {
    listByModality: () => [fakeStrategy],
    get: (id: string) => (id === fakeStrategy.id ? fakeStrategy : undefined),
  },
}));

let resolveDataset: ((value: unknown) => void) | null = null;

vi.mock("../../src/shared/lib/dataLoaders", () => ({
  loadGameConfig: () =>
    Promise.resolve({
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lotofacil: { simpleTicketSize: 15, ticketCostBRL: 3, source: "test", referenceDate: "2026-01-01", configVersion: "1" },
      megasena: { simpleTicketSize: 6, ticketCostBRL: 5, source: "test", referenceDate: "2026-01-01", configVersion: "1" },
    }),
  // Never resolves until the test explicitly calls resolveDataset — simulates
  // a slow/in-flight fetch so the race window can be observed deterministically.
  loadDataset: () =>
    new Promise((resolve) => {
      resolveDataset = resolve;
    }),
  suggestNextContest: (d: { latestContest: number }) => d.latestContest + 1,
}));

const generateSpy = vi.fn();

vi.mock("../../src/shared/lib/useGenerationWorker", async () => {
  const { useState } = await import("react");
  return {
    useGenerationWorker: () => {
      const [result] = useState(null);
      return { stage: "idle", result, error: null, isRunning: false, generate: generateSpy, reset: vi.fn() };
    },
  };
});

import { GerarPage } from "../../src/app/pages/GerarPage";

describe("GerarPage — target-contest validation cannot be bypassed while the dataset is still loading", () => {
  it("shows a neutral loading message and blocks generation for a manually entered contest before the dataset resolves, then validates normally once it does", async () => {
    generateSpy.mockClear();
    resolveDataset = null;

    render(
      <MemoryRouter>
        <GerarPage modality="megasena" />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("heading", { name: "Gerar jogos aleatórios" }));
    const contestInput = await screen.findByRole("spinbutton", { name: "Concurso em que você pretende jogar" });
    fireEvent.change(contestInput, { target: { value: "3055" } });

    // Dataset has not resolved yet: a neutral loading message, not a false "invalid contest" error.
    await screen.findByText("Carregando a base de concursos...");
    expect(screen.queryByText(/não está disponível/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    expect(generateSpy).not.toHaveBeenCalled();
    expect(await screen.findByText("Não é possível gerar")).toBeInTheDocument();
    expect(screen.getAllByText("Carregando a base de concursos...").length).toBeGreaterThan(0);

    // Now let the dataset resolve — normal target-contest validation takes over automatically.
    expect(resolveDataset).not.toBeNull();
    resolveDataset!({
      schemaVersion: 1,
      modality: "megasena",
      source: "https://example.test/megasena",
      importedAt: "2026-09-08T00:00:00.000Z",
      latestContest: 3055,
      draws: [{ contest: 3055, drawDate: "2026-09-08", numbers: [1, 11, 36, 43, 48, 49] }],
    });

    // The live field note disappears on its own once the dataset resolves,
    // and the historical-simulation notice takes over automatically.
    await screen.findByText(/simulação histórica/);

    // A fresh submit attempt now succeeds instead of repeating the stale loading error.
    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Não é possível gerar")).not.toBeInTheDocument();
  });
});
