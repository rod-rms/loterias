import { describe, expect, it } from "vitest";
import { StrategyRegistry } from "../../src/shared/lib/strategyRegistry";
import { LOTOFACIL_STRATEGIES } from "../../src/modules/lotofacil/strategies/definitions";
import { MEGASENA_STRATEGIES } from "../../src/modules/megasena/strategies/definitions";

describe("strategy registry", () => {
  it("registers and lists strategies by modality without duplication", () => {
    const registry = new StrategyRegistry();
    for (const s of [...LOTOFACIL_STRATEGIES, ...MEGASENA_STRATEGIES]) registry.register(s);
    expect(registry.listByModality("lotofacil")).toHaveLength(5);
    expect(registry.listByModality("megasena")).toHaveLength(5);
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

  it("MEGA-ROLL-001 (Rolling 20 Balanceada v2.1) declares exactly the capabilities from spec §1", () => {
    const rolling20 = MEGASENA_STRATEGIES.find((s) => s.id === "megasena.rolling_20_v2")!;
    expect(rolling20.version).toBe("2.1.0");
    expect(rolling20.requiresHistoricalDraws).toBe(true);
    expect(rolling20.requiresTargetContest).toBe(true);
    expect(rolling20.historyWindowSize).toBe(20);
    expect(rolling20.supportsFixedNumbers).toBe(false);
    expect(rolling20.supportsExcludedNumbers).toBe(false);
    expect(rolling20.supportsBudget).toBe(true);
    expect(rolling20.supportsUserSeed).toBe(true);
    expect(rolling20.supportsQualityPreset).toBe(true);
    expect(rolling20.ticketCount).toEqual({ mode: "range", min: 1, max: 100 });
    expect(rolling20.ux.title).toBe("Organizar pelo histórico recente");
    expect(rolling20.ux.badge).toBe("Estratégia personalizada");
    expect(rolling20.ux.technicalName).toBe("Rolling 20 Balanceada v2.1");
  });

  it("no strategy's UX copy uses a prohibited predictive phrase (spec §11 Proibido list)", () => {
    const prohibited = [/maior chance de ganhar/i, /números? (quente|frio|atrasad)/i, /composição vencedora/i, /aumentam a probabilidade/i, /evita dividir prêmio/i, /IA prev[êe]/i, /ROI/i, /resultado líquido/i];
    for (const s of [...LOTOFACIL_STRATEGIES, ...MEGASENA_STRATEGIES]) {
      const text = [s.ux.title, s.ux.summary, s.ux.helpTitle, s.ux.helpBody, ...s.disclaimers].join(" ");
      for (const pattern of prohibited) expect(text).not.toMatch(pattern);
    }
  });
});
