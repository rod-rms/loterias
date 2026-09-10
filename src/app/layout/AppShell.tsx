import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { GameSwitcher, DataFreshnessBadge } from "../../shared/components";
import { loadDataset } from "../../shared/lib/dataLoaders";
import { APP_VERSION } from "../../shared/lib/appVersion";
import lotoatlasLogoUi from "../../assets/brand/lotoatlas-logo-ui-reversed.svg";
import lotoatlasSymbolUi from "../../assets/brand/lotoatlas-symbol-ui-on-dark.svg";

export function AppShell({ children }: { children: ReactNode }) {
  const [latestContest, setLatestContest] = useState<{ lotofacil: number | null; megasena: number | null }>({ lotofacil: null, megasena: null });
  const location = useLocation();

  useEffect(() => {
    loadDataset("lotofacil")
      .then((d) => setLatestContest((s) => ({ ...s, lotofacil: d.latestContest })))
      .catch(() => undefined);
    loadDataset("megasena")
      .then((d) => setLatestContest((s) => ({ ...s, megasena: d.latestContest })))
      .catch(() => undefined);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium ${isActive ? "text-brand-text" : "text-brand-textMuted hover:text-brand-text"}`;

  const compactNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-xs font-medium ${isActive ? "text-brand-text" : "text-brand-textMuted hover:text-brand-text"}`;

  // Scope the freshness badges to the modality currently being viewed;
  // elsewhere (home, Meus jogos salvos, Sobre) show both, clearly labeled.
  const showLotofacil = !location.pathname.startsWith("/megasena");
  const showMegasena = !location.pathname.startsWith("/lotofacil");

  const freshnessBadges = (
    <>
      {showLotofacil && <DataFreshnessBadge label="Lotofácil" latestContest={latestContest.lotofacil} />}
      {showMegasena && <DataFreshnessBadge label="Mega-Sena" latestContest={latestContest.megasena} />}
    </>
  );

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-brand-surface focus:p-2 focus:text-brand-text focus:shadow"
      >
        Pular para o conteúdo
      </a>
      <header className="border-b border-brand-border bg-brand-surface">
        {/* Mobile header (below sm): three deliberate rows — brand+nav, modality switcher, freshness. */}
        <div className="mx-auto max-w-6xl px-4 sm:hidden">
          <div className="flex items-center justify-between gap-3 py-3">
            <Link to="/" className="flex shrink-0 items-center" aria-label="LotoAtlas — página inicial">
              <img src={lotoatlasSymbolUi} alt="LotoAtlas" className="h-7 w-auto" width={33} height={28} />
            </Link>
            <nav aria-label="Navegação principal" className="flex items-center gap-3">
              <NavLink to="/carteiras" className={compactNavLinkClass}>
                Meus jogos salvos
              </NavLink>
              <NavLink to="/sobre" className={compactNavLinkClass}>
                Sobre
              </NavLink>
            </nav>
          </div>
          <div className="pb-3">
            <GameSwitcher />
          </div>
          <div className="flex flex-wrap gap-2 pb-3">{freshnessBadges}</div>
        </div>

        {/* Desktop/tablet header (sm and up): one primary row (logo, switcher, nav), freshness as a secondary row. */}
        <div className="mx-auto hidden max-w-6xl items-center gap-4 px-4 py-3 sm:flex">
          <Link to="/" className="flex shrink-0 items-center" aria-label="LotoAtlas — página inicial">
            <img src={lotoatlasLogoUi} alt="LotoAtlas" className="h-7 w-auto" width={96} height={28} />
          </Link>
          <GameSwitcher />
          <nav aria-label="Navegação principal" className="ml-auto flex items-center gap-5">
            <NavLink to="/carteiras" className={navLinkClass}>
              Meus jogos salvos
            </NavLink>
            <NavLink to="/sobre" className={navLinkClass}>
              Sobre
            </NavLink>
          </nav>
        </div>
        <div className="mx-auto hidden max-w-6xl flex-wrap gap-2 px-4 pb-2 sm:flex">{freshnessBadges}</div>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-brand-border bg-brand-surface px-4 py-6 text-center text-xs text-brand-textMuted">
        LotoAtlas v{APP_VERSION} · Não afiliado à CAIXA · Uso destinado a maiores de 18 anos · Não é uma plataforma de apostas.
      </footer>
    </div>
  );
}
