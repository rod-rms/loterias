import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { StrategyDefinition, PortfolioEnvelope, GeneratePortfolioRequest, Modality } from "../../src/shared/types";

const lotofacilStrategy: StrategyDefinition = {
  id: "lotofacil.uniform_random",
  version: "1",
  modality: "lotofacil",
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
  ux: { title: "Gerar jogos aleatórios da Lotofácil", summary: "", badge: "", helpTitle: "", helpBody: "", technicalName: "Uniform random" },
};

const megasenaStrategy: StrategyDefinition = {
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
  ux: { title: "Gerar jogos aleatórios da Mega-Sena", summary: "", badge: "", helpTitle: "", helpBody: "", technicalName: "Uniform random" },
};

vi.mock("../../src/shared/lib/strategyRegistry", () => ({
  strategyRegistry: {
    listByModality: (modality: Modality) => (modality === "lotofacil" ? [lotofacilStrategy] : [megasenaStrategy]),
    get: (id: string) => [lotofacilStrategy, megasenaStrategy].find((s) => s.id === id),
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
  loadDataset: (modality: Modality) =>
    Promise.resolve({
      schemaVersion: 1,
      modality,
      source: `https://example.test/${modality}`,
      importedAt: "2026-09-07T22:38:23.130Z",
      latestContest: modality === "lotofacil" ? 3779 : 3055,
      draws: [{ contest: modality === "lotofacil" ? 3779 : 3055, drawDate: "2026-09-03", numbers: [1, 2, 3, 4, 5, 6] }],
    }),
  suggestNextContest: () => null,
}));

let fakeResultCounter = 0;
function makeFakeResult(modality: Modality, numberOfTickets: number): PortfolioEnvelope {
  fakeResultCounter += 1;
  const size = modality === "lotofacil" ? 15 : 6;
  return {
    id: `result-${fakeResultCounter}`,
    modality,
    strategyId: modality === "lotofacil" ? lotofacilStrategy.id : megasenaStrategy.id,
    strategyVersion: "1",
    seed: `seed-${fakeResultCounter}`,
    tickets: Array.from({ length: numberOfTickets }, (_, i) => Array.from({ length: size }, (_, j) => i + j + 1)),
    costBRL: numberOfTickets * (modality === "lotofacil" ? 3 : 5),
    metrics: { randomBaseline: {}, overlap: { min: 0, max: 0, mean: 0, histogram: {} }, exposure: { exposure: {} }, probability: {} },
    audit: {},
    generationMethod: "test",
    evaluationMethod: "test",
    createdAt: "2026-09-07T00:00:00.000Z",
  };
}

const savePortfolio = vi.fn().mockImplementation(async (p: unknown) => p); // real store returns the persisted record
vi.mock("../../src/shared/lib/portfolioStore", () => ({
  savePortfolio: (...args: unknown[]) => savePortfolio(...args),
}));

// Deliberately a WORST-CASE fake: unlike the real (fixed) hook, this one does
// NOT clear its own `result` when the `modality` argument changes — its
// internal useState just persists across a prop change, exactly like the
// real hook did before the fix. This proves GerarPage's OWN modality
// ownership guard (`activeResult`) and reset effect are independently
// sufficient, per the requirement that GerarPage/useGenerationWorker must
// remain safe even if reused with a different modality prop.
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
        generate: (request: GeneratePortfolioRequest) => {
          setResult(makeFakeResult(request.modality, request.numberOfTickets ?? 1));
        },
        reset: () => setResult(null),
      };
    },
  };
});

import { GerarPage } from "../../src/app/pages/GerarPage";

describe("GerarPage — cross-modality generation state isolation", () => {
  beforeEach(() => {
    savePortfolio.mockClear();
    fakeResultCounter = 0;
  });

  it("A) Mega-Sena result never remains visible after the component is reused for Lotofácil (the reported bug)", async () => {
    const { rerender } = render(
      <MemoryRouter>
        <GerarPage modality="megasena" />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Gerar jogos aleatórios da Mega-Sena"));
    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    await screen.findByRole("heading", { name: "Seus jogos estão prontos" });

    // Simulate the exact defect precondition: edit the config after
    // generating, so the stale-result warning is showing, then "navigate"
    // to Lotofácil WITHOUT the component unmounting (same fiber reused).
    const quantityInput = screen.getByRole("spinbutton", { name: /Quantidade de jogos/ });
    fireEvent.change(quantityInput, { target: { value: "9" } });
    await screen.findByText(/Você alterou a configuração depois de gerar estes jogos/);

    rerender(
      <MemoryRouter>
        <GerarPage modality="lotofacil" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Gerar jogos da Lotofácil" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Seus jogos estão prontos" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Você alterou a configuração depois de gerar estes jogos/)).not.toBeInTheDocument();
    expect(screen.queryByText(megasenaStrategy.ux.title)).not.toBeInTheDocument();
    expect(screen.getByText("Escolha uma opção acima para continuar.")).toBeInTheDocument();
  });

  it("B) reverse direction: Lotofácil result never remains visible after reuse for Mega-Sena", async () => {
    const { rerender } = render(
      <MemoryRouter>
        <GerarPage modality="lotofacil" />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Gerar jogos aleatórios da Lotofácil"));
    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    await screen.findByRole("heading", { name: "Seus jogos estão prontos" });

    rerender(
      <MemoryRouter>
        <GerarPage modality="megasena" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Gerar jogos da Mega-Sena" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Seus jogos estão prontos" })).not.toBeInTheDocument();
    expect(screen.queryByText(lotofacilStrategy.ux.title)).not.toBeInTheDocument();
  });

  it("C) selecting a strategy after returning does not resurrect the previous modality's result", async () => {
    const { rerender } = render(
      <MemoryRouter>
        <GerarPage modality="megasena" />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Gerar jogos aleatórios da Mega-Sena"));
    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    await screen.findByRole("heading", { name: "Seus jogos estão prontos" });

    rerender(
      <MemoryRouter>
        <GerarPage modality="lotofacil" />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Gerar jogos aleatórios da Lotofácil"));

    expect(screen.queryByRole("heading", { name: "Seus jogos estão prontos" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Você alterou a configuração depois de gerar estes jogos/)).not.toBeInTheDocument();
  });

  it("D) same-modality stale semantics are unchanged: editing the form after generating keeps the result visible and stale", async () => {
    render(
      <MemoryRouter>
        <GerarPage modality="lotofacil" />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Gerar jogos aleatórios da Lotofácil"));
    const quantityInput = await screen.findByRole("spinbutton", { name: /Quantidade de jogos/ });
    fireEvent.change(quantityInput, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    await screen.findByRole("heading", { name: "Seus jogos estão prontos" });

    fireEvent.change(quantityInput, { target: { value: "9" } });

    expect(screen.getByRole("heading", { name: "Seus jogos estão prontos" })).toBeInTheDocument();
    await screen.findByText(/Você alterou a configuração depois de gerar estes jogos/);
  });

  it("E) save safety: a cross-modality result can never be passed to savePortfolio with the new modality's config", async () => {
    const { rerender } = render(
      <MemoryRouter>
        <GerarPage modality="megasena" />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Gerar jogos aleatórios da Mega-Sena"));
    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    await screen.findByRole("heading", { name: "Seus jogos estão prontos" });

    rerender(
      <MemoryRouter>
        <GerarPage modality="lotofacil" />
      </MemoryRouter>,
    );

    // The "Salvar estes jogos" action is not even rendered once the stale
    // cross-modality result is hidden, but assert this explicitly: there is
    // no way to trigger a save of the discarded Mega-Sena result.
    expect(screen.queryByRole("button", { name: "Salvar estes jogos" })).not.toBeInTheDocument();
    expect(savePortfolio).not.toHaveBeenCalled();
  });

  it("F) export/copy/compare actions for a cross-modality result are not actionable after returning", async () => {
    const { rerender } = render(
      <MemoryRouter>
        <GerarPage modality="megasena" />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Gerar jogos aleatórios da Mega-Sena"));
    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    await screen.findByRole("heading", { name: "Seus jogos estão prontos" });

    rerender(
      <MemoryRouter>
        <GerarPage modality="lotofacil" />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "Copiar todos" })).not.toBeInTheDocument();
    expect(screen.queryByText("Exportar")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Comparar com outra opção" })).not.toBeInTheDocument();
  });

  it("G) changing modality clears a completed result even with no user interaction in between", async () => {
    const { rerender } = render(
      <MemoryRouter>
        <GerarPage modality="lotofacil" />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Gerar jogos aleatórios da Lotofácil"));
    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    await screen.findByRole("heading", { name: "Seus jogos estão prontos" });

    rerender(
      <MemoryRouter>
        <GerarPage modality="megasena" />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Seus jogos estão prontos" })).not.toBeInTheDocument());
  });
});
