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
  getAccountBalance,
  getCardLimitUsage,
  getInvoiceStatus,
  getInvoiceTotal,
  getMonthlySummary,
  type FinanceSnapshot,
} from "@/services/balanceCalculator";
import { roundMoney } from "@/utils/currency";
import { monthKey, todayISO } from "@/utils/date";
import { createAccount, deleteAccount, updateAccount, type AccountInput } from "@/services/accountsService";
import { createCard, deleteCard, updateCard, type CardInput } from "@/services/cardsService";
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
import { createTransfer, deleteTransfer, type TransferInput } from "@/services/transfersService";
import { DomainError } from "@/services/errors";

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

/** Faturas com total e status, da mais recente para a mais antiga. */
const invoiceViews = computed(() => {
  const today = todayISO();
  return invoices.value
    .map((invoice) => ({
      invoice,
      total: getInvoiceTotal(invoice, transactions.value),
      status: getInvoiceStatus(invoice, today),
    }))
    .sort((a, b) => b.invoice.dueDate.localeCompare(a.invoice.dueDate));
});

const incomeCategories = computed(() => categories.value.filter((c) => c.kind === "entrada"));
const expenseCategories = computed(() => categories.value.filter((c) => c.kind === "saida"));

/** Resumo do mês corrente, usado pelo Dashboard. */
const summary = computed(() => getMonthlySummary(snapshot.value, monthKey(todayISO())));

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
    invoiceViews,
    incomeCategories,
    expenseCategories,
    summary,
    // contas
    addAccount,
    editAccount,
    removeAccount: (id: number) => mutate(() => deleteAccount(id)),
    // cartões
    addCard: (input: CardInput) => mutate(() => createCard(input)),
    editCard: (id: number, input: CardInput) => mutate(() => updateCard(id, input)),
    removeCard: (id: number) => mutate(() => deleteCard(id)),
    // entradas e saídas
    addIncome: (input: IncomeInput) => mutate(() => createIncome(input)),
    editIncome: (id: number, input: IncomeInput) => mutate(() => updateIncome(id, input)),
    addExpense: (input: ExpenseInput) => mutate(() => createExpense(input)),
    editExpense: (id: number, input: ExpenseInput) => mutate(() => updateExpense(id, input)),
    removeTransaction: (id: number) => mutate(() => deleteTransaction(id)),
    // transferências entre contas
    addTransfer: (input: TransferInput) => mutate(() => createTransfer(input)),
    removeTransfer: (id: number) => mutate(() => deleteTransfer(id)),
    // faturas
    payInvoice: (invoiceId: number, accountId: number, paidAt?: string) =>
      mutate(() => payInvoice(invoiceId, accountId, paidAt)),
    undoInvoicePayment: (invoiceId: number) => mutate(() => undoInvoicePayment(invoiceId)),
    reload: loadAll,
  };
}
