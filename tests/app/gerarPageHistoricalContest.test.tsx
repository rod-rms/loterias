import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { StrategyDefinition } from "../../src/shared/types";

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
      modality: "megasena",
      source: "https://example.test/megasena",
      importedAt: "2026-09-08T00:00:00.000Z",
      latestContest: 3055,
      draws: [{ contest: 3055, drawDate: "2026-09-08", numbers: [1, 11, 36, 43, 48, 49] }],
    }),
  suggestNextContest: () => 3056,
}));

vi.mock("../../src/shared/lib/useGenerationWorker", async () => {
  const { useState } = await import("react");
  return {
    useGenerationWorker: () => {
      const [result] = useState(null);
      return { stage: "idle", result, error: null, isRunning: false, generate: vi.fn(), reset: vi.fn() };
    },
  };
});

import { GerarPage } from "../../src/app/pages/GerarPage";

function renderPage() {
  render(
    <MemoryRouter>
      <GerarPage modality="megasena" />
    </MemoryRouter>,
  );
}

describe("GerarPage — target-contest validation and historical simulation UI", () => {
  it("shows a neutral 'próximo concurso' status for the default next contest", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("heading", { name: "Gerar jogos aleatórios" }));
    await screen.findByText("Próximo concurso disponível");
    expect(screen.queryByText(/simulação histórica/)).not.toBeInTheDocument();
  });

  it("shows the historical-simulation notice with the official result when an existing past contest is entered", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("heading", { name: "Gerar jogos aleatórios" }));
    const contestInput = await screen.findByRole("spinbutton", { name: "Concurso em que você pretende jogar" });
    fireEvent.change(contestInput, { target: { value: "3055" } });

    await screen.findByText("Concurso 3055 já realizado em 08/09/2026");
    expect(screen.getByText("Resultado oficial")).toBeInTheDocument();
    expect(screen.getByText("01 · 11 · 36 · 43 · 48 · 49")).toBeInTheDocument();
    expect(screen.getByText(/simulação histórica/)).toBeInTheDocument();
  });

  it("blocks generation for a contest far beyond the next available one, with a dynamic message", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("heading", { name: "Gerar jogos aleatórios" }));
    const contestInput = await screen.findByRole("spinbutton", { name: "Concurso em que você pretende jogar" });
    fireEvent.change(contestInput, { target: { value: "4090" } });

    await screen.findByText(/ainda não está disponível para geração/);
    expect(screen.getByText(/atualizada até o concurso 3055/)).toBeInTheDocument();
    expect(screen.getByText(/próximo concurso disponível é o 3056/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Gerar jogos" }));
    expect(await screen.findByText("Não é possível gerar")).toBeInTheDocument();
  });

  it("blocks a contest below latestContest that is missing from the dataset (a gap)", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("heading", { name: "Gerar jogos aleatórios" }));
    const contestInput = await screen.findByRole("spinbutton", { name: "Concurso em que você pretende jogar" });
    fireEvent.change(contestInput, { target: { value: "3054" } });

    await screen.findByText("Esse concurso não está disponível na base local validada.");
  });
});
