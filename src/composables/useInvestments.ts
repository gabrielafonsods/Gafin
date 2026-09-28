import { computed, ref } from "vue";
import {
  assetsRepository,
  investmentIncomesRepository,
  investmentOperationsRepository,
} from "@/database/repositories";
import type { Asset, InvestmentIncome, InvestmentOperation } from "@/database/schema";
import {
  createAsset,
  deleteAsset,
  setCurrentPrice,
  setCurrentValue,
  updateAsset,
  type AssetInput,
} from "@/services/assetsService";
import {
  createAssetIncome,
  deleteAssetIncome,
  updateAssetIncome,
  type AssetIncomeInput,
} from "@/services/assetIncomesService";
import {
  createOperation,
  deleteOperation,
  updateOperation,
  type OperationInput,
} from "@/services/assetOperationsService";
import {
  allocationByAsset,
  allocationByType,
  buildAssetViews,
  summarizePortfolio,
} from "@/services/portfolioCalculator";

/*
 * Estado compartilhado do módulo Investimentos (refs em nível de módulo, sem
 * Pinia). Toda escrita passa pelos services (que validam e persistem) e
 * depois recarrega o estado, então Dashboard, Carteira e Ativos sempre
 * refletem o que está gravado. Quantidade, preço médio e valor investido são
 * DERIVADOS das operações (portfolioCalculator).
 */
const assets = ref<Asset[]>([]);
const operations = ref<InvestmentOperation[]>([]);
const incomes = ref<InvestmentIncome[]>([]);
const loaded = ref(false);
const loading = ref(false);

async function loadAll(): Promise<void> {
  loading.value = true;
  try {
    const [a, o, i] = await Promise.all([
      assetsRepository.getAll(),
      investmentOperationsRepository.getAll(),
      investmentIncomesRepository.getAll(),
    ]);
    assets.value = a;
    operations.value = o;
    incomes.value = i;
    loaded.value = true;
  } finally {
    loading.value = false;
  }
}

async function mutate<T>(operation: () => Promise<T>): Promise<T> {
  const result = await operation();
  await loadAll();
  return result;
}

const assetViews = computed(() => buildAssetViews(assets.value, operations.value, incomes.value));
const summary = computed(() => summarizePortfolio(assetViews.value));
const typeAllocation = computed(() => allocationByType(assetViews.value));
const assetAllocation = computed(() => allocationByAsset(assetViews.value));

/** Patrimônio investido (custo das posições em aberto) — usado pelo Início. */
const totalInvested = computed(() => summary.value.patrimonioInvestido);

/** Mais recentes primeiro. */
function operationsOf(assetId: number): InvestmentOperation[] {
  return operations.value
    .filter((operation) => operation.assetId === assetId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

function incomesOf(assetId: number): InvestmentIncome[] {
  return incomes.value
    .filter((income) => income.assetId === assetId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function useInvestments() {
  if (!loaded.value && !loading.value) {
    void loadAll();
  }

  return {
    // dados e derivados
    assets,
    loaded,
    assetViews,
    summary,
    typeAllocation,
    assetAllocation,
    totalInvested,
    operationsOf,
    incomesOf,
    // ativos
    addAsset: (input: AssetInput) => mutate(() => createAsset(input)),
    editAsset: (id: number, input: AssetInput) => mutate(() => updateAsset(id, input)),
    removeAsset: (id: number) => mutate(() => deleteAsset(id)),
    updateCurrentPrice: (id: number, price: number | null) => mutate(() => setCurrentPrice(id, price)),
    updateCurrentValue: (id: number, totalValue: number) => mutate(() => setCurrentValue(id, totalValue)),
    // operações
    addOperation: (input: OperationInput) => mutate(() => createOperation(input)),
    editOperation: (id: number, input: OperationInput) => mutate(() => updateOperation(id, input)),
    removeOperation: (id: number) => mutate(() => deleteOperation(id)),
    // rendimentos
    addIncome: (input: AssetIncomeInput) => mutate(() => createAssetIncome(input)),
    editIncome: (id: number, input: AssetIncomeInput) => mutate(() => updateAssetIncome(id, input)),
    removeIncome: (id: number) => mutate(() => deleteAssetIncome(id)),
    reload: loadAll,
  };
}
