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
// invoices, transfers | v4: investments passa a ser a store de ativos
// (migrada) + investmentOperations e investmentIncomes | v5: + settings
// (aparência e bloqueio do app) | v6: + recurrences (lançamentos recorrentes)
export const DB_VERSION = 6;

/** Backups mais antigos que isso nunca existiram (o recurso nasceu na v5). */
export const MIN_BACKUP_SCHEMA_VERSION = 5;

/**
 * Versão do schema em que cada store passou a existir. Um backup antigo não
 * tem as stores criadas depois dele — nesse caso elas são restauradas vazias.
 */
export const STORE_ADDED_IN: Record<string, number> = {
  accounts: 1,
  investments: 2,
  cards: 3,
  categories: 3,
  transactions: 3,
  invoices: 3,
  transfers: 3,
  investmentOperations: 4,
  investmentIncomes: 4,
  settings: 5,
  recurrences: 6,
};

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
  // Ativos de investimento (nome histórico da store preservado para não
  // perder os dados já gravados; ver migrations.ts).
  investments: {
    name: "investments",
    keyPath: "id",
    autoIncrement: true,
    indexes: [{ name: "by_name", keyPath: "name" }],
  },
  investmentOperations: {
    name: "investmentOperations",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "by_asset", keyPath: "assetId" },
      { name: "by_date", keyPath: "date" },
    ],
  },
  investmentIncomes: {
    name: "investmentIncomes",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "by_asset", keyPath: "assetId" },
      { name: "by_date", keyPath: "date" },
    ],
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
  // Registro único (id fixo "main"): aparência e bloqueio do app.
  settings: {
    name: "settings",
    keyPath: "id",
  },
  recurrences: {
    name: "recurrences",
    keyPath: "id",
    autoIncrement: true,
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
  /** Arquivada: some das listas e não recebe lançamentos (só com saldo zero). */
  archived?: boolean;
  createdAt: string;
}

export interface Card {
  id?: number;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  /** Arquivado: some das listas e não recebe compras (só sem fatura em aberto). */
  archived?: boolean;
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
  /** Criada pelo usuário (as padrão não têm este campo). */
  custom?: boolean;
  /** Arquivada: some dos formulários, mas continua no histórico. */
  archived?: boolean;
  /** Orçamento mensal (só categorias de saída). */
  monthlyBudget?: number;
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
  /** Lançamento gerado por uma recorrência (regra + data da ocorrência). */
  recurrenceId?: number;
  occurrenceDate?: string;
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

/** Presente quando a compra foi parcelada: cada parcela é uma transação. */
export interface InstallmentInfo {
  /** Liga todas as parcelas da mesma compra. */
  groupId: string;
  /** 1..count */
  number: number;
  count: number;
  /** Valor total da compra (a soma das parcelas). */
  totalAmount: number;
}

/** Compra no cartão: NÃO mexe no saldo da conta, entra na fatura. */
export interface CardExpenseTransaction extends TransactionBase {
  type: "saida";
  paymentMethod: "cartao";
  cardId: number;
  invoiceId: number;
  installment?: InstallmentInfo;
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

export type AssetType =
  | "renda_fixa"
  | "acoes"
  | "fiis"
  | "etfs"
  | "tesouro_direto"
  | "criptomoedas"
  | "exterior"
  | "outros";

/**
 * Ativo. Quantidade, preço médio e valor investido NÃO são gravados: são
 * derivados das operações (ver portfolioCalculator.ts). Só o preço atual é
 * informado à mão, por unidade.
 */
export interface Asset {
  id?: number;
  name: string;
  ticker: string;
  type: AssetType;
  institution: string;
  /** Cotação atual por unidade (informada à mão ou atualizada automaticamente). */
  currentPrice?: number;
  /** Quando a cotação foi atualizada pela última vez (ISO). */
  priceUpdatedAt?: string;
  /** false = nunca atualizar sozinho (preço só manual). Ausente = automático, se o tipo permitir. */
  autoQuote?: boolean;
  createdAt: string;
}

export type OperationType = "compra" | "venda";

export interface InvestmentOperation {
  id?: number;
  assetId: number;
  type: OperationType;
  quantity: number;
  /** Preço por unidade. */
  price: number;
  /** Taxas/corretagem da operação (somam ao custo na compra, abatem na venda). */
  fees: number;
  date: string;
  note?: string;
  createdAt: string;
}

export type IncomeType = "dividendo" | "jcp" | "rendimento" | "outros";

/** Provento recebido: fica separado das compras/aportes e da posição. */
export interface InvestmentIncome {
  id?: number;
  assetId: number;
  type: IncomeType;
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

// --- Configurações do app --------------------------------------------------

export type Theme = "light" | "dark" | "system";

/**
 * Nunca guarda o PIN em texto puro: só o hash (PBKDF2) e o salt, ambos em
 * base64. Ver services/security/pinCrypto.ts.
 */
export interface SecuritySettings {
  enabled: boolean;
  pinHash?: string;
  pinSalt?: string;
  pinIterations?: number;
  /** Minutos em segundo plano até pedir o PIN de novo. 0 = só ao abrir o app. */
  inactivityTimeoutMinutes: number;
  biometricEnabled: boolean;
  /** ID (base64url) da credencial WebAuthn local, se o biométrico estiver ativo. */
  biometricCredentialId?: string;
}

/**
 * Cotações automáticas (brapi.dev). O token é pessoal e fica só neste
 * aparelho: não entra no backup nem nas exportações.
 */
export interface QuoteSettings {
  token?: string;
  autoRefresh: boolean;
  /** Última rodada de atualização (ISO). */
  lastRunAt?: string;
}

/** Registro único, sempre com id "main". */
export interface AppSettings {
  id: "main";
  theme: Theme;
  security: SecuritySettings;
  quotes?: QuoteSettings;
  /** % ideal da carteira por tipo de ativo (0–100; a soma não passa de 100). */
  allocationTargets?: Partial<Record<AssetType, number>>;
}

// --- Recorrências ----------------------------------------------------------

export type RecurrenceFrequency = "semanal" | "mensal" | "anual";

interface RecurrenceBase {
  id?: number;
  /** Valor de cada ocorrência. */
  amount: number;
  categoryId: number;
  description: string;
  customCategory?: string;
  frequency: RecurrenceFrequency;
  /** Primeira ocorrência (ancora o dia do mês / da semana). */
  startDate: string;
  endDate?: string;
  active: boolean;
  /** Última ocorrência já lançada: o gerador só olha para depois dela. */
  generatedThrough?: string;
  createdAt: string;
}

export interface IncomeRecurrence extends RecurrenceBase {
  kind: "entrada";
  accountId: number;
}

export interface AccountExpenseRecurrence extends RecurrenceBase {
  kind: "saida";
  paymentMethod: "dinheiro" | "pix";
  accountId: number;
}

export interface CardExpenseRecurrence extends RecurrenceBase {
  kind: "saida";
  paymentMethod: "cartao";
  cardId: number;
}

export type Recurrence = IncomeRecurrence | AccountExpenseRecurrence | CardExpenseRecurrence;
