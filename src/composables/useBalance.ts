import { computed, ref } from "vue";
import {
  accountsRepository,
  cardsRepository,
  categoriesRepository,
  invoicesRepository,
  transactionsRepository,
  transfersRepository,
} from "@/database/repositories";
import type {
  Account,
  Card,
  Category,
  Invoice,
  Transaction,
  Transfer,
} from "@/database/schema";
import {
  archiveAccount,
  createAccount,
  deleteAccount,
  unarchiveAccount,
  updateAccount,
  type AccountInput,
} from "@/services/accountsService";
import {
  getAccountBalance,
  getCardLimitUsage,
  getMonthlySummary,
  type FinanceSnapshot,
} from "@/services/balanceCalculator";
import {
  buildInvoiceViews,
  buildStatement,
  getCategoryBreakdown,
  getInvoiceItems,
  getUpcomingInvoices,
  type StatementFilter,
} from "@/services/balanceViews";
import {
  archiveCard,
  createCard,
  deleteCard,
  unarchiveCard,
  updateCard,
  type CardInput,
} from "@/services/cardsService";
import { DomainError } from "@/services/errors";
import { payInvoice, undoInvoicePayment } from "@/services/invoicesService";
import {
  createExpense,
  createIncome,
  deleteTransaction,
  updateExpense,
  updateIncome,
  type ExpenseInput,
  type IncomeInput,
} from "@/services/transactionsService";
import {
  createTransfer,
  deleteTransfer,
  updateTransfer,
  type TransferInput,
} from "@/services/transfersService";
import { roundMoney } from "@/utils/currency";
import { monthKey, todayISO } from "@/utils/date";

/*
 * Estado compartilhado do módulo Saldo (mesmo padrão do useInvestments:
 * refs em nível de módulo, sem Pinia). Toda alteração passa pelos services
 * (que validam e persistem) e depois recarrega o estado, então o Dashboard
 * e as telas sempre refletem o que está gravado no IndexedDB.
 */
const accounts = ref<Account[]>([]);
const cards = ref<Card[]>([]);
const categories = ref<Category[]>([]);
const transactions = ref<Transaction[]>([]);
const invoices = ref<Invoice[]>([]);
const transfers = ref<Transfer[]>([]);
const loaded = ref(false);
const loading = ref(false);

async function loadAll(): Promise<void> {
  loading.value = true;
  try {
    const [a, c, cat, t, i, tr] = await Promise.all([
      accountsRepository.getAll(),
      cardsRepository.getAll(),
      categoriesRepository.getAll(),
      transactionsRepository.getAll(),
      invoicesRepository.getAll(),
      transfersRepository.getAll(),
    ]);
    accounts.value = a;
    cards.value = c;
    categories.value = cat;
    transactions.value = t;
    invoices.value = i;
    transfers.value = tr;
    loaded.value = true;
  } finally {
    loading.value = false;
  }
}

/** Executa uma operação de escrita e recarrega o estado em seguida. */
async function mutate<T>(operation: () => Promise<T>): Promise<T> {
  const result = await operation();
  await loadAll();
  return result;
}

const snapshot = computed<FinanceSnapshot>(() => ({
  accounts: accounts.value,
  cards: cards.value,
  transactions: transactions.value,
  invoices: invoices.value,
  transfers: transfers.value,
}));

const accountBalances = computed(() =>
  accounts.value.map((account) => ({
    account,
    balance: getAccountBalance(account, snapshot.value),
  })),
);

const cardUsage = computed(() =>
  cards.value.map((card) => ({ card, ...getCardLimitUsage(card, snapshot.value) })),
);

/** Contas e cartões arquivados não aparecem nos formulários de lançamento. */
const activeAccounts = computed(() => accounts.value.filter((a) => !a.archived));
const activeCards = computed(() => cards.value.filter((c) => !c.archived));

/** Faturas com cartão, total e status, da mais recente para a mais antiga. */
const invoiceViews = computed(() =>
  buildInvoiceViews(snapshot.value, todayISO()).sort((a, b) =>
    b.invoice.dueDate.localeCompare(a.invoice.dueDate),
  ),
);

/** Faturas a pagar (com compras), pelo vencimento mais próximo. */
const upcomingInvoices = computed(() => getUpcomingInvoices(snapshot.value, todayISO()));

const incomeCategories = computed(() => categories.value.filter((c) => c.kind === "entrada"));
const expenseCategories = computed(() => categories.value.filter((c) => c.kind === "saida"));

/** Resumo do mês corrente, usado pelo Dashboard do Início. */
const summary = computed(() => getMonthlySummary(snapshot.value, monthKey(todayISO())));

/** Resumo de qualquer mês ("YYYY-MM"), para as telas com navegação de mês. */
const summaryFor = (month: string) => getMonthlySummary(snapshot.value, month);
const breakdownFor = (month: string, kind: "entrada" | "saida") =>
  getCategoryBreakdown(snapshot.value, categories.value, month, kind);
const statementFor = (filter: StatementFilter = {}) =>
  buildStatement(snapshot.value, categories.value, filter);
const invoiceItemsFor = (invoice: Invoice) =>
  getInvoiceItems(invoice, transactions.value, categories.value);

export interface AccountFormInput {
  name: string;
  type: AccountInput["type"];
  /** Na criação: saldo inicial. Na edição: saldo ATUAL desejado. */
  balance: number;
}

async function addAccount(input: AccountFormInput): Promise<number> {
  return mutate(() =>
    createAccount({ name: input.name, type: input.type, initialBalance: input.balance }),
  );
}

/**
 * Editar o saldo ajusta o saldo inicial na diferença, para que o saldo
 * ATUAL fique exatamente no valor informado sem apagar o histórico.
 */
async function editAccount(id: number, input: AccountFormInput): Promise<void> {
  const current = accountBalances.value.find((item) => item.account.id === id);
  if (!current) throw new DomainError("Conta não encontrada.");
  const initialBalance = roundMoney(
    current.account.initialBalance + (input.balance - current.balance),
  );
  await mutate(() => updateAccount(id, { name: input.name, type: input.type, initialBalance }));
}

export function useBalance() {
  if (!loaded.value && !loading.value) {
    void loadAll();
  }

  return {
    // dados
    accounts,
    cards,
    categories,
    transactions,
    invoices,
    transfers,
    loaded,
    // derivados
    accountBalances,
    cardUsage,
    activeAccounts,
    activeCards,
    invoiceViews,
    upcomingInvoices,
    incomeCategories,
    expenseCategories,
    summary,
    summaryFor,
    breakdownFor,
    statementFor,
    invoiceItemsFor,
    // contas
    addAccount,
    editAccount,
    removeAccount: (id: number) => mutate(() => deleteAccount(id)),
    archiveAccount: (id: number) => mutate(() => archiveAccount(id)),
    unarchiveAccount: (id: number) => mutate(() => unarchiveAccount(id)),
    // cartões
    addCard: (input: CardInput) => mutate(() => createCard(input)),
    editCard: (id: number, input: CardInput) => mutate(() => updateCard(id, input)),
    removeCard: (id: number) => mutate(() => deleteCard(id)),
    archiveCard: (id: number) => mutate(() => archiveCard(id)),
    unarchiveCard: (id: number) => mutate(() => unarchiveCard(id)),
    // entradas e saídas
    addIncome: (input: IncomeInput) => mutate(() => createIncome(input)),
    editIncome: (id: number, input: IncomeInput) => mutate(() => updateIncome(id, input)),
    addExpense: (input: ExpenseInput) => mutate(() => createExpense(input)),
    editExpense: (id: number, input: ExpenseInput) => mutate(() => updateExpense(id, input)),
    removeTransaction: (id: number) => mutate(() => deleteTransaction(id)),
    // transferências entre contas
    addTransfer: (input: TransferInput) => mutate(() => createTransfer(input)),
    editTransfer: (id: number, input: TransferInput) => mutate(() => updateTransfer(id, input)),
    removeTransfer: (id: number) => mutate(() => deleteTransfer(id)),
    // faturas
    payInvoice: (invoiceId: number, accountId: number, paidAt?: string) =>
      mutate(() => payInvoice(invoiceId, accountId, paidAt)),
    undoInvoicePayment: (invoiceId: number) => mutate(() => undoInvoicePayment(invoiceId)),
    reload: loadAll,
  };
}
