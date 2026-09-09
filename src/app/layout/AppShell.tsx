import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { GameSwitcher, DataFreshnessBadge } from "../../shared/components";
import { loadDataset } from "../../shared/lib/dataLoaders";
import { APP_VERSION } from "../../shared/lib/appVersion";

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

  const navLinkClass = ({ isActive }: { isActive: boolean }) => `text-sm font-medium ${isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-800"}`;

  // Scope the freshness badges to the modality currently being viewed;
  // elsewhere (home, Meus jogos salvos, Sobre) show both, clearly labeled.
  const showLotofacil = !location.pathname.startsWith("/megasena");
  const showMegasena = !location.pathname.startsWith("/lotofacil");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2 focus:shadow">
        Pular para o conteúdo
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="flex flex-col leading-tight">
            <span className="text-lg font-bold">Loterias</span>
            <span className="text-xs text-slate-500">Jogos organizados com transparência</span>
          </Link>
          <GameSwitcher />
          <nav aria-label="Navegação principal" className="ml-auto flex items-center gap-4">
            <NavLink to="/carteiras" className={navLinkClass}>
              Meus jogos salvos
            </NavLink>
            <NavLink to="/sobre" className={navLinkClass}>
              Sobre
            </NavLink>
          </nav>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 pb-2">
          {showLotofacil && <DataFreshnessBadge label="Lotofácil" latestContest={latestContest.lotofacil} />}
          {showMegasena && <DataFreshnessBadge label="Mega-Sena" latestContest={latestContest.megasena} />}
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
        Loterias v{APP_VERSION} · Não afiliado à CAIXA · Uso destinado a maiores de 18 anos · Não é uma plataforma de apostas.
      </footer>
    </div>
  );
}
