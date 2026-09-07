import { strategyRegistry } from "../../shared/lib/strategyRegistry";
import { LOTOFACIL_STRATEGIES } from "../../modules/lotofacil/strategies/definitions";
import { MEGASENA_STRATEGIES } from "../../modules/megasena/strategies/definitions";

let bootstrapped = false;

/** Registers every catalog strategy exactly once. Safe to call multiple times. */
export function ensureStrategiesRegistered(): void {
  if (bootstrapped) return;
  for (const strategy of [...LOTOFACIL_STRATEGIES, ...MEGASENA_STRATEGIES]) {
    strategyRegistry.register(strategy);
  }
  bootstrapped = true;
}
