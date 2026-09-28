import {
  accountsRepository,
  cardsRepository,
  categoriesRepository,
  invoicesRepository,
  transactionsRepository,
} from "@/database/repositories";
import type {
  CategoryKind,
  ExpenseTransaction,
  IncomeTransaction,
  Transaction,
} from "@/database/schema";
import { DomainError } from "./errors";
import { getOrCreateInvoiceForPurchase, pruneEmptyInvoice } from "./invoicesService";
import { requireISODate, requirePositiveMoney } from "./validation";

interface CommonInput {
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
    | { paymentMethod: "cartao"; cardId: number }
  );

type ExpenseTarget =
  | { paymentMethod: "dinheiro" | "pix"; accountId: number }
  | { paymentMethod: "cartao"; cardId: number; invoiceId: number };

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

async function assertAccountExists(accountId: number): Promise<void> {
  if (!(await accountsRepository.getById(accountId))) {
    throw new DomainError("Conta não encontrada.");
  }
}

async function resolveExpenseTarget(input: ExpenseInput, date: string): Promise<ExpenseTarget> {
  if (input.paymentMethod === "cartao") {
    const card = await cardsRepository.getById(input.cardId);
    if (!card) throw new DomainError("Cartão não encontrado.");

    const invoice = await getOrCreateInvoiceForPurchase(card, date);
    if (invoice.paidAt || invoice.id === undefined) {
      throw new DomainError(
        "A fatura desse período já foi paga. Desfaça o pagamento ou escolha outra data.",
      );
    }
    return { paymentMethod: "cartao", cardId: input.cardId, invoiceId: invoice.id };
  }

  await assertAccountExists(input.accountId);
  return { paymentMethod: input.paymentMethod, accountId: input.accountId };
}

/** Compras de faturas já pagas ficam travadas para não quebrar o histórico. */
async function assertEditable(transaction: Transaction): Promise<void> {
  if (transaction.type === "saida" && transaction.paymentMethod === "cartao") {
    const invoice = await invoicesRepository.getById(transaction.invoiceId);
    if (invoice?.paidAt) {
      throw new DomainError(
        "Esta compra pertence a uma fatura já paga. Desfaça o pagamento da fatura para alterá-la.",
      );
    }
  }
}

export async function createIncome(input: IncomeInput): Promise<number> {
  const common = await buildCommon(input, "entrada");
  await assertAccountExists(input.accountId);

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
  await assertAccountExists(input.accountId);

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
 * data da compra e só afeta a conta quando a fatura for paga.
 */
export async function createExpense(input: ExpenseInput): Promise<number> {
  const common = await buildCommon(input, "saida");
  const target = await resolveExpenseTarget(input, common.date);

  const record: ExpenseTransaction = {
    ...common,
    ...target,
    type: "saida",
    createdAt: new Date().toISOString(),
  };
  return transactionsRepository.create(record);
}

export async function updateExpense(id: number, input: ExpenseInput): Promise<void> {
  const existing = await transactionsRepository.getById(id);
  if (!existing || existing.type !== "saida") throw new DomainError("Saída não encontrada.");
  await assertEditable(existing);

  const common = await buildCommon(input, "saida");
  const target = await resolveExpenseTarget(input, common.date);

  const record: ExpenseTransaction = {
    ...common,
    ...target,
    id,
    type: "saida",
    createdAt: existing.createdAt,
  };
  await transactionsRepository.update(record);

  if (existing.paymentMethod === "cartao") await pruneEmptyInvoice(existing.invoiceId);
}

/** Exclui entrada ou saída. */
export async function deleteTransaction(id: number): Promise<void> {
  const existing = await transactionsRepository.getById(id);
  if (!existing) return;
  await assertEditable(existing);

  await transactionsRepository.remove(id);

  if (existing.type === "saida" && existing.paymentMethod === "cartao") {
    await pruneEmptyInvoice(existing.invoiceId);
  }
}
