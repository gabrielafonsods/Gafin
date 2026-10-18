import {
  accountsRepository,
  assetsRepository,
  cardsRepository,
  categoriesRepository,
  investmentOperationsRepository,
  invoicesRepository,
  transactionsRepository,
  transfersRepository,
} from "@/database/repositories";
import type { CsvTable } from "@/utils/csv";
import { getAccountBalance, getCardLimitUsage, type FinanceSnapshot } from "./balanceCalculator";
import { buildAssetViews } from "./portfolioCalculator";
import { ACCOUNT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/types/balance";
import { ASSET_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/types/investments";
import { formatCurrency, formatPercent, formatQuantity } from "@/utils/currency";
import { formatDateBR } from "@/utils/date";

export interface ExportTable extends CsvTable {
  name: string;
}

/**
 * Junta os dados de Saldo e Investimentos já formatados (moeda, data,
 * percentual) em tabelas prontas para CSV/XLSX. É só leitura: nada aqui
 * grava no banco.
 */
export async function buildExportTables(): Promise<ExportTable[]> {
  const [accounts, cards, categories, transactions, invoices, transfers, assets, operations] =
    await Promise.all([
      accountsRepository.getAll(),
      cardsRepository.getAll(),
      categoriesRepository.getAll(),
      transactionsRepository.getAll(),
      invoicesRepository.getAll(),
      transfersRepository.getAll(),
      assetsRepository.getAll(),
      investmentOperationsRepository.getAll(),
    ]);

  const snapshot: FinanceSnapshot = { accounts, cards, transactions, invoices, transfers };
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const assetById = new Map(assets.map((a) => [a.id, a]));

  const incomeRows = transactions
    .filter((t) => t.type === "entrada")
    .map((t) => [
      formatCurrency(t.amount),
      formatDateBR(t.date),
      t.customCategory || categoryById.get(t.categoryId)?.name || "",
      t.description,
      accountById.get(t.accountId)?.name || "",
    ]);

  const expenseRows = transactions
    .filter((t) => t.type === "saida")
    .map((t) => [
      formatCurrency(t.amount),
      formatDateBR(t.date),
      t.customCategory || categoryById.get(t.categoryId)?.name || "",
      t.description,
      PAYMENT_METHOD_LABELS[t.paymentMethod],
      t.paymentMethod === "cartao" ? cardById.get(t.cardId)?.name || "" : accountById.get(t.accountId)?.name || "",
      t.paymentMethod === "cartao" && t.installment ? `${t.installment.number}/${t.installment.count}` : "",
    ]);

  const accountRows = accounts.map((a) => [
    a.name,
    ACCOUNT_TYPE_LABELS[a.type],
    formatCurrency(getAccountBalance(a, snapshot)),
  ]);

  const cardRows = cards.map((c) => {
    const usage = getCardLimitUsage(c, snapshot);
    return [
      c.name,
      formatCurrency(c.limit),
      String(c.closingDay),
      String(c.dueDay),
      formatCurrency(usage.used),
      formatCurrency(usage.available),
    ];
  });

  const assetViews = buildAssetViews(assets, operations, []);
  const assetRows = assetViews.map((v) => [
    v.asset.name,
    v.asset.ticker,
    ASSET_TYPE_LABELS[v.asset.type],
    v.asset.institution,
    formatQuantity(v.position.quantity),
    formatCurrency(v.position.averagePrice),
    formatCurrency(v.position.investedValue),
    formatCurrency(v.currentValue),
    formatPercent(v.profitPercent),
  ]);

  const operationRows = operations.map((op) => [
    assetById.get(op.assetId)?.name || "",
    OPERATION_TYPE_LABELS[op.type],
    formatQuantity(op.quantity),
    formatCurrency(op.price),
    formatCurrency(op.fees),
    formatDateBR(op.date),
    op.note || "",
  ]);

  return [
    { name: "Entradas", columns: ["Valor", "Data", "Categoria", "Descrição", "Conta de destino"], rows: incomeRows },
    {
      name: "Saídas",
      columns: ["Valor", "Data", "Categoria", "Descrição", "Forma de pagamento", "Conta/cartão", "Parcela"],
      rows: expenseRows,
    },
    { name: "Contas", columns: ["Nome", "Tipo", "Saldo"], rows: accountRows },
    {
      name: "Cartões",
      columns: ["Nome", "Limite", "Fechamento", "Vencimento", "Limite usado", "Limite disponível"],
      rows: cardRows,
    },
    {
      name: "Ativos",
      columns: [
        "Nome",
        "Ticker",
        "Tipo",
        "Instituição",
        "Quantidade",
        "Preço médio",
        "Valor investido",
        "Valor atual",
        "Rentabilidade",
      ],
      rows: assetRows,
    },
    {
      name: "Operações",
      columns: ["Ativo", "Operação", "Quantidade", "Preço", "Taxas", "Data", "Observação"],
      rows: operationRows,
    },
  ];
}
