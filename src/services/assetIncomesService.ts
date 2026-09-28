import { assetsRepository, investmentIncomesRepository } from "@/database/repositories";
import type { IncomeType, InvestmentIncome } from "@/database/schema";
import { INCOME_TYPES } from "@/types/investments";
import { DomainError } from "./errors";
import { requireISODate, requirePositiveMoney } from "./validation";

export interface AssetIncomeInput {
  assetId: number;
  type: IncomeType;
  amount: number;
  date: string;
  description?: string;
}

function build(input: AssetIncomeInput) {
  if (!INCOME_TYPES.includes(input.type)) throw new DomainError("Tipo de rendimento inválido.");
  return {
    assetId: input.assetId,
    type: input.type,
    amount: requirePositiveMoney(input.amount, "Valor"),
    date: requireISODate(input.date),
    description: (input.description ?? "").trim(),
  };
}

/** Rendimento recebido (dividendo, JCP...). Não altera a posição do ativo. */
export async function createAssetIncome(input: AssetIncomeInput): Promise<number> {
  if (!(await assetsRepository.getById(input.assetId))) throw new DomainError("Ativo não encontrado.");
  const record: InvestmentIncome = { ...build(input), createdAt: new Date().toISOString() };
  return investmentIncomesRepository.create(record);
}

export async function updateAssetIncome(id: number, input: AssetIncomeInput): Promise<void> {
  const existing = await investmentIncomesRepository.getById(id);
  if (!existing) throw new DomainError("Rendimento não encontrado.");
  await investmentIncomesRepository.update({
    ...build({ ...input, assetId: existing.assetId }),
    id,
    createdAt: existing.createdAt,
  });
}

export async function deleteAssetIncome(id: number): Promise<void> {
  await investmentIncomesRepository.remove(id);
}
