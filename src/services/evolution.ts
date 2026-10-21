import type { Asset, InvestmentOperation } from "@/database/schema";
import { roundMoney } from "@/utils/currency";
import { endOfMonth } from "@/utils/date";
import { isAccountExpense, getMonthlySummary, sumMoney, type FinanceSnapshot } from "./balanceCalculator";
import { replayOperations } from "./portfolioCalculator";

/*
 * Séries históricas para os gráficos de evolução — funções puras. Tudo é
 * reconstruído das movimentações gravadas; não existe "foto" mensal salva.
 */

export interface MonthFlow {
  month: string;
  entradas: number;
  saidas: number;
}

/** Entradas e saídas reais (conta) de cada mês. Compras no cartão entram quando a fatura é paga. */
export function getMonthlyFlow(snapshot: FinanceSnapshot, months: readonly string[]): MonthFlow[] {
  return months.map((month) => {
    const summary = getMonthlySummary(snapshot, month);
    return { month, entradas: summary.entradasMes, saidas: summary.saidasMes };
  });
}

export interface BalancePoint {
  month: string;
  balance: number;
}

/**
 * Saldo total das contas no fim de cada mês: saldo inicial das contas mais o
 * que entrou, menos o que saiu e o que foi pago de fatura até aquela data.
 * Transferências entre contas se anulam no total.
 */
export function getBalanceHistory(snapshot: FinanceSnapshot, months: readonly string[]): BalancePoint[] {
  const initial = sumMoney(snapshot.accounts.map((account) => account.initialBalance));

  return months.map((month) => {
    const until = endOfMonth(month);
    const incomes = sumMoney(
      snapshot.transactions.filter((t) => t.type === "entrada" && t.date <= until).map((t) => t.amount),
    );
    const expenses = sumMoney(
      snapshot.transactions.filter((t) => isAccountExpense(t) && t.date <= until).map((t) => t.amount),
    );
    const payments = sumMoney(
      snapshot.invoices
        .filter((inv) => inv.paidAt !== undefined && inv.paidAt <= until)
        .map((inv) => inv.paidAmount ?? 0),
    );
    return { month, balance: roundMoney(initial + incomes - expenses - payments) };
  });
}

export interface InvestedPoint {
  month: string;
  invested: number;
}

/** Quanto estava investido (custo das posições em aberto) no fim de cada mês. */
export function getInvestedHistory(
  assets: readonly Asset[],
  operations: readonly InvestmentOperation[],
  months: readonly string[],
): InvestedPoint[] {
  return months.map((month) => {
    const until = endOfMonth(month);
    const invested = sumMoney(
      assets.map((asset) =>
        replayOperations(operations.filter((op) => op.assetId === asset.id && op.date <= until)).position
          .investedValue,
      ),
    );
    return { month, invested };
  });
}

export interface WealthPoint {
  month: string;
  balance: number;
  invested: number;
  total: number;
}

/** Patrimônio ao longo do tempo: contas + investido (custo — não há histórico de cotações). */
export function getWealthHistory(
  snapshot: FinanceSnapshot,
  assets: readonly Asset[],
  operations: readonly InvestmentOperation[],
  months: readonly string[],
): WealthPoint[] {
  const balances = getBalanceHistory(snapshot, months);
  const invested = getInvestedHistory(assets, operations, months);
  return months.map((month, i) => {
    const balance = balances[i]?.balance ?? 0;
    const cost = invested[i]?.invested ?? 0;
    return { month, balance, invested: cost, total: roundMoney(balance + cost) };
  });
}
