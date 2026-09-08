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
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-700">
          Quantidade de jogos: <strong>{n}</strong>
        </p>
        <p className="mt-1 text-xs text-slate-500">Esta opção foi criada e validada para exatamente {n} jogos.</p>
        <p className="mt-2 text-sm font-medium text-slate-800">Custo total: {formatBRL(costUsed(n, ticketCostBRL))}</p>
      </div>
    );
  }

  const min = strategy.ticketCount.min ?? 1;
  const max = strategy.ticketCount.max ?? 50;
  const effectiveN = inputMode === "budget" ? ticketsForBudget(budgetBRL, ticketCostBRL) : numberOfTickets;

  return (
    <div className="space-y-3">
      {strategy.supportsBudget && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Como você quer definir a quantidade">
          {(["quantity", "budget"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={inputMode === mode}
              onClick={() => onInputModeChange(mode)}
              className={`rounded-md border px-3 py-1.5 text-sm ${inputMode === mode ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
            >
              {mode === "quantity" ? "Por quantidade" : "Por valor que quero gastar"}
            </button>
          ))}
        </div>
      )}

      {inputMode === "quantity" ? (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Quantidade de jogos ({min}–{max})</span>
          <input
            type="number"
            min={min}
            max={max}
            value={numberOfTickets}
            onChange={(e) => onNumberOfTicketsChange(Number(e.target.value))}
            className="w-32 rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
      ) : (
        <label className="block text-sm">
          <span className="mb-1 flex items-center gap-1.5 font-medium text-slate-700">
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
            className="w-32 rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Preço por jogo</dt>
          <dd className="font-medium">{formatBRL(ticketCostBRL)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Quantidade</dt>
          <dd className="font-medium">{effectiveN}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Total</dt>
          <dd className="font-medium">{formatBRL(costUsed(effectiveN, ticketCostBRL))}</dd>
        </div>
        {inputMode === "budget" && (
          <div>
            <dt className="text-xs text-slate-500">Saldo não utilizado</dt>
            <dd className="font-medium">{formatBRL(remainingBalance(budgetBRL, effectiveN, ticketCostBRL))}</dd>
          </div>
        )}
      </dl>
      {effectiveN > max && (
        <p role="alert" className="text-sm font-medium text-rose-700">
          Essa quantidade passa do limite desta opção ({max} jogos). Reduza o valor ou informe a quantidade diretamente.
        </p>
      )}
    </div>
  );
}
