import { computed, ref } from "vue";
import {
  accountsRepository,
  cardsRepository,
  categoriesRepository,
  invoicesRepository,
  recurrencesRepository,
  transactionsRepository,
  transfersRepository,
} from "@/database/repositories";
import type {
  Account,
  Card,
  Category,
  Invoice,
  Recurrence,
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
  getBudgetProgress,
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
import {
  createCategory,
  deleteCategory,
  renameCategory,
  setCategoryArchived,
  setCategoryBudget,
} from "@/services/categoriesService";
import { DomainError } from "@/services/errors";
import {
  createRecurrence,
  deleteRecurrence,
  generateDueTransactions,
  setRecurrenceActive,
  updateRecurrence,
  type RecurrenceInput,
  type RecurrenceRunResult,
} from "@/services/recurrencesService";
import { monthlyEquivalent, nextOccurrence } from "@/services/recurrenceSchedule";
import type { CategoryKind } from "@/database/schema";
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
const recurrences = ref<Recurrence[]>([]);
/** Ocorrências que o gerador não conseguiu lançar (mostradas em Recorrentes até o usuário dispensar). */
const recurrenceNotice = ref<RecurrenceRunResult["skipped"]>([]);
const loaded = ref(false);
const loading = ref(false);

async function loadAll(): Promise<void> {
  loading.value = true;
  try {
    const [a, c, cat, t, i, tr, rec] = await Promise.all([
      accountsRepository.getAll(),
      cardsRepository.getAll(),
      categoriesRepository.getAll(),
      transactionsRepository.getAll(),
      invoicesRepository.getAll(),
      transfersRepository.getAll(),
      recurrencesRepository.getAll(),
    ]);
    accounts.value = a;
    cards.value = c;
    categories.value = cat;
    transactions.value = t;
    invoices.value = i;
    transfers.value = tr;
    recurrences.value = rec;
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

/** Categorias arquivadas ficam fora dos formulários (mas seguem no histórico). */
const incomeCategories = computed(() =>
  categories.value.filter((c) => c.kind === "entrada" && !c.archived),
);
const expenseCategories = computed(() =>
  categories.value.filter((c) => c.kind === "saida" && !c.archived),
);

/** Cada recorrência com o nome do destino e a próxima data. */
const recurrenceViews = computed(() =>
  recurrences.value
    .map((rule) => {
      const targetName =
        "cardId" in rule
          ? (cards.value.find((c) => c.id === rule.cardId)?.name ?? "Cartão removido")
          : (accounts.value.find((a) => a.id === rule.accountId)?.name ?? "Conta removida");
      return {
        rule,
        targetName,
        next: rule.active ? nextOccurrence(rule, rule.generatedThrough) : null,
        perMonth: monthlyEquivalent(rule.frequency, rule.amount),
      };
    })
    .sort((a, b) => (a.next ?? "9999").localeCompare(b.next ?? "9999")),
);

/** Resumo do mês corrente, usado pelo Dashboard do Início. */
const summary = computed(() => getMonthlySummary(snapshot.value, monthKey(todayISO())));

/** Resumo de qualquer mês ("YYYY-MM"), para as telas com navegação de mês. */
const summaryFor = (month: string) => getMonthlySummary(snapshot.value, month);
const breakdownFor = (month: string, kind: "entrada" | "saida") =>
  getCategoryBreakdown(snapshot.value, categories.value, month, kind);
const statementFor = (filter: StatementFilter = {}) =>
  buildStatement(snapshot.value, categories.value, filter);
const budgetFor = (month: string) => getBudgetProgress(snapshot.value, categories.value, month);
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

/** Lança as recorrências vencidas e recarrega. Seguro de rodar quantas vezes for preciso. */
let recurrenceRun: Promise<RecurrenceRunResult> | null = null;

async function runRecurrences(): Promise<RecurrenceRunResult> {
  // Duas execuções simultâneas leriam o mesmo estado e lançariam em dobro: enfileira.
  while (recurrenceRun) await recurrenceRun.catch(() => undefined);

  recurrenceRun = (async () => {
    const result = await generateDueTransactions();
    if (result.skipped.length > 0) recurrenceNotice.value = result.skipped;
    await loadAll();
    return result;
  })();
  try {
    return await recurrenceRun;
  } finally {
    recurrenceRun = null;
  }
}

async function addRecurrence(input: RecurrenceInput): Promise<number> {
  const id = await createRecurrence(input);
  await runRecurrences(); // lança já as ocorrências atrasadas (se a data inicial é passada)
  return id;
}

async function editRecurrence(id: number, input: RecurrenceInput): Promise<void> {
  await updateRecurrence(id, input);
  await runRecurrences();
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
    recurrences,
    recurrenceNotice,
    loaded,
    snapshot,
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
    budgetFor,
    recurrenceViews,
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
    // recorrências
    addRecurrence,
    editRecurrence,
    toggleRecurrence: (id: number, active: boolean) => mutate(() => setRecurrenceActive(id, active)),
    removeRecurrence: (id: number) => mutate(() => deleteRecurrence(id)),
    runRecurrences,
    dismissRecurrenceNotice: () => {
      recurrenceNotice.value = [];
    },
    // categorias
    addCategory: (input: { name: string; kind: CategoryKind }) => mutate(() => createCategory(input)),
    renameCategory: (id: number, name: string) => mutate(() => renameCategory(id, name)),
    setCategoryBudget: (id: number, amount: number | null) => mutate(() => setCategoryBudget(id, amount)),
    setCategoryArchived: (id: number, archived: boolean) =>
      mutate(() => setCategoryArchived(id, archived)),
    removeCategory: (id: number) => mutate(() => deleteCategory(id)),
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
