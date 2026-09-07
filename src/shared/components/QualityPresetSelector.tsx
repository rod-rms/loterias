import type { QualityPreset } from "../types";

const LABELS: Record<QualityPreset, string> = { fast: "Rápida", balanced: "Equilibrada", deep: "Profunda" };

export function QualityPresetSelector({ value, onChange }: { value: QualityPreset; onChange: (v: QualityPreset) => void }) {
  return (
    <div role="radiogroup" aria-label="Preset de qualidade da busca" className="flex gap-2">
      {(["fast", "balanced", "deep"] as const).map((preset) => (
        <button
          key={preset}
          type="button"
          role="radio"
          aria-checked={value === preset}
          onClick={() => onChange(preset)}
          className={`rounded-md border px-3 py-1.5 text-sm ${value === preset ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
        >
          {LABELS[preset]}
        </button>
      ))}
    </div>
  );
}
