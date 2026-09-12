import { InfoHelp } from "./InfoHelp";
import type { QualityPreset } from "../types";

const LABELS: Record<QualityPreset, string> = { fast: "Rápida", balanced: "Equilibrada", deep: "Intensiva" };
const HELP: Record<QualityPreset, string> = {
  fast: "Faz menos tentativas e termina mais rápido.",
  balanced: "Equilibra tempo de processamento e quantidade de tentativas.",
  deep: "Faz mais tentativas em busca de um conjunto melhor e pode levar mais tempo. Não garante um resultado melhor em todos os casos.",
};

export function QualityPresetSelector({ value, onChange }: { value: QualityPreset; onChange: (v: QualityPreset) => void }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-brand-text">Quanto tempo o app deve dedicar à busca?</span>
      <div role="radiogroup" aria-label="Quanto tempo o app deve dedicar à busca?" className="flex flex-wrap gap-2">
        {(["fast", "balanced", "deep"] as const).map((preset) => (
          <span key={preset} className="inline-flex items-center gap-1">
            <button
              type="button"
              role="radio"
              aria-checked={value === preset}
              onClick={() => onChange(preset)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${value === preset ? "border-brand-action bg-brand-action text-brand-actionForeground" : "border-brand-border bg-brand-surface text-brand-text"}`}
            >
              {LABELS[preset]}
              {preset === "balanced" && (
                <span className={`rounded-full px-1.5 py-0 text-[10px] ${value === preset ? "bg-white/20 text-white" : "bg-brand-surfaceElevated text-brand-textMuted"}`}>Padrão</span>
              )}
            </button>
            <InfoHelp title={LABELS[preset]} body={HELP[preset]} />
          </span>
        ))}
      </div>
    </div>
  );
}
