import {
  cardsRepository,
  invoicesRepository,
  transactionsRepository,
} from "@/database/repositories";
import type { Card } from "@/database/schema";
import { DomainError } from "./errors";
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
  await cardsRepository.update({ ...normalize(input), id, createdAt: existing.createdAt });
}

export async function deleteCard(id: number): Promise<void> {
  const [purchases, invoices] = await Promise.all([
    transactionsRepository.countByIndex("by_card", id),
    invoicesRepository.countByIndex("by_card", id),
  ]);
  if (purchases + invoices > 0) {
    throw new DomainError(
      "Este cartão possui compras ou faturas e não pode ser excluído. Exclua os lançamentos antes.",
    );
  }
  await cardsRepository.remove(id);
}
