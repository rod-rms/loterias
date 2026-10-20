import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { db } from "../../src/shared/lib/db";
import { savePortfolio, listPortfolios } from "../../src/shared/lib/portfolioStore";
import type { SavedPortfolio } from "../../src/shared/types";

// Lotofácil draw: 1..15. Ticket hit counts are controlled by how many of 1..15 each ticket contains.
const DRAW = { contest: 3780, drawDate: "2026-09-19", numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] };
let datasetDraws: (typeof DRAW)[] = [DRAW];

vi.mock("../../src/shared/lib/dataLoaders", async () => {
  const actual = await vi.importActual<typeof import("../../src/shared/lib/dataLoaders")>("../../src/shared/lib/dataLoaders");
  return {
    ...actual,
    loadDataset: vi.fn().mockImplementation(() =>
      Promise.resolve({ schemaVersion: 1, modality: "lotofacil", source: "test", importedAt: "2026-09-08T00:00:00.000Z", latestContest: 3780, draws: datasetDraws }),
    ),
  };
});

import { CarteirasPage } from "../../src/app/pages/CarteirasPage";

/** ticket i has hitsList[i] numbers from the draw (1..15) padded with non-draw numbers 16..25. */
function ticketWithHits(hits: number): number[] {
  return [...Array.from({ length: hits }, (_, i) => i + 1), ...Array.from({ length: 15 - hits }, (_, i) => 16 + i)];
}

function makePortfolio(id: string, hitsList: number[], overrides: Partial<SavedPortfolio> = {}): SavedPortfolio {
  return {
    schemaVersion: 1,
    id,
    modality: "lotofacil",
    contest: 3780,
    strategyId: "lotofacil.rms_v2",
    strategyVersion: "2.0.0",
    engineVersion: "2.0.0",
    createdAt: "2026-09-08T00:00:00.000Z",
    price: { ticketCostBRL: 3.5, referenceDate: "2026-09-08", source: "test" },
    seed: "seed-1",
    parameters: {},
    tickets: hitsList.map(ticketWithHits),
    metrics: {},
    audit: {},
    markedAsBet: false,
    ...overrides,
  };
}

function withBet(numbers: number[]): Partial<SavedPortfolio> {
  return { markedAsBet: numbers.length > 0, betSelection: { schemaVersion: 1, revisions: [{ selectedTicketNumbers: numbers, recordedAt: "2026-09-08T00:00:00.000Z", resultAvailability: "before_result_in_dataset", datasetLatestContestAtRecording: 3779 }] } };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CarteirasPage />
    </MemoryRouter>,
  );
}

async function openAndCheck() {
  fireEvent.click(await screen.findByRole("button", { name: "Abrir" }));
  fireEvent.click(screen.getByRole("button", { name: "Conferir resultado" }));
  await screen.findByText(/Resultado oficial, concurso 3780/);
}

describe("CarteirasPage — saved portfolio bet status", () => {
  beforeEach(async () => {
    await db.portfolios.clear();
    datasetDraws = [DRAW];
  });

  it("no bet declaration: shows the full generated portfolio and 'Aposta não registrada'", async () => {
    await savePortfolio(makePortfolio("none", [12, 11, 11, 11, 11, 10]));
    renderPage();
    expect(await screen.findByTestId("bet-status")).toHaveTextContent("Aposta não registrada");
    expect(screen.getByText(/Carteira gerada: 6 jogos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar aposta" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover registro de aposta" })).not.toBeInTheDocument();
  });

  it("partial selection shows 5/6 apostados with a distinct reference cost, not replacing the portfolio cost", async () => {
    await savePortfolio(makePortfolio("partial", [12, 11, 11, 11, 11, 10], withBet([1, 2, 3, 4, 5])));
    renderPage();
    expect(await screen.findByTestId("bet-status")).toHaveTextContent("5/6 apostados");
    expect(screen.getByText(/Carteira gerada: 6 jogos · R\$\s?21,00/)).toBeInTheDocument();
    expect(screen.getByText(/Apostados: 5 jogos · custo de referência R\$\s?17,50/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar jogos apostados" })).toBeInTheDocument();
  });

  it("all selected shows 6/6 apostados", async () => {
    await savePortfolio(makePortfolio("all", [12, 11, 11, 11, 11, 10], withBet([1, 2, 3, 4, 5, 6])));
    renderPage();
    expect(await screen.findByTestId("bet-status")).toHaveTextContent("6/6 apostados");
  });

  it("legacy markedAsBet=true without betSelection is displayed as every ticket bet", async () => {
    await savePortfolio(makePortfolio("legacy", [12, 11, 10], { markedAsBet: true }));
    renderPage();
    expect(await screen.findByTestId("bet-status")).toHaveTextContent("3/3 apostados");
  });

  it("registering defaults to all tickets; unchecking J6 records [1..5] and keeps all six tickets", async () => {
    await savePortfolio(makePortfolio("reg", [12, 11, 11, 11, 11, 10]));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Registrar aposta" }));
    const dialog = await screen.findByRole("dialog", { name: "Registrar jogos apostados" });
    expect(within(dialog).getByText("6 de 6 jogos marcados como apostados")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "J6 apostado" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar registro" }));

    await waitFor(async () => {
      const [p] = await listPortfolios();
      expect(p!.betSelection?.revisions.at(-1)?.selectedTicketNumbers).toEqual([1, 2, 3, 4, 5]);
    });
    const [p] = await listPortfolios();
    expect(p!.tickets).toHaveLength(6);
    expect(p!.markedAsBet).toBe(true);
    expect(p!.betSelection!.revisions.at(-1)!.resultAvailability).toBe("after_result_in_dataset"); // result already in dataset
    expect(await screen.findByTestId("bet-status")).toHaveTextContent("5/6 apostados");
  });

  it("'Salvar registro' is disabled for an empty selection (removal is the explicit way to clear)", async () => {
    await savePortfolio(makePortfolio("zero", [12, 11], withBet([1, 2])));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Editar jogos apostados" }));
    const dialog = await screen.findByRole("dialog", { name: "Registrar jogos apostados" });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "J1 apostado" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "J2 apostado" }));
    expect(within(dialog).getByRole("button", { name: "Salvar registro" })).toBeDisabled();
    expect(within(dialog).getByText(/Selecione ao menos um jogo apostado/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "J1 apostado" }));
    expect(within(dialog).getByRole("button", { name: "Salvar registro" })).toBeEnabled();
  });

  it("editing appends a revision and removing the registration preserves history", async () => {
    await savePortfolio(makePortfolio("hist", [12, 11, 11, 11, 11, 10], withBet([1, 2, 3, 4, 5, 6])));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Editar jogos apostados" }));
    const dialog = await screen.findByRole("dialog", { name: "Registrar jogos apostados" });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "J6 apostado" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar registro" }));
    await waitFor(async () => expect((await listPortfolios())[0]!.betSelection!.revisions).toHaveLength(2));

    fireEvent.click(await screen.findByRole("button", { name: "Remover registro de aposta" }));
    await waitFor(async () => expect((await listPortfolios())[0]!.betSelection!.revisions).toHaveLength(3));
    const [p] = await listPortfolios();
    expect(p!.markedAsBet).toBe(false);
    expect(p!.betSelection!.revisions[0]!.selectedTicketNumbers).toEqual([1, 2, 3, 4, 5, 6]);
    expect(p!.tickets).toHaveLength(6);
    expect(await screen.findByTestId("bet-status")).toHaveTextContent("Aposta não registrada");
  });
});

describe("CarteirasPage — the bet editor opens right below the card whose button was clicked", () => {
  // Newest first: C3 (createdAt :03) is the first card, C1 the last. We always pick by POSITION, never by first card.
  async function seedThree(overrides: Array<Partial<SavedPortfolio>> = [{}, {}, {}]) {
    for (let i = 0; i < 3; i += 1) {
      await savePortfolio(makePortfolio(`c${i + 1}`, [11, 11, 11, 11, 11, 10], { createdAt: `2026-09-08T00:00:0${i + 1}.000Z`, ...overrides[i] }));
    }
  }
  const cards = () => screen.getAllByTestId("saved-card");
  const editorFor = () => screen.getByRole("dialog", { name: "Registrar jogos apostados" });
  /** The element that wraps the dialog inside the per-card Fragment (a direct child of the grid, like the details wrapper). */
  const editorWrapper = () => editorFor().parentElement!;

  beforeEach(async () => {
    await db.portfolios.clear();
    datasetDraws = [DRAW];
  });

  it("'Registrar aposta' on a card in the middle/end of the list: the editor is the next sibling of THAT card, not of any other, and exists once", async () => {
    await seedThree();
    renderPage();
    await waitFor(() => expect(cards()).toHaveLength(3));
    const target = cards()[2]!;
    fireEvent.click(within(target).getByRole("button", { name: "Registrar aposta" }));

    expect(screen.getAllByRole("dialog", { name: "Registrar jogos apostados" })).toHaveLength(1);
    expect(target.nextElementSibling).toBe(editorWrapper());
    expect(editorWrapper().parentElement).toBe(target.parentElement); // a direct grid child, like the details panel
    expect(editorWrapper().className).toContain("md:col-span-2"); // spans the full row on md:grid-cols-2
    // the other cards are NOT followed by the editor
    expect(cards()[0]!.nextElementSibling).toBe(cards()[1]);
    expect(cards()[1]!.nextElementSibling).toBe(cards()[2]);
  });

  it("'Editar jogos apostados' (card that already has a bet) uses the same placement", async () => {
    await seedThree([{}, withBet([1, 2, 3]), {}]);
    renderPage();
    await waitFor(() => expect(cards()).toHaveLength(3));
    const target = cards()[1]!;
    fireEvent.click(within(target).getByRole("button", { name: "Editar jogos apostados" }));

    expect(screen.getAllByRole("dialog", { name: "Registrar jogos apostados" })).toHaveLength(1);
    expect(target.nextElementSibling).toBe(editorWrapper());
    expect(within(editorFor()).getByText("3 de 6 jogos marcados como apostados")).toBeInTheDocument();
    expect(cards()[2]!.previousElementSibling).toBe(editorWrapper()); // the card after it is pushed below the editor
  });

  it("opening the editor on another card replaces the current one (single editor state)", async () => {
    await seedThree();
    renderPage();
    await waitFor(() => expect(cards()).toHaveLength(3));
    fireEvent.click(within(cards()[0]!).getByRole("button", { name: "Registrar aposta" }));
    expect(cards()[0]!.nextElementSibling).toBe(editorWrapper());

    fireEvent.click(within(cards()[2]!).getByRole("button", { name: "Registrar aposta" }));
    expect(screen.getAllByRole("dialog", { name: "Registrar jogos apostados" })).toHaveLength(1);
    expect(cards()[2]!.nextElementSibling).toBe(editorWrapper());
    expect(cards()[0]!.nextElementSibling).toBe(cards()[1]); // nothing left behind under the first card
  });

  it("both open on the same card: card, then the editor, then the details; details content/behaviour unchanged", async () => {
    await seedThree();
    renderPage();
    await waitFor(() => expect(cards()).toHaveLength(3));
    const target = cards()[1]!;
    fireEvent.click(within(target).getByRole("button", { name: "Abrir" }));
    const details = screen.getByRole("dialog", { name: "Detalhes dos jogos salvos" });
    expect(target.nextElementSibling).toBe(details.parentElement); // details alone: right below the card, as before

    fireEvent.click(within(target).getByRole("button", { name: "Registrar aposta" }));
    expect(target.nextElementSibling).toBe(editorWrapper()); // editor first...
    expect(editorWrapper().nextElementSibling).toBe(details.parentElement); // ...then the details
    expect(within(details).getByRole("button", { name: "Conferir resultado" })).toBeInTheDocument();
  });

  it("cancelling removes the editor; saving the record still works from its new place", async () => {
    await seedThree();
    renderPage();
    await waitFor(() => expect(cards()).toHaveLength(3));
    fireEvent.click(within(cards()[1]!).getByRole("button", { name: "Registrar aposta" }));
    fireEvent.click(within(editorFor()).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Registrar jogos apostados" })).not.toBeInTheDocument();

    fireEvent.click(within(cards()[1]!).getByRole("button", { name: "Registrar aposta" }));
    fireEvent.click(within(editorFor()).getByRole("checkbox", { name: "J6 apostado" }));
    fireEvent.click(within(editorFor()).getByRole("button", { name: "Salvar registro" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Registrar jogos apostados" })).not.toBeInTheDocument());
    const saved = (await listPortfolios()).find((p) => p.id === "c2")!;
    expect(saved.betSelection!.revisions.at(-1)!.selectedTicketNumbers).toEqual([1, 2, 3, 4, 5]);
  });

  it("opening the editor scrolls it into view if needed and moves focus to its heading", async () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      await seedThree();
      renderPage();
      await waitFor(() => expect(cards()).toHaveLength(3));
      fireEvent.click(within(cards()[2]!).getByRole("button", { name: "Registrar aposta" }));
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
      expect(scrollIntoView.mock.contexts[0]).toBe(editorWrapper());
      expect(within(editorFor()).getByRole("heading", { name: "Jogos apostados" })).toHaveFocus();

      // editing inside the editor must not re-scroll
      fireEvent.click(within(editorFor()).getByRole("checkbox", { name: "J6 apostado" }));
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });
});

describe("CarteirasPage — result checking with bet vs non-bet tickets", () => {
  beforeEach(async () => {
    await db.portfolios.clear();
    datasetDraws = [DRAW];
  });

  it("mandatory scenario: 6 saved, 5 bet — six hit counts, six rows, 5 'Apostado', 1 'Não apostado', J6 keeps its number", async () => {
    await savePortfolio(makePortfolio("mand", [11, 11, 11, 11, 12, 10], withBet([1, 2, 3, 4, 5])));
    renderPage();
    await openAndCheck();

    const [saved] = await listPortfolios();
    expect(saved!.checkedResult!.hitsPerTicket).toEqual([11, 11, 11, 11, 12, 10]);
    const list = screen.getByRole("list", { name: "Lista de 6 jogos" });
    expect(list.querySelectorAll(":scope > li")).toHaveLength(6);
    for (let n = 1; n <= 5; n += 1) expect(screen.getByTestId(`ticket-badge-J${n}`)).toHaveTextContent("Apostado");
    expect(screen.getByTestId("ticket-badge-J6")).toHaveTextContent("Não apostado");
    expect(within(list).getByText("J6")).toBeInTheDocument();

    const comparison = screen.getByTestId("bet-comparison");
    expect(within(comparison).getByText("Melhor entre os apostados")).toBeInTheDocument();
    expect(within(comparison).getByText("J5 · 12 acertos")).toBeInTheDocument();
    expect(within(comparison).getByText("Melhor entre os não apostados")).toBeInTheDocument();
    expect(within(comparison).getByText("J6 · 10 acertos")).toBeInTheDocument();
    expect(within(comparison).getByText("Nenhum jogo não apostado superou o melhor jogo apostado.")).toBeInTheDocument();
    expect(screen.getByText("Melhor da carteira gerada")).toBeInTheDocument();
  });

  it("when the unbet ticket performed better, states it factually and flags the overall best as not bet", async () => {
    await savePortfolio(makePortfolio("better", [11, 11, 11, 11, 12, 13], withBet([1, 2, 3, 4, 5])));
    renderPage();
    await openAndCheck();
    expect(screen.getByText("J6 não foi marcado como apostado e teve 1 acerto a mais que o melhor jogo apostado.")).toBeInTheDocument();
    expect(screen.getByText("O melhor jogo da carteira não foi marcado como apostado.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/boa decisão|decisão ruim|vencedor|ganhou/i);
  });

  it("all bet: standard checking plus no non-bet comparison section content", async () => {
    await savePortfolio(makePortfolio("allbet", [12, 11], withBet([1, 2])));
    renderPage();
    await openAndCheck();
    expect(screen.queryByText("Melhor entre os não apostados")).not.toBeInTheDocument();
    expect(screen.getByTestId("ticket-badge-J1")).toHaveTextContent("Apostado");
  });

  it("no selection: standard full-portfolio checking, no badges and no comparison", async () => {
    await savePortfolio(makePortfolio("nosel", [12, 11, 10]));
    renderPage();
    await openAndCheck();
    expect(screen.queryByTestId("bet-comparison")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ticket-badge-J1")).not.toBeInTheDocument();
    expect(screen.getByText("Melhor resultado")).toBeInTheDocument();
  });

  it("legacy full-portfolio bet: every ticket is 'Apostado'", async () => {
    await savePortfolio(makePortfolio("legacy", [12, 11], { markedAsBet: true }));
    renderPage();
    await openAndCheck();
    expect(screen.getByTestId("ticket-badge-J1")).toHaveTextContent("Apostado");
    expect(screen.getByTestId("ticket-badge-J2")).toHaveTextContent("Apostado");
  });

  it("ties: equal best hits between bet and non-bet are stated factually", async () => {
    await savePortfolio(makePortfolio("tie", [12, 12, 10], withBet([1])));
    renderPage();
    await openAndCheck();
    expect(screen.getByText(/mesmo número de acertos que o melhor jogo apostado/)).toBeInTheDocument();
  });
});
