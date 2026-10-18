import {
  daysInMonth,
  makeDate,
  parseISODate,
  shiftMonth,
  toMonthKey,
  type YearMonth,
} from "@/utils/date";

export interface InvoiceCycle {
  /** Mês do fechamento ("YYYY-MM"). */
  referenceMonth: string;
  closingDate: string;
  dueDate: string;
}

/** Datas do ciclo cujo fechamento cai em `closingMonth`. */
export function cycleForClosingMonth(
  closingMonth: YearMonth,
  closingDay: number,
  dueDay: number,
): InvoiceCycle {
  // Vencimento depois do fechamento no calendário: mesmo mês; senão, mês seguinte.
  const dueMonth = dueDay > closingDay ? closingMonth : shiftMonth(closingMonth, 1);
  return {
    referenceMonth: toMonthKey(closingMonth),
    closingDate: makeDate(closingMonth, closingDay),
    dueDate: makeDate(dueMonth, dueDay),
  };
}

/**
 * Descobre em qual fatura uma compra cai.
 *
 * Convenção: compras feitas até o dia do fechamento (inclusive) entram na
 * fatura que fecha naquele mês; do dia seguinte em diante, na próxima
 * ("melhor dia de compra" = dia seguinte ao fechamento). Dias 29-31 são
 * ajustados em meses mais curtos.
 */
export function resolveInvoiceCycle(
  purchaseDate: string,
  closingDay: number,
  dueDay: number,
): InvoiceCycle {
  const { year, month, day } = parseISODate(purchaseDate);
  const purchaseMonth = { year, month };

  const closingDayInPurchaseMonth = Math.min(closingDay, daysInMonth(year, month));
  const closingMonth = day <= closingDayInPurchaseMonth ? purchaseMonth : shiftMonth(purchaseMonth, 1);

  return cycleForClosingMonth(closingMonth, closingDay, dueDay);
}

/**
 * Ciclo da parcela de índice `offset` (0 = primeira) de uma compra cuja
 * primeira parcela cai em `base`. Desloca pelo MÊS DE FECHAMENTO, não pela
 * data, para que dias 29-31 não façam duas parcelas caírem na mesma fatura.
 */
export function shiftInvoiceCycle(
  base: InvoiceCycle,
  offset: number,
  closingDay: number,
  dueDay: number,
): InvoiceCycle {
  const [year, month] = base.referenceMonth.split("-").map(Number);
  const closingMonth = shiftMonth({ year: year ?? 0, month: month ?? 1 }, offset);
  return cycleForClosingMonth(closingMonth, closingDay, dueDay);
}
