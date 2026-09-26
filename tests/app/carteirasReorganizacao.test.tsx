import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { db } from "../../src/shared/lib/db";
import { savePortfolio } from "../../src/shared/lib/portfolioStore";
import type { LotteryDataset, Modality, SavedPortfolio } from "../../src/shared/types";

function dataset(modality: Modality, latestContest: number, drawDate: string): LotteryDataset {
  return { schemaVersion: 1, modality, source: "test", importedAt: "2026-09-25T00:00:00.000Z", latestContest, draws: [{ contest: latestContest, drawDate, numbers: [1, 2, 3, 4, 5, 6] }] };
}
const DATASETS = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("../../src/shared/lib/dataLoaders", async () => {
  const actual = await vi.importActual<typeof import("../../src/shared/lib/dataLoaders")>("../../src/shared/lib/dataLoaders");
  return { ...actual, loadDataset: vi.fn().mockImplementation((m: string) => Promise.resolve(DATASETS.current[m])) };
});

import { CarteirasPage } from "../../src/app/pages/CarteirasPage";

function daysAgo(n: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12).toISOString();
}
function make(id: string, modality: Modality, contest: number, createdAt: string): SavedPortfolio {
  const size = modality === "lotofacil" ? 15 : 6;
  return {
    schemaVersion: 1, id, modality, contest, strategyId: modality === "lotofacil" ? "lotofacil.uniform_random" : "megasena.uniform_random", strategyVersion: "1", engineVersion: "1",
    createdAt, price: { ticketCostBRL: 3, referenceDate: "2026-09-08", source: "test" }, seed: id, parameters: {},
    tickets: [Array.from({ length: size }, (_, i) => i + 1)], metrics: {}, audit: {}, markedAsBet: false,
  };
}
const renderPage = () => render(<MemoryRouter><CarteirasPage /></MemoryRouter>);

beforeEach(async () => {
  await db.portfolios.clear();
  DATASETS.current = { lotofacil: dataset("lotofacil", 100, "2026-09-25"), megasena: dataset("megasena", 50, "2026-09-24") };
});

describe("CarteirasPage — grouping by day, modality cue, load more", () => {
  it("groups mixed modalities/dates under Hoje / Ontem / full-date headings, newest first, and colors cards by modality", async () => {
    await savePortfolio(make("m-today", "megasena", 51, daysAgo(0)));
    await savePortfolio(make("l-today", "lotofacil", 101, new Date(Date.now() - 1000).toISOString()));
    await savePortfolio(make("l-yest", "lotofacil", 100, daysAgo(1)));
    renderPage();
    const hoje = await screen.findByRole("region", { name: "Hoje" });
    expect(within(hoje).getAllByTestId("saved-card")).toHaveLength(2);
    expect(within(screen.getByRole("region", { name: "Ontem" })).getAllByTestId("saved-card")).toHaveLength(1);
    const cards = screen.getAllByTestId("saved-card");
    expect(cards.find((c) => c.dataset.modality === "megasena")!.className).toContain("border-l-brand-blue");
    expect(cards.find((c) => c.dataset.modality === "lotofacil")!.className).toContain("border-l-brand-teal");
    // the text label stays alongside the color cue
    expect(within(cards[0]!).getByText(/Mega-Sena|Lotofácil/)).toBeInTheDocument();
  });

  it("shows only the 3 most recent day-groups and reveals the rest with 'Carregar mais'", async () => {
    for (let d = 0; d < 5; d += 1) await savePortfolio(make(`p${d}`, "lotofacil", 90 + d, daysAgo(d * 2)));
    renderPage();
    await screen.findByRole("region", { name: "Hoje" });
    expect(screen.getAllByTestId("saved-card")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    expect(screen.getAllByTestId("saved-card")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
  });
});

describe("CarteirasPage — concurso quick filter", () => {
  it("filters the loaded list by exact or partial contest number", async () => {
    await savePortfolio(make("a", "megasena", 3061, daysAgo(0)));
    await savePortfolio(make("b", "megasena", 3050, daysAgo(0)));
    await savePortfolio(make("c", "lotofacil", 3786, daysAgo(1)));
    renderPage();
    await screen.findAllByTestId("saved-card");
    expect(screen.getAllByTestId("saved-card")).toHaveLength(3);
    fireEvent.change(screen.getByRole("spinbutton", { name: /Concurso/ }), { target: { value: "3061" } });
    expect(screen.getAllByTestId("saved-card")).toHaveLength(1);
    fireEvent.change(screen.getByRole("spinbutton", { name: /Concurso/ }), { target: { value: "30" } });
    expect(screen.getAllByTestId("saved-card")).toHaveLength(2); // 3061, 3050
    fireEvent.change(screen.getByRole("spinbutton", { name: /Concurso/ }), { target: { value: "999" } });
    expect(screen.getByText("Nenhum jogo encontrado")).toBeInTheDocument();
    // existing filters/controls remain
    expect(screen.getByRole("combobox", { name: /Modalidade/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar backup" })).toBeInTheDocument();
  });
});

describe("CarteirasPage — estimated / real draw date on cards", () => {
  it("shows the real date for a contest already in the dataset and an 'estimado' label for a future one", async () => {
    await savePortfolio(make("past", "lotofacil", 100, daysAgo(1)));
    await savePortfolio(make("future", "lotofacil", 101, daysAgo(0)));
    await savePortfolio(make("mega-future", "megasena", 52, daysAgo(0)));
    renderPage();
    expect(await screen.findByText("Sorteio realizado em 25/09/2026")).toBeInTheDocument();
    expect(await screen.findByText(/Sorteio estimado: 27\/09\/26 · domingo · 11h/)).toBeInTheDocument();
    expect(await screen.findByText(/Sorteio estimado: 29\/09\/26 · terça-feira · 21h/)).toBeInTheDocument();
  });
});

describe("CarteirasPage — pending-result notice lives inside the dialog", () => {
  it("shows a prominent amber notice in the detail dialog (not the page-level message) when the result is not published yet", async () => {
    await savePortfolio(make("pending", "lotofacil", 105, daysAgo(0)));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Abrir" }));
    const dialog = await screen.findByRole("dialog", { name: "Detalhes dos jogos salvos" });
    expect(within(dialog).queryByTestId("no-result-yet")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Conferir resultado" }));
    const notice = await within(dialog).findByTestId("no-result-yet");
    expect(notice).toHaveTextContent("O resultado oficial do concurso 105 ainda não foi divulgado pela CAIXA. Volte a conferir mais tarde.");
    expect(notice.className).toContain("border-amber-700");
    expect(screen.queryByText(/ainda não está disponível no dataset/)).not.toBeInTheDocument();
    // closing and reopening clears it
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Abrir" }));
    await waitFor(() => expect(screen.queryByTestId("no-result-yet")).not.toBeInTheDocument());
  });
});

describe("CarteirasPage — Detalhes opens right below the clicked card", () => {
  it("renders the detail panel immediately after the opened card (before the following cards), not at the page bottom", async () => {
    await savePortfolio(make("first", "lotofacil", 100, new Date(Date.now() - 1000).toISOString()));
    await savePortfolio(make("second", "megasena", 50, new Date(Date.now() - 2000).toISOString()));
    await savePortfolio(make("third", "lotofacil", 99, daysAgo(1)));
    renderPage();
    const cards = await screen.findAllByTestId("saved-card");
    expect(cards).toHaveLength(3);
    fireEvent.click(within(cards[0]!).getByRole("button", { name: "Abrir" }));
    const dialog = await screen.findByRole("dialog", { name: "Detalhes dos jogos salvos" });
    // the wrapper is the very next sibling of the opened card, inside the same day grid
    expect(cards[0]!.nextElementSibling).toContainElement(dialog);
    // only one details panel exists, and it precedes the later cards in document order
    expect(screen.getAllByRole("dialog", { name: "Detalhes dos jogos salvos" })).toHaveLength(1);
    expect(dialog.compareDocumentPosition(cards[1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // opening another card moves the panel there; Fechar removes it
    fireEvent.click(within(cards[2]!).getByRole("button", { name: "Abrir" }));
    const moved = await screen.findByRole("dialog", { name: "Detalhes dos jogos salvos" });
    expect(cards[2]!.nextElementSibling).toContainElement(moved);
    fireEvent.click(within(moved).getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog", { name: "Detalhes dos jogos salvos" })).not.toBeInTheDocument();
  });
});
