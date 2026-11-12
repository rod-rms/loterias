import { z } from "zod";

/**
 * Offline historical backtest (ANL-002, source A of the future "Análise de resultados" page).
 * A screening tool, NOT evidence: the strategies were designed by people who had already seen this history.
 * Descriptive only (DEC-013, DEC-025).
 */

export const BACKTEST_SCHEMA_VERSION = 1;
export const BACKTEST_TICKETS_PER_STRATEGY = 6;
export const BACKTEST_SEED_TEMPLATE = "backtest:{modality}:{contest}:{strategyId}:{strategyVersion}";
/** First contest a backtest may simulate: rms_v2 uses the 50 contests before the target (tie-break window). */
export const BACKTEST_MIN_TARGET_CONTEST = 51;

export const TICKET_SIZE = { lotofacil: 15, megasena: 6 } as const;

const modalitySchema = z.enum(["lotofacil", "megasena"]);
const isoUtc = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, "expected a UTC ISO timestamp");
const sha256 = z.string().regex(/^[0-9a-f]{64}$/, "expected a lowercase hex SHA-256");

export const backtestRowSchema = z.object({
  contest: z.number().int().positive(),
  strategyId: z.string().min(1),
  hitsPerTicket: z.array(z.number().int().nonnegative()).length(BACKTEST_TICKETS_PER_STRATEGY),
  bestHits: z.number().int().nonnegative(),
});

export const backtestFileSchema = z
  .object({
    backtestSchemaVersion: z.literal(BACKTEST_SCHEMA_VERSION),
    modality: modalitySchema,
    runId: z.string().min(1),
    codeCommit: z.string().min(1),
    generatedAt: isoUtc,
    parameters: z.object({
      ticketsPerStrategy: z.literal(BACKTEST_TICKETS_PER_STRATEGY),
      inputMode: z.literal("quantity"),
      qualityPreset: z.literal("balanced"),
      seedTemplate: z.string().min(1),
    }),
    strategies: z.array(z.object({ id: z.string().min(1), strategyVersion: z.string().min(1), algorithmVersion: z.string().min(1) })).min(1),
    range: z.object({ from: z.number().int().positive(), to: z.number().int().positive(), contestsCount: z.number().int().positive() }),
    datasetSha256: sha256,
    rows: z.array(backtestRowSchema),
    caveats: z.array(z.string().min(1)).min(1),
  })
  .superRefine((file, ctx) => {
    const add = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    const size = TICKET_SIZE[file.modality];
    const ids = file.strategies.map((s) => s.id);
    if (new Set(ids).size !== ids.length) add("duplicate strategy id in `strategies`", ["strategies"]);
    const { from, to, contestsCount } = file.range;
    if (to < from) add("range.to < range.from", ["range"]);
    if (contestsCount !== to - from + 1) add("range.contestsCount must equal to - from + 1", ["range", "contestsCount"]);
    if (from < BACKTEST_MIN_TARGET_CONTEST) add(`range.from must be >= ${BACKTEST_MIN_TARGET_CONTEST} (history required by the strategies)`, ["range", "from"]);
    if (file.rows.length !== contestsCount * ids.length) add(`expected ${contestsCount * ids.length} rows (contests x strategies), found ${file.rows.length}`, ["rows"]);

    const seen = new Set<string>();
    const idSet = new Set(ids);
    file.rows.forEach((row, i) => {
      const key = `${row.contest}:${row.strategyId}`;
      if (seen.has(key)) add(`duplicate row ${key}`, ["rows", i]);
      seen.add(key);
      if (!idSet.has(row.strategyId)) add(`row strategy ${row.strategyId} is not listed in \`strategies\``, ["rows", i, "strategyId"]);
      if (row.contest < from || row.contest > to) add(`row contest ${row.contest} is outside the range`, ["rows", i, "contest"]);
      if (row.hitsPerTicket.some((h) => h > size)) add(`hits cannot exceed the ticket size (${size})`, ["rows", i, "hitsPerTicket"]);
      if (row.bestHits !== Math.max(...row.hitsPerTicket)) add("bestHits must equal the maximum of hitsPerTicket", ["rows", i, "bestHits"]);
    });
    // Every contest of the range must have a row for every strategy (contiguous, no gaps).
    for (let c = from; c <= to; c += 1) {
      for (const id of ids) {
        if (!seen.has(`${c}:${id}`)) {
          add(`missing row ${c}:${id}`, ["rows"]);
          return;
        }
      }
    }
  });

export type BacktestRow = z.infer<typeof backtestRowSchema>;
export type BacktestFile = z.infer<typeof backtestFileSchema>;

/** Plain-language caveats that every artifact carries (also repeated in the PR description). */
export const BACKTEST_CAVEATS: readonly string[] = [
  "As estratégias foram desenhadas e ajustadas por pessoas que já conheciam este histórico. \"Sem look-ahead\" protege a janela de dados de cada sorteio simulado, não as escolhas de desenho. O backtest tende a ser otimista para as estratégias desenhadas e é uma ferramenta de triagem, não evidência; o ledger prospectivo é a fonte sem viés.",
  "Os jogos de uma mesma carteira são correlacionados; os concursos são as unidades independentes. Qualquer intervalo deve agrupar por concurso.",
  "O backtest avalia o código atual das estratégias sobre dados passados (não reproduz versões antigas). Uma nova strategyVersion inicia uma nova série.",
  "Resultado descritivo: não prevê nem garante nada sobre sorteios futuros.",
];
