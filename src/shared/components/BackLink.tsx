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
      className="inline-flex items-center gap-1 text-sm font-medium text-brand-textMuted underline-offset-2 hover:text-brand-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
    >
      ← {label}
    </Link>
  );
}
