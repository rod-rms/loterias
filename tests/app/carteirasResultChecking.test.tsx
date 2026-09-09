import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { db } from "../../src/shared/lib/db";
import { savePortfolio } from "../../src/shared/lib/portfolioStore";
import type { SavedPortfolio } from "../../src/shared/types";

const { FAKE_DRAW } = vi.hoisted(() => ({
  FAKE_DRAW: { contest: 100, drawDate: "2026-09-08", numbers: [1, 2, 3, 4, 5, 6] },
}));

vi.mock("../../src/shared/lib/dataLoaders", async () => {
  const actual = await vi.importActual<typeof import("../../src/shared/lib/dataLoaders")>("../../src/shared/lib/dataLoaders");
  return {
    ...actual,
    loadDataset: vi.fn().mockResolvedValue({
      schemaVersion: 1,
      modality: "megasena",
      source: "test",
      importedAt: "2026-09-08T00:00:00.000Z",
      latestContest: 100,
      draws: [FAKE_DRAW],
    }),
  };
});

import { CarteirasPage } from "../../src/app/pages/CarteirasPage";

function makePortfolio(id: string, tickets: number[][]): SavedPortfolio {
  return {
    schemaVersion: 1,
    id,
    modality: "megasena",
    contest: 100,
    strategyId: "megasena.uniform_random",
    strategyVersion: "1",
    engineVersion: "1",
    createdAt: "2026-09-08T00:00:00.000Z",
    price: { ticketCostBRL: 5, referenceDate: "2026-09-08", source: "test" },
    seed: "seed-1",
    parameters: {},
    tickets,
    metrics: {},
    audit: {},
    markedAsBet: false,
  };
}

describe("CarteirasPage — full result checking with ties and labels", () => {
  beforeEach(async () => {
    await db.portfolios.clear();
  });

  it("shows the official numbers, per-ticket hits, and a single best ticket with its label", async () => {
    await savePortfolio(
      makePortfolio("p-single-best", [
        [1, 2, 3, 4, 50, 51], // 4 hits -> Quadra
        [1, 2, 60, 59, 58, 57], // 2 hits -> no label
      ]),
    );

    render(
      <MemoryRouter>
        <CarteirasPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Abrir" }));
    fireEvent.click(screen.getByRole("button", { name: "Conferir resultado" }));

    await screen.findByText(/Resultado oficial — Concurso 100/);
    expect(screen.getByText("01 · 02 · 03 · 04 · 05 · 06")).toBeInTheDocument();
    expect(screen.getByText("J1 foi o melhor jogo, com 4 acertos · Quadra.")).toBeInTheDocument();
    const ticketList = screen.getByRole("list", { name: /Lista de \d+ jogos/ });
    expect(ticketList).toHaveTextContent("4 acertos · Quadra");
    const secondTicket = ticketList.querySelectorAll("li")[1]!;
    expect(secondTicket).toHaveTextContent("2 acertos");
    expect(secondTicket.textContent).not.toContain("·");
  });

  it("handles two tied best tickets correctly", async () => {
    await savePortfolio(
      makePortfolio("p-tied", [
        [1, 2, 3, 4, 50, 51], // 4 hits
        [1, 2, 3, 4, 60, 59], // 4 hits, tied
        [1, 2, 58, 57, 56, 55], // 2 hits
      ]),
    );

    render(
      <MemoryRouter>
        <CarteirasPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Abrir" }));
    fireEvent.click(screen.getByRole("button", { name: "Conferir resultado" }));

    await waitFor(() => expect(screen.getByText(/foram os melhores jogos/)).toBeInTheDocument());
    expect(screen.getByText("J1 e J2 foram os melhores jogos, com 4 acertos cada · Quadra.")).toBeInTheDocument();
    // Both tied tickets are visually marked "Melhor".
    expect(screen.getByTestId("best-ticket-badge-J1")).toBeInTheDocument();
    expect(screen.getByTestId("best-ticket-badge-J2")).toBeInTheDocument();
    expect(screen.queryByTestId("best-ticket-badge-J3")).not.toBeInTheDocument();
  });

  it("never uses prize/payout wording anywhere in the checked result view", async () => {
    await savePortfolio(makePortfolio("p-sena", [[1, 2, 3, 4, 5, 6]]));

    render(
      <MemoryRouter>
        <CarteirasPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Abrir" }));
    fireEvent.click(screen.getByRole("button", { name: "Conferir resultado" }));

    await waitFor(() => expect(screen.getAllByText(/Sena/).length).toBeGreaterThan(0));
    expect(document.body.textContent).not.toMatch(/premi|ganhou|vencedora/i);
  });
});
