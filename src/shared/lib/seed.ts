/**
 * Shared seed utilities: generate, serialize, and derive deterministic
 * sub-seeds. The actual PRNG algorithm used for generation stays in each
 * domain (lotofacil/megasena), this module only standardizes seed handling.
 */

export function generateRandomSeed(): string {
  const bytes = new Uint32Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 0xffffffff);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(8, "0")).join("");
}

export function resolveSeed(userSeed: string | number | undefined | null): string | number {
  if (userSeed === undefined || userSeed === null || userSeed === "") {
    return generateRandomSeed();
  }
  return userSeed;
}

export function serializeSeed(seed: string | number): string {
  return String(seed);
}

/** Deterministic sub-seed derived from a parent seed and a namespace/tag. */
export function deriveSubSeed(parentSeed: string | number, tag: string): string {
  return `${serializeSeed(parentSeed)}:${tag}`;
}

/** Stable seed used for RMS v2 generation, per contest and algorithm version. */
export function rmsSeed(contest: number, algorithmVersion: string): string {
  return `rms-v2:${contest}:${algorithmVersion}`;
}
