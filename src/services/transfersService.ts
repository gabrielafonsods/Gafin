import { accountsRepository, transfersRepository } from "@/database/repositories";
import type { Transfer } from "@/database/schema";
import { DomainError } from "./errors";
import { requireISODate, requirePositiveMoney } from "./validation";

export interface TransferInput {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  date: string;
  description?: string;
}

/**
 * Transferência entre contas próprias: move saldo de uma para outra sem
 * contar como entrada nem saída no Dashboard.
 */
export async function createTransfer(input: TransferInput): Promise<number> {
  if (input.fromAccountId === input.toAccountId) {
    throw new DomainError("Escolha contas diferentes para a transferência.");
  }
  const [from, to] = await Promise.all([
    accountsRepository.getById(input.fromAccountId),
    accountsRepository.getById(input.toAccountId),
  ]);
  if (!from || !to) throw new DomainError("Conta não encontrada.");

  const description = input.description?.trim();
  const transfer: Transfer = {
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    amount: requirePositiveMoney(input.amount, "Valor"),
    date: requireISODate(input.date),
    ...(description ? { description } : {}),
    createdAt: new Date().toISOString(),
  };
  return transfersRepository.create(transfer);
}

export async function deleteTransfer(id: number): Promise<void> {
  await transfersRepository.remove(id);
}
