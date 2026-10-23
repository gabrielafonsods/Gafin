import type { AssetType, IncomeType, OperationType } from "@/database/schema";

/** Ordem usada nos formulários. */
export const ASSET_TYPES: readonly AssetType[] = [
  "acoes",
  "fiis",
  "renda_fixa",
  "etfs",
  "tesouro_direto",
  "criptomoedas",
  "exterior",
  "outros",
];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  acoes: "Ações",
  fiis: "FIIs",
  renda_fixa: "Renda Fixa",
  etfs: "ETFs",
  tesouro_direto: "Tesouro Direto",
  criptomoedas: "Criptomoedas",
  exterior: "Exterior",
  outros: "Outros",
};

/** Categorias sempre visíveis em Posições, na ordem de exibição. */
export const MAIN_POSITION_TYPES: readonly AssetType[] = [
  "acoes",
  "fiis",
  "renda_fixa",
  "etfs",
  "tesouro_direto",
];

/** Só aparecem em Posições quando têm ativos (para nunca esconder dados já cadastrados). */
export const EXTRA_POSITION_TYPES: readonly AssetType[] = ["criptomoedas", "exterior", "outros"];

/** Cores das fatias do gráfico de pizza e dos marcadores de cada categoria. */
export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  acoes: "#3b82f6",
  fiis: "#22d3ee",
  renda_fixa: "#34d399",
  etfs: "#a78bfa",
  tesouro_direto: "#f59e0b",
  criptomoedas: "#f472b6",
  exterior: "#fb923c",
  outros: "#94a3b8",
};

/** Tipos negociados na B3, cujo preço dá para buscar automaticamente pelo ticker. */
export const QUOTABLE_TYPES: readonly AssetType[] = ["acoes", "fiis", "etfs"];

export const OPERATION_TYPES: readonly OperationType[] = ["compra", "venda"];

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  compra: "Compra/aporte",
  venda: "Venda/resgate",
};

export const INCOME_TYPES: readonly IncomeType[] = ["dividendo", "jcp", "rendimento", "outros"];

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  dividendo: "Dividendo",
  jcp: "JCP",
  rendimento: "Rendimento",
  outros: "Outros",
};
