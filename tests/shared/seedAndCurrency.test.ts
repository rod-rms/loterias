import { describe, expect, it } from "vitest";
import { generateRandomSeed, resolveSeed, rmsSeed } from "../../src/shared/lib/seed";
import { costUsed, formatBRL, remainingBalance, ticketsForBudget } from "../../src/shared/utils/currency";

describe("shared seed service", () => {
  it("uses the user seed when provided", () => {
    expect(resolveSeed("my-seed")).toBe("my-seed");
    expect(resolveSeed(42)).toBe(42);
  });

  it("generates a non-empty random seed when none is provided", () => {
    const seed = resolveSeed(undefined);
    expect(typeof seed).toBe("string");
    expect((seed as string).length).toBeGreaterThan(0);
  });

  it("generates different seeds across calls", () => {
    const a = generateRandomSeed();
    const b = generateRandomSeed();
    expect(a).not.toBe(b);
  });

  it("derives a stable RMS seed from contest and algorithm version", () => {
    expect(rmsSeed(3780, "rms-v2.0.0")).toBe("rms-v2:3780:rms-v2.0.0");
  });
});

describe("shared currency utils", () => {
  it("floors the number of tickets a budget can afford", () => {
    expect(ticketsForBudget(20, 3.5)).toBe(5); // 17.5 used, 2.5 left
    expect(ticketsForBudget(21, 3.5)).toBe(6);
  });

  it("never exceeds the budget", () => {
    const n = ticketsForBudget(10, 6);
    expect(costUsed(n, 6)).toBeLessThanOrEqual(10);
  });

  it("computes cost used and remaining balance", () => {
    expect(costUsed(5, 3.5)).toBeCloseTo(17.5, 5);
    expect(remainingBalance(20, 5, 3.5)).toBeCloseTo(2.5, 5);
  });

  it("formats BRL currency", () => {
    expect(formatBRL(3.5)).toContain("3,50");
  });
});
