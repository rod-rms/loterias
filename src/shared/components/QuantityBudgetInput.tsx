import { formatBRL, ticketsForBudget, costUsed, remainingBalance } from "../utils/currency";
import { InfoHelp } from "./InfoHelp";
import type { StrategyDefinition } from "../types";

interface QuantityBudgetInputProps {
  strategy: StrategyDefinition;
  inputMode: "quantity" | "budget";
  onInputModeChange: (mode: "quantity" | "budget") => void;
  numberOfTickets: number;
  onNumberOfTicketsChange: (n: number) => void;
  budgetBRL: number;
  onBudgetChange: (v: number) => void;
  ticketCostBRL: number;
}

export function QuantityBudgetInput({
  strategy,
  inputMode,
  onInputModeChange,
  numberOfTickets,
  onNumberOfTicketsChange,
  budgetBRL,
  onBudgetChange,
  ticketCostBRL,
}: QuantityBudgetInputProps) {
  if (strategy.ticketCount.mode === "fixed") {
    const n = strategy.ticketCount.fixed ?? 0;
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold text-ink-100">
          {n} {n === 1 ? "jogo" : "jogos"}
        </span>
        <span className="text-ink-200" aria-hidden>
          ·
        </span>
        <span className="text-ink-200">Esta opção foi criada e validada para exatamente {n} jogos.</span>
        <span className="text-ink-200" aria-hidden>
          ·
        </span>
        <span className="font-medium text-ink-100">Custo total: {formatBRL(costUsed(n, ticketCostBRL))}</span>
      </div>
    );
  }

  const min = strategy.ticketCount.min ?? 1;
  const max = strategy.ticketCount.max ?? 50;
  const effectiveN = inputMode === "budget" ? ticketsForBudget(budgetBRL, ticketCostBRL) : numberOfTickets;

  return (
    <div className="space-y-3">
      {strategy.supportsBudget && (
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-sm font-medium text-ink-100">Como você quer definir seus jogos?</legend>
          <div className="flex flex-wrap gap-4">
            {(["quantity", "budget"] as const).map((mode) => (
              <label key={mode} className="inline-flex items-center gap-2 text-sm text-ink-100">
                <input
                  type="radio"
                  name="quantity-budget-mode"
                  checked={inputMode === mode}
                  onChange={() => onInputModeChange(mode)}
                  className="h-4 w-4 border-ink-500"
                />
                {mode === "quantity" ? "Quantidade de jogos" : "Valor que quero gastar"}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {inputMode === "quantity" ? (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink-100">Quantidade de jogos ({min}–{max})</span>
          <input
            type="number"
            min={min}
            max={max}
            value={numberOfTickets}
            onChange={(e) => onNumberOfTicketsChange(Number(e.target.value))}
            className="w-32 rounded-md border border-ink-500 px-2 py-1.5"
          />
        </label>
      ) : (
        <label className="block text-sm">
          <span className="mb-1 flex items-center gap-1.5 font-medium text-ink-100">
            Valor que quero gastar (R$)
            <InfoHelp title="Valor que quero gastar" body="Informe quanto você quer gastar; calculamos quantos jogos cabem nesse valor, sem nunca ultrapassá-lo." />
          </span>
          <input
            type="number"
            aria-label="Valor que quero gastar (R$)"
            min={0}
            step="0.5"
            value={budgetBRL}
            onChange={(e) => onBudgetChange(Number(e.target.value))}
            className="w-32 rounded-md border border-ink-500 px-2 py-1.5"
          />
        </label>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-ink-500 pt-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-ink-200">Preço por jogo</dt>
          <dd className="font-mono font-medium tabular-nums">{formatBRL(ticketCostBRL)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-200">Quantidade</dt>
          <dd className="font-mono font-medium tabular-nums">{effectiveN}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-200">Total</dt>
          <dd className="font-mono font-medium tabular-nums">{formatBRL(costUsed(effectiveN, ticketCostBRL))}</dd>
        </div>
        {inputMode === "budget" && (
          <div>
            <dt className="text-xs text-ink-200">Saldo não utilizado</dt>
            <dd className="font-mono font-medium tabular-nums">{formatBRL(remainingBalance(budgetBRL, effectiveN, ticketCostBRL))}</dd>
          </div>
        )}
      </dl>
      {effectiveN > max && (
        <p role="alert" className="text-sm font-medium text-rose-300">
          Essa quantidade passa do limite desta opção ({max} jogos). Reduza o valor ou informe a quantidade diretamente.
        </p>
      )}
    </div>
  );
}
