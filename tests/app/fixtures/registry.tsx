import type { ReactElement } from "react";
import { ModalityRegistryProvider } from "../../../src/shared/lib/modalityRegistry";
import type { GameConfig, Modality } from "../../../src/shared/types";

/** Test copy of the modality registry (UI-001), shaped like public/data/config/game-config.json. */
const entry = (id: Modality, displayName: string, order: number, accent: string): NonNullable<GameConfig["modalities"]>[number] => ({
  id,
  slug: id,
  displayName,
  shortName: displayName,
  enabled: true,
  order,
  sections: ["gerar", "carteiras", "analise", "metodologia"],
  datasetPath: `data/${id}/results.json`,
  officialUrl: "https://loterias.caixa.gov.br/",
  colors: { accent, accentStrong: "#2e7d32", soft: "#16351f", onAccent: "#ffffff", text: "#9fe0a3" },
});

export const TEST_GAME_CONFIG: GameConfig = {
  schemaVersion: 1,
  updatedAt: "2026-11-14",
  lotofacil: { simpleTicketSize: 15, ticketCostBRL: 3.5, source: "t", referenceDate: "2026-09-07", configVersion: "1" },
  megasena: { simpleTicketSize: 6, ticketCostBRL: 6, source: "t", referenceDate: "2026-09-07", configVersion: "1" },
  modalities: [entry("lotofacil", "Lotofácil", 1, "#4caf50"), entry("megasena", "Mega-Sena", 2, "#7a9fd1")],
};

/** Wraps UI in a registry provider with the test config already loaded (no fetch). */
export const withRegistry = (ui: ReactElement): ReactElement => <ModalityRegistryProvider preloaded={TEST_GAME_CONFIG}>{ui}</ModalityRegistryProvider>;
