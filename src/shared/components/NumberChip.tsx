interface NumberChipProps {
  value: number;
  variant?: "default" | "hit" | "miss" | "fixed" | "excluded";
  size?: "sm" | "md";
}

const VARIANT_CLASSES: Record<NonNullable<NumberChipProps["variant"]>, string> = {
  default: "bg-slate-100 text-slate-800 border-slate-300",
  hit: "bg-emerald-100 text-emerald-900 border-emerald-500 font-semibold",
  miss: "bg-slate-50 text-slate-400 border-slate-200",
  fixed: "bg-amber-100 text-amber-900 border-amber-500",
  excluded: "bg-rose-50 text-rose-700 border-rose-300 line-through",
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
