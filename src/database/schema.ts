/**
 * Schema único e centralizado do banco local do Gafin.
 *
 * Toda vez que uma nova store (tabela) for necessária, ela deve ser
 * adicionada aqui em STORES e o número em DB_VERSION deve ser incrementado.
 * O upgrade em si (criação da object store) é tratado em db.ts.
 */

export const DB_NAME = "gafin-db";

// Incremente sempre que STORES mudar. O IndexedDB só roda onupgradeneeded
// quando a versão solicitada é maior que a versão já existente no
// dispositivo do usuário.
export const DB_VERSION = 2;

export interface StoreDefinition {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: { name: string; keyPath: string; unique?: boolean }[];
}

/**
 * Stores previstas para o sistema financeiro completo. Cada nova store
 * adicionada aqui é criada automaticamente no próximo boot do app (ver
 * db.ts) sem apagar os dados já existentes dos usuários.
 */
export const STORES: Record<string, StoreDefinition> = {
  accounts: {
    name: "accounts",
    keyPath: "id",
    autoIncrement: true,
    indexes: [{ name: "by_name", keyPath: "name" }],
  },
  investments: {
    name: "investments",
    keyPath: "id",
    autoIncrement: true,
    indexes: [{ name: "by_asset_name", keyPath: "assetName" }],
  },
};

export type StoreName = keyof typeof STORES;

// --- Tipos de domínio (usados pelos futuros repositories) -----------------

export interface Account {
  id?: number;
  name: string;
  type: "corrente" | "poupanca" | "carteira" | "investimento";
  initialBalance: number;
  createdAt: string;
}

export interface Card {
  id?: number;
  name: string;
  closingDay: number;
  dueDay: number;
  limit: number;
}

export interface Transaction {
  id?: number;
  accountId: number;
  categoryId?: number;
  description: string;
  amount: number;
  type: "entrada" | "saida";
  date: string;
}

export interface Category {
  id?: number;
  name: string;
  kind: "entrada" | "saida";
}

export interface Investment {
  id?: number;
  assetName: string;
  quantity: number;
  averagePrice: number;
  createdAt: string;
}
