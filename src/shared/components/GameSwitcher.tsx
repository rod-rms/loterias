import { Link, useLocation } from "react-router-dom";

export function GameSwitcher() {
  const base = "rounded-md px-3 py-1.5 text-sm font-medium transition";
  const location = useLocation();
  const isLotofacil = location.pathname.startsWith("/lotofacil");
  const isMegasena = location.pathname.startsWith("/megasena");

  return (
    <nav aria-label="Alternar modalidade" className="flex gap-1 rounded-lg bg-brand-surfaceElevated p-1">
      <Link
        to="/lotofacil/gerar"
        aria-current={isLotofacil ? "page" : undefined}
        className={`${base} ${isLotofacil ? "bg-lotofacil-500 text-white shadow-sm" : "text-brand-textMuted hover:text-brand-text"}`}
      >
        Lotofácil
      </Link>
      <Link
        to="/megasena/gerar"
        aria-current={isMegasena ? "page" : undefined}
        className={`${base} ${isMegasena ? "bg-megasena-600 text-white shadow-sm" : "text-brand-textMuted hover:text-brand-text"}`}
      >
        Mega-Sena
      </Link>
    </nav>
  );
}
