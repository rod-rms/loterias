import { z } from "zod";

/**
 * Prospective ledger (ANL-001, DEC-026, docs/analysis/PROSPECTIVE_LEDGER_PROTOCOL.md).
 * Entries are immutable, append-only generation records; scores are derived and may be recomputed.
 */

export const LEDGER_SCHEMA_VERSION = 1;
export const LEDGER_TICKETS_PER_ENTRY = 6;

const TICKET_RULES = {
  lotofacil: { size: 15, max: 25 },
  megasena: { size: 6, max: 60 },
} as const;

const modalitySchema = z.enum(["lotofacil", "megasena"]);
const isoUtc = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, "expected a UTC ISO timestamp");
const sha256 = z.string().regex(/^[0-9a-f]{64}$/, "expected a lowercase hex SHA-256");

export const ledgerEntrySchema = z
  .object({
    ledgerSchemaVersion: z.literal(LEDGER_SCHEMA_VERSION),
    modality: modalitySchema,
    targetContest: z.number().int().positive(),
    strategyId: z.string().min(1),
    strategyVersion: z.string().min(1),
    algorithmVersion: z.string().min(1),
    seed: z.string().min(1),
    qualityPreset: z.enum(["fast", "balanced", "deep"]),
    tickets: z.array(z.array(z.number().int().positive())).length(LEDGER_TICKETS_PER_ENTRY),
    generatedAt: isoUtc,
    datasetLatestContest: z.number().int().nonnegative(),
    datasetSha256: sha256,
    estimatedDrawAt: isoUtc,
    cutoffAt: isoUtc,
    valid: z.boolean(),
    invalidReason: z.string().min(1).optional(),
    codeCommit: z.string().min(1),
    /** A correction is a NEW entry that references the old one; entries are never edited. */
    supersedes: z.string().min(1).optional(),
  })
  .superRefine((entry, ctx) => {
    const rule = TICKET_RULES[entry.modality];
    const seen = new Set<string>();
    entry.tickets.forEach((ticket, i) => {
      const bad = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tickets", i], message });
      if (ticket.length !== rule.size) return bad(`ticket must have ${rule.size} numbers`);
      if (new Set(ticket).size !== ticket.length) return bad("ticket has duplicate numbers");
      if (ticket.some((n) => n < 1 || n > rule.max)) return bad(`numbers must be within 1..${rule.max}`);
      if (ticket.some((n, k) => k > 0 && n < ticket[k - 1]!)) return bad("ticket must be sorted ascending");
      const key = ticket.join(",");
      if (seen.has(key)) return bad("duplicate ticket inside the entry");
      seen.add(key);
    });
    if (entry.valid && entry.invalidReason) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["invalidReason"], message: "a valid entry must not carry an invalidReason" });
    if (!entry.valid && !entry.invalidReason) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["invalidReason"], message: "an invalid entry needs an invalidReason" });
  });

export const ledgerEntriesFileSchema = z.object({
  ledgerSchemaVersion: z.literal(LEDGER_SCHEMA_VERSION),
  modality: modalitySchema,
  /** Month of the target draw date, "YYYY-MM". */
  month: z.string().regex(/^\d{4}-\d{2}$/),
  entries: z.array(ledgerEntrySchema),
});

export const ledgerScoreSchema = z.object({
  targetContest: z.number().int().positive(),
  strategyId: z.string().min(1),
  strategyVersion: z.string().min(1),
  valid: z.boolean(),
  invalidReason: z.string().min(1).optional(),
  /** Present only for valid entries whose result is in the dataset. */
  hitsPerTicket: z.array(z.number().int().nonnegative()).length(LEDGER_TICKETS_PER_ENTRY).optional(),
  bestHits: z.number().int().nonnegative().optional(),
  scoredAt: isoUtc,
  resultNumbersSha256: sha256.optional(),
});

export const ledgerScoresFileSchema = z.object({
  ledgerSchemaVersion: z.literal(LEDGER_SCHEMA_VERSION),
  modality: modalitySchema,
  month: z.string().regex(/^\d{4}-\d{2}$/),
  scores: z.array(ledgerScoreSchema),
});

export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;
export type LedgerEntriesFile = z.infer<typeof ledgerEntriesFileSchema>;
export type LedgerScore = z.infer<typeof ledgerScoreSchema>;
export type LedgerScoresFile = z.infer<typeof ledgerScoresFileSchema>;
