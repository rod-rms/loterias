import { z } from "zod";

export const modalitySchema = z.enum(["lotofacil", "megasena"]);

export const lotteryDrawSchema = z.object({
  contest: z.number().int().positive(),
  drawDate: z.string().min(1),
  numbers: z.array(z.number().int().positive()).min(1),
});

export const lotteryDatasetSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    modality: modalitySchema,
    source: z.string().min(1),
    importedAt: z.string().min(1),
    latestContest: z.number().int().nonnegative(),
    draws: z.array(lotteryDrawSchema),
  })
  .superRefine((dataset, ctx) => {
    const expectedSize = dataset.modality === "lotofacil" ? 15 : 6;
    const maxNumber = dataset.modality === "lotofacil" ? 25 : 60;
    const seenContests = new Set<number>();
    for (let i = 0; i < dataset.draws.length; i += 1) {
      const draw = dataset.draws[i]!;
      if (seenContests.has(draw.contest)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate contest ${draw.contest}`, path: ["draws", i] });
      }
      seenContests.add(draw.contest);
      if (draw.numbers.length !== expectedSize) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `contest ${draw.contest} must have ${expectedSize} numbers`, path: ["draws", i, "numbers"] });
      }
      if (new Set(draw.numbers).size !== draw.numbers.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `contest ${draw.contest} has duplicate numbers`, path: ["draws", i, "numbers"] });
      }
      for (const n of draw.numbers) {
        if (n < 1 || n > maxNumber) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `contest ${draw.contest} has number ${n} out of range 1..${maxNumber}`, path: ["draws", i, "numbers"] });
        }
      }
      if (i > 0 && draw.contest <= dataset.draws[i - 1]!.contest) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "draws must be sorted by ascending contest", path: ["draws", i] });
      }
    }
  });

export const gameConfigEntrySchema = z.object({
  simpleTicketSize: z.number().int().positive(),
  ticketCostBRL: z.number().positive(),
  source: z.string().min(1),
  referenceDate: z.string().min(1),
  configVersion: z.string().min(1),
});

export const gameConfigSchema = z.object({
  schemaVersion: z.number().int().positive(),
  updatedAt: z.string().min(1),
  lotofacil: gameConfigEntrySchema,
  megasena: gameConfigEntrySchema,
});

export const checkedResultSchema = z.object({
  contest: z.number().int().positive(),
  numbers: z.array(z.number().int().positive()),
  source: z.string().optional(),
  checkedAt: z.string().min(1),
  hitsPerTicket: z.array(z.number().int().nonnegative()),
  prizeGrossBRL: z.number().optional(),
});

export const savedPortfolioSchema = z.object({
  schemaVersion: z.number().int().positive(),
  id: z.string().min(1),
  modality: modalitySchema,
  contest: z.number().int().positive().optional(),
  strategyId: z.string().min(1),
  strategyVersion: z.string().min(1),
  engineVersion: z.string().min(1),
  createdAt: z.string().min(1),
  dataset: z
    .object({
      latestContest: z.number().int().nonnegative(),
      importedAt: z.string(),
      source: z.string(),
    })
    .optional(),
  price: z.object({
    ticketCostBRL: z.number().positive(),
    referenceDate: z.string(),
    source: z.string(),
  }),
  seed: z.union([z.string(), z.number()]),
  parameters: z.unknown(),
  tickets: z.array(z.array(z.number().int().positive())),
  metrics: z.unknown(),
  audit: z.unknown(),
  markedAsBet: z.boolean(),
  notes: z.string().optional(),
  checkedResult: checkedResultSchema.optional(),
});

export const loteriasBackupSchema = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string().min(1),
  portfolios: z.array(savedPortfolioSchema),
  preferences: z.record(z.unknown()).optional(),
});

export type ParsedLotteryDataset = z.infer<typeof lotteryDatasetSchema>;
export type ParsedGameConfig = z.infer<typeof gameConfigSchema>;
export type ParsedBackup = z.infer<typeof loteriasBackupSchema>;
