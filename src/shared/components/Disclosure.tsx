import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface DisclosureProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  /** Controlled mode: pass both to let the parent own the open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Shared collapsed/expandable control. Uses `flex` on the trigger button so
 * it is always block-level (a plain inline <button> next to another one can
 * end up sitting side-by-side on the same line instead of stacking, which
 * caused two disclosure buttons to visually run together in the result
 * screen). Always renders a visible chevron and a clear touch target.
 */
export function Disclosure({ title, subtitle, defaultOpen = false, children, open: controlledOpen, onOpenChange }: DisclosureProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-brand-text hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
      >
        <span className="inline-flex items-center gap-2">
          {title}
          {subtitle && <span className="rounded-full bg-brand-surfaceElevated px-2 py-0.5 text-[11px] font-normal text-brand-textMuted">{subtitle}</span>}
        </span>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-brand-textMuted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-brand-border px-4 py-3">{children}</div>}
    </div>
  );
}
