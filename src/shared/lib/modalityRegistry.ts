import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";
import { loadGameConfig } from "./dataLoaders";
import type { GameConfig, Modality, ModalityRegistryEntry, ModalitySection } from "../types";

/**
 * Modality registry (UI-001). The list of modalities, their slugs, names, colours and enabled sections comes from
 * public/data/config/game-config.json (`modalities`), the same versioned config that already carries prices.
 * The navigation shell, the route guards, accents and freshness lines read from here, so adding a CAIXA modality
 * (Quina, Dupla Sena, ...) is a config entry plus its domain module, never an edit to the shell.
 */

export const SECTION_ORDER: ModalitySection[] = ["gerar", "carteiras", "analise", "metodologia"];

export const SECTION_LABEL: Record<ModalitySection, string> = {
  gerar: "Gerar jogos",
  carteiras: "Meus jogos",
  analise: "Análise de resultados",
  metodologia: "Metodologia",
};

/** Enabled entries, ordered. Empty when the config carries no registry (the shell then fails closed with a message). */
export function listModalities(config: Pick<GameConfig, "modalities"> | null | undefined): ModalityRegistryEntry[] {
  return (config?.modalities ?? []).filter((m) => m.enabled).sort((a, b) => a.order - b.order);
}

export const findModalityBySlug = (entries: ModalityRegistryEntry[], slug: string | undefined): ModalityRegistryEntry | undefined =>
  entries.find((m) => m.slug === slug);

export const findModalityById = (entries: ModalityRegistryEntry[], id: Modality | undefined): ModalityRegistryEntry | undefined =>
  entries.find((m) => m.id === id);

export const sectionPath = (entry: Pick<ModalityRegistryEntry, "slug">, section: ModalitySection): string => `/${entry.slug}/${section}`;

/** CSS custom properties that carry the modality identity colours (read by the `mod-*` Tailwind utilities). */
export function modalityCssVars(entry: ModalityRegistryEntry | undefined): Record<string, string> {
  if (!entry) return {};
  return {
    "--mod-accent": entry.colors.accent,
    "--mod-accent-strong": entry.colors.accentStrong,
    "--mod-soft": entry.colors.soft,
    "--mod-on-accent": entry.colors.onAccent,
    "--mod-text": entry.colors.text,
  };
}

// ---- React context -------------------------------------------------------------------------------------------------

export type RegistryState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; config: GameConfig; modalities: ModalityRegistryEntry[] };

const RegistryContext = createContext<RegistryState>({ status: "loading" });

export function ModalityRegistryProvider({ children, preloaded }: { children: ReactNode; preloaded?: GameConfig }) {
  const [state, setState] = useState<RegistryState>(() =>
    preloaded ? { status: "ready", config: preloaded, modalities: listModalities(preloaded) } : { status: "loading" },
  );
  useEffect(() => {
    if (preloaded) return;
    let cancelled = false;
    loadGameConfig()
      .then((config) => {
        if (cancelled) return;
        const modalities = listModalities(config);
        if (modalities.length === 0) setState({ status: "error", message: "A configuração de modalidades não foi encontrada." });
        else setState({ status: "ready", config, modalities });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", message: "Não foi possível carregar a configuração do aplicativo." });
      });
    return () => {
      cancelled = true;
    };
  }, [preloaded]);
  return createElement(RegistryContext.Provider, { value: state }, children);
}

export const useModalityRegistry = (): RegistryState => useContext(RegistryContext);

/** Enabled modalities (empty while loading or on error). */
export function useModalities(): ModalityRegistryEntry[] {
  const state = useModalityRegistry();
  return state.status === "ready" ? state.modalities : [];
}

const LAST_MODALITY_KEY = "lotoatlas:lastModality";

function readLastModality(): string | null {
  try {
    return window.localStorage.getItem(LAST_MODALITY_KEY);
  } catch {
    return null;
  }
}

/**
 * The modality the shell is "in": the `:modalidade` route segment when present, otherwise the last one visited,
 * otherwise the first enabled entry. Remembers the route-derived modality for global pages (home, /carteiras, /sobre).
 */
export function useCurrentModality(): ModalityRegistryEntry | undefined {
  const modalities = useModalities();
  const params = useParams();
  const location = useLocation();
  const slugFromRoute = params.modalidade ?? location.pathname.split("/")[1];
  const fromRoute = findModalityBySlug(modalities, slugFromRoute);
  useEffect(() => {
    if (!fromRoute) return;
    try {
      window.localStorage.setItem(LAST_MODALITY_KEY, fromRoute.slug);
    } catch {
      /* per-viewer convenience only */
    }
  }, [fromRoute]);
  return useMemo(() => fromRoute ?? findModalityBySlug(modalities, readLastModality() ?? undefined) ?? modalities[0], [fromRoute, modalities]);
}
