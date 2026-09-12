import { RESPONSIBLE_GAMING_URL } from "../lib/externalLinks";

export function ResponsibleGamingNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      aria-label="Aviso de jogo responsável"
      className={`rounded-lg border border-brand-border bg-brand-surfaceElevated text-brand-textMuted ${compact ? "p-2 text-xs" : "p-4 text-sm"}`}
    >
      <p>
        Uso destinado a maiores de <strong>18 anos</strong>. Este aplicativo não vende nem registra apostas na CAIXA. As opções disponíveis organizam e
        comparam jogos, mas não eliminam a aleatoriedade do sorteio. Não aumente gastos para tentar recuperar perdas.{" "}
        <a href={RESPONSIBLE_GAMING_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-text">
          Saiba mais sobre jogo responsável
        </a>
        .
      </p>
    </aside>
  );
}
