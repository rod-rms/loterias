import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { BarChart3, BookOpen, Bookmark, ChevronDown, Info, Layers, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Ticket, X } from "lucide-react";
import { loadDataStatus } from "../../shared/lib/dataLoaders";
import { APP_VERSION } from "../../shared/lib/appVersion";
import { SECTION_LABEL, SECTION_ORDER, modalityCssVars, sectionPath, useCurrentModality, useModalities, useModalityRegistry } from "../../shared/lib/modalityRegistry";
import { useMediaQuery } from "../../shared/lib/useMediaQuery";
import type { DataStatus, ModalityRegistryEntry, ModalitySection } from "../../shared/types";
// Brand Kit v1 (docs/global/LotoAtlas_BrandKit_v1): compact reversed lockup for headers/sidebar (min 130 px wide) and the
// ready-made on-dark symbol (min 32 px) for the collapsed sidebar.
import lotoatlasLogoCompact from "../../assets/brand/lotoatlas-logo-compact-reversed.svg";
import lotoatlasSymbolOnDark from "../../assets/brand/lotoatlas-symbol-on-dark.svg";

/**
 * Navigation shell (UI-001). Desktop (>= 1024 px): fixed left sidebar, collapsible to icons. Mobile: top bar with a
 * modality pill and a bottom tab bar (Gerar · Meus jogos · Análise · Mais). Everything about modalities (list, names,
 * colours, sections) comes from the modality registry; adding a modality never touches this file.
 */

const SECTION_ICON: Record<ModalitySection, typeof Ticket> = { gerar: Ticket, carteiras: Bookmark, analise: BarChart3, metodologia: BookOpen };
const DESKTOP = "(min-width: 1024px)";
const COLLAPSED_KEY = "lotoatlas:sidebarCollapsed";

function sectionFromPath(pathname: string): ModalitySection | null {
  const seg = pathname.split("/")[2];
  return (SECTION_ORDER as string[]).includes(seg ?? "") ? (seg as ModalitySection) : null;
}

function formatDate(iso: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

function useDataStatus(): DataStatus | null | "error" {
  const [status, setStatus] = useState<DataStatus | null | "error">(null);
  useEffect(() => {
    let cancelled = false;
    loadDataStatus()
      .then((s) => !cancelled && setStatus(s))
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}

/** "Lotofácil · concurso 3829 · 13/11/2026", one line per modality, from status.json. */
function Freshness({ modalities, status, compact = false }: { modalities: ModalityRegistryEntry[]; status: DataStatus | null | "error"; compact?: boolean }) {
  return (
    <ul className={`space-y-1 ${compact ? "text-xs" : "text-xs"} text-ink-300`} aria-label="Atualização dos dados" data-testid="freshness">
      {modalities.map((m) => {
        const s = status && status !== "error" ? (status as unknown as Record<string, { latestContest: number; latestDrawDate: string } | undefined>)[m.id] : undefined;
        return (
          <li key={m.id} className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: m.colors.accent }} />
            <span className="truncate">
              {m.shortName} ·{" "}
              {status === null ? "carregando…" : s ? (
                <>
                  concurso <span className="font-mono tabular-nums text-ink-200">{s.latestContest}</span> · <span className="font-mono tabular-nums">{formatDate(s.latestDrawDate)}</span>
                </>
              ) : (
                "dados indisponíveis"
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ModalityDot({ entry, active }: { entry: ModalityRegistryEntry; active: boolean }) {
  return <span aria-hidden className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${active ? "" : "opacity-60"}`} style={{ background: entry.colors.accent }} />;
}

// ---- desktop sidebar -----------------------------------------------------------------------------------------------

function Sidebar({ modalities, current, section, status }: { modalities: ModalityRegistryEntry[]; current: ModalityRegistryEntry | undefined; section: ModalitySection | null; status: DataStatus | null | "error" }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* per-viewer convenience only */
    }
  }, [collapsed]);

  const item = (active: boolean) =>
    `group flex items-center gap-3 rounded px-2 py-1.5 text-sm ${active ? "bg-ink-700 text-ink-100" : "text-ink-200 hover:bg-ink-800 hover:text-ink-100"} ${collapsed ? "justify-center px-0" : ""}`;
  const label = (text: string) => (collapsed ? <span className="sr-only">{text}</span> : <span className="truncate">{text}</span>);

  return (
    <aside
      data-testid="sidebar"
      data-collapsed={collapsed ? "true" : "false"}
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-ink-500 bg-ink-900 ${collapsed ? "w-14" : "w-60"}`}
    >
      <div className={`flex h-16 items-center ${collapsed ? "justify-center" : "justify-between px-3"}`}>
        <Link to="/" className="flex items-center" aria-label="LotoAtlas, página inicial">
          {collapsed ? <img src={lotoatlasSymbolOnDark} alt="LotoAtlas" className="h-8 w-auto" width={36} height={32} /> : <img src={lotoatlasLogoCompact} alt="LotoAtlas" className="h-9 w-auto" width={140} height={36} />}
        </Link>
        {!collapsed && (
          <button type="button" onClick={() => setCollapsed(true)} aria-label="Recolher menu" title="Recolher menu" className="rounded p-1 text-ink-300 hover:bg-ink-800 hover:text-ink-100">
            <PanelLeftClose aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>
      {collapsed && (
        <button type="button" onClick={() => setCollapsed(false)} aria-label="Expandir menu" title="Expandir menu" className="mx-auto mb-2 rounded p-1 text-ink-300 hover:bg-ink-800 hover:text-ink-100">
          <PanelLeftOpen aria-hidden className="h-4 w-4" />
        </button>
      )}

      <nav aria-label="Modalidades" className={`border-t border-ink-500 py-3 ${collapsed ? "px-1" : "px-2"}`}>
        {!collapsed && <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-ink-300">Modalidade</p>}
        <ul className="space-y-0.5">
          {modalities.map((m) => {
            const active = current?.id === m.id;
            const target = sectionPath(m, section && m.sections.includes(section) ? section : "gerar");
            return (
              <li key={m.id}>
                <Link to={target} aria-current={active ? "true" : undefined} className={item(active)} title={collapsed ? m.displayName : undefined}>
                  <ModalityDot entry={m} active={active} />
                  {label(m.displayName)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {current && (
        <nav aria-label="Navegação principal" className={`border-t border-ink-500 py-3 ${collapsed ? "px-1" : "px-2"}`}>
          {!collapsed && <p className="mb-1 truncate px-2 text-xs font-medium uppercase tracking-wide text-ink-300">{current.displayName}</p>}
          <ul className="space-y-0.5">
            {SECTION_ORDER.filter((s) => current.sections.includes(s)).map((s) => {
              const Icon = SECTION_ICON[s];
              return (
                <li key={s}>
                  <NavLink to={sectionPath(current, s)} className={({ isActive }) => item(isActive)} title={collapsed ? SECTION_LABEL[s] : undefined}>
                    <Icon aria-hidden className="h-4 w-4 shrink-0" />
                    {label(SECTION_LABEL[s])}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <nav aria-label="Geral" className={`border-t border-ink-500 py-3 ${collapsed ? "px-1" : "px-2"}`}>
        <ul className="space-y-0.5">
          <li>
            <NavLink to="/carteiras" end className={({ isActive }) => item(isActive)} title={collapsed ? "Todos os meus jogos" : undefined}>
              <Layers aria-hidden className="h-4 w-4 shrink-0" />
              {label("Todos os meus jogos")}
            </NavLink>
          </li>
          <li>
            <NavLink to="/sobre" className={({ isActive }) => item(isActive)} title={collapsed ? "Sobre" : undefined}>
              <Info aria-hidden className="h-4 w-4 shrink-0" />
              {label("Sobre")}
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className={`mt-auto border-t border-ink-500 py-3 ${collapsed ? "px-1" : "px-4"}`}>
        {collapsed ? (
          <p className="text-center text-xs text-ink-300" title={`LotoAtlas v${APP_VERSION}`}>
            v{APP_VERSION}
          </p>
        ) : (
          <>
            <Freshness modalities={modalities} status={status} />
            <p className="mt-3 text-xs text-ink-300">LotoAtlas v{APP_VERSION}</p>
          </>
        )}
      </div>
    </aside>
  );
}

// ---- mobile: top bar, modality sheet, bottom tabs, "Mais" drawer -----------------------------------------------------

function useDialogBehaviour(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>("a, button, [tabindex]:not([tabindex='-1'])");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);
  return panelRef;
}

function Overlay({ open, onClose, label, children, side }: { open: boolean; onClose: () => void; label: string; children: ReactNode; side: "bottom" | "right" }) {
  const panelRef = useDialogBehaviour(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" role="presentation">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 h-full w-full bg-ink-950/70" tabIndex={-1} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute bg-ink-800 shadow-overlay ${side === "bottom" ? "inset-x-0 bottom-0 rounded-t-lg pb-[env(safe-area-inset-bottom)]" : "inset-y-0 right-0 w-72 max-w-[85vw]"}`}
      >
        <div className="flex items-center justify-between border-b border-ink-500 px-4 py-3">
          <p className="text-sm font-medium text-ink-100">{label}</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded p-1 text-ink-300 hover:bg-ink-700 hover:text-ink-100">
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MobileChrome({ modalities, current, section, status, children }: { modalities: ModalityRegistryEntry[]; current: ModalityRegistryEntry | undefined; section: ModalitySection | null; status: DataStatus | null | "error"; children: ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setSheetOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);
  const tabs: { section: ModalitySection; short: string }[] = [
    { section: "gerar", short: "Gerar" },
    { section: "carteiras", short: "Meus jogos" },
    { section: "analise", short: "Análise" },
  ];
  const tabClass = (active: boolean) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-ink-100" : "text-ink-300"}`;
  const closeSheet = () => setSheetOpen(false);
  const closeMore = () => setMoreOpen(false);
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ink-500 bg-ink-900">
        <div className="flex h-12 items-center justify-between px-4">
          <Link to="/" className="flex items-center" aria-label="LotoAtlas, página inicial">
            <img src={lotoatlasLogoCompact} alt="LotoAtlas" className="h-9 w-auto" width={140} height={36} />
          </Link>
          {current && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-label={`Modalidade: ${current.displayName}. Trocar modalidade`}
              className="inline-flex items-center gap-2 rounded-full border border-ink-500 px-3 py-1 text-sm text-ink-100"
            >
              <ModalityDot entry={current} active />
              {current.shortName}
              <ChevronDown aria-hidden className="h-3.5 w-3.5 text-ink-300" />
            </button>
          )}
        </div>
      </header>

      {children}

      <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-500 bg-ink-900 pb-[env(safe-area-inset-bottom)]">
        <ul className="flex">
          {current &&
            tabs
              .filter((t) => current.sections.includes(t.section))
              .map((t) => {
                const Icon = SECTION_ICON[t.section];
                return (
                  <li key={t.section} className="flex flex-1">
                    <NavLink to={sectionPath(current, t.section)} className={({ isActive }) => tabClass(isActive)} aria-label={SECTION_LABEL[t.section]}>
                      <Icon aria-hidden className="h-5 w-5" />
                      {t.short}
                    </NavLink>
                  </li>
                );
              })}
          <li className="flex flex-1">
            <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen} className={tabClass(moreOpen)}>
              <MoreHorizontal aria-hidden className="h-5 w-5" />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <Overlay open={sheetOpen} onClose={closeSheet} label="Escolher modalidade" side="bottom">
        <ul className="py-2">
          {modalities.map((m) => {
            const active = current?.id === m.id;
            return (
              <li key={m.id}>
                <Link
                  to={sectionPath(m, section && m.sections.includes(section) ? section : "gerar")}
                  aria-current={active ? "true" : undefined}
                  className={`flex items-center gap-3 px-4 py-3 text-base ${active ? "bg-ink-700 text-ink-100" : "text-ink-200"}`}
                >
                  <ModalityDot entry={m} active={active} />
                  {m.displayName}
                </Link>
              </li>
            );
          })}
        </ul>
      </Overlay>

      <Overlay open={moreOpen} onClose={closeMore} label="Mais" side="right">
        <nav aria-label="Mais páginas" className="py-2">
          <ul>
            {current && current.sections.includes("metodologia") && (
              <li>
                <NavLink to={sectionPath(current, "metodologia")} className="flex items-center gap-3 px-4 py-3 text-base text-ink-100">
                  <BookOpen aria-hidden className="h-4 w-4 text-ink-300" />
                  Metodologia
                </NavLink>
              </li>
            )}
            <li>
              <NavLink to="/carteiras" end className="flex items-center gap-3 px-4 py-3 text-base text-ink-100">
                <Layers aria-hidden className="h-4 w-4 text-ink-300" />
                Todos os meus jogos
              </NavLink>
            </li>
            <li>
              <NavLink to="/sobre" className="flex items-center gap-3 px-4 py-3 text-base text-ink-100">
                <Info aria-hidden className="h-4 w-4 text-ink-300" />
                Sobre
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className="border-t border-ink-500 px-4 py-3">
          <Freshness modalities={modalities} status={status} compact />
          <p className="mt-3 text-xs text-ink-300">LotoAtlas v{APP_VERSION}</p>
        </div>
      </Overlay>
    </>
  );
}

// ---- shell -----------------------------------------------------------------------------------------------------------

export function AppShell({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery(DESKTOP, true);
  const registry = useModalityRegistry();
  const modalities = useModalities();
  const current = useCurrentModality();
  const location = useLocation();
  const section = sectionFromPath(location.pathname);
  const status = useDataStatus();
  const onModalityRoute = Boolean(current) && location.pathname.split("/")[1] === current?.slug;
  const vars = useMemo(() => modalityCssVars(current) as CSSProperties, [current]);

  const main = (
    <main id="main-content" style={vars} className={`mx-auto w-full max-w-content flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10 ${onModalityRoute ? "modality-page" : ""}`}>
      {onModalityRoute && <div aria-hidden className="mb-6 h-0.5 w-12 rounded-full bg-mod-accent" data-testid="modality-stripe" />}
      {registry.status === "error" && (
        <p role="alert" className="mb-6 text-sm text-rose-300">
          {registry.message}
        </p>
      )}
      {children}
    </main>
  );

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-ink-700 focus:p-2 focus:text-ink-100"
      >
        Pular para o conteúdo
      </a>
      {isDesktop ? (
        <div className="flex min-h-screen">
          <Sidebar modalities={modalities} current={current} section={section} status={status} />
          <div className="flex min-w-0 flex-1 flex-col">
            {main}
            <footer className="border-t border-ink-500 px-8 py-4 text-xs text-ink-300">Não afiliado à CAIXA · Uso destinado a maiores de 18 anos · Não é uma plataforma de apostas.</footer>
          </div>
        </div>
      ) : (
        <MobileChrome modalities={modalities} current={current} section={section} status={status}>
          {main}
          <footer className="px-4 pb-24 text-xs text-ink-300">Não afiliado à CAIXA · Uso destinado a maiores de 18 anos · Não é uma plataforma de apostas.</footer>
        </MobileChrome>
      )}
    </div>
  );
}
