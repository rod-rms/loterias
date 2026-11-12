import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
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
    const url = String(input);
    const ds = /data\/(lotofacil|megasena)\/results\.json/.exec(url)?.[1];
    if (ds) return new Response(readFileSync(path.join(process.cwd(), `public/data/${ds}/results.json`), "utf8"), { status: 200 });
    const lg = /ledger\/(lotofacil|megasena)\/entries-(\d{4}-\d{2})\.json/.exec(url);
    if (lg) {
      const f = path.join(process.cwd(), `public/data/ledger/${lg[1]}/entries-${lg[2]}.json`);
      return existsSync(f) ? new Response(readFileSync(f, "utf8"), { status: 200 }) : new Response("nf", { status: 404 });
    }
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

describe("lay-view numbers (hand-checked)", () => {
  it("worst/mean/best per portfolio and prize counts", () => {
    const f = makeFile("lotofacil", { contests: 4 });
    const id = "lotofacil.rms_v2";
    const hits: number[][] = [
      [9, 9, 9, 9, 9, 9],
      [11, 10, 9, 9, 8, 7],
      [12, 8, 8, 9, 9, 9],
      [9, 9, 9, 9, 9, 9],
    ];
    f.rows.filter((r) => r.strategyId === id).forEach((r, i) => {
      r.hitsPerTicket = hits[i]!;
      r.bestHits = Math.max(...hits[i]!);
    });
    const a = analyzeBacktest(f);
    const s = a.strategies.find((x) => x.strategyId === id)!;
    expect(s.spread.worst).toBeCloseTo((9 + 7 + 8 + 9) / 4, 10);
    expect(s.spread.best).toBeCloseTo((9 + 11 + 12 + 9) / 4, 10);
    expect(s.prize.observed).toEqual([1, 1, 0, 0, 0]);
    expect(s.prize.total).toBe(2);
    expect(s.prize.per100).toBeCloseTo((2 / 24) * 100, 10);
    expect(a.control?.strategyId).toBe("lotofacil.uniform_random");
    // chance band: exact random mean +/- z(99%) * (sd/sqrt 6) / sqrt(n)
    expect(a.chanceBand.low).toBeLessThan(9);
    expect(a.chanceBand.high).toBeGreaterThan(9);
    expect((a.chanceBand.high + a.chanceBand.low) / 2).toBeCloseTo(9, 10);
  });
  it("Mega-Sena prize levels are quadra, quina and sena", () => {
    const a = analyzeBacktest(makeFile("megasena", { contests: 10 }));
    expect(a.reference.prizeLevels).toEqual([4, 5, 6]);
    expect(a.reference.prizeChance).toBeCloseTo(0.00043524, 7);
  });
  it("user-facing strategy names equal the registry definitions names", async () => {
    const { LOTOFACIL_STRATEGIES } = await import("../../src/modules/lotofacil/strategies/definitions");
    const { MEGASENA_STRATEGIES } = await import("../../src/modules/megasena/strategies/definitions");
    const { STRATEGY_NAMES } = await import("../../src/app/pages/analise/format");
    for (const d of [...LOTOFACIL_STRATEGIES, ...MEGASENA_STRATEGIES]) expect(STRATEGY_NAMES[d.id]).toBe(d.name);
  });
});

const JARGON = [/intervalo de confiança/i, /\bIC\b/, /hipergeom/i, /bonferroni/i, /desvio/i, /funil/i, /p-valor/i, /significân/i, /amostra fina/i, /lotofacil\./, /megasena\./, /backtest/i];
const FORBIDDEN_EVERYWHERE = ["melhor estratégia", "melhores estratégias", "recomend", "mais acertou", "ranking", "roi", "lucro garantido", "vai sair"];

describe("AnalisePage (lay view)", () => {
  it("shows the short answer first, with the period dates, the three charts and the prospective-test card", async () => {
    renderPage();
    const answer = await screen.findByTestId("short-answer");
    expect(answer).toHaveTextContent("Em 60 sorteios passados");
    expect(answer).toHaveTextContent(/de \d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}/);
    expect(answer).toHaveTextContent(/em média (entre )?\d,\d{3}( e \d,\d{3})? pontos por jogo; ao acaso, 9,000/);
    expect(answer).toHaveTextContent("Nenhuma estratégia aumenta a chance de ganhar");
    const main = screen.getByTestId("main-view");
    expect(main.firstElementChild).toBe(answer);
    for (const id of ["media", "premios", "melhor-pior"]) expect(screen.getByTestId(`chart-${id}`)).toBeInTheDocument();
    expect(screen.getByTestId("chart-media")).toHaveTextContent("Aleatória distinta");
    expect(screen.getAllByText("Igual ao acaso")).toHaveLength(5);
    const ledger = screen.getByTestId("ledger-card");
    expect(ledger).toHaveTextContent("fim de dezembro de 2026");
    expect(ledger).toHaveTextContent("fim de janeiro de 2027");
    expect(ledger).toHaveTextContent("otimista");
    await waitFor(() => expect(ledger).toHaveTextContent(/\d+ de 30 sorteios registrados/));
    expect(within(ledger).getAllByRole("progressbar")).toHaveLength(2);
    expect(screen.getByTestId("analysis-disclaimer")).toHaveTextContent("não garantem nem preveem sorteios futuros");
    expect(screen.getByTestId("audit-footer")).toHaveTextContent("bt-lotofacil-51-110-abcdef012345");
  });

  it("Mega-Sena: the prize chart is a table of quadra/quina/sena with the too-rare message", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("short-answer");
    await user.click(screen.getByRole("button", { name: "Mega-Sena" }));
    await waitFor(() => expect(screen.getByTestId("short-answer")).toHaveTextContent(/acertos por jogo; ao acaso, 0,600/));
    expect(screen.getByTestId("short-answer")).toHaveTextContent("raros demais");
    const prizes = screen.getByTestId("chart-premios");
    expect(prizes).toHaveTextContent("Quadra");
    expect(prizes).toHaveTextContent("Quina");
    expect(prizes).toHaveTextContent("Sena");
    expect(prizes).toHaveTextContent("Ao acaso: esperado (normal: de A a B)");
    expect(within(prizes).getByTestId("chance-row")).toHaveTextContent("0,15 0–2"); // fixture: n = 360 tickets, quadra p = 0.000429, 99% exact range
    expect(within(prizes).getByRole("button", { name: /faixa normal do acaso na tabela/i })).toBeInTheDocument();
  });

  it("main view has no technical jargon (also in the open help balloons); the technical disclosure does", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("short-answer");
    const main = screen.getByTestId("main-view");
    const text = [main.textContent ?? "", screen.getByTestId("analysis-disclaimer").textContent ?? ""];
    for (const id of ["media", "premios", "melhor-pior"]) {
      const card = screen.getByTestId(`chart-${id}`);
      await user.click(within(card).getAllByRole("button", { name: /^Ajuda sobre/ })[0]!);
      const tip = within(card).getByRole("tooltip");
      expect((tip.textContent?.match(/[.!?](\s|$)/g) ?? []).length).toBeLessThanOrEqual(3); // at most 3 short sentences
      text.push(tip.textContent ?? "");
      await user.keyboard("{Escape}");
    }
    for (const t of text) for (const re of JARGON) expect(re.test(t), `jargon ${re} in: ${t.slice(0, 80)}`).toBe(false);

    expect(screen.queryByTestId("technical-details")).toBeNull(); // collapsed by default
    await user.click(screen.getByRole("button", { name: /Detalhes técnicos/ }));
    const tech = screen.getByTestId("technical-details");
    expect(tech).toHaveTextContent("Bonferroni");
    expect(tech).toHaveTextContent("hipergeométrica");
    expect(within(tech).getByRole("button", { name: "Exportar" })).toBeInTheDocument();
  });

  it("never uses ranking or recommendation wording, even with the technical details open, and has no generation link", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await screen.findByTestId("short-answer");
    await user.click(screen.getByRole("button", { name: /Detalhes técnicos/ }));
    const all = (container.textContent ?? "").toLowerCase();
    for (const w of FORBIDDEN_EVERYWHERE) expect(all.includes(w), `forbidden wording: ${w}`).toBe(false);
    expect(screen.queryByRole("link", { name: /gerar/i })).toBeNull();
  });

  it("uses a fixed, non-exaggerating axis for the average chart", async () => {
    renderPage();
    await screen.findByTestId("short-answer");
    const axis = within(screen.getByTestId("chart-media")).getAllByText(/^(8|9|10)$/);
    expect(axis.map((e) => e.textContent)).toEqual(["8", "9", "10"]);
  });

  it("flags a difference only under the adjusted rule, in plain words", async () => {
    serve({ lotofacil: makeFile("lotofacil", { contests: 200, override: { "lotofacil.rms_v2": 12 } }) });
    renderPage();
    const answer = await screen.findByTestId("short-answer");
    expect(answer).toHaveTextContent("RMS v2");
    expect(answer).toHaveTextContent("acima da variação normal do acaso");
    expect(screen.getByText("Acima do acaso")).toBeInTheDocument();
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
