import type { Modality, StrategyDefinition } from "../types";

/**
 * Central registry of strategy capabilities. UI screens read from this
 * registry instead of branching on strategy id.
 */
export class StrategyRegistry {
  private readonly byId = new Map<string, StrategyDefinition>();

  register(definition: StrategyDefinition): void {
    if (this.byId.has(definition.id)) {
      throw new Error(`Strategy already registered: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
  }

  get(id: string): StrategyDefinition | undefined {
    return this.byId.get(id);
  }

  require(id: string): StrategyDefinition {
    const found = this.get(id);
    if (!found) throw new Error(`Unknown strategy: ${id}`);
    return found;
  }

  listByModality(modality: Modality): StrategyDefinition[] {
    return Array.from(this.byId.values()).filter((s) => s.modality === modality);
  }

  listAll(): StrategyDefinition[] {
    return Array.from(this.byId.values());
  }
}

export const strategyRegistry = new StrategyRegistry();
