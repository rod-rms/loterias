import { shuffleInPlace, type RandomSource } from "./prng";

/**
 * Degree-constrained greedy assignment (Havel-Hakimi style): assigns pool
 * members to buckets (e.g. games/tickets) such that each bucket receives
 * exactly its quota from the pool, and each pool member is used exactly its
 * target exposure count (a "high" or "low" value). Returns null if the
 * greedy assignment gets stuck; callers should retry with a fresh shuffle.
 *
 * Generic across modalities: used by both Lotofacil (RMS pools,
 * diversification) and Mega-Sena (diversification) to realize the same kind
 * of balanced-exposure combinatorial design.
 */
export function assignPoolToBuckets(
  poolMembers: number[],
  quotasPerBucket: number[],
  highExposureCount: number,
  random: RandomSource,
  highExposureValue: number,
  lowExposureValue: number,
): number[][] | null {
  const shuffled = shuffleInPlace([...poolMembers], random);
  const highSet = new Set(shuffled.slice(0, highExposureCount));
  return assignPoolToBucketsWithExposureMap(poolMembers, quotasPerBucket, highSet, random, highExposureValue, lowExposureValue);
}

/**
 * Same greedy assignment as {@link assignPoolToBuckets}, but the caller
 * decides explicitly WHICH pool members get the high exposure value instead
 * of a random count-based split. Needed whenever downstream aggregate
 * properties of the high-exposure set (e.g. how many are even, or fall in a
 * numeric sub-range) must hit an exact target — a swap-based local search
 * over bucket membership can never change those aggregate sums, because it
 * only relocates members between buckets without changing any member's
 * total exposure count.
 */
export function assignPoolToBucketsWithExposureMap(
  poolMembers: number[],
  quotasPerBucket: number[],
  highExposureSet: ReadonlySet<number>,
  random: RandomSource,
  highExposureValue: number,
  lowExposureValue: number,
): number[][] | null {
  const shuffled = shuffleInPlace([...poolMembers], random);
  const remainingExposure = new Map<number, number>();
  shuffled.forEach((n) => remainingExposure.set(n, highExposureSet.has(n) ? highExposureValue : lowExposureValue));

  const bucketOrder = shuffleInPlace(quotasPerBucket.map((_, i) => i), random);
  const bucketMembers: number[][] = quotasPerBucket.map(() => []);
  const remainingQuota = [...quotasPerBucket];

  for (const bi of bucketOrder) {
    for (let slot = 0; slot < quotasPerBucket[bi]!; slot += 1) {
      const candidates = shuffled
        .filter((n) => !bucketMembers[bi]!.includes(n) && (remainingExposure.get(n) ?? 0) > 0)
        .sort((a, b) => (remainingExposure.get(b) ?? 0) - (remainingExposure.get(a) ?? 0));
      const pick = candidates[0];
      if (pick === undefined) return null;
      bucketMembers[bi]!.push(pick);
      remainingExposure.set(pick, (remainingExposure.get(pick) ?? 0) - 1);
      remainingQuota[bi]! -= 1;
    }
  }
  if (remainingQuota.some((q) => q !== 0)) return null;
  if (Array.from(remainingExposure.values()).some((v) => v !== 0)) return null;
  return bucketMembers;
}

/** Splits `poolSize` items into a "high" and "low" exposure count summing to `totalExposure`. */
export function splitExposureCounts(poolSize: number, totalExposure: number, lowValue: number, highValue: number): { highCount: number; lowCount: number } {
  const highCount = Math.round((totalExposure - poolSize * lowValue) / (highValue - lowValue));
  return { highCount, lowCount: poolSize - highCount };
}
