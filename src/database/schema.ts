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
// v1: accounts | v2: + investments | v3: + cards, categories, transactions,
// invoices, transfers
export const DB_VERSION = 3;

export interface StoreDefinition {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: { name: string; keyPath: string | string[]; unique?: boolean }[];
}

/**
 * Stores do sistema financeiro. Cada nova store adicionada aqui é criada
 * automaticamente no próximo boot do app (ver db.ts) sem apagar os dados já
 * existentes dos usuários.
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
  cards: {
    name: "cards",
    keyPath: "id",
    autoIncrement: true,
    indexes: [{ name: "by_name", keyPath: "name" }],
  },
  categories: {
    name: "categories",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "by_kind", keyPath: "kind" },
      { name: "by_key", keyPath: "key", unique: true },
    ],
  },
  transactions: {
    name: "transactions",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "by_date", keyPath: "date" },
      { name: "by_account", keyPath: "accountId" },
      { name: "by_card", keyPath: "cardId" },
      { name: "by_invoice", keyPath: "invoiceId" },
    ],
  },
  invoices: {
    name: "invoices",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "by_card", keyPath: "cardId" },
      // Uma única fatura por cartão em cada ciclo de fechamento.
      { name: "by_card_month", keyPath: ["cardId", "referenceMonth"], unique: true },
      { name: "by_paid_account", keyPath: "paidFromAccountId" },
    ],
  },
  transfers: {
    name: "transfers",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "by_date", keyPath: "date" },
      { name: "by_from_account", keyPath: "fromAccountId" },
      { name: "by_to_account", keyPath: "toAccountId" },
    ],
  },
};

export type StoreName = keyof typeof STORES;

// --- Tipos de domínio ------------------------------------------------------
// Datas: "YYYY-MM-DD" (data local, sem fuso). Meses: "YYYY-MM".
// Valores: reais com 2 casas decimais (ver roundMoney em utils/currency.ts).

export type AccountType = "banco" | "carteira" | "poupanca" | "outro";

export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  /** Saldo na criação da conta. O saldo atual é derivado (balanceCalculator). */
  initialBalance: number;
  createdAt: string;
}

export interface Card {
  id?: number;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  createdAt: string;
}

export type CategoryKind = "entrada" | "saida";

export interface Category {
  id?: number;
  /** Identificador estável (não muda se o nome for traduzido/editado). */
  key: string;
  name: string;
  kind: CategoryKind;
  /** "Outros": a UI deve pedir/incentivar uma descrição personalizada. */
  acceptsCustomLabel: boolean;
}

export type PaymentMethod = "dinheiro" | "pix" | "cartao";

interface TransactionBase {
  id?: number;
  amount: number;
  date: string;
  categoryId: number;
  description: string;
  /** Só preenchido em categorias "Outros". */
  customCategory?: string;
  createdAt: string;
}

export interface IncomeTransaction extends TransactionBase {
  type: "entrada";
  /** Conta de destino. */
  accountId: number;
}

/** Saída em dinheiro/PIX: debita a conta imediatamente. */
export interface AccountExpenseTransaction extends TransactionBase {
  type: "saida";
  paymentMethod: "dinheiro" | "pix";
  accountId: number;
}

/** Compra no cartão: NÃO mexe no saldo da conta, entra na fatura. */
export interface CardExpenseTransaction extends TransactionBase {
  type: "saida";
  paymentMethod: "cartao";
  cardId: number;
  invoiceId: number;
}

export type ExpenseTransaction = AccountExpenseTransaction | CardExpenseTransaction;
export type Transaction = IncomeTransaction | ExpenseTransaction;

/**
 * O total e o status da fatura são derivados das compras; só o pagamento é
 * persistido (paidAt/paidAmount/paidFromAccountId).
 */
export interface Invoice {
  id?: number;
  cardId: number;
  /** Mês do fechamento ("YYYY-MM") — identifica o ciclo. */
  referenceMonth: string;
  closingDate: string;
  dueDate: string;
  paidAt?: string;
  paidAmount?: number;
  paidFromAccountId?: number;
}

/** Transferência entre contas próprias: mexe nos saldos, não é entrada/saída. */
export interface Transfer {
  id?: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  date: string;
  description?: string;
  createdAt: string;
}

export interface Investment {
  id?: number;
  assetName: string;
  quantity: number;
  averagePrice: number;
  createdAt: string;
}
