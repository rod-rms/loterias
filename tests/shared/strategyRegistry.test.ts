import { describe, expect, it } from "vitest";
import { StrategyRegistry } from "../../src/shared/lib/strategyRegistry";
import { LOTOFACIL_STRATEGIES } from "../../src/modules/lotofacil/strategies/definitions";
import { MEGASENA_STRATEGIES } from "../../src/modules/megasena/strategies/definitions";

describe("strategy registry", () => {
  it("registers and lists strategies by modality without duplication", () => {
    const registry = new StrategyRegistry();
    for (const s of [...LOTOFACIL_STRATEGIES, ...MEGASENA_STRATEGIES]) registry.register(s);
    expect(registry.listByModality("lotofacil")).toHaveLength(5);
    expect(registry.listByModality("megasena")).toHaveLength(4);
  });

  it("throws when registering the same strategy id twice", () => {
    const registry = new StrategyRegistry();
    registry.register(LOTOFACIL_STRATEGIES[0]!);
    expect(() => registry.register(LOTOFACIL_STRATEGIES[0]!)).toThrow();
  });

  it("every strategy declares its capability contract fields", () => {
    for (const s of [...LOTOFACIL_STRATEGIES, ...MEGASENA_STRATEGIES]) {
      expect(s.id).toBeTruthy();
      expect(s.version).toBeTruthy();
      expect(["fixed", "range"]).toContain(s.ticketCount.mode);
      expect(Array.isArray(s.disclaimers)).toBe(true);
    }
  });

  it("RMS v2 declares a fixed quantity of exactly 6", () => {
    const rms = LOTOFACIL_STRATEGIES.find((s) => s.id === "lotofacil.rms_v2")!;
    expect(rms.ticketCount.mode).toBe("fixed");
    expect(rms.ticketCount.fixed).toBe(6);
    expect(rms.supportsBudget).toBe(false);
  });
});
