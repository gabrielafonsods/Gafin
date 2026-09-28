import type { AssetType, IncomeType, OperationType } from "@/database/schema";

export const ASSET_TYPES: readonly AssetType[] = [
  "renda_fixa",
  "acoes",
  "fiis",
  "etfs",
  "criptomoedas",
  "exterior",
  "outros",
];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  renda_fixa: "Renda fixa",
  acoes: "Ações",
  fiis: "FIIs",
  etfs: "ETFs",
  criptomoedas: "Criptomoedas",
  exterior: "Exterior",
  outros: "Outros",
};

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
