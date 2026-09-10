import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "../../src/app/layout/AppShell";

vi.mock("../../src/shared/lib/dataLoaders", () => ({
  loadDataset: () => Promise.resolve({ latestContest: 100, draws: [], source: "test", importedAt: "2026-01-01T00:00:00.000Z" }),
}));

/**
 * The application's public-facing brand is LotoAtlas (Brand Kit v0.3);
 * "Loterias" only survives as a generic reference to the official CAIXA
 * lottery product line, never as this app's own name. This guards against
 * the old self-referential brand text silently coming back in the shell.
 */
describe("AppShell — LotoAtlas public brand", () => {
  it("shows the LotoAtlas name and tagline, and the version footer under the LotoAtlas name (not 'Loterias')", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell>
          <p>conteúdo</p>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getAllByAltText("LotoAtlas").length).toBeGreaterThan(0);
    expect(screen.getByText("Organize. Analise. Confira.")).toBeInTheDocument();
    expect(screen.getByText(/^LotoAtlas v\d+\.\d+\.\d+/)).toBeInTheDocument();
    expect(screen.queryByText(/^Loterias v/)).not.toBeInTheDocument();
  });

  it("keeps the skip link and main content landmark intact", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell>
          <p>conteúdo</p>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getByText("Pular para o conteúdo")).toHaveAttribute("href", "#main-content");
    expect(document.getElementById("main-content")).not.toBeNull();
  });
});
