import { daysInMonth, makeDate, parseISODate, shiftMonth, toMonthKey } from "@/utils/date";

export interface InvoiceCycle {
  /** Mês do fechamento ("YYYY-MM"). */
  referenceMonth: string;
  closingDate: string;
  dueDate: string;
}

/**
 * Descobre em qual fatura uma compra cai.
 *
 * Convenção: compras feitas até o dia do fechamento (inclusive) entram na
 * fatura que fecha naquele mês; do dia seguinte em diante, na próxima
 * ("melhor dia de compra" = dia seguinte ao fechamento). Se o vencimento
 * for depois do fechamento no calendário (ex.: fecha 10, vence 20), vence no
 * mesmo mês do fechamento; caso contrário (fecha 25, vence 5), no mês
 * seguinte. Dias 29-31 são ajustados em meses mais curtos.
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
  const dueMonth = dueDay > closingDay ? closingMonth : shiftMonth(closingMonth, 1);

  return {
    referenceMonth: toMonthKey(closingMonth),
    closingDate: makeDate(closingMonth, closingDay),
    dueDate: makeDate(dueMonth, dueDay),
  };
}
