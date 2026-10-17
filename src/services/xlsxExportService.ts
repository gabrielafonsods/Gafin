import { buildXlsx } from "@/utils/xlsx";
import { saveFile } from "@/utils/fileSaver";
import { todayISO } from "@/utils/date";
import { buildExportTables } from "./reportData";

/** Uma única planilha com uma aba por tabela (Entradas, Saídas, Contas...). */
export async function exportAllXlsx(): Promise<void> {
  const tables = await buildExportTables();
  const bytes = buildXlsx(tables.map(({ name, columns, rows }) => ({ name, columns, rows })));
  const file = new File([bytes as BlobPart], `gafin-dados-${todayISO()}.xlsx`, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  await saveFile(file);
}
