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

/** "2026-09" + 1 -> "2026-10" */
export function shiftMonthKey(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  return toMonthKey(shiftMonth({ year: year ?? 0, month: month ?? 1 }, delta));
}

/** "2026-09" -> "setembro de 2026" */
export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/** Mesmo dia, `delta` meses depois (dia 31 vira o último dia do mês mais curto). */
export function shiftDateByMonths(date: string, delta: number): string {
  const { year, month, day } = parseISODate(date);
  return makeDate(shiftMonth({ year, month }, delta), day);
}

/** Soma (ou subtrai) dias a uma data "YYYY-MM-DD". */
export function addDaysISO(date: string, days: number): string {
  const { year, month, day } = parseISODate(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Último dia do mês: "2026-02" -> "2026-02-28". */
export function endOfMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return makeDate({ year: year ?? 0, month: month ?? 1 }, 31);
}

/** Os `count` meses que terminam em `endKey`, do mais antigo ao mais novo. */
export function monthRange(endKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonthKey(endKey, i - (count - 1)));
}

/** "2026-09" -> "set" */
export function formatMonthShort(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
}

/** "agora", "há 12 min", "há 3 h", "há 2 dias" — para mostrar a idade de uma cotação. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}
