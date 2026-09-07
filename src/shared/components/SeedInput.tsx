export function SeedInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">Seed (opcional)</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Deixe em branco para gerar automaticamente"
        className="w-64 rounded-md border border-slate-300 px-2 py-1.5 disabled:bg-slate-100"
      />
      <span className="mt-1 block text-xs text-slate-500">A mesma seed e os mesmos parâmetros reproduzem exatamente a mesma carteira.</span>
    </label>
  );
}
