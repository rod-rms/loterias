import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../../src/app/ErrorBoundary";

function Bomb(): never {
  throw new Error("boom: deliberate render crash for testing");
}

function SafeChild() {
  return <p>Tudo certo</p>;
}

describe("ErrorBoundary — global fallback for render/lifecycle crashes", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React (and our own dev-only logging) logs the caught error to the
    // console by design; keep test output clean without hiding real failures.
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders the calm fallback instead of leaving a blank screen when a child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
    expect(document.body.textContent).not.toBe("");
  });

  it("shows the correct user-facing message and saved-data reassurance, with no stack trace", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Não foi possível carregar esta tela. Seus jogos salvos continuam armazenados neste navegador.")).toBeInTheDocument();
    expect(screen.getByRole("alert").textContent).not.toMatch(/at \w+.*\(.*:\d+:\d+\)/);
    expect(screen.getByRole("alert").textContent).not.toContain("boom:");
  });

  it("provides a retry action and a way back home", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    const homeLink = screen.getByRole("link", { name: "Voltar ao início" });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("retry re-renders the children (recovers once the underlying condition is fixed)", () => {
    let shouldCrash = true;
    function Flaky() {
      if (shouldCrash) throw new Error("boom");
      return <p>Recuperado</p>;
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();

    shouldCrash = false;
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(screen.getByText("Recuperado")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Algo deu errado" })).not.toBeInTheDocument();
  });

  it("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Tudo certo")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Algo deu errado" })).not.toBeInTheDocument();
  });
});
