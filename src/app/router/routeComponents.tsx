import { Suspense, lazy } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { GerarPage } from "../pages/GerarPage";
import { CarteirasPage } from "../pages/CarteirasPage";
import { MetodologiaPage } from "../pages/MetodologiaPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { findModalityBySlug, useModalities, useModalityRegistry } from "../../shared/lib/modalityRegistry";
import type { ModalitySection } from "../../shared/types";

// Lazy: the analysis page and its statistics code are only downloaded when this route is opened.
const AnalisePage = lazy(() => import("../pages/AnalisePage").then((m) => ({ default: m.AnalisePage })));

/**
 * UI-001: canonical routes are `/:modalidade/{gerar,carteiras,analise,metodologia}`. The slug is resolved against the
 * modality registry (game-config.json), so a new modality needs no route edit. An unknown slug renders "não encontrada".
 * `key` per modality forces a full remount of the page on a modality change (see GerarPage's own isolation notes).
 */
export function ModalityRoute({ section }: { section: ModalitySection }) {
  const { modalidade } = useParams();
  const registry = useModalityRegistry();
  if (registry.status === "loading") return <p role="status" className="text-sm text-ink-300">Carregando…</p>;
  if (registry.status === "error") return <NotFoundPage message={registry.message} />;
  const entry = findModalityBySlug(registry.modalities, modalidade);
  if (!entry) return <NotFoundPage />;
  if (!entry.sections.includes(section)) return <Navigate to={`/${entry.slug}/${entry.sections[0]}`} replace />;
  const modality = entry.id;
  switch (section) {
    case "gerar":
      return <GerarPage key={modality} modality={modality} />;
    case "carteiras":
      return <CarteirasPage key={modality} modality={modality} />;
    case "metodologia":
      return <MetodologiaPage key={modality} modality={modality} />;
    case "analise":
      return (
        <Suspense fallback={<p role="status" className="text-sm text-ink-300">Carregando…</p>}>
          <AnalisePage key={modality} modality={modality} />
        </Suspense>
      );
  }
}

/** `/:modalidade` (old landing pages) → the modality hub `/:modalidade/gerar`; unknown slugs → "não encontrada". */
export function ModalityIndexRedirect() {
  const { modalidade } = useParams();
  const registry = useModalityRegistry();
  if (registry.status === "loading") return null;
  const entry = registry.status === "ready" ? findModalityBySlug(registry.modalities, modalidade) : undefined;
  return entry ? <Navigate to={`/${entry.slug}/gerar`} replace /> : <NotFoundPage />;
}

/** Legacy `/analise?modalidade=x` → `/x/analise` (replace). Without a valid parameter, the first enabled modality. */
export function LegacyAnaliseRedirect() {
  const [params] = useSearchParams();
  const modalities = useModalities();
  if (modalities.length === 0) return null;
  const entry = findModalityBySlug(modalities, params.get("modalidade") ?? undefined) ?? modalities[0]!;
  return <Navigate to={`/${entry.slug}/analise`} replace />;
}

