/**
 * Validator of the backtest artifacts (ANL-002): schema + contiguity + row counts. It never runs the engine, so it is
 * cheap enough for CI.   npm run backtest:validate
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { backtestFileSchema } from "../../src/shared/lib/backtestSchemas";

export interface BacktestValidation {
  ok: boolean;
  checked: string[];
  errors: string[];
}

export function validateBacktest(root: string): BacktestValidation {
  const out: BacktestValidation = { ok: true, checked: [], errors: [] };
  for (const modality of ["lotofacil", "megasena"] as const) {
    const file = path.join(root, modality, "backtest.json");
    if (!existsSync(file)) continue;
    out.checked.push(`${modality}/backtest.json`);
    try {
      const parsed = backtestFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
      if (!parsed.success) out.errors.push(`${modality}: ${parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
      else if (parsed.data.modality !== modality) out.errors.push(`${modality}: file declares modality ${parsed.data.modality}`);
    } catch (err) {
      out.errors.push(`${modality}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  out.ok = out.errors.length === 0;
  return out;
}

if (process.env.BACKTEST_VALIDATE_CLI === "1") {
  const res = validateBacktest(path.resolve("public/data/backtest"));
  if (!res.ok) {
    console.error(`backtest:validate FAILED\n- ${res.errors.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`backtest:validate: ${res.checked.length} artifact(s) ok${res.checked.length === 0 ? " (none committed yet)" : ""}`);
}
