import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalisePage } from "../../src/app/pages/AnalisePage";
import { analyzeBacktest, buildAnalysisExport } from "../../src/shared/lib/backtestAnalysis";
import { backtestFileSchema, type BacktestFile } from "../../src/shared/lib/backtestSchemas";
import { hitsDistributionFor } from "../../src/shared/lib/hitsDistribution";
import { createSeededRandom } from "../../src/shared/lib/prng";
import type { Modality } from "../../src/shared/types";

const FIXTURE_SEED = "fixture-b";
const IDS: Record<Modality, string[]> = {
  lotofacil: ["lotofacil.max_coverage_11", "lotofacil.max_coverage_12", "lotofacil.max_diversification", "lotofacil.rms_v2", "lotofacil.uniform_random"],
  megasena: ["megasena.max_diversification", "megasena.max_f4", "megasena.max_f5", "megasena.rolling_20_v2", "megasena.uniform_random"],
};

/** Synthetic artifact: every ticket's hits are sampled from the EXACT random distribution (the honest "no difference" case). */
function makeFile(modality: Modality, opts: { contests?: number; override?: Record<string, number> } = {}): BacktestFile {
  const from = 51;
  const n = opts.contests ?? 60;
  const dist = hitsDistributionFor(modality);
  const random = createSeededRandom(`${FIXTURE_SEED}:${modality}`);
  const sample = () => {
    let u = random();
    for (let h = 0; h < dist.pmf.length; h += 1) {
      u -= dist.pmf[h]!;
      if (u <= 0) return h;
    }
    return dist.pmf.length - 1;
  };
  const rows: BacktestFile["rows"] = [];
  for (let c = from; c < from + n; c += 1) {
    for (const id of IDS[modality]) {
      const hits = Array.from({ length: 6 }, () => opts.override?.[id] ?? sample());
      rows.push({ contest: c, strategyId: id, hitsPerTicket: hits, bestHits: Math.max(...hits) });
    }
  }
  return backtestFileSchema.parse({
    backtestSchemaVersion: 1,
    modality,
    runId: `bt-${modality}-${from}-${from + n - 1}-abcdef012345`,
    codeCommit: "deadbeef",
    generatedAt: "2026-11-12T12:00:00.000Z",
    parameters: { ticketsPerStrategy: 6, inputMode: "quantity", qualityPreset: "balanced", seedTemplate: "backtest:{modality}:{contest}:{strategyId}:{strategyVersion}" },
    strategies: IDS[modality].map((id) => ({ id, strategyVersion: "1.0.0", algorithmVersion: "x" })),
    range: { from, to: from + n - 1, contestsCount: n },
    datasetSha256: "a".repeat(64),
    rows,
    caveats: ["aviso de teste"],
  });
}

const realFetch = globalThis.fetch;
function serve(files: Partial<Record<Modality, unknown>>) {
  globalThis.fetch = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
    const m = /backtest\/(\w+)\/backtest\.json/.exec(String(input))?.[1] as Modality | undefined;
    if (m && files[m] !== undefined) return new Response(JSON.stringify(files[m]), { status: 200 });
    return new Response("nf", { status: 404 });
  }) as unknown as typeof fetch;
}
const renderPage = (path = "/analise") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AnalisePage />
    </MemoryRouter>,
  );

beforeEach(() => serve({ lotofacil: makeFile("lotofacil"), megasena: makeFile("megasena") }));
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("analyzeBacktest (hand-checked)", () => {
  it("computes mean, rate, best and cumulative difference for a tiny known case", () => {
    const f = makeFile("lotofacil", { contests: 4 });
    const id = "lotofacil.rms_v2";
    const hitsByContest: number[][] = [
      [9, 9, 9, 9, 9, 9],
      [11, 10, 9, 9, 8, 7],
      [12, 8, 8, 9, 9, 9],
      [9, 9, 9, 9, 9, 9],
    ];
    f.rows.filter((r) => r.strategyId === id).forEach((r, i) => {
      r.hitsPerTicket = hitsByContest[i]!;
      r.bestHits = Math.max(...hitsByContest[i]!);
    });
    const s = analyzeBacktest(f).strategies.find((x) => x.strategyId === id)!;
    // portfolio means: 9, 9, 9.1667, 9 -> overall 9.0417
    expect(s.meanHits.mean).toBeCloseTo((9 + 9 + 55 / 6 + 9) / 4, 10);
    expect(s.nContests).toBe(4);
    expect(s.nTickets).toBe(24);
    expect(s.rate.events).toBe(2); // 11 and 12 are the only tickets >= 11
    expect(s.bestHits.mean).toBeCloseTo((9 + 11 + 12 + 9) / 4, 10);
    expect(s.cumulative.at(-1)).toBeCloseTo(55 / 6 - 9, 10);
    expect(s.rate.thin).toBe(true);
  });

  it("flags a clearly different strategy and stays silent for random-like ones", () => {
    const a = analyzeBacktest(makeFile("lotofacil", { contests: 200, override: { "lotofacil.rms_v2": 12 } }));
    expect(a.anyDetectable).toBe(true);
    expect(a.strategies.find((s) => s.strategyId === "lotofacil.rms_v2")!.differenceVsReference).toBe("above");
    const b = analyzeBacktest(makeFile("lotofacil", { contests: 200 }));
    expect(b.anyDetectable).toBe(false);
  });

  it("exports exactly the displayed numbers with metadata", () => {
    const a = analyzeBacktest(makeFile("megasena"));
    const { csv, json } = buildAnalysisExport(a);
    expect(csv).toContain(`# runId;${a.meta.runId}`);
    expect(csv).toContain(`# datasetSha256;${"a".repeat(64)}`);
    expect(csv).toContain("# aviso;aviso de teste");
    expect(csv).toContain("# metodo;");
    expect(csv.split("\n").filter((l) => l.startsWith("megasena.")).length).toBe(5 + 5 * a.bins.length);
    expect((json as { runId: string }).runId).toBe(a.meta.runId);
  });
});

describe("AnalisePage", () => {
  it("renders the charts, n, the reference, the disclaimer and the audit footer; says no difference is detectable", async () => {
    renderPage();
    expect(await screen.findByTestId("analysis-no-difference")).toHaveTextContent("Nenhuma diferença detectável");
    for (const id of ["distribuicao", "media", "taxa", "melhor-jogo", "acumulada"]) expect(screen.getByTestId(`chart-${id}`)).toBeInTheDocument();
    expect(screen.getByTestId("analysis-disclaimer")).toHaveTextContent("não garantem nem preveem sorteios futuros");
    expect(screen.getByTestId("analysis-disclaimer")).toHaveTextContent("otimista");
    expect(screen.getByTestId("audit-footer")).toHaveTextContent("bt-lotofacil-51-110-abcdef012345");
    expect(screen.getByTestId("audit-footer")).toHaveTextContent("a".repeat(64));
    expect(screen.getByTestId("chart-media")).toHaveTextContent("n = 60 concursos");
    expect(screen.getByTestId("chart-media")).toHaveTextContent("9,000"); // exact random reference
  });

  it("switches to Mega-Sena and flags the thin sample of the rare-event rate", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("analysis-summary");
    await user.click(screen.getByRole("button", { name: "Mega-Sena" }));
    await waitFor(() => expect(screen.getByTestId("chart-taxa")).toHaveTextContent("3 ou mais acertos"));
    expect(screen.getByTestId("chart-taxa")).toHaveTextContent("amostra fina");
    expect(screen.getByTestId("chart-media")).toHaveTextContent("0,600");
  });

  it("every chart has an info button that opens on click and closes with Escape, and works from the keyboard", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("analysis-summary");
    for (const id of ["distribuicao", "media", "taxa", "melhor-jogo", "acumulada"]) {
      const card = screen.getByTestId(`chart-${id}`);
      const button = within(card).getByRole("button", { name: /^Ajuda sobre o gráfico/ });
      await user.click(button);
      const tip = within(card).getByRole("tooltip");
      expect(tip).toHaveTextContent("O que mede");
      expect(tip).toHaveTextContent("Como ler");
      expect(tip).toHaveTextContent("O que não afirma");
      await user.keyboard("{Escape}");
      expect(within(card).queryByRole("tooltip")).toBeNull();
    }
    const first = within(screen.getByTestId("chart-media")).getByRole("button", { name: /^Ajuda sobre o gráfico/ });
    await user.tab(); // keyboard focus on some control; then focus the info button itself
    act(() => first.focus());
    await waitFor(() => expect(within(screen.getByTestId("chart-media")).getByRole("tooltip")).toBeInTheDocument());
  });

  it("never uses ranking or recommendation wording", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await screen.findByTestId("analysis-summary");
    const lf = container.textContent ?? "";
    await user.click(screen.getByRole("button", { name: "Mega-Sena" }));
    await waitFor(() => expect(screen.getByTestId("chart-media")).toHaveTextContent("0,600"));
    const all = `${lf} ${container.textContent ?? ""}`.toLowerCase();
    for (const word of ["melhor estratégia", "melhores estratégias", "recomend", "mais acertou", "ranking", "roi", "lucro garantido", "vai sair"]) {
      expect(all.includes(word), `forbidden wording: ${word}`).toBe(false);
    }
    expect(screen.queryByRole("link", { name: /gerar/i })).toBeNull();
  });

  it("fails closed with a clear message when the artifact is missing, has another schema version or is inconsistent", async () => {
    serve({});
    const missing = renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível mostrar a análise");
    missing.unmount();

    serve({ lotofacil: { ...makeFile("lotofacil"), backtestSchemaVersion: 2 } });
    const version = renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Versão do arquivo de backtest incompatível");
    version.unmount();

    const broken = makeFile("lotofacil");
    broken.rows.pop();
    serve({ lotofacil: broken });
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("inconsistente");
  });
});
