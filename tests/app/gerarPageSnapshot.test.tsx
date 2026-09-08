import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { StrategyDefinition, PortfolioEnvelope } from "../../src/shared/types";

const fakeStrategy: StrategyDefinition = {
  id: "lotofacil.uniform_random",
  version: "1",
  modality: "lotofacil",
  name: "Uniform random",
  shortDescription: "",
  status: "active",
  evidence: "baseline",
  ticketCount: { mode: "range", min: 1, max: 50 },
  supportsBudget: false,
  supportsFixedNumbers: true,
  supportsExcludedNumbers: true,
  supportsUserSeed: true,
  supportsQualityPreset: false,
  requiresHistoricalDraws: false,
  requiresTargetContest: false,
  optimizedMetrics: [],
  reportedMetrics: [],
  disclaimers: [],
  ux: {
    title: "Gerar jogos aleatórios",
    summary: "",
    badge: "",
    helpTitle: "",
    helpBody: "",
    technicalName: "Uniform random",
  },
};

vi.mock("../../src/shared/lib/strategyRegistry", () => ({
  strategyRegistry: {
    listByModality: () => [fakeStrategy],
    get: (id: string) => (id === fakeStrategy.id ? fakeStrategy : undefined),
  },
}));

vi.mock("../../src/shared/lib/dataLoaders", () => ({
  loadGameConfig: () =>
    Promise.resolve({
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lotofacil: { simpleTicketSize: 15, ticketCostBRL: 3, source: "test", referenceDate: "2026-01-01", configVersion: "1" },
      megasena: { simpleTicketSize: 6, ticketCostBRL: 5, source: "test", referenceDate: "2026-01-01", configVersion: "1" },
    }),
  loadDataset: () =>
    Promise.resolve({
      schemaVersion: 1,
      modality: "lotofacil",
      source: "https://example.test/lotofacil",
      importedAt: "2026-09-07T22:38:23.130Z",
      latestContest: 3779,
      draws: [{ contest: 3779, drawDate: "2026-09-03", numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }],
    }),
  suggestNextContest: () => 3780,
}));

let fakeResultCounter = 0;
function makeFakeResult(numberOfTickets: number): PortfolioEnvelope {
  fakeResultCounter += 1;
  return {
    id: `result-${fakeResultCounter}`,
    modality: "lotofacil",
    strategyId: fakeStrategy.id,
    strategyVersion: fakeStrategy.version,
    seed: `seed-${fakeResultCounter}`,
    tickets: Array.from({ length: numberOfTickets }, (_, i) => [i + 1, i + 2, i + 3, i + 4, i + 5, i + 6, i + 7, i + 8, i + 9, i + 10, i + 11, i + 12, i + 13, i + 14, i + 15]),
    costBRL: numberOfTickets * 3,
    metrics: { randomBaseline: {}, overlap: { min: 0, max: 0, mean: 0, histogram: {} }, exposure: { exposure: {} }, probability: {} },
    audit: {},
    generationMethod: "test",
    evaluationMethod: "test",
    createdAt: "2026-09-07T00:00:00.000Z",
  };
}

const savePortfolio = vi.fn().mockResolvedValue(undefined);
vi.mock("../../src/shared/lib/portfolioStore", () => ({
  savePortfolio: (...args: unknown[]) => savePortfolio(...args),
}));

// Minimal controllable stand-in for the real worker-backed hook: `generate`
// synchronously produces a result whose ticket count matches the request,
// so tests can assert exactly what was frozen at generation time.
vi.mock("../../src/shared/lib/useGenerationWorker", async () => {
  const { useState } = await import("react");
  return {
    useGenerationWorker: () => {
      const [result, setResult] = useState<PortfolioEnvelope | null>(null);
      return {
        stage: "idle",
        result,
        error: null,
        isRunning: false,
        generate: (request: { numberOfTickets?: number }) => {
          setResult(makeFakeResult(request.numberOfTickets ?? 1));
        },
        reset: () => setResult(null),
      };
    },
  };
});

import { GerarPage } from "../../src/app/pages/GerarPage";

describe("GerarPage — two-snapshot generation state", () => {
  beforeEach(() => {
    savePortfolio.mockClear();
    fakeResultCounter = 0;
  });

  it("saving a stale displayed result uses the snapshot that produced it, not the edited form", async () => {
    render(
      <MemoryRouter>
        <GerarPage modality="lotofacil" />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Gerar jogos aleatórios"));
    const quantityInput = await screen.findByRole("spinbutton", { name: /Quantidade de jogos/ });
    fireEvent.change(quantityInput, { target: { value: "3" } });

    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    await screen.findByRole("heading", { name: "Seus jogos estão prontos" });

    // Edit the form AFTER generating, without regenerating.
    fireEvent.change(quantityInput, { target: { value: "8" } });
    await screen.findByText(/Você alterou a configuração depois de gerar estes jogos/);

    fireEvent.click(screen.getByRole("button", { name: "Salvar estes jogos" }));

    await waitFor(() => expect(savePortfolio).toHaveBeenCalledTimes(1));
    const saved = savePortfolio.mock.calls[0][0];
    expect(saved.parameters.numberOfTickets).toBe(3);
    expect(saved.tickets).toHaveLength(3);
    expect(saved.dataset).toEqual({
      latestContest: 3779,
      importedAt: "2026-09-07T22:38:23.130Z",
      source: "https://example.test/lotofacil",
      latestDrawDate: "2026-09-03",
    });
  });

  it("restoring the previous configuration removes the stale warning without generating again", async () => {
    render(
      <MemoryRouter>
        <GerarPage modality="lotofacil" />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Gerar jogos aleatórios"));
    const quantityInput = await screen.findByRole("spinbutton", { name: /Quantidade de jogos/ });
    fireEvent.change(quantityInput, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    await screen.findByRole("heading", { name: "Seus jogos estão prontos" });

    fireEvent.change(quantityInput, { target: { value: "8" } });
    await screen.findByText(/Você alterou a configuração depois de gerar estes jogos/);

    fireEvent.click(screen.getByRole("button", { name: "Restaurar configuração anterior" }));

    await waitFor(() => expect(screen.queryByText(/Você alterou a configuração depois de gerar estes jogos/)).not.toBeInTheDocument());
    expect((quantityInput as HTMLInputElement).value).toBe("3");
    expect(screen.getByRole("heading", { name: "Seus jogos estão prontos" })).toBeInTheDocument();
  });
});
