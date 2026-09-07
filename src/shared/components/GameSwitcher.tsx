import { NavLink } from "react-router-dom";

export function GameSwitcher() {
  const base = "rounded-md px-3 py-1.5 text-sm font-medium transition";
  return (
    <nav aria-label="Alternar modalidade" className="flex gap-1 rounded-lg bg-slate-100 p-1">
      <NavLink to="/lotofacil" className={({ isActive }) => `${base} ${isActive ? "bg-white text-lotofacil-600 shadow-sm" : "text-slate-600"}`}>
        Lotofácil
      </NavLink>
      <NavLink to="/megasena" className={({ isActive }) => `${base} ${isActive ? "bg-white text-megasena-600 shadow-sm" : "text-slate-600"}`}>
        Mega-Sena
      </NavLink>
    </nav>
  );
}
