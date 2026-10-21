import { roundMoney } from "@/utils/currency";
import type {
  Card,
  Category,
  CardExpenseTransaction,
  Invoice,
  Transaction,
} from "@/database/schema";
import { PAYMENT_METHOD_LABELS } from "@/types/balance";
import {
  getInvoiceStatus,
  getInvoiceTotal,
  isCardExpense,
  sumMoney,
  type FinanceSnapshot,
  type InvoiceStatus,
} from "./balanceCalculator";

/*
 * Visões prontas para as telas do Saldo (extrato, categorias, faturas).
 * Funções puras: recebem os dados já carregados e devolvem listas
 * ordenadas — nenhuma regra de negócio fica dentro dos componentes.
 */

export type StatementKind =
  | "entrada"
  | "saida"
  | "compra_cartao"
  | "transferencia"
  | "pagamento_fatura";

export interface StatementEntry {
  key: string;
  kind: StatementKind;
  date: string;
  title: string;
  subtitle: string;
  /** Sempre positivo; o efeito no saldo vem de `direction`. */
  amount: number;
  /** in/out = mexe no saldo de uma conta; neutral = não mexe (compra no cartão, transferência). */
  direction: "in" | "out" | "neutral";
  transactionId?: number;
  transferId?: number;
  invoiceId?: number;
  /** Gerado por um lançamento recorrente. */
  recurring?: boolean;
  sortKey: string;
}

export interface StatementFilter {
  /** "YYYY-MM" */
  month?: string;
  /** Mostra só o que toca essa conta (extrato da conta). */
  accountId?: number;
}

export function installmentLabel(transaction: CardExpenseTransaction): string {
  const { installment } = transaction;
  return installment ? `${installment.number}/${installment.count}` : "";
}

function categoryLabel(transaction: Transaction, categories: readonly Category[]): string {
  const category = categories.find((c) => c.id === transaction.categoryId);
  return transaction.customCategory || category?.name || "Sem categoria";
}

/** Extrato unificado: entradas, saídas, compras no cartão, transferências e pagamentos de fatura. */
export function buildStatement(
  snapshot: FinanceSnapshot,
  categories: readonly Category[],
  filter: StatementFilter = {},
): StatementEntry[] {
  const accountName = (id: number) => snapshot.accounts.find((a) => a.id === id)?.name ?? "Conta removida";
  const cardName = (id: number) => snapshot.cards.find((c) => c.id === id)?.name ?? "Cartão removido";
  const inMonth = (date: string) => !filter.month || date.startsWith(filter.month);
  const entries: StatementEntry[] = [];

  for (const t of snapshot.transactions) {
    if (!inMonth(t.date)) continue;
    const base = {
      date: t.date,
      title: categoryLabel(t, categories),
      amount: t.amount,
      transactionId: t.id,
      recurring: t.recurrenceId !== undefined,
      sortKey: `${t.date}|${t.createdAt}|${t.id ?? 0}`,
    };

    if (t.type === "entrada") {
      if (filter.accountId !== undefined && t.accountId !== filter.accountId) continue;
      entries.push({
        ...base,
        key: `t${t.id}`,
        kind: "entrada",
        subtitle: [t.description, accountName(t.accountId)].filter(Boolean).join(" · "),
        direction: "in",
      });
    } else if (isCardExpense(t)) {
      if (filter.accountId !== undefined) continue;
      const parcel = installmentLabel(t);
      entries.push({
        ...base,
        key: `t${t.id}`,
        kind: "compra_cartao",
        subtitle: [t.description, `Cartão ${cardName(t.cardId)}`, parcel && `parcela ${parcel}`]
          .filter(Boolean)
          .join(" · "),
        direction: "neutral",
      });
    } else {
      if (filter.accountId !== undefined && t.accountId !== filter.accountId) continue;
      entries.push({
        ...base,
        key: `t${t.id}`,
        kind: "saida",
        subtitle: [t.description, PAYMENT_METHOD_LABELS[t.paymentMethod], accountName(t.accountId)]
          .filter(Boolean)
          .join(" · "),
        direction: "out",
      });
    }
  }

  for (const tr of snapshot.transfers) {
    if (!inMonth(tr.date)) continue;
    const touches =
      filter.accountId === undefined ||
      tr.fromAccountId === filter.accountId ||
      tr.toAccountId === filter.accountId;
    if (!touches) continue;

    entries.push({
      key: `tr${tr.id}`,
      kind: "transferencia",
      date: tr.date,
      title: "Transferência",
      subtitle: [`${accountName(tr.fromAccountId)} → ${accountName(tr.toAccountId)}`, tr.description]
        .filter(Boolean)
        .join(" · "),
      amount: tr.amount,
      direction:
        filter.accountId === undefined
          ? "neutral"
          : tr.fromAccountId === filter.accountId
            ? "out"
            : "in",
      transferId: tr.id,
      sortKey: `${tr.date}|${tr.createdAt}|${tr.id ?? 0}`,
    });
  }

  for (const invoice of snapshot.invoices) {
    if (!invoice.paidAt || invoice.paidFromAccountId === undefined) continue;
    if (!inMonth(invoice.paidAt)) continue;
    if (filter.accountId !== undefined && invoice.paidFromAccountId !== filter.accountId) continue;

    entries.push({
      key: `inv${invoice.id}`,
      kind: "pagamento_fatura",
      date: invoice.paidAt,
      title: `Fatura ${cardName(invoice.cardId)}`,
      subtitle: `Pagamento · ${accountName(invoice.paidFromAccountId)}`,
      amount: invoice.paidAmount ?? 0,
      direction: "out",
      invoiceId: invoice.id,
      sortKey: `${invoice.paidAt}|~|${invoice.id ?? 0}`,
    });
  }

  return entries.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

export interface CategorySlice {
  categoryId: number;
  name: string;
  total: number;
  percent: number;
}

export interface BudgetProgress {
  categoryId: number;
  name: string;
  budget: number;
  spent: number;
  /** Pode passar de 100 (estourou o orçamento). */
  percent: number;
  /** Negativo quando estourou. */
  remaining: number;
}

/** Quanto cada categoria com orçamento já gastou no mês (compras no cartão incluídas, pela data da parcela). */
export function getBudgetProgress(
  snapshot: FinanceSnapshot,
  categories: readonly Category[],
  month: string,
): BudgetProgress[] {
  return categories
    .filter((c) => c.kind === "saida" && !c.archived && c.monthlyBudget !== undefined && c.monthlyBudget > 0)
    .map((category) => {
      const budget = category.monthlyBudget as number;
      const spent = sumMoney(
        snapshot.transactions
          .filter((t) => t.type === "saida" && t.categoryId === category.id && t.date.startsWith(month))
          .map((t) => t.amount),
      );
      return {
        categoryId: category.id as number,
        name: category.name,
        budget,
        spent,
        percent: (spent / budget) * 100,
        remaining: roundMoney(budget - spent),
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

/**
 * Total por categoria no mês. Saídas incluem compras no cartão (por data da
 * parcela) — é "em que você gastou", não só o que saiu da conta.
 */
export function getCategoryBreakdown(
  snapshot: FinanceSnapshot,
  categories: readonly Category[],
  month: string,
  kind: "entrada" | "saida",
): CategorySlice[] {
  const totals = new Map<number, number>();
  for (const t of snapshot.transactions) {
    if (t.type !== kind || !t.date.startsWith(month)) continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }

  const grand = sumMoney([...totals.values()]);
  return [...totals.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      name: categories.find((c) => c.id === categoryId)?.name ?? "Sem categoria",
      total: roundMoney(total),
      percent: grand > 0 ? (total / grand) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface InvoiceView {
  invoice: Invoice;
  card: Card | undefined;
  total: number;
  status: InvoiceStatus;
}

export function buildInvoiceViews(snapshot: FinanceSnapshot, today: string): InvoiceView[] {
  return snapshot.invoices.map((invoice) => ({
    invoice,
    card: snapshot.cards.find((c) => c.id === invoice.cardId),
    total: getInvoiceTotal(invoice, snapshot.transactions),
    status: getInvoiceStatus(invoice, today),
  }));
}

/** Faturas ainda não pagas e com compras, pelo vencimento mais próximo. */
export function getUpcomingInvoices(snapshot: FinanceSnapshot, today: string): InvoiceView[] {
  return buildInvoiceViews(snapshot, today)
    .filter((view) => view.status !== "paga" && view.total > 0)
    .sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate));
}

export interface InvoiceItem {
  transaction: CardExpenseTransaction;
  title: string;
  parcel: string;
}

/** Compras que compõem uma fatura, da mais antiga para a mais nova. */
export function getInvoiceItems(
  invoice: Invoice,
  transactions: readonly Transaction[],
  categories: readonly Category[],
): InvoiceItem[] {
  return transactions
    .filter((t): t is CardExpenseTransaction => isCardExpense(t) && t.invoiceId === invoice.id)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0))
    .map((transaction) => ({
      transaction,
      title: transaction.description || categoryLabel(transaction, categories),
      parcel: installmentLabel(transaction),
    }));
}
