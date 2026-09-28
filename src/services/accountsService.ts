import {
  accountsRepository,
  invoicesRepository,
  transactionsRepository,
  transfersRepository,
} from "@/database/repositories";
import type { Account, AccountType } from "@/database/schema";
import { DomainError } from "./errors";
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
  await accountsRepository.update({ ...normalize(input), id, createdAt: existing.createdAt });
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
  if (transactions + sent + received + invoicePayments > 0) {
    throw new DomainError(
      "Esta conta possui movimentações e não pode ser excluída. Exclua ou mova os lançamentos antes.",
    );
  }
  await accountsRepository.remove(id);
}
