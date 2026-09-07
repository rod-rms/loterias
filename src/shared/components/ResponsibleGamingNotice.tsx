export function ResponsibleGamingNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      aria-label="Aviso de jogo responsável"
      className={`rounded-lg border border-slate-200 bg-slate-50 text-slate-600 ${compact ? "p-2 text-xs" : "p-4 text-sm"}`}
    >
      <p>
        Uso destinado a maiores de <strong>18 anos</strong>. Este aplicativo não vende nem registra apostas na CAIXA. Estratégias organizam e comparam
        carteiras, mas não eliminam a aleatoriedade do sorteio. Não aumente gastos para tentar recuperar perdas.{" "}
        <a
          href="https://loterias.caixa.gov.br/Paginas/jogo-responsavel.aspx"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-slate-900"
        >
          Saiba mais sobre jogo responsável
        </a>
        .
      </p>
    </aside>
  );
}
