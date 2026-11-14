import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "../../src/app/layout/AppShell";
import { ModalityRegistryProvider } from "../../src/shared/lib/modalityRegistry";
import type { GameConfig } from "../../src/shared/types";

vi.mock("../../src/shared/lib/dataLoaders", () => ({
  loadDataset: () => Promise.resolve({ latestContest: 100, draws: [], source: "test", importedAt: "2026-01-01T00:00:00.000Z" }),
  loadDataStatus: () =>
    Promise.resolve({
      schemaVersion: 1,
      lotofacil: { source: "t", latestContest: 3829, latestDrawDate: "2026-11-13", lastUpdatedAt: "x", lastCheckedAt: "x", status: "ok", gapCount: 0 },
      megasena: { source: "t", latestContest: 3085, latestDrawDate: "2026-11-12", lastUpdatedAt: "x", lastCheckedAt: "x", status: "ok", gapCount: 0 },
    }),
  loadGameConfig: () => Promise.reject(new Error("not used: the provider receives a preloaded config")),
}));

const entry = (id: "lotofacil" | "megasena", displayName: string, order: number): NonNullable<GameConfig["modalities"]>[number] => ({
  id,
  slug: id,
  displayName,
  shortName: displayName,
  enabled: true,
  order,
  sections: ["gerar", "carteiras", "analise", "metodologia"],
  datasetPath: `data/${id}/results.json`,
  officialUrl: "https://loterias.caixa.gov.br/",
  colors: { accent: "#4caf50", accentStrong: "#2e7d32", soft: "#16351f", onAccent: "#ffffff", text: "#9fe0a3" },
});
const config: GameConfig = {
  schemaVersion: 1,
  updatedAt: "2026-11-14",
  lotofacil: { simpleTicketSize: 15, ticketCostBRL: 3.5, source: "t", referenceDate: "2026-09-07", configVersion: "1" },
  megasena: { simpleTicketSize: 6, ticketCostBRL: 6, source: "t", referenceDate: "2026-09-07", configVersion: "1" },
  modalities: [entry("lotofacil", "Lotofácil", 1), entry("megasena", "Mega-Sena", 2)],
};

const renderShell = (path = "/") =>
  render(
    <ModalityRegistryProvider preloaded={config}>
      <MemoryRouter initialEntries={[path]}>
        <AppShell>
          <p>conteúdo</p>
        </AppShell>
      </MemoryRouter>
    </ModalityRegistryProvider>,
  );

/**
 * The application's public-facing brand is LotoAtlas (Brand Kit v0.3); "Loterias" only survives as a generic
 * reference to the official CAIXA lottery product line, never as this app's own name. UI-001 moved the chrome to a
 * sidebar (desktop) built from the modality registry; jsdom has no matchMedia, so the desktop variant renders here.
 */
describe("AppShell — LotoAtlas public brand", () => {
  it("shows the LotoAtlas name and the version (not 'Loterias'), without the tagline in the chrome", async () => {
    renderShell();
    expect(screen.getAllByAltText("LotoAtlas").length).toBeGreaterThan(0);
    expect(screen.getByText(/^LotoAtlas v\d+\.\d+\.\d+/)).toBeInTheDocument();
    expect(screen.queryByText(/^Loterias v/)).not.toBeInTheDocument();
    expect(screen.queryByText("Organize. Analise. Confira.")).not.toBeInTheDocument();
    expect((await screen.findAllByText(/concurso/)).length).toBeGreaterThan(0); // freshness from status.json
  });

  it("keeps the skip link and main content landmark intact", () => {
    renderShell();
    expect(screen.getByText("Pular para o conteúdo")).toHaveAttribute("href", "#main-content");
    expect(document.getElementById("main-content")).not.toBeNull();
  });
});

describe("AppShell — navigation from the modality registry (UI-001)", () => {
  it("lists every enabled modality and the sections of the current one; switching modality keeps the section", () => {
    renderShell("/lotofacil/analise");
    const modalities = screen.getByRole("navigation", { name: "Modalidades" });
    expect(within(modalities).getByRole("link", { name: "Lotofácil" })).toHaveAttribute("aria-current", "true");
    expect(within(modalities).getByRole("link", { name: "Mega-Sena" })).toHaveAttribute("href", "/megasena/analise");
    const sections = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(sections).getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual([
      "/lotofacil/gerar",
      "/lotofacil/carteiras",
      "/lotofacil/analise",
      "/lotofacil/metodologia",
    ]);
    expect(within(sections).getByRole("link", { name: "Análise de resultados" })).toHaveAttribute("aria-current", "page");
    const global = screen.getByRole("navigation", { name: "Geral" });
    expect(within(global).getByRole("link", { name: "Todos os meus jogos" })).toHaveAttribute("href", "/carteiras");
    expect(within(global).getByRole("link", { name: "Sobre" })).toHaveAttribute("href", "/sobre");
  });

  it("on a global page the modality links point to each modality's hub and the current modality is the first enabled one", () => {
    renderShell("/sobre");
    const modalities = screen.getByRole("navigation", { name: "Modalidades" });
    expect(within(modalities).getByRole("link", { name: "Mega-Sena" })).toHaveAttribute("href", "/megasena/gerar");
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toHaveTextContent("Gerar jogos");
  });
});
