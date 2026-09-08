import { Link } from "react-router-dom";

interface BackLinkProps {
  to: string;
  label: string;
}

/** Deterministic in-app back navigation (a fixed destination, not browser history). */
export function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
    >
      ← {label}
    </Link>
  );
}
