import {
  accountsRepository,
  cardsRepository,
  categoriesRepository,
  invoicesRepository,
  transactionsRepository,
} from "@/database/repositories";
import type {
  CardExpenseTransaction,
  CategoryKind,
  ExpenseTransaction,
  IncomeTransaction,
  Transaction,
} from "@/database/schema";
import { shiftDateByMonths } from "@/utils/date";
import { isCardExpense } from "./balanceCalculator";
import { DomainError } from "./errors";
import { resolveInvoiceCycle, shiftInvoiceCycle } from "./invoiceCycle";
import { getOrCreateInvoiceForCycle, pruneEmptyInvoice } from "./invoicesService";
import { requireISODate, requirePositiveMoney } from "./validation";

export const MAX_INSTALLMENTS = 48;

interface CommonInput {
  /** Valor da compra. Em compra parcelada no cartão, é o valor TOTAL. */
  amount: number;
  date: string;
  categoryId: number;
  description: string;
  /** Descrição personalizada para categorias "Outros". */
  customCategory?: string;
}

export interface IncomeInput extends CommonInput {
  /** Conta de destino. */
  accountId: number;
}

export type ExpenseInput = CommonInput &
  (
    | { paymentMethod: "dinheiro" | "pix"; accountId: number }
    | { paymentMethod: "cartao"; cardId: number; installments?: number }
  );

/**
 * Divide o total em parcelas em centavos exatos: a soma sempre fecha no
 * total e a sobra de centavos vai para as primeiras parcelas (100 em 3 =
 * 33,34 + 33,33 + 33,33).
 */
export function splitAmount(total: number, count: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}

function newGroupId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

async function buildCommon(input: CommonInput, kind: CategoryKind) {
  const amount = requirePositiveMoney(input.amount, "Valor");
  const date = requireISODate(input.date);

  const category = await categoriesRepository.getById(input.categoryId);
  if (!category || category.kind !== kind) throw new DomainError("Categoria inválida.");

  const customLabel = category.acceptsCustomLabel ? input.customCategory?.trim() : undefined;
  return {
    amount,
    date,
    categoryId: input.categoryId,
    description: input.description.trim(),
    ...(customLabel ? { customCategory: customLabel } : {}),
  };
}

/** Conta precisa existir e, se arquivada, só vale quando já era a mesma do lançamento editado. */
async function assertAccountUsable(accountId: number, unchangedId?: number): Promise<void> {
  const account = await accountsRepository.getById(accountId);
  if (!account) throw new DomainError("Conta não encontrada.");
  if (account.archived && accountId !== unchangedId) {
    throw new DomainError(`A conta "${account.name}" está arquivada.`);
  }
}

/** Compras de faturas já pagas ficam travadas para não quebrar o histórico. */
async function assertEditable(transaction: Transaction): Promise<void> {
  if (isCardExpense(transaction)) {
    const invoice = await invoicesRepository.getById(transaction.invoiceId);
    if (invoice?.paidAt) {
      throw new DomainError(
        "Esta compra pertence a uma fatura já paga. Desfaça o pagamento da fatura para alterá-la.",
      );
    }
  }
}

/** Todas as parcelas da mesma compra (ou só a própria transação, se não for parcelada). */
async function purchaseMembers(existing: Transaction): Promise<Transaction[]> {
  if (!isCardExpense(existing) || !existing.installment) return [existing];
  const { groupId } = existing.installment;
  const all = await transactionsRepository.getAll();
  return all.filter((t) => isCardExpense(t) && t.installment?.groupId === groupId);
}

function idsOf(transactions: readonly Transaction[]): number[] {
  return transactions.flatMap((t) => (t.id === undefined ? [] : [t.id]));
}

function cardInvoiceIdsOf(transactions: readonly Transaction[]): number[] {
  return [...new Set(transactions.filter(isCardExpense).map((t) => t.invoiceId))];
}

async function pruneInvoices(invoiceIds: readonly number[]): Promise<void> {
  for (const invoiceId of invoiceIds) await pruneEmptyInvoice(invoiceId);
}

/**
 * Monta os registros da saída (SEM gravar). Dinheiro/PIX viram um registro
 * que debita a conta. Cartão vira uma parcela por fatura, cada uma no ciclo
 * do seu mês; só o primeiro ciclo depende da data da compra.
 */
async function buildExpenseRecords(
  input: ExpenseInput,
  common: Awaited<ReturnType<typeof buildCommon>>,
  createdAt: string,
  touchedInvoiceIds: number[],
  previous?: ExpenseTransaction,
): Promise<ExpenseTransaction[]> {
  if (input.paymentMethod !== "cartao") {
    await assertAccountUsable(
      input.accountId,
      previous && !isCardExpense(previous) ? previous.accountId : undefined,
    );
    return [
      {
        ...common,
        type: "saida",
        paymentMethod: input.paymentMethod,
        accountId: input.accountId,
        createdAt,
      },
    ];
  }

  const card = await cardsRepository.getById(input.cardId);
  if (!card) throw new DomainError("Cartão não encontrado.");
  const sameCardAsBefore = previous !== undefined && isCardExpense(previous) && previous.cardId === card.id;
  if (card.archived && !sameCardAsBefore) throw new DomainError(`O cartão "${card.name}" está arquivado.`);

  const count = input.installments ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
    throw new DomainError(`Parcelas: informe de 1 a ${MAX_INSTALLMENTS}.`);
  }
  const amounts = splitAmount(common.amount, count);
  if (amounts.some((amount) => amount < 0.01)) {
    throw new DomainError("O valor é pequeno demais para esse número de parcelas.");
  }

  const baseCycle = resolveInvoiceCycle(common.date, card.closingDay, card.dueDay);
  const groupId = count > 1 ? newGroupId() : undefined;
  const records: ExpenseTransaction[] = [];

  for (let i = 0; i < count; i++) {
    const cycle = shiftInvoiceCycle(baseCycle, i, card.closingDay, card.dueDay);
    const invoice = await getOrCreateInvoiceForCycle(card, cycle);
    if (invoice.id !== undefined) touchedInvoiceIds.push(invoice.id);
    if (invoice.paidAt || invoice.id === undefined) {
      throw new DomainError(
        `A fatura de ${cycle.referenceMonth} já foi paga. Desfaça o pagamento ou escolha outra data.`,
      );
    }

    const record: CardExpenseTransaction = {
      ...common,
      amount: amounts[i] ?? 0,
      date: shiftDateByMonths(common.date, i),
      type: "saida",
      paymentMethod: "cartao",
      cardId: input.cardId,
      invoiceId: invoice.id,
      createdAt,
      ...(groupId
        ? { installment: { groupId, number: i + 1, count, totalAmount: common.amount } }
        : {}),
    };
    records.push(record);
  }
  return records;
}

export async function createIncome(input: IncomeInput): Promise<number> {
  const common = await buildCommon(input, "entrada");
  await assertAccountUsable(input.accountId);

  const record: IncomeTransaction = {
    ...common,
    type: "entrada",
    accountId: input.accountId,
    createdAt: new Date().toISOString(),
  };
  return transactionsRepository.create(record);
}

export async function updateIncome(id: number, input: IncomeInput): Promise<void> {
  const existing = await transactionsRepository.getById(id);
  if (!existing || existing.type !== "entrada") throw new DomainError("Entrada não encontrada.");

  const common = await buildCommon(input, "entrada");
  await assertAccountUsable(input.accountId, existing.accountId);

  const record: IncomeTransaction = {
    ...common,
    id,
    type: "entrada",
    accountId: input.accountId,
    createdAt: existing.createdAt,
  };
  await transactionsRepository.update(record);
}

/**
 * Dinheiro/PIX debitam a conta na hora. Cartão entra na fatura do ciclo da
 * data da compra (uma parcela por fatura, se parcelado) e só afeta a conta
 * quando a fatura for paga. Devolve o id da primeira parcela.
 */
export async function createExpense(input: ExpenseInput): Promise<number> {
  const common = await buildCommon(input, "saida");
  const touched: number[] = [];

  try {
    const records = await buildExpenseRecords(input, common, new Date().toISOString(), touched);
    const [firstId] = await transactionsRepository.createMany(records);
    if (firstId === undefined) throw new DomainError("Não foi possível salvar a saída.");
    return firstId;
  } catch (error) {
    await pruneInvoices(touched); // não deixa faturas vazias para trás
    throw error;
  }
}

/**
 * Editar uma parcela edita a COMPRA inteira: as parcelas antigas são
 * substituídas pelas novas numa única transação (tudo ou nada).
 */
export async function updateExpense(id: number, input: ExpenseInput): Promise<void> {
  const existing = await transactionsRepository.getById(id);
  if (!existing || existing.type !== "saida") throw new DomainError("Saída não encontrada.");

  const members = await purchaseMembers(existing);
  for (const member of members) await assertEditable(member);

  const common = await buildCommon(input, "saida");
  const touched: number[] = [];

  try {
    const records = await buildExpenseRecords(input, common, existing.createdAt, touched, existing);
    const [only] = records;

    if (only !== undefined && records.length === 1 && members.length === 1) {
      await transactionsRepository.update({ ...only, id });
    } else {
      await transactionsRepository.applyChanges({ remove: idsOf(members), add: records });
    }
  } catch (error) {
    await pruneInvoices(touched);
    throw error;
  }

  await pruneInvoices(cardInvoiceIdsOf(members));
}

/** Exclui entrada ou saída. Em compra parcelada, exclui todas as parcelas. */
export async function deleteTransaction(id: number): Promise<void> {
  const existing = await transactionsRepository.getById(id);
  if (!existing) return;

  const members = await purchaseMembers(existing);
  for (const member of members) await assertEditable(member);

  await transactionsRepository.applyChanges({ remove: idsOf(members) });
  await pruneInvoices(cardInvoiceIdsOf(members));
}
