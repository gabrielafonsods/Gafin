/*
 * Datas do Gafin são strings locais "YYYY-MM-DD" (sem fuso horário), o que
 * evita o clássico bug de uma data "andar um dia" ao converter para UTC.
 * Comparar as strings diretamente respeita a ordem cronológica.
 */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Dias do mês. `month` vai de 1 a 12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isValidISODate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export interface YearMonth {
  year: number;
  month: number;
}

export function parseISODate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 };
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function toMonthKey({ year, month }: YearMonth): string {
  return `${year}-${pad(month)}`;
}

/** "2026-09-27" -> "2026-09" */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/** Monta uma data limitando o dia ao tamanho do mês (dia 31 em fevereiro -> 28/29). */
export function makeDate({ year, month }: YearMonth, day: number): string {
  return `${year}-${pad(month)}-${pad(Math.min(day, daysInMonth(year, month)))}`;
}

/** "2026-09-27" -> "27/09/2026" */
export function formatDateBR(value: string): string {
  const { year, month, day } = parseISODate(value);
  return `${pad(day)}/${pad(month)}/${year}`;
}
