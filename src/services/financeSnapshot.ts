import {
  accountsRepository,
  cardsRepository,
  invoicesRepository,
  transactionsRepository,
  transfersRepository,
} from "@/database/repositories";
import type { FinanceSnapshot } from "./balanceCalculator";

/** Lê tudo que os cálculos de saldo precisam (só leitura). */
export async function loadFinanceSnapshot(): Promise<FinanceSnapshot> {
  const [accounts, cards, transactions, invoices, transfers] = await Promise.all([
    accountsRepository.getAll(),
    cardsRepository.getAll(),
    transactionsRepository.getAll(),
    invoicesRepository.getAll(),
    transfersRepository.getAll(),
  ]);
  return { accounts, cards, transactions, invoices, transfers };
}
