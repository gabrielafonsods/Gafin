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

/** Conta de uma transferência: precisa existir e, se arquivada, só vale se já era a mesma. */
async function assertUsable(accountId: number, unchangedId?: number): Promise<void> {
  const account = await accountsRepository.getById(accountId);
  if (!account) throw new DomainError("Conta não encontrada.");
  if (account.archived && accountId !== unchangedId) {
    throw new DomainError(`A conta "${account.name}" está arquivada.`);
  }
}

async function build(input: TransferInput, previous?: Transfer) {
  if (input.fromAccountId === input.toAccountId) {
    throw new DomainError("Escolha contas diferentes para a transferência.");
  }
  await Promise.all([
    assertUsable(input.fromAccountId, previous?.fromAccountId),
    assertUsable(input.toAccountId, previous?.toAccountId),
  ]);

  const description = input.description?.trim();
  return {
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    amount: requirePositiveMoney(input.amount, "Valor"),
    date: requireISODate(input.date),
    ...(description ? { description } : {}),
  };
}

/**
 * Transferência entre contas próprias: move saldo de uma para outra sem
 * contar como entrada nem saída no Dashboard.
 */
export async function createTransfer(input: TransferInput): Promise<number> {
  const transfer: Transfer = { ...(await build(input)), createdAt: new Date().toISOString() };
  return transfersRepository.create(transfer);
}

export async function updateTransfer(id: number, input: TransferInput): Promise<void> {
  const existing = await transfersRepository.getById(id);
  if (!existing) throw new DomainError("Transferência não encontrada.");
  await transfersRepository.update({
    ...(await build(input, existing)),
    id,
    createdAt: existing.createdAt,
  });
}

export async function deleteTransfer(id: number): Promise<void> {
  await transfersRepository.remove(id);
}
