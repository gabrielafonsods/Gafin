import { roundMoney } from "@/utils/currency";
import type {
  Account,
  AccountExpenseTransaction,
  Card,
  CardExpenseTransaction,
  Invoice,
  Transaction,
  Transfer,
} from "@/database/schema";

/**
 * Cálculos puros (sem banco, sem Vue) de saldos, faturas, limites e do
 * resumo do Dashboard. Tudo é DERIVADO das movimentações: assim editar ou
 * excluir um lançamento nunca deixa um saldo salvo desatualizado.
 *
 * Regras:
 *  - Entrada soma na conta de destino.
 *  - Saída em dinheiro/PIX subtrai da conta na hora.
 *  - Compra no cartão NÃO mexe em conta; entra na fatura e consome limite.
 *  - Pagar a fatura subtrai da conta usada e libera o limite.
 *  - Transferência entre contas move saldo, mas não conta como entrada/saída.
 */

export interface FinanceSnapshot {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  invoices: Invoice[];
  transfers: Transfer[];
}

export type InvoiceStatus = "aberta" | "fechada" | "paga";

export function isCardExpense(t: Transaction): t is CardExpenseTransaction {
  return t.type === "saida" && t.paymentMethod === "cartao";
}

export function isAccountExpense(t: Transaction): t is AccountExpenseTransaction {
  return t.type === "saida" && t.paymentMethod !== "cartao";
}

export function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

export function getAccountBalance(account: Account, snapshot: FinanceSnapshot): number {
  const id = account.id;
  const incomes = snapshot.transactions.filter((t) => t.type === "entrada" && t.accountId === id);
  const expenses = snapshot.transactions.filter((t) => isAccountExpense(t) && t.accountId === id);
  const received = snapshot.transfers.filter((tr) => tr.toAccountId === id);
  const sent = snapshot.transfers.filter((tr) => tr.fromAccountId === id);
  const invoicePayments = snapshot.invoices.filter((inv) => inv.paidFromAccountId === id);

  return roundMoney(
    account.initialBalance +
      sumMoney(incomes.map((t) => t.amount)) -
      sumMoney(expenses.map((t) => t.amount)) +
      sumMoney(received.map((tr) => tr.amount)) -
      sumMoney(sent.map((tr) => tr.amount)) -
      sumMoney(invoicePayments.map((inv) => inv.paidAmount ?? 0)),
  );
}

export function getInvoiceTotal(invoice: Invoice, transactions: Transaction[]): number {
  return sumMoney(
    transactions.filter((t) => isCardExpense(t) && t.invoiceId === invoice.id).map((t) => t.amount),
  );
}

/** Aberta até o dia do fechamento (inclusive), fechada depois, paga quando quitada. */
export function getInvoiceStatus(invoice: Invoice, today: string): InvoiceStatus {
  if (invoice.paidAt) return "paga";
  return today > invoice.closingDate ? "fechada" : "aberta";
}

/** Limite usado = soma das faturas ainda não pagas do cartão. */
export function getCardLimitUsage(card: Card, snapshot: FinanceSnapshot) {
  const used = sumMoney(
    snapshot.invoices
      .filter((inv) => inv.cardId === card.id && !inv.paidAt)
      .map((inv) => getInvoiceTotal(inv, snapshot.transactions)),
  );
  return { limit: card.limit, used, available: roundMoney(card.limit - used) };
}

export function getUnpaidInvoicesTotal(snapshot: FinanceSnapshot): number {
  return sumMoney(
    snapshot.invoices
      .filter((inv) => !inv.paidAt)
      .map((inv) => getInvoiceTotal(inv, snapshot.transactions)),
  );
}

export interface BalanceSummary {
  /** Soma dos saldos de todas as contas. */
  saldoTotal: number;
  /** Saldo total menos o que já está comprometido em faturas não pagas. */
  saldoDisponivel: number;
  /** Faturas de cartão ainda não pagas (todas). */
  faturasEmAberto: number;
  /** Entradas reais do mês (transferências entre contas não entram). */
  entradasMes: number;
  /** Saídas reais do mês: dinheiro/PIX + faturas pagas no mês. */
  saidasMes: number;
  /** Compras no cartão feitas no mês (informativo; ainda não saiu da conta). */
  gastosCartaoMes: number;
}

/** `month` no formato "YYYY-MM". */
export function getMonthlySummary(snapshot: FinanceSnapshot, month: string): BalanceSummary {
  const inMonth = (date: string) => date.startsWith(month);

  const saldoTotal = sumMoney(snapshot.accounts.map((a) => getAccountBalance(a, snapshot)));
  const faturasEmAberto = getUnpaidInvoicesTotal(snapshot);

  const entradasMes = sumMoney(
    snapshot.transactions.filter((t) => t.type === "entrada" && inMonth(t.date)).map((t) => t.amount),
  );
  const saidasConta = sumMoney(
    snapshot.transactions.filter((t) => isAccountExpense(t) && inMonth(t.date)).map((t) => t.amount),
  );
  const faturasPagasNoMes = sumMoney(
    snapshot.invoices
      .filter((inv) => inv.paidAt !== undefined && inMonth(inv.paidAt))
      .map((inv) => inv.paidAmount ?? 0),
  );
  const gastosCartaoMes = sumMoney(
    snapshot.transactions.filter((t) => isCardExpense(t) && inMonth(t.date)).map((t) => t.amount),
  );

  return {
    saldoTotal,
    saldoDisponivel: roundMoney(saldoTotal - faturasEmAberto),
    faturasEmAberto,
    entradasMes,
    saidasMes: roundMoney(saidasConta + faturasPagasNoMes),
    gastosCartaoMes,
  };
}
