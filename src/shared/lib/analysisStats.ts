/**
 * Descriptive statistics for the "Análise de resultados" page (ANL-003). Pure TypeScript, no I/O.
 *
 * Method choices (documented on the page and in the PR):
 *  - The independent unit is the CONTEST, not the ticket: the 6 tickets of one portfolio share the same draw, so they
 *    are correlated. Every interval below is computed over per-contest values (e.g. the mean hits of the 6 tickets).
 *  - Means: Student-t interval over the per-contest values (hand-verifiable; n is in the hundreds).
 *  - Rates of rare events (>=3 hits in Mega-Sena is ~1% of tickets): seeded percentile bootstrap over contests, because a
 *    t-interval can leave [0,1] and is poor for skewed data.
 *  - Multiple comparisons: five strategies are compared with the random reference on ONE primary metric (mean hits per
 *    ticket). A "detectable difference" marker requires the Bonferroni-adjusted interval (level 1 - 0.05/5) to exclude the
 *    reference. The other metrics show 95% intervals but never carry a marker.
 *  - Random reference: exact (hypergeometric); under a random portfolio the 6 ticket hit counts are i.i.d. with that
 *    distribution (independent of the draw by symmetry), so the per-contest portfolio mean has exactly sd = sd / sqrt(6).
 *    The cumulative-difference funnel is therefore analytic, not simulated.
 * Descriptive only: nothing here predicts or recommends (DEC-013, DEC-025).
 */
import { createSeededRandom } from "./prng";

export const mean = (v: readonly number[]): number => v.reduce((a, b) => a + b, 0) / v.length;

export function sampleVariance(v: readonly number[]): number {
  if (v.length < 2) return 0;
  const m = mean(v);
  return v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1);
}

// ---- special functions -------------------------------------------------------------------------------------------

function logGamma(x: number): number {
  const c = [76.1800917294715, -86.5053203294168, 24.0140982408309, -1.23173957245015, 0.001208650973866179, -0.000005395239384953];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const coef of c) ser += coef / (y += 1);
  return -tmp + Math.log((Math.sqrt(2 * Math.PI) * ser) / x);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const tiny = 1e-30;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return h;
}

/** Regularized incomplete beta function I_x(a, b). */
function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (front * betaContinuedFraction(a, b, x)) / a : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** CDF of Student's t with `df` degrees of freedom. */
export function tCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const tail = 0.5 * regularizedBeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}

/** Quantile of Student's t (bisection on the CDF). */
export function tQuantile(p: number, df: number): number {
  if (!(p > 0 && p < 1)) throw new Error("p must be in (0, 1)");
  if (p === 0.5) return 0;
  let lo = -1000;
  let hi = 1000;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (tCdf(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Quantile of the standard normal (Acklam's rational approximation, relative error < 1.2e-9). */
export function normalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) throw new Error("p must be in (0, 1)");
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p > 1 - pLow) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

// ---- intervals -------------------------------------------------------------------------------------------------

export interface Interval {
  /** Number of independent units (contests). */
  n: number;
  mean: number;
  sd: number;
  low: number;
  high: number;
  /** Two-sided coverage, e.g. 0.95. */
  level: number;
  method: "t" | "bootstrap";
}

/** Two-sided t critical value for coverage `level` with n - 1 degrees of freedom. */
export const tCritical = (df: number, level: number): number => tQuantile(1 - (1 - level) / 2, df);

/** Bonferroni-adjusted coverage for a family of `m` comparisons (level 0.95, m 5 -> 0.99). */
export const bonferroniLevel = (level: number, m: number): number => 1 - (1 - level) / m;

/** Student-t interval for the mean of per-contest values. n < 2 gives a degenerate interval (low = high = mean). */
export function meanInterval(values: readonly number[], level = 0.95): Interval {
  const n = values.length;
  const m = mean(values);
  const sd = Math.sqrt(sampleVariance(values));
  if (n < 2) return { n, mean: m, sd, low: m, high: m, level, method: "t" };
  const half = tCritical(n - 1, level) * (sd / Math.sqrt(n));
  return { n, mean: m, sd, low: m - half, high: m + half, level, method: "t" };
}

/** Seeded percentile bootstrap (resampling CONTESTS with replacement) for the mean of per-contest values. */
export function bootstrapMeanInterval(values: readonly number[], seed: string, level = 0.95, resamples = 2000): Interval {
  const n = values.length;
  const m = mean(values);
  const sd = Math.sqrt(sampleVariance(values));
  if (n < 2) return { n, mean: m, sd, low: m, high: m, level, method: "bootstrap" };
  const random = createSeededRandom(seed);
  const means = new Array<number>(resamples);
  for (let b = 0; b < resamples; b += 1) {
    let s = 0;
    for (let i = 0; i < n; i += 1) s += values[Math.floor(random() * n)]!;
    means[b] = s / n;
  }
  means.sort((x, y) => x - y);
  const alpha = (1 - level) / 2;
  const at = (q: number) => means[Math.min(resamples - 1, Math.max(0, Math.floor(q * resamples)))]!;
  return { n, mean: m, sd, low: at(alpha), high: at(1 - alpha), level, method: "bootstrap" };
}

/** True when the reference value lies outside the interval, i.e. the difference exceeds the declared uncertainty. */
export const excludesReference = (interval: Pick<Interval, "low" | "high">, reference: number): boolean => reference < interval.low || reference > interval.high;

// ---- random reference ------------------------------------------------------------------------------------------

/** E[max of k i.i.d. draws] from a pmf over 0..pmf.length-1: sum h (F(h)^k - F(h-1)^k). */
export function expectedMaxOfK(pmf: readonly number[], k: number): number {
  let cumulative = 0;
  let previousPower = 0;
  let expected = 0;
  for (let h = 0; h < pmf.length; h += 1) {
    cumulative += pmf[h]!;
    const power = Math.min(1, cumulative) ** k;
    expected += h * (power - previousPower);
    previousPower = power;
  }
  return expected;
}

/** Cumulative sum of (value - reference): the running difference from the expected total under the random reference. */
export function cumulativeDifference(values: readonly number[], reference: number): number[] {
  let s = 0;
  return values.map((v) => (s += v - reference));
}

/** Half-width of the variation funnel after k contests: z * sd * sqrt(k), where sd is the per-contest standard deviation under chance. */
export const funnelHalfWidth = (k: number, perContestSd: number, z: number): number => z * perContestSd * Math.sqrt(k);

/**
 * Exact central range [low, high] of a Binomial(n, p) count that chance alone produces at two-sided coverage `level`:
 * low = smallest k with P(X <= k) >= alpha/2, high = smallest k with P(X <= k) >= 1 - alpha/2 (so coverage is at least `level`).
 * Used for the count tables of the lay view (DEC-025a). pmf by the stable recurrence from P(X = 0).
 */
export function binomialRange(n: number, p: number, level: number): { low: number; high: number } {
  if (n <= 0 || p <= 0) return { low: 0, high: 0 };
  if (p >= 1) return { low: n, high: n };
  const alpha = 1 - level;
  let pmf = Math.exp(n * Math.log1p(-p));
  let cdf = pmf;
  let low = cdf >= alpha / 2 ? 0 : -1;
  let high = cdf >= 1 - alpha / 2 ? 0 : -1;
  for (let k = 0; k < n && (low < 0 || high < 0); k += 1) {
    pmf *= ((n - k) / (k + 1)) * (p / (1 - p));
    cdf += pmf;
    if (low < 0 && cdf >= alpha / 2) low = k + 1;
    if (high < 0 && cdf >= 1 - alpha / 2) high = k + 1;
  }
  return { low: Math.max(0, low), high: high < 0 ? n : high };
}
