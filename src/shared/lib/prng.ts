/**
 * Deterministic seeded PRNG (xmur3 seed hash + mulberry32 generator).
 * Generic utility with no lottery-specific semantics, shared across modules.
 */
export type RandomSource = () => number;

function xmur3(text: string): () => number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRandom(seed: string | number): RandomSource {
  const seedFactory = xmur3(String(seed));
  return mulberry32(seedFactory());
}

export function randomInt(random: RandomSource, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(random() * (maxInclusive - minInclusive + 1));
}

export function shuffleInPlace<T>(values: T[], random: RandomSource): T[] {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = randomInt(random, 0, i);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
