import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";

const POPOVER_WIDTH_PX = 256; // matches the w-64 utility below
const VIEWPORT_SAFE_MARGIN_PX = 16;

type PopoverAlign = "center" | "left" | "right";

const ALIGN_CLASS: Record<PopoverAlign, string> = {
  center: "left-1/2 -translate-x-1/2",
  left: "left-0",
  right: "right-0",
};

export interface InfoHelpProps {
  /** Short heading for the explanation (e.g. the metric or option name). */
  title: string;
  /** Plain-language explanatory copy. Never put information here that is required to use the feature correctly. */
  body: string;
  /** Accessible label for the icon-only trigger when title alone isn't enough context (e.g. "Ajuda sobre X"). Ignored when `triggerContent` is provided. */
  label?: string;
  /**
   * Replaces the default icon-only trigger with visible content (e.g. a
   * "Como funciona?" text + icon). When set, the button's accessible name
   * comes from this visible content instead of `label`/`aria-label`, per
   * WCAG 2.5.3 (visible text should match the accessible name).
   */
  triggerContent?: ReactNode;
  className?: string;
}

/**
 * Accessible help/tooltip trigger. Opens on click/tap (primary mechanism,
 * works on touch), and also on hover/keyboard focus (desktop convenience) —
 * never hover-only. Closes on Escape, outside click, or blur-away. Critical
 * information must never live exclusively inside this component; it only
 * ever supplements visible content.
 */
export function InfoHelp({ title, body, label, triggerContent, className }: InfoHelpProps) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<PopoverAlign>("center");
  const popoverId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Collision-safe positioning: a popover centered under a trigger near a
  // screen edge would otherwise overflow the viewport (clipped/unreadable
  // content on narrow phones). Measured on open, not on every render.
  useLayoutEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const triggerCenter = rect.left + rect.width / 2;
    const half = POPOVER_WIDTH_PX / 2;
    if (triggerCenter - half < VIEWPORT_SAFE_MARGIN_PX) {
      setAlign("left");
    } else if (triggerCenter + half > window.innerWidth - VIEWPORT_SAFE_MARGIN_PX) {
      setAlign("right");
    } else {
      setAlign("center");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={containerRef} className={`relative inline-flex ${className ?? ""}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        aria-label={triggerContent ? undefined : (label ?? `Mais informações: ${title}`)}
        onClick={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onMouseLeave={(e) => {
          // Only close on mouse-leave if focus isn't still inside (keyboard users keep it open via focus).
          if (!containerRef.current?.contains(document.activeElement)) setOpen(false);
          void e;
        }}
        className={
          triggerContent
            ? "inline-flex items-center gap-1 rounded text-brand-textMuted hover:text-brand-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
            : "inline-flex h-5 w-5 items-center justify-center rounded-full text-brand-textMuted hover:text-brand-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
        }
      >
        {triggerContent ?? <CircleHelp aria-hidden className="h-4 w-4" />}
      </button>
      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className={`absolute top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-brand-border bg-brand-surface p-3 text-left text-xs text-brand-text shadow-lg ${ALIGN_CLASS[align]}`}
        >
          <span className="mb-1 block font-semibold text-brand-text">{title}</span>
          <span className="block leading-relaxed">{body}</span>
        </span>
      )}
    </span>
  );
}
