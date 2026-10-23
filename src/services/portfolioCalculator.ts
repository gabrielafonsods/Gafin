import { roundMoney, roundPrice, roundQuantity } from "@/utils/currency";
import { ASSET_TYPES, EXTRA_POSITION_TYPES, MAIN_POSITION_TYPES } from "@/types/investments";
import type {
  Asset,
  AssetType,
  InvestmentIncome,
  InvestmentOperation,
} from "@/database/schema";

/**
 * Cálculos puros (sem banco, sem Vue) da carteira. Tudo é DERIVADO das
 * operações e rendimentos — nada de quantidade/preço médio digitado.
 *
 * Método do preço médio:
 *  - Compra: soma ao custo (quantidade × preço + taxas) e à quantidade.
 *  - Venda: reduz a quantidade e retira do custo na proporção do preço médio
 *    vigente (o preço médio não muda numa venda). Lucro realizado =
 *    (quantidade × preço − taxas) − custo retirado.
 *  - Zerou a posição: custo e preço médio voltam a zero.
 *  - Rendimentos (dividendos, JCP...) ficam de fora da posição.
 */

const EPSILON = 1e-8;

export interface PositionResult {
  quantity: number;
  averagePrice: number;
  /** Custo da posição em aberto (o que ainda está investido). */
  investedValue: number;
  /** Total pago em compras (com taxas), ao longo de toda a história. */
  totalBought: number;
  /** Total líquido recebido em vendas (já sem taxas). */
  totalSold: number;
  totalFees: number;
  realizedProfit: number;
}

export interface ReplayResult {
  position: PositionResult;
  /** Descrição da primeira inconsistência (venda maior que a posição), se houver. */
  error: string | null;
}

/** Ordem cronológica; no mesmo dia as compras vêm antes das vendas. */
function compareOperations(a: InvestmentOperation, b: InvestmentOperation): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.type !== b.type) return a.type === "compra" ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return (a.id ?? 0) - (b.id ?? 0);
}

export function replayOperations(operations: readonly InvestmentOperation[]): ReplayResult {
  const sorted = [...operations].sort(compareOperations);

  let quantity = 0;
  let cost = 0;
  let totalBought = 0;
  let totalSold = 0;
  let totalFees = 0;
  let realizedProfit = 0;
  let error: string | null = null;

  for (const operation of sorted) {
    totalFees += operation.fees;

    if (operation.type === "compra") {
      const operationCost = roundMoney(operation.quantity * operation.price + operation.fees);
      quantity = roundQuantity(quantity + operation.quantity);
      cost += operationCost;
      totalBought += operationCost;
      continue;
    }

    let soldQuantity = operation.quantity;
    if (soldQuantity > quantity + EPSILON) {
      error ??= `A venda de ${operation.quantity} em ${operation.date} é maior que a posição disponível (${quantity}).`;
      soldQuantity = quantity; // nunca quebra a tela; só sinaliza o erro
    }

    const averageCost = quantity > 0 ? cost / quantity : 0;
    const remaining = roundQuantity(quantity - soldQuantity);
    const removedCost = remaining <= EPSILON ? cost : averageCost * soldQuantity;
    const proceeds = roundMoney(soldQuantity * operation.price - operation.fees);

    realizedProfit += proceeds - removedCost;
    totalSold += proceeds;
    cost -= removedCost;
    quantity = remaining;

    if (quantity <= EPSILON) {
      quantity = 0;
      cost = 0;
    }
  }

  return {
    position: {
      quantity,
      averagePrice: quantity > 0 ? roundPrice(cost / quantity) : 0,
      investedValue: roundMoney(cost),
      totalBought: roundMoney(totalBought),
      totalSold: roundMoney(totalSold),
      totalFees: roundMoney(totalFees),
      realizedProfit: roundMoney(realizedProfit),
    },
    error,
  };
}

export function calculatePosition(operations: readonly InvestmentOperation[]): PositionResult {
  return replayOperations(operations).position;
}

function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

export interface AssetView {
  asset: Asset;
  position: PositionResult;
  /** false = sem cotação informada; o valor atual assume o preço médio. */
  hasManualPrice: boolean;
  currentPrice: number;
  currentValue: number;
  profit: number;
  /** Rentabilidade da posição em aberto, em % (sem contar rendimentos). */
  profitPercent: number;
  /**
   * Variação: quanto o preço atual está acima/abaixo do preço médio, em %.
   * (Mesmo valor de profitPercent, com o nome usado nas telas.)
   */
  variationPercent: number;
  /** Retorno total em R$: valor atual + vendas + proventos − tudo que foi comprado. */
  totalReturn: number;
  /**
   * Rentabilidade: retorno total sobre o que foi comprado, em %. Diferente da
   * variação, conta proventos recebidos e lucro de vendas já feitas.
   */
  returnPercent: number;
  incomesReceived: number;
  /** Participação no valor atual da carteira, em %. */
  sharePercent: number;
}

export function buildAssetViews(
  assets: readonly Asset[],
  operations: readonly InvestmentOperation[],
  incomes: readonly InvestmentIncome[],
): AssetView[] {
  const views: AssetView[] = assets.map((asset) => {
    const position = calculatePosition(operations.filter((op) => op.assetId === asset.id));
    const hasManualPrice = asset.currentPrice !== undefined;
    const currentPrice = asset.currentPrice ?? position.averagePrice;
    const currentValue = position.quantity > 0 ? roundMoney(position.quantity * currentPrice) : 0;
    const profit = roundMoney(currentValue - position.investedValue);
    const variation = position.investedValue > 0 ? (profit / position.investedValue) * 100 : 0;

    return {
      asset,
      position,
      hasManualPrice,
      currentPrice,
      currentValue,
      profit,
      profitPercent: variation,
      variationPercent: variation,
      totalReturn: 0,
      returnPercent: 0,
      incomesReceived: sumMoney(
        incomes.filter((income) => income.assetId === asset.id).map((income) => income.amount),
      ),
      sharePercent: 0,
    };
  });

  const totalValue = sumMoney(views.map((view) => view.currentValue));
  for (const view of views) {
    view.sharePercent = totalValue > 0 ? (view.currentValue / totalValue) * 100 : 0;
    const { totalReturn, returnPercent } = calculateReturn([view]);
    view.totalReturn = totalReturn;
    view.returnPercent = returnPercent;
  }
  return views;
}

/**
 * Retorno total de um conjunto de ativos: o que vale hoje, mais o que já foi
 * recebido em vendas e proventos, menos tudo que foi comprado (com taxas).
 * É um retorno simples sobre o capital aportado — não ponderado pelo tempo.
 */
export function calculateReturn(views: readonly AssetView[]): { totalReturn: number; returnPercent: number } {
  const bought = sumMoney(views.map((v) => v.position.totalBought));
  const sold = sumMoney(views.map((v) => v.position.totalSold));
  const incomes = sumMoney(views.map((v) => v.incomesReceived));
  const value = sumMoney(views.map((v) => v.currentValue));
  const totalReturn = roundMoney(value + sold + incomes - bought);
  return { totalReturn, returnPercent: bought > 0 ? (totalReturn / bought) * 100 : 0 };
}

export interface PortfolioSummary {
  /** Custo das posições em aberto. */
  patrimonioInvestido: number;
  valorAtual: number;
  /** Lucro/prejuízo das posições em aberto (valor atual − investido). */
  lucroPrejuizo: number;
  /** Mesmo valor de variacaoPercent (nome antigo, mantido por compatibilidade). */
  rentabilidadePercent: number;
  /** Variação do preço atual contra o preço médio das posições em aberto. */
  variacaoPercent: number;
  /** Retorno total (valor atual + vendas + proventos − compras) e sua % sobre o comprado. */
  retornoTotal: number;
  retornoTotalPercent: number;
  /** Total de rendimentos recebidos (separado de compras e da rentabilidade). */
  rendimentosRecebidos: number;
  /** Lucro já realizado em vendas/resgates. */
  lucroRealizado: number;
  /** Ativos com posição em aberto. */
  quantidadeAtivos: number;
  maiorPosicao: AssetView | null;
}

export function summarizePortfolio(views: readonly AssetView[]): PortfolioSummary {
  const open = views.filter((view) => view.position.quantity > 0);
  const patrimonioInvestido = sumMoney(open.map((view) => view.position.investedValue));
  const valorAtual = sumMoney(open.map((view) => view.currentValue));
  const lucroPrejuizo = roundMoney(valorAtual - patrimonioInvestido);
  const biggest = [...open].sort((a, b) => b.currentValue - a.currentValue)[0] ?? null;
  const variacao = patrimonioInvestido > 0 ? (lucroPrejuizo / patrimonioInvestido) * 100 : 0;
  const totalReturn = calculateReturn(views);

  return {
    patrimonioInvestido,
    valorAtual,
    lucroPrejuizo,
    rentabilidadePercent: variacao,
    variacaoPercent: variacao,
    retornoTotal: totalReturn.totalReturn,
    retornoTotalPercent: totalReturn.returnPercent,
    rendimentosRecebidos: sumMoney(views.map((view) => view.incomesReceived)),
    lucroRealizado: sumMoney(views.map((view) => view.position.realizedProfit)),
    quantidadeAtivos: open.length,
    maiorPosicao: biggest,
  };
}

export interface AllocationSlice {
  type: AssetType;
  value: number;
  percent: number;
}

/** Sempre devolve os 7 tipos (na ordem padrão), mesmo os zerados. */
export function allocationByType(views: readonly AssetView[]): AllocationSlice[] {
  const open = views.filter((view) => view.position.quantity > 0);
  const total = sumMoney(open.map((view) => view.currentValue));

  return ASSET_TYPES.map((type) => {
    const value = sumMoney(
      open.filter((view) => view.asset.type === type).map((view) => view.currentValue),
    );
    return { type, value, percent: total > 0 ? (value / total) * 100 : 0 };
  });
}

/** Posições em aberto, da maior para a menor. */
export function allocationByAsset(views: readonly AssetView[]): AssetView[] {
  return views
    .filter((view) => view.position.quantity > 0)
    .sort((a, b) => b.currentValue - a.currentValue);
}

export interface CategoryGroup {
  type: AssetType;
  /** Ativos com posição em aberto. */
  count: number;
  /** Todos os ativos da categoria: em aberto primeiro (maior valor antes), encerrados depois. */
  views: AssetView[];
  /** Valor atual e custo das posições em aberto. */
  value: number;
  invested: number;
  variationPercent: number;
  returnPercent: number;
  /** Participação no valor atual da carteira, em %. */
  sharePercent: number;
}

/**
 * Agrupa os ativos por categoria para a tela Posições. As cinco categorias
 * principais aparecem sempre (mesmo vazias); Criptomoedas, Exterior e Outros
 * só quando têm ativos — assim nada cadastrado fica escondido.
 */
export function buildCategoryGroups(views: readonly AssetView[]): CategoryGroup[] {
  const totalValue = sumMoney(views.map((v) => v.currentValue));
  const types = [
    ...MAIN_POSITION_TYPES,
    ...EXTRA_POSITION_TYPES.filter((type) => views.some((v) => v.asset.type === type)),
  ];

  return types.map((type) => {
    const members = views.filter((v) => v.asset.type === type);
    const open = members.filter((v) => v.position.quantity > 0);
    const closed = members.filter((v) => v.position.quantity === 0);
    const value = sumMoney(open.map((v) => v.currentValue));
    const invested = sumMoney(open.map((v) => v.position.investedValue));

    return {
      type,
      count: open.length,
      views: [...open.sort((a, b) => b.currentValue - a.currentValue), ...closed],
      value,
      invested,
      variationPercent: invested > 0 ? ((value - invested) / invested) * 100 : 0,
      returnPercent: calculateReturn(members).returnPercent,
      sharePercent: totalValue > 0 ? (value / totalValue) * 100 : 0,
    };
  });
}

/** Proventos recebidos desde `since` (inclusive), em R$. */
export function sumIncomesSince(incomes: readonly InvestmentIncome[], since: string): number {
  return sumMoney(incomes.filter((income) => income.date >= since).map((income) => income.amount));
}
