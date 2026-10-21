import {
  cardsRepository,
  invoicesRepository,
  transactionsRepository,
} from "@/database/repositories";
import type { Card } from "@/database/schema";
import { getCardLimitUsage } from "./balanceCalculator";
import { DomainError } from "./errors";
import { loadFinanceSnapshot } from "./financeSnapshot";
import { countRecurrencesUsing } from "./recurrencesService";
import { requireDayOfMonth, requirePositiveMoney, requireText } from "./validation";

export interface CardInput {
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
}

function normalize(input: CardInput) {
  return {
    name: requireText(input.name, "Nome do cartão"),
    limit: requirePositiveMoney(input.limit, "Limite"),
    closingDay: requireDayOfMonth(input.closingDay, "Dia de fechamento"),
    dueDay: requireDayOfMonth(input.dueDay, "Dia de vencimento"),
  };
}

export async function createCard(input: CardInput): Promise<number> {
  const card: Card = { ...normalize(input), createdAt: new Date().toISOString() };
  return cardsRepository.create(card);
}

/**
 * Faturas já existentes mantêm as datas com que foram criadas; os novos
 * dias de fechamento/vencimento valem para os próximos ciclos.
 */
export async function updateCard(id: number, input: CardInput): Promise<void> {
  const existing = await cardsRepository.getById(id);
  if (!existing) throw new DomainError("Cartão não encontrado.");
  await cardsRepository.update({
    ...normalize(input),
    ...(existing.archived ? { archived: true } : {}),
    id,
    createdAt: existing.createdAt,
  });
}

/** Só sem fatura em aberto: o limite usado precisa estar zerado. */
export async function archiveCard(id: number): Promise<void> {
  const card = await cardsRepository.getById(id);
  if (!card) throw new DomainError("Cartão não encontrado.");

  if ((await countRecurrencesUsing({ cardId: id })) > 0) {
    throw new DomainError("Este cartão é usado em lançamentos recorrentes. Exclua as recorrências antes.");
  }
  const { used } = getCardLimitUsage(card, await loadFinanceSnapshot());
  if (used > 0) {
    throw new DomainError("Este cartão ainda tem fatura em aberto. Pague as faturas antes de arquivar.");
  }
  await cardsRepository.update({ ...card, archived: true });
}

export async function unarchiveCard(id: number): Promise<void> {
  const card = await cardsRepository.getById(id);
  if (!card) throw new DomainError("Cartão não encontrado.");
  const { archived: _archived, ...rest } = card;
  await cardsRepository.update(rest);
}

export async function deleteCard(id: number): Promise<void> {
  const [purchases, invoices] = await Promise.all([
    transactionsRepository.countByIndex("by_card", id),
    invoicesRepository.countByIndex("by_card", id),
  ]);
  if ((await countRecurrencesUsing({ cardId: id })) > 0) {
    throw new DomainError("Este cartão é usado em lançamentos recorrentes. Exclua as recorrências antes.");
  }
  if (purchases + invoices > 0) {
    throw new DomainError(
      "Este cartão possui compras ou faturas e não pode ser excluído. Se não o usa mais, arquive-o.",
    );
  }
  await cardsRepository.remove(id);
}
