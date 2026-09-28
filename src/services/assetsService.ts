import {
  assetsRepository,
  investmentIncomesRepository,
  investmentOperationsRepository,
} from "@/database/repositories";
import type { Asset, AssetType } from "@/database/schema";
import { ASSET_TYPES } from "@/types/investments";
import { roundPrice } from "@/utils/currency";
import { DomainError } from "./errors";
import { calculatePosition } from "./portfolioCalculator";
import { requirePrice, requireText } from "./validation";

export interface AssetInput {
  name: string;
  ticker?: string;
  type: AssetType;
  institution?: string;
  /** Cotação atual por unidade; vazio/undefined = não informada. */
  currentPrice?: number | null;
}

function normalize(input: AssetInput) {
  if (!ASSET_TYPES.includes(input.type)) throw new DomainError("Tipo de ativo inválido.");
  const hasPrice = input.currentPrice !== undefined && input.currentPrice !== null;

  return {
    name: requireText(input.name, "Nome do ativo"),
    ticker: (input.ticker ?? "").trim().toUpperCase(),
    type: input.type,
    institution: (input.institution ?? "").trim(),
    ...(hasPrice ? { currentPrice: requirePrice(input.currentPrice as number, "Preço atual") } : {}),
  };
}

export async function createAsset(input: AssetInput): Promise<number> {
  const asset: Asset = { ...normalize(input), createdAt: new Date().toISOString() };
  return assetsRepository.create(asset);
}

export async function updateAsset(id: number, input: AssetInput): Promise<void> {
  const existing = await assetsRepository.getById(id);
  if (!existing) throw new DomainError("Ativo não encontrado.");

  // Editar o cadastro não mexe na cotação se o formulário não a enviar.
  const data = normalize(input);
  const currentPrice = input.currentPrice === undefined ? existing.currentPrice : data.currentPrice;
  await assetsRepository.update({
    ...data,
    ...(currentPrice !== undefined ? { currentPrice } : {}),
    id,
    createdAt: existing.createdAt,
  });
}

/** Cotação atual por unidade; `null` remove a cotação informada. */
export async function setCurrentPrice(id: number, price: number | null): Promise<void> {
  const existing = await assetsRepository.getById(id);
  if (!existing) throw new DomainError("Ativo não encontrado.");

  const { currentPrice: _previous, ...rest } = existing;
  await assetsRepository.update(
    price === null ? rest : { ...rest, currentPrice: requirePrice(price, "Preço atual") },
  );
}

/**
 * Informa o valor atual TOTAL da posição (útil em renda fixa): converte para
 * cotação por unidade usando a quantidade em carteira.
 */
export async function setCurrentValue(id: number, totalValue: number): Promise<void> {
  if (!Number.isFinite(totalValue) || totalValue < 0) {
    throw new DomainError("Valor atual não pode ser negativo.");
  }
  const operations = await investmentOperationsRepository.getAllByIndex("by_asset", id);
  const { quantity } = calculatePosition(operations);
  if (quantity <= 0) {
    throw new DomainError("O ativo não tem posição em aberto para receber um valor atual.");
  }
  await setCurrentPrice(id, roundPrice(totalValue / quantity));
}

/** Exclui o ativo junto com o histórico dele (operações e rendimentos). */
export async function deleteAsset(id: number): Promise<void> {
  const [operations, incomes] = await Promise.all([
    investmentOperationsRepository.getAllByIndex("by_asset", id),
    investmentIncomesRepository.getAllByIndex("by_asset", id),
  ]);
  // O ativo é o último a sair: se algo falhar no meio, dá para tentar de novo.
  for (const operation of operations) {
    if (operation.id !== undefined) await investmentOperationsRepository.remove(operation.id);
  }
  for (const income of incomes) {
    if (income.id !== undefined) await investmentIncomesRepository.remove(income.id);
  }
  await assetsRepository.remove(id);
}
