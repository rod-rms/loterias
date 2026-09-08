import { InfoHelp } from "./InfoHelp";

export function SeedInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center gap-1.5 font-medium text-slate-700">
        Código de reprodução
        <InfoHelp
          title="Código de reprodução"
          body="Este código permite recriar exatamente o mesmo conjunto de jogos no futuro. Você não precisa preenchê-lo: se deixar em branco, o aplicativo cria um código automaticamente."
        />
      </span>
      <input
        type="text"
        aria-label="Código de reprodução"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Deixe em branco para gerar automaticamente"
        className="w-64 rounded-md border border-slate-300 px-2 py-1.5 disabled:bg-slate-100"
      />
    </label>
  );
}
