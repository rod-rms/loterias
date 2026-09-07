#!/usr/bin/env node
/**
 * Structural validation for the versioned lottery datasets, used by CI/the
 * data-update workflow before allowing a commit. Mirrors the checks in
 * src/shared/lib/schemas.ts (kept dependency-free here so it can run as a
 * plain Node script without a TypeScript build step).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

const MODALITIES = {
  lotofacil: { ticketSize: 15, maxNumber: 25, file: path.join(ROOT, "public/data/lotofacil/results.json") },
  megasena: { ticketSize: 6, maxNumber: 60, file: path.join(ROOT, "public/data/megasena/results.json") },
};

let failed = false;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

for (const [modality, cfg] of Object.entries(MODALITIES)) {
  const dataset = JSON.parse(readFileSync(cfg.file, "utf8"));
  if (dataset.modality !== modality) fail(`${modality}: dataset.modality mismatch (${dataset.modality})`);
  if (!Array.isArray(dataset.draws) || dataset.draws.length === 0) fail(`${modality}: draws must be a non-empty array`);

  const seenContests = new Set();
  let previousContest = 0;
  for (const draw of dataset.draws) {
    if (!Number.isInteger(draw.contest) || draw.contest <= 0) fail(`${modality}: invalid contest number ${draw.contest}`);
    if (seenContests.has(draw.contest)) fail(`${modality}: duplicate contest ${draw.contest}`);
    seenContests.add(draw.contest);
    if (draw.contest <= previousContest) fail(`${modality}: contests must be strictly ascending (${draw.contest} after ${previousContest})`);
    previousContest = draw.contest;

    if (!Array.isArray(draw.numbers) || draw.numbers.length !== cfg.ticketSize) {
      fail(`${modality}: contest ${draw.contest} must have exactly ${cfg.ticketSize} numbers`);
    } else {
      const unique = new Set(draw.numbers);
      if (unique.size !== draw.numbers.length) fail(`${modality}: contest ${draw.contest} has duplicate numbers`);
      for (const n of draw.numbers) {
        if (!Number.isInteger(n) || n < 1 || n > cfg.maxNumber) {
          fail(`${modality}: contest ${draw.contest} has number ${n} out of range 1..${cfg.maxNumber}`);
        }
      }
    }
  }

  if (dataset.latestContest !== dataset.draws.at(-1)?.contest) {
    fail(`${modality}: latestContest (${dataset.latestContest}) does not match the last draw's contest (${dataset.draws.at(-1)?.contest})`);
  }

  console.log(`OK: ${modality} dataset has ${dataset.draws.length} draws, latestContest=${dataset.latestContest}`);
}

process.exit(failed ? 1 : 0);
