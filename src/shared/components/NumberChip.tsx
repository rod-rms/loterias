interface NumberChipProps {
  value: number;
  variant?: "default" | "hit" | "miss" | "fixed" | "excluded";
  size?: "sm" | "md";
}

const VARIANT_CLASSES: Record<NonNullable<NumberChipProps["variant"]>, string> = {
  default: "bg-brand-surfaceElevated text-brand-text border-brand-border",
  hit: "bg-emerald-900/50 text-emerald-200 border-emerald-500 font-semibold",
  miss: "bg-brand-surfaceElevated text-brand-textMuted border-brand-border",
  fixed: "bg-amber-900/50 text-amber-200 border-amber-500",
  excluded: "bg-rose-950/40 text-rose-300 border-rose-700 line-through",
};

export function NumberChip({ value, variant = "default", size = "md" }: NumberChipProps) {
  const sizeClass = size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";
  return (
    <span
      className={`inline-flex ${sizeClass} items-center justify-center rounded-full border font-mono ${VARIANT_CLASSES[variant]}`}
      aria-label={`dezena ${String(value).padStart(2, "0")}${variant === "hit" ? " (acerto)" : ""}`}
    >
      {String(value).padStart(2, "0")}
    </span>
  );
}
