/**
 * Serializador CSV simples (RFC 4180), sem dependência: escapa aspas, ponto
 * e vírgula e quebras de linha. Usa ; como separador porque é o que o
 * Excel/Numbers em pt-BR esperam por padrão (evita o clássico problema da
 * "coluna única").
 */
export interface CsvTable {
  columns: readonly string[];
  rows: readonly (string | number)[][];
}

function escapeCell(value: string | number): string {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv({ columns, rows }: CsvTable): string {
  const header = columns.map(escapeCell).join(";");
  const lines = rows.map((row) => row.map(escapeCell).join(";"));
  return [header, ...lines].join("\r\n");
}
