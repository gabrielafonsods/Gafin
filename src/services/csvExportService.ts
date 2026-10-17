import { toCsv } from "@/utils/csv";
import { csvFile, saveFile } from "@/utils/fileSaver";
import { todayISO } from "@/utils/date";
import { DomainError } from "./errors";
import { buildExportTables } from "./reportData";

async function exportNamedCsv(tableName: string, fileSlug: string): Promise<void> {
  const table = (await buildExportTables()).find((t) => t.name === tableName);
  if (!table) throw new DomainError(`Não foi possível montar a exportação de ${tableName}.`);
  await saveFile(csvFile(`gafin-${fileSlug}-${todayISO()}.csv`, toCsv(table)));
}

export const exportIncomesCsv = () => exportNamedCsv("Entradas", "entradas");
export const exportExpensesCsv = () => exportNamedCsv("Saídas", "saidas");
export const exportAccountsCsv = () => exportNamedCsv("Contas", "contas");
export const exportCardsCsv = () => exportNamedCsv("Cartões", "cartoes");
export const exportAssetsCsv = () => exportNamedCsv("Ativos", "ativos");
export const exportOperationsCsv = () => exportNamedCsv("Operações", "operacoes-investimentos");
