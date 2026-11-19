interface NumberChipProps {
  value: number;
  variant?: "default" | "hit" | "miss" | "fixed" | "excluded";
  size?: "sm" | "md";
}

/**
 * Lottery number chip (UI-001): compact, tabular mono, coloured by the current modality through the `mod-*` CSS
 * variables set by the shell (or by a card/block that carries its own modality). Numbers are the hero element,
 * so the chip is a quiet square, not a pill.
 */
const VARIANT_CLASSES: Record<NonNullable<NumberChipProps["variant"]>, string> = {
  default: "border-mod-strong bg-mod-soft text-mod-text",
  hit: "border-brand-success bg-brand-success/15 font-medium text-brand-luckLight",
  miss: "border-ink-500 bg-ink-800 text-ink-300",
  fixed: "border-amber-500 bg-amber-900/50 text-amber-200",
  excluded: "border-rose-700 bg-rose-950/40 text-rose-300 line-through",
};

export function NumberChip({ value, variant = "default", size = "md" }: NumberChipProps) {
  const sizeClass = size === "sm" ? "h-6 min-w-6 px-1 text-xs" : "h-7 min-w-7 px-1.5 text-sm";
  return (
    <span
      className={`inline-flex ${sizeClass} items-center justify-center rounded border font-mono tabular-nums ${VARIANT_CLASSES[variant]}`}
      aria-label={`dezena ${String(value).padStart(2, "0")}${variant === "hit" ? " (acerto)" : ""}`}
    >
      {String(value).padStart(2, "0")}
    </span>
  );
}
