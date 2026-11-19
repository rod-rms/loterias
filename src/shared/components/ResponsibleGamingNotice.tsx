import { RESPONSIBLE_GAMING_URL } from "../lib/externalLinks";

export function ResponsibleGamingNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      aria-label="Aviso de jogo responsável"
      className={`border-t border-ink-500 text-ink-200 ${compact ? "pt-3 text-xs" : "pt-4 text-sm"}`}
    >
      <p>
        Uso destinado a maiores de <strong>18 anos</strong>. Este aplicativo não vende nem registra apostas na CAIXA. As opções disponíveis organizam e
        comparam jogos, mas não eliminam a aleatoriedade do sorteio. Não aumente gastos para tentar recuperar perdas.{" "}
        <a href={RESPONSIBLE_GAMING_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink-100">
          Saiba mais sobre jogo responsável
        </a>
        .
      </p>
    </aside>
  );
}
