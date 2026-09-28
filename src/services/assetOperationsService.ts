import { assetsRepository, investmentOperationsRepository } from "@/database/repositories";
import type { InvestmentOperation, OperationType } from "@/database/schema";
import { OPERATION_TYPES } from "@/types/investments";
import { DomainError } from "./errors";
import { replayOperations } from "./portfolioCalculator";
import { requireFees, requireISODate, requirePrice, requireQuantity } from "./validation";

export interface OperationInput {
  assetId: number;
  type: OperationType;
  quantity: number;
  price: number;
  fees?: number;
  date: string;
  note?: string;
}

function build(input: OperationInput) {
  if (!OPERATION_TYPES.includes(input.type)) throw new DomainError("Tipo de operação inválido.");
  const note = input.note?.trim();
  return {
    assetId: input.assetId,
    type: input.type,
    quantity: requireQuantity(input.quantity),
    price: requirePrice(input.price),
    fees: requireFees(input.fees ?? 0),
    date: requireISODate(input.date),
    ...(note ? { note } : {}),
  };
}

/**
 * Nenhuma alteração pode deixar o histórico do ativo inconsistente (vender
 * mais do que se tinha, em qualquer ponto da linha do tempo). Simula o
 * histórico resultante antes de gravar.
 */
function assertConsistent(operations: InvestmentOperation[], prefix?: string): void {
  const { error } = replayOperations(operations);
  if (error) throw new DomainError(prefix ? `${prefix} ${error}` : error);
}

export async function createOperation(input: OperationInput): Promise<number> {
  if (!(await assetsRepository.getById(input.assetId))) throw new DomainError("Ativo não encontrado.");

  const record: InvestmentOperation = { ...build(input), createdAt: new Date().toISOString() };
  const history = await investmentOperationsRepository.getAllByIndex("by_asset", input.assetId);
  assertConsistent([...history, record]);

  return investmentOperationsRepository.create(record);
}

/** O ativo de uma operação não muda; para trocar de ativo, exclua e recrie. */
export async function updateOperation(id: number, input: OperationInput): Promise<void> {
  const existing = await investmentOperationsRepository.getById(id);
  if (!existing) throw new DomainError("Operação não encontrada.");

  const record: InvestmentOperation = {
    ...build({ ...input, assetId: existing.assetId }),
    id,
    createdAt: existing.createdAt,
  };
  const history = await investmentOperationsRepository.getAllByIndex("by_asset", existing.assetId);
  assertConsistent(history.map((operation) => (operation.id === id ? record : operation)));

  await investmentOperationsRepository.update(record);
}

export async function deleteOperation(id: number): Promise<void> {
  const existing = await investmentOperationsRepository.getById(id);
  if (!existing) return;

  const history = await investmentOperationsRepository.getAllByIndex("by_asset", existing.assetId);
  assertConsistent(
    history.filter((operation) => operation.id !== id),
    "Não é possível excluir esta operação:",
  );
  await investmentOperationsRepository.remove(id);
}
