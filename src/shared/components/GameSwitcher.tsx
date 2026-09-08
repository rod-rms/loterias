import { Link, useLocation } from "react-router-dom";

export function GameSwitcher() {
  const base = "rounded-md px-3 py-1.5 text-sm font-medium transition";
  const location = useLocation();
  const isLotofacil = location.pathname.startsWith("/lotofacil");
  const isMegasena = location.pathname.startsWith("/megasena");

  return (
    <nav aria-label="Alternar modalidade" className="flex gap-1 rounded-lg bg-slate-100 p-1">
      <Link to="/lotofacil/gerar" aria-current={isLotofacil ? "page" : undefined} className={`${base} ${isLotofacil ? "bg-white text-lotofacil-600 shadow-sm" : "text-slate-600"}`}>
        Lotofácil
      </Link>
      <Link to="/megasena/gerar" aria-current={isMegasena ? "page" : undefined} className={`${base} ${isMegasena ? "bg-white text-megasena-600 shadow-sm" : "text-slate-600"}`}>
        Mega-Sena
      </Link>
    </nav>
  );
}
