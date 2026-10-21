import {
  accountsRepository,
  invoicesRepository,
  transactionsRepository,
  transfersRepository,
} from "@/database/repositories";
import type { Account, AccountType } from "@/database/schema";
import { formatCurrency } from "@/utils/currency";
import { getAccountBalance } from "./balanceCalculator";
import { DomainError } from "./errors";
import { loadFinanceSnapshot } from "./financeSnapshot";
import { countRecurrencesUsing } from "./recurrencesService";
import { requireMoney, requireText } from "./validation";

export interface AccountInput {
  name: string;
  type: AccountType;
  /** Saldo com que a conta começa (na criação). */
  initialBalance: number;
}

function normalize(input: AccountInput) {
  return {
    name: requireText(input.name, "Nome da conta"),
    type: input.type,
    initialBalance: requireMoney(input.initialBalance, "Saldo"),
  };
}

export async function createAccount(input: AccountInput): Promise<number> {
  const account: Account = { ...normalize(input), createdAt: new Date().toISOString() };
  return accountsRepository.create(account);
}

export async function updateAccount(id: number, input: AccountInput): Promise<void> {
  const existing = await accountsRepository.getById(id);
  if (!existing) throw new DomainError("Conta não encontrada.");
  await accountsRepository.update({
    ...normalize(input),
    ...(existing.archived ? { archived: true } : {}),
    id,
    createdAt: existing.createdAt,
  });
}

/**
 * Arquivar tira a conta das listas e dos formulários sem apagar o histórico.
 * Só com saldo zero, para o saldo total nunca esconder dinheiro.
 */
export async function archiveAccount(id: number): Promise<void> {
  const account = await accountsRepository.getById(id);
  if (!account) throw new DomainError("Conta não encontrada.");

  if ((await countRecurrencesUsing({ accountId: id })) > 0) {
    throw new DomainError("Esta conta é usada em lançamentos recorrentes. Exclua as recorrências antes.");
  }
  const balance = getAccountBalance(account, await loadFinanceSnapshot());
  if (Math.abs(balance) >= 0.005) {
    throw new DomainError(
      `Esta conta ainda tem saldo de ${formatCurrency(balance)}. Transfira ou ajuste o saldo para zero antes de arquivar.`,
    );
  }
  await accountsRepository.update({ ...account, archived: true });
}

export async function unarchiveAccount(id: number): Promise<void> {
  const account = await accountsRepository.getById(id);
  if (!account) throw new DomainError("Conta não encontrada.");
  const { archived: _archived, ...rest } = account;
  await accountsRepository.update(rest);
}

/**
 * Contas com movimentação não podem ser excluídas: apagar removeria (ou
 * deixaria órfãs) entradas, saídas, transferências e pagamentos de fatura.
 */
export async function deleteAccount(id: number): Promise<void> {
  const [transactions, sent, received, invoicePayments] = await Promise.all([
    transactionsRepository.countByIndex("by_account", id),
    transfersRepository.countByIndex("by_from_account", id),
    transfersRepository.countByIndex("by_to_account", id),
    invoicesRepository.countByIndex("by_paid_account", id),
  ]);
  const rules = await countRecurrencesUsing({ accountId: id });
  if (rules > 0) {
    throw new DomainError("Esta conta é usada em lançamentos recorrentes. Exclua as recorrências antes.");
  }
  if (transactions + sent + received + invoicePayments > 0) {
    throw new DomainError(
      "Esta conta possui movimentações e não pode ser excluída. Se não a usa mais, arquive-a.",
    );
  }
  await accountsRepository.remove(id);
}
