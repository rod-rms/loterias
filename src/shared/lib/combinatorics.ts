/** Exact integer binomial coefficient using bigint. Shared math utility. */
export function comb(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  const kk = Math.min(k, n - k);
  let result = 1n;
  for (let i = 0; i < kk; i += 1) {
    result = (result * BigInt(n - i)) / BigInt(i + 1);
  }
  return result;
}

/**
 * Exact mean probability that a uniformly selected portfolio of N distinct
 * elementary tickets from a universe of M possible draws hits at least one
 * of K favourable draws for a fixed target:
 *   1 - C(M-K, N) / C(M, N)
 * Computed via bigint ratio for exactness where practical, falling back to
 * a numerically stable floating point evaluation for very large inputs.
 */
export function uniformAtLeastOneProbability(totalDraws: number, favourableForOneTicket: number, numberOfTickets: number): number {
  const M = totalDraws;
  const K = favourableForOneTicket;
  const N = numberOfTickets;
  if (N <= 0) return 0;
  if (N >= M) return 1;
  if (K <= 0) return 0;
  if (M - K < N) return 1;

  // log(C(M-K,N) / C(M,N)) = sum_{i=0}^{N-1} log((M-K-i)/(M-i))
  let logRatio = 0;
  for (let i = 0; i < N; i += 1) {
    logRatio += Math.log(M - K - i) - Math.log(M - i);
  }
  return -Math.expm1(logRatio);
}
