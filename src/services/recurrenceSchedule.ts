import type { RecurrenceFrequency } from "@/database/schema";
import { addDaysISO, shiftDateByMonths } from "@/utils/date";

/*
 * Agenda de uma recorrência — funções puras. A data de cada ocorrência é
 * calculada a partir da primeira (não da anterior), então um "dia 31"
 * volta a ser 31 nos meses longos depois de ser 28 em fevereiro.
 */

export interface ScheduleRule {
  startDate: string;
  frequency: RecurrenceFrequency;
  endDate?: string;
}

const MAX_INDEX = 1000;

export function occurrenceAt(rule: ScheduleRule, index: number): string {
  switch (rule.frequency) {
    case "semanal":
      return addDaysISO(rule.startDate, 7 * index);
    case "mensal":
      return shiftDateByMonths(rule.startDate, index);
    case "anual":
      return shiftDateByMonths(rule.startDate, 12 * index);
  }
}

/**
 * Ocorrências em (after, until] — `after` fora, `until` dentro — respeitando
 * o fim da regra. `limit` protege contra datas de início absurdas.
 */
export function occurrencesBetween(
  rule: ScheduleRule,
  after: string | undefined,
  until: string,
  limit = 366,
): string[] {
  const dates: string[] = [];
  for (let i = 0; i < MAX_INDEX && dates.length < limit; i++) {
    const date = occurrenceAt(rule, i);
    if (date > until || (rule.endDate !== undefined && date > rule.endDate)) break;
    if (after !== undefined && date <= after) continue;
    dates.push(date);
  }
  return dates;
}

/** Primeira ocorrência depois de `after` (ou a inicial, se nada foi lançado). */
export function nextOccurrence(rule: ScheduleRule, after: string | undefined): string | null {
  for (let i = 0; i < MAX_INDEX; i++) {
    const date = occurrenceAt(rule, i);
    if (rule.endDate !== undefined && date > rule.endDate) return null;
    if (after === undefined || date > after) return date;
  }
  return null;
}

/** Quanto a regra pesa por mês, em média (semanal = 52/12 ocorrências, anual = 1/12). */
export function monthlyEquivalent(frequency: RecurrenceFrequency, amount: number): number {
  const factor = frequency === "mensal" ? 1 : frequency === "semanal" ? 52 / 12 : 1 / 12;
  return Math.round(amount * factor * 100) / 100;
}
