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

const METRICS = { randomBaseline: {}, overlap: { min: 0, max: 0, mean: 0, histogram: {} }, exposure: { exposure: {} }, probability: {}, marker: "original-metrics" };
const AUDIT = { marker: "original-audit" };
let counter = 0;
function makeFakeResult(n: number): PortfolioEnvelope {
  counter += 1;
  return {
    id: `result-${counter}`,
    modality: "lotofacil",
    contest: 3780,
    strategyId: fakeStrategy.id,
    strategyVersion: "1",
    seed: `seed-${counter}`,
    tickets: Array.from({ length: n }, (_, i) => Array.from({ length: 15 }, (_, j) => i + j + 1)),
    costBRL: n * 3,
    metrics: METRICS,
    audit: AUDIT,
    generationMethod: "test",
    evaluationMethod: "test",
    createdAt: "2026-09-07T00:00:00.000Z",
  };
}

// Spy wrapping the REAL store (fake-indexeddb), so the page sees the authoritative final record.
const savePortfolio = vi.hoisted(() => vi.fn());
vi.mock("../../src/shared/lib/portfolioStore", async () => {
  const actual = await vi.importActual<typeof import("../../src/shared/lib/portfolioStore")>("../../src/shared/lib/portfolioStore");
  savePortfolio.mockImplementation(actual.savePortfolio);
  return { ...actual, savePortfolio: (...a: unknown[]) => savePortfolio(...a) };
});
import { db } from "../../src/shared/lib/db";
import { listPortfolios } from "../../src/shared/lib/portfolioStore";

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
        generate: (request: { numberOfTickets?: number }) => setResult(makeFakeResult(request.numberOfTickets ?? 1)),
        reset: () => setResult(null),
      };
    },
  };
});

import { GerarPage } from "../../src/app/pages/GerarPage";

async function generateSix() {
  render(
    <MemoryRouter>
      <GerarPage modality="lotofacil" />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByText("Gerar jogos aleatórios"));
  fireEvent.change(await screen.findByRole("spinbutton", { name: /Quantidade de jogos/ }), { target: { value: "6" } });
  fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
  await screen.findByRole("heading", { name: "Seus jogos estão prontos" });
  fireEvent.click(screen.getByRole("button", { name: "Salvar estes jogos" }));
  await screen.findByRole("dialog", { name: "Salvar carteira" });
}

describe("GerarPage — save panel and opt-in bet registration", () => {
  beforeEach(async () => {
    savePortfolio.mockClear();
    await db.portfolios.clear();
    counter = 0;
  });

  it("states that all generated tickets will be saved, and bet registration is OFF by default", async () => {
    await generateSix();
    expect(screen.getByText("Todos os 6 jogos gerados serão salvos.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Registrar também quais jogos foram apostados/ })).not.toBeChecked();
    expect(screen.queryByRole("list", { name: "Jogos apostados" })).not.toBeInTheDocument();
  });

  it("saving without registering bets saves ALL tickets, markedAsBet=false, no betSelection", async () => {
    await generateSix();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e salvar" }));
    await waitFor(() => expect(savePortfolio).toHaveBeenCalledTimes(1));
    const saved = savePortfolio.mock.calls[0][0];
    expect(saved.tickets).toHaveLength(6);
    expect(saved.markedAsBet).toBe(false);
    expect(saved.betSelection).toBeUndefined();
    expect(await screen.findByText(/Nenhuma aposta foi registrada/)).toBeInTheDocument();
  });

  it("opting in selects every ticket by default", async () => {
    await generateSix();
    fireEvent.click(screen.getByRole("checkbox", { name: /Registrar também quais jogos foram apostados/ }));
    for (let n = 1; n <= 6; n += 1) expect(screen.getByRole("checkbox", { name: `J${n} apostado` })).toBeChecked();
    expect(screen.getByText("6 de 6 jogos marcados como apostados")).toBeInTheDocument();
  });

  it("unchecking J6 saves all six tickets but records [1,2,3,4,5]; metrics/audit are saved unchanged", async () => {
    await generateSix();
    fireEvent.click(screen.getByRole("checkbox", { name: /Registrar também quais jogos foram apostados/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "J6 apostado" }));
    expect(screen.getByText("5 de 6 jogos marcados como apostados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e salvar" }));

    await waitFor(() => expect(savePortfolio).toHaveBeenCalledTimes(1));
    const saved = savePortfolio.mock.calls[0][0];
    expect(saved.tickets).toHaveLength(6);
    expect(saved.markedAsBet).toBe(true);
    expect(saved.betSelection.schemaVersion).toBe(1);
    expect(saved.betSelection.revisions).toHaveLength(1);
    expect(saved.betSelection.revisions[0].selectedTicketNumbers).toEqual([1, 2, 3, 4, 5]);
    expect(saved.betSelection.revisions[0].resultAvailability).toBe("before_result_in_dataset");
    expect(saved.betSelection.revisions[0].datasetLatestContestAtRecording).toBe(3779);
    expect(saved.metrics).toBe(METRICS);
    expect(saved.audit).toBe(AUDIT);
    expect(await screen.findByText(/5 de 6 jogos registrados como apostados/)).toBeInTheDocument();
  });

  it("cancel closes the panel without saving", async () => {
    await generateSix();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Salvar carteira" })).not.toBeInTheDocument();
    expect(savePortfolio).not.toHaveBeenCalled();
  });
});

describe("GerarPage — zero-ticket bet registration is not allowed", () => {
  beforeEach(async () => {
    savePortfolio.mockClear();
    await db.portfolios.clear();
    counter = 0;
  });

  it("disables 'Salvar carteira' with a helper when registration is on and nothing is selected", async () => {
    await generateSix();
    fireEvent.click(screen.getByRole("checkbox", { name: /Registrar também quais jogos foram apostados/ }));
    for (let n = 1; n <= 6; n += 1) fireEvent.click(screen.getByRole("checkbox", { name: `J${n} apostado` }));
    expect(screen.getByText("Selecione ao menos um jogo apostado ou desative o registro de aposta.")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Confirmar e salvar" });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(savePortfolio).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Registrar também quais jogos foram apostados/ }));
    expect(screen.getByRole("button", { name: "Confirmar e salvar" })).toBeEnabled();
  });
});

describe("GerarPage — repeated save of the same generated portfolio reports the FINAL persisted state", () => {
  beforeEach(async () => {
    savePortfolio.mockClear();
    await db.portfolios.clear();
    counter = 0;
  });

  const toggleRegister = () => fireEvent.click(screen.getByRole("checkbox", { name: /Registrar também quais jogos foram apostados/ }));
  const saveFirst5of6 = async () => {
    await generateSix();
    toggleRegister();
    fireEvent.click(screen.getByRole("checkbox", { name: "J6 apostado" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e salvar" }));
    await screen.findByText(/5 de 6 jogos registrados como apostados/);
  };
  const reopenSave = async () => {
    fireEvent.click(screen.getByRole("button", { name: "Salvar estes jogos" }));
    await screen.findByRole("dialog", { name: "Salvar carteira" });
  };

  it("registration OFF on repeat: persistence stays 5/6, message never says no bet was registered, generated content untouched", async () => {
    await saveFirst5of6();
    const [before] = await listPortfolios();
    await reopenSave();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e salvar" }));
    await waitFor(() => expect(savePortfolio).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/O registro de aposta existente foi preservado: 5 de 6 jogos registrados como apostados/)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma aposta foi registrada/)).not.toBeInTheDocument();
    const all = await listPortfolios();
    expect(all).toHaveLength(1);
    expect(all[0]!.betSelection!.revisions).toHaveLength(1);
    expect(all[0]!.betSelection!.revisions[0]!.selectedTicketNumbers).toEqual([1, 2, 3, 4, 5]);
    expect(all[0]!.markedAsBet).toBe(true);
    expect(all[0]!.tickets).toEqual(before!.tickets);
    expect(all[0]!.seed).toBe(before!.seed);
    expect(all[0]!.strategyId).toBe(before!.strategyId);
    expect(all[0]!.metrics).toEqual(before!.metrics);
    expect(all[0]!.audit).toEqual(before!.audit);
  });

  it("repeat with a changed selection 5/6 -> 4/6 reports 4 de 6", async () => {
    await saveFirst5of6();
    await reopenSave();
    toggleRegister();
    fireEvent.click(screen.getByRole("checkbox", { name: "J5 apostado" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "J6 apostado" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e salvar" }));
    expect(await screen.findByText(/Estes jogos foram salvos em Meus jogos salvos. 4 de 6 jogos registrados como apostados/)).toBeInTheDocument();
    const [p] = await listPortfolios();
    expect(p!.betSelection!.revisions).toHaveLength(2);
  });

  it("repeat with an identical selection is idempotent and reports the actual state", async () => {
    await saveFirst5of6();
    await reopenSave();
    toggleRegister();
    fireEvent.click(screen.getByRole("checkbox", { name: "J6 apostado" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e salvar" }));
    await waitFor(() => expect(savePortfolio).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/5 de 6 jogos registrados como apostados/)).toBeInTheDocument();
    expect((await listPortfolios())[0]!.betSelection!.revisions).toHaveLength(1);
  });

  it("first save with no registration, repeated with none: still 'Nenhuma aposta foi registrada'", async () => {
    await generateSix();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e salvar" }));
    await screen.findByText(/Nenhuma aposta foi registrada/);
    await reopenSave();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e salvar" }));
    await waitFor(() => expect(savePortfolio).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Nenhuma aposta foi registrada/)).toBeInTheDocument();
  });
});
