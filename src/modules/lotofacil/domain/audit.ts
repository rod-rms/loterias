import { MODEL_VERSION } from "./constants";
import type { LotofacilAuditMetadata, ProbabilityMetric } from "./types";

export function createAuditMetadata(input: Omit<LotofacilAuditMetadata, "modelVersion" | "generatedAt">): LotofacilAuditMetadata {
  return {
    modelVersion: MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    ...input,
  };
}

export function aggregateEvaluationMethod(metrics: ProbabilityMetric[]): "exact" | "estimated" | "mixed" {
  const statuses = new Set(metrics.map((m) => m.status));
  if (statuses.size === 1 && statuses.has("exact")) return "exact";
  if (statuses.has("exact") && statuses.size > 1) return "mixed";
  return "estimated";
}
