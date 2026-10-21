import {
  accountsRepository,
  cardsRepository,
  recurrencesRepository,
  transactionsRepository,
} from "@/database/repositories";
import type { PaymentMethod, Recurrence, RecurrenceFrequency } from "@/database/schema";
import { RECURRENCE_FREQUENCIES } from "@/types/balance";
import { addDaysISO, shiftDateByMonths, todayISO } from "@/utils/date";
import { DomainError, toUserMessage } from "./errors";
import { occurrencesBetween } from "./recurrenceSchedule";
import { buildCommon, createExpense, createIncome } from "./transactionsService";
import { requireISODate } from "./validation";

const MAX_PAST_MONTHS = 24;

export interface RecurrenceInput {
  kind: "entrada" | "saida";
  /** Valor de cada ocorrência. */
  amount: number;
  categoryId: number;
  description: string;
  customCategory?: string;
  frequency: RecurrenceFrequency;
  /** Primeira ocorrência. Datas passadas lançam as ocorrências atrasadas. */
  startDate: string;
  endDate?: string;
  /** Só saídas: dinheiro, PIX ou cartão. */
  paymentMethod?: PaymentMethod;
  accountId?: number;
  cardId?: number;
}

interface Meta {
  createdAt: string;
  active: boolean;
  generatedThrough?: string;
}

async function accountOf(id: number | undefined, unchangedId?: number): Promise<number> {
  if (id === undefined) throw new DomainError("Escolha a conta.");
  const account = await accountsRepository.getById(id);
  if (!account) throw new DomainError("Conta não encontrada.");
  if (account.archived && id !== unchangedId) throw new DomainError(`A conta "${account.name}" está arquivada.`);
  return id;
}

async function cardOf(id: number | undefined, unchangedId?: number): Promise<number> {
  if (id === undefined) throw new DomainError("Escolha o cartão.");
  const card = await cardsRepository.getById(id);
  if (!card) throw new DomainError("Cartão não encontrado.");
  if (card.archived && id !== unchangedId) throw new DomainError(`O cartão "${card.name}" está arquivado.`);
  return id;
}

async function buildRule(input: RecurrenceInput, meta: Meta, previous?: Recurrence): Promise<Recurrence> {
  if (!RECURRENCE_FREQUENCIES.includes(input.frequency)) throw new DomainError("Frequência inválida.");

  const startDate = requireISODate(input.startDate, "Primeira ocorrência");
  const tooOld = shiftDateByMonths(todayISO(), -MAX_PAST_MONTHS);
  if (startDate < tooOld && startDate !== previous?.startDate) {
    throw new DomainError(`A primeira ocorrência não pode ser anterior a ${MAX_PAST_MONTHS} meses.`);
  }
  const endDate = input.endDate ? requireISODate(input.endDate, "Data final") : undefined;
  if (endDate !== undefined && endDate < startDate) {
    throw new DomainError("A data final é anterior à primeira ocorrência.");
  }

  // Reaproveita a validação de valor, data e categoria dos lançamentos normais.
  const common = await buildCommon(
    {
      amount: input.amount,
      date: startDate,
      categoryId: input.categoryId,
      description: input.description,
      customCategory: input.customCategory,
    },
    input.kind,
  );

  const base = {
    amount: common.amount,
    categoryId: common.categoryId,
    description: common.description,
    ...(common.customCategory ? { customCategory: common.customCategory } : {}),
    frequency: input.frequency,
    startDate,
    ...(endDate ? { endDate } : {}),
    active: meta.active,
    ...(meta.generatedThrough ? { generatedThrough: meta.generatedThrough } : {}),
    createdAt: meta.createdAt,
  };

  const previousAccountId = previous && "accountId" in previous ? previous.accountId : undefined;
  const previousCardId = previous && "cardId" in previous ? previous.cardId : undefined;

  if (input.kind === "entrada") {
    return { ...base, kind: "entrada", accountId: await accountOf(input.accountId, previousAccountId) };
  }
  if (input.paymentMethod === "cartao") {
    return {
      ...base,
      kind: "saida",
      paymentMethod: "cartao",
      cardId: await cardOf(input.cardId, previousCardId),
    };
  }
  if (input.paymentMethod === "dinheiro" || input.paymentMethod === "pix") {
    return {
      ...base,
      kind: "saida",
      paymentMethod: input.paymentMethod,
      accountId: await accountOf(input.accountId, previousAccountId),
    };
  }
  throw new DomainError("Escolha a forma de pagamento.");
}

export async function createRecurrence(input: RecurrenceInput): Promise<number> {
  const rule = await buildRule(input, { createdAt: new Date().toISOString(), active: true });
  return recurrencesRepository.create(rule);
}

/** Mudanças valem para as próximas ocorrências; o que já foi lançado não é tocado. */
export async function updateRecurrence(id: number, input: RecurrenceInput): Promise<void> {
  const existing = await recurrencesRepository.getById(id);
  if (!existing) throw new DomainError("Recorrência não encontrada.");

  const rule = await buildRule(
    input,
    {
      createdAt: existing.createdAt,
      active: existing.active,
      ...(existing.generatedThrough ? { generatedThrough: existing.generatedThrough } : {}),
    },
    existing,
  );
  await recurrencesRepository.update({ ...rule, id });
}

/**
 * Pausar não gera nada enquanto estiver pausada; ao reativar, o período
 * pausado é pulado (não vira um monte de lançamentos atrasados).
 */
export async function setRecurrenceActive(id: number, active: boolean): Promise<void> {
  const existing = await recurrencesRepository.getById(id);
  if (!existing) throw new DomainError("Recorrência não encontrada.");
  if (existing.active === active) return;

  let generatedThrough = existing.generatedThrough;
  if (active) {
    const yesterday = addDaysISO(todayISO(), -1);
    if (generatedThrough === undefined || generatedThrough < yesterday) generatedThrough = yesterday;
  }
  await recurrencesRepository.update({
    ...existing,
    active,
    ...(generatedThrough ? { generatedThrough } : {}),
  });
}

/** Remove só a regra: os lançamentos que ela já gerou continuam no histórico. */
export async function deleteRecurrence(id: number): Promise<void> {
  await recurrencesRepository.remove(id);
}

/** Quantas regras usam a conta/cartão/categoria (para travar exclusão e arquivamento). */
export async function countRecurrencesUsing(target: {
  accountId?: number;
  cardId?: number;
  categoryId?: number;
}): Promise<number> {
  const rules = await recurrencesRepository.getAll();
  return rules.filter(
    (rule) =>
      (target.accountId !== undefined && "accountId" in rule && rule.accountId === target.accountId) ||
      (target.cardId !== undefined && "cardId" in rule && rule.cardId === target.cardId) ||
      (target.categoryId !== undefined && rule.categoryId === target.categoryId),
  ).length;
}

async function createOccurrence(rule: Recurrence, date: string): Promise<void> {
  const common = {
    amount: rule.amount,
    date,
    categoryId: rule.categoryId,
    description: rule.description,
    ...(rule.customCategory ? { customCategory: rule.customCategory } : {}),
    recurrence: { ruleId: rule.id as number, date },
  };

  if (rule.kind === "entrada") {
    await createIncome({ ...common, accountId: rule.accountId });
  } else if (rule.paymentMethod === "cartao") {
    await createExpense({ ...common, paymentMethod: "cartao", cardId: rule.cardId });
  } else {
    await createExpense({ ...common, paymentMethod: rule.paymentMethod, accountId: rule.accountId });
  }
}

export interface RecurrenceRunResult {
  created: number;
  /** Ocorrências que não puderam ser lançadas (ex.: fatura já paga, conta arquivada). */
  skipped: { ruleId: number; description: string; date: string; reason: string }[];
}

/**
 * Lança tudo que venceu até `today`. Pode rodar quantas vezes quiser: cada
 * lançamento carrega (regra, data) e ocorrências já lançadas são puladas,
 * então abrir o app duas vezes no mesmo dia nunca duplica nada.
 */
export async function generateDueTransactions(today: string = todayISO()): Promise<RecurrenceRunResult> {
  const result: RecurrenceRunResult = { created: 0, skipped: [] };

  const rules = (await recurrencesRepository.getAll()).filter((rule) => rule.active);
  if (rules.length === 0) return result;

  const done = new Set(
    (await transactionsRepository.getAll())
      .filter((t) => t.recurrenceId !== undefined && t.occurrenceDate !== undefined)
      .map((t) => `${t.recurrenceId}|${t.occurrenceDate}`),
  );

  for (const rule of rules) {
    const dates = occurrencesBetween(rule, rule.generatedThrough, today);
    const last = dates[dates.length - 1];
    if (last === undefined) continue;

    for (const date of dates) {
      const key = `${rule.id}|${date}`;
      if (done.has(key)) continue;
      try {
        await createOccurrence(rule, date);
        done.add(key);
        result.created++;
      } catch (error) {
        result.skipped.push({
          ruleId: rule.id as number,
          description: rule.description,
          date,
          reason: toUserMessage(error),
        });
      }
    }
    await recurrencesRepository.update({ ...rule, generatedThrough: last });
  }
  return result;
}
