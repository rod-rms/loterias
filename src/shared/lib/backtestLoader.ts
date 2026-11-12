import { BACKTEST_SCHEMA_VERSION, backtestFileSchema, type BacktestFile } from "./backtestSchemas";
import type { Modality } from "../types";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

/**
 * Loads the backtest artifact (ANL-002) for the "Análise de resultados" page. Kept out of dataLoaders so that only this
 * route's chunk pulls it in. Fails closed: a missing file, a schema-version mismatch or an inconsistent file throws a clear error.
 */
export async function loadBacktest(modality: Modality): Promise<BacktestFile> {
  const res = await fetch(`${BASE_URL}data/backtest/${modality}/backtest.json`.replace(/\/{2,}/g, "/"));
  if (!res.ok) throw new Error(`Não foi possível carregar o arquivo de backtest (HTTP ${res.status}).`);
  const raw: unknown = await res.json();
  const version = (raw as { backtestSchemaVersion?: unknown } | null)?.backtestSchemaVersion;
  if (version !== BACKTEST_SCHEMA_VERSION) {
    throw new Error(`Versão do arquivo de backtest incompatível (esperada ${BACKTEST_SCHEMA_VERSION}, encontrada ${String(version)}).`);
  }
  const parsed = backtestFileSchema.safeParse(raw);
  if (!parsed.success) throw new Error("O arquivo de backtest está inconsistente e não foi usado.");
  if (parsed.data.modality !== modality) throw new Error("O arquivo de backtest não corresponde à modalidade escolhida.");
  return parsed.data;
}
