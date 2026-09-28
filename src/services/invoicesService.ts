import {
  accountsRepository,
  invoicesRepository,
  transactionsRepository,
} from "@/database/repositories";
import type { Card, Invoice } from "@/database/schema";
import { getInvoiceStatus, getInvoiceTotal } from "./balanceCalculator";
import { DomainError } from "./errors";
import { resolveInvoiceCycle } from "./invoiceCycle";
import { requireISODate } from "./validation";
import { todayISO } from "@/utils/date";

/** Fatura do ciclo em que a compra cai; cria o registro se ainda não existir. */
export async function getOrCreateInvoiceForPurchase(
  card: Card,
  purchaseDate: string,
): Promise<Invoice> {
  if (card.id === undefined) throw new DomainError("Cartão inválido.");

  const cycle = resolveInvoiceCycle(purchaseDate, card.closingDay, card.dueDay);
  const existing = await invoicesRepository.getOneByIndex("by_card_month", [
    card.id,
    cycle.referenceMonth,
  ]);
  if (existing) return existing;

  const invoice: Invoice = { cardId: card.id, ...cycle };
  const id = await invoicesRepository.create(invoice);
  return { ...invoice, id };
}

async function loadInvoiceTotal(invoice: Invoice): Promise<number> {
  if (invoice.id === undefined) return 0;
  const purchases = await transactionsRepository.getAllByIndex("by_invoice", invoice.id);
  return getInvoiceTotal(invoice, purchases);
}

/**
 * Registra o pagamento de uma fatura já fechada, debitando a conta escolhida
 * (e liberando o limite do cartão). `paidAt` deve ser posterior ao fechamento.
 */
export async function payInvoice(
  invoiceId: number,
  accountId: number,
  paidAt: string = todayISO(),
): Promise<void> {
  requireISODate(paidAt, "Data do pagamento");

  const invoice = await invoicesRepository.getById(invoiceId);
  if (!invoice) throw new DomainError("Fatura não encontrada.");
  if (invoice.paidAt) throw new DomainError("Esta fatura já foi paga.");
  if (getInvoiceStatus(invoice, paidAt) !== "fechada") {
    throw new DomainError("Só é possível pagar a fatura depois do fechamento.");
  }

  const account = await accountsRepository.getById(accountId);
  if (!account) throw new DomainError("Conta de pagamento não encontrada.");

  const total = await loadInvoiceTotal(invoice);
  if (total <= 0) throw new DomainError("Esta fatura não possui compras.");

  await invoicesRepository.update({
    ...invoice,
    paidAt,
    paidAmount: total,
    paidFromAccountId: accountId,
  });
}

/** Desfaz o pagamento (ex.: pagou na conta errada): o valor volta para a conta. */
export async function undoInvoicePayment(invoiceId: number): Promise<void> {
  const invoice = await invoicesRepository.getById(invoiceId);
  if (!invoice) throw new DomainError("Fatura não encontrada.");
  if (!invoice.paidAt) throw new DomainError("Esta fatura não está paga.");

  await invoicesRepository.update({
    id: invoice.id,
    cardId: invoice.cardId,
    referenceMonth: invoice.referenceMonth,
    closingDate: invoice.closingDate,
    dueDate: invoice.dueDate,
  });
}

/** Remove a fatura se ficou sem nenhuma compra (e não foi paga). */
export async function pruneEmptyInvoice(invoiceId: number): Promise<void> {
  const invoice = await invoicesRepository.getById(invoiceId);
  if (!invoice || invoice.paidAt) return;
  const purchases = await transactionsRepository.countByIndex("by_invoice", invoiceId);
  if (purchases === 0) await invoicesRepository.remove(invoiceId);
}
