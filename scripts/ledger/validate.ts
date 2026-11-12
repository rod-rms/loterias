/**
 * `npm run ledger:validate` (ANL-001): schema, 6 distinct sorted tickets of the right size and range, no duplicate
 * (modality, targetContest, strategyId), shard consistency, scores only for known entries, and APPEND-ONLY integrity
 * against git (the entries that existed at the base ref are unchanged and still the first ones of the file).
 * Runs through scripts/ledger/launch.mjs. Exit code 1 on any problem.
 *
 *   npm run ledger:validate [-- --base <git-ref>] [-- --ledger-dir <dir>]
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { ledgerEntriesFileSchema, ledgerScoresFileSchema } from "../../src/shared/lib/ledgerSchemas";
import { entryKey, scoreKey } from "./core";

export interface ValidateInput {
  ledgerDir: string;
  /** Repo-relative POSIX path -> content at the base ref; null = file did not exist there; undefined = no baseline available. */
  readBase?: (relPath: string) => string | null | undefined;
  /** Repo-relative POSIX path prefix of ledgerDir (for readBase). */
  relPrefix?: string;
}

const MODALITIES = ["lotofacil", "megasena"] as const;

export function validateLedger(input: ValidateInput): { errors: string[]; notes: string[]; entries: number; scores: number } {
  const errors: string[] = [];
  const notes: string[] = [];
  let entryCount = 0;
  let scoreCount = 0;
  const seenKeys = new Set<string>();
  const known = new Set<string>();
  const rel = (p: string) => `${input.relPrefix ?? "public/data/ledger"}/${p}`;
  const parsedScores: { relPath: string; modality: string; file: ReturnType<typeof ledgerScoresFileSchema.parse> }[] = [];

  for (const modality of MODALITIES) {
    const dir = path.join(input.ledgerDir, modality);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const relPath = rel(`${modality}/${name}`);
      const em = /^entries-(\d{4}-\d{2})\.json$/.exec(name);
      const sm = /^scores-(\d{4}-\d{2})\.json$/.exec(name);
      if (!em && !sm) {
        errors.push(name.includes(".tmp-") ? `${relPath}: leftover temporary file` : `${relPath}: unexpected file`);
        continue;
      }
      let raw: unknown;
      try {
        raw = JSON.parse(readFileSync(full, "utf8"));
      } catch (e) {
        errors.push(`${relPath}: invalid JSON (${e instanceof Error ? e.message : String(e)})`);
        continue;
      }
      if (em) {
        const parsed = ledgerEntriesFileSchema.safeParse(raw);
        if (!parsed.success) {
          errors.push(`${relPath}: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
          continue;
        }
        const file = parsed.data;
        if (file.modality !== modality || file.month !== em[1]) errors.push(`${relPath}: modality/month do not match the file name`);
        for (const e of file.entries) {
          entryCount += 1;
          const key = entryKey(e);
          if (seenKeys.has(key)) errors.push(`${relPath}: duplicate entry ${key}`);
          seenKeys.add(key);
          known.add(`${e.targetContest}:${e.strategyId}:${e.strategyVersion}:${modality}`);
          if (e.modality !== modality) errors.push(`${relPath}: entry ${key} has a different modality than its folder`);
          if (e.estimatedDrawAt.slice(0, 7) !== file.month) errors.push(`${relPath}: entry ${key} belongs to month ${e.estimatedDrawAt.slice(0, 7)}`);
          if (e.valid && e.datasetLatestContest !== e.targetContest - 1) errors.push(`${relPath}: valid entry ${key} has datasetLatestContest ${e.datasetLatestContest} != target-1`);
          if (e.valid && Date.parse(e.generatedAt) >= Date.parse(e.cutoffAt)) errors.push(`${relPath}: valid entry ${key} was generated at/after its cutoff`);
        }
        // Append-only against the base ref.
        const base = input.readBase?.(relPath);
        if (base === undefined || base === null) continue; // no baseline, or a new shard: nothing to compare
        const baseParsed = ledgerEntriesFileSchema.safeParse(JSON.parse(base));
        if (!baseParsed.success) {
          errors.push(`${relPath}: the base version is not a valid entries file`);
          continue;
        }
        const before = baseParsed.data.entries;
        if (file.entries.length < before.length) errors.push(`${relPath}: entries were removed (${before.length} -> ${file.entries.length})`);
        before.forEach((old, i) => {
          if (JSON.stringify(file.entries[i]) !== JSON.stringify(old)) errors.push(`${relPath}: entry #${i} (${entryKey(old)}) was modified or reordered`);
        });
      } else if (sm) {
        const parsed = ledgerScoresFileSchema.safeParse(raw);
        if (!parsed.success) {
          errors.push(`${relPath}: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
          continue;
        }
        const file = parsed.data;
        if (file.modality !== modality || file.month !== sm[1]) errors.push(`${relPath}: modality/month do not match the file name`);
        const keys = new Set<string>();
        for (const s of file.scores) {
          scoreCount += 1;
          const k = scoreKey(s);
          if (keys.has(k)) errors.push(`${relPath}: duplicate score ${k}`);
          keys.add(k);
          if (s.valid && !s.hitsPerTicket) errors.push(`${relPath}: valid score ${k} without hits`);
          if (!s.valid && s.hitsPerTicket) errors.push(`${relPath}: invalid entry ${k} must not carry hits`);
          if (s.hitsPerTicket && s.bestHits !== Math.max(...s.hitsPerTicket)) errors.push(`${relPath}: score ${k} bestHits does not match hitsPerTicket`);
        }
        parsedScores.push({ relPath, modality, file });
      }
    }
  }
  // Scores must refer to stored entries (checked once all entries are known).
  for (const { relPath, modality, file } of parsedScores) {
    for (const s of file.scores) if (!known.has(`${s.targetContest}:${s.strategyId}:${s.strategyVersion}:${modality}`)) errors.push(`${relPath}: score ${scoreKey(s)} has no matching entry`);
  }
  if (input.readBase === undefined) notes.push("no git baseline available: append-only check skipped");
  else if (entryCount === 0) notes.push("no entries yet");
  return { errors, notes, entries: entryCount, scores: scoreCount };
}

function gitBaseReader(baseRef: string): (relPath: string) => string | null {
  return (relPath) => {
    try {
      return execFileSync("git", ["show", `${baseRef}:${relPath}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
    } catch {
      return null;
    }
  };
}

function refExists(ref: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function resolveBaseRef(explicit: string | undefined): string | undefined {
  if (explicit) return refExists(explicit) ? explicit : undefined;
  let dirty = false;
  try {
    dirty = execFileSync("git", ["status", "--porcelain", "--", "public/data/ledger"], { encoding: "utf8" }).trim().length > 0;
  } catch {
    dirty = false;
  }
  if (dirty) return "HEAD";
  return refExists("HEAD~1") ? "HEAD~1" : undefined;
}

// CLI (only when executed through the launcher).
if (process.env.LEDGER_VALIDATE_CLI === "1") {
  const arg = (flag: string) => {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const ledgerDir = path.resolve(arg("--ledger-dir") ?? "public/data/ledger");
  const baseRef = resolveBaseRef(arg("--base"));
  const result = validateLedger({ ledgerDir, readBase: baseRef ? gitBaseReader(baseRef) : undefined });
  console.log(`ledger:validate: ${result.entries} entries, ${result.scores} scores${baseRef ? `, append-only vs ${baseRef}` : ""}`);
  for (const n of result.notes) console.log(`  note: ${n}`);
  for (const e of result.errors) console.error(`  ERROR: ${e}`);
  process.exit(result.errors.length ? 1 : 0);
}
