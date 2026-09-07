export function formatBRL(valueBRL: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valueBRL);
}

/** Number of simple tickets that fit a budget without exceeding it. */
export function ticketsForBudget(budgetBRL: number, ticketCostBRL: number): number {
  if (ticketCostBRL <= 0) throw new RangeError("ticketCostBRL must be greater than zero");
  if (budgetBRL < 0) throw new RangeError("budgetBRL must not be negative");
  return Math.floor(budgetBRL / ticketCostBRL);
}

export function costUsed(numberOfTickets: number, ticketCostBRL: number): number {
  return Math.round(numberOfTickets * ticketCostBRL * 100) / 100;
}

export function remainingBalance(budgetBRL: number, numberOfTickets: number, ticketCostBRL: number): number {
  return Math.round((budgetBRL - costUsed(numberOfTickets, ticketCostBRL)) * 100) / 100;
}
