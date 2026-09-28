import { BaseRepository } from "./base-repository";
import type {
  Account,
  Card,
  Category,
  Investment,
  Invoice,
  Transaction,
  Transfer,
} from "../schema";

/**
 * Repositórios concretos. Cada um cobre o CRUD básico de uma store; as
 * regras de negócio (validações, faturas, saldos) ficam em src/services.
 */
export const accountsRepository = new BaseRepository<Account>("accounts");
export const cardsRepository = new BaseRepository<Card>("cards");
export const categoriesRepository = new BaseRepository<Category>("categories");
export const transactionsRepository = new BaseRepository<Transaction>("transactions");
export const invoicesRepository = new BaseRepository<Invoice>("invoices");
export const transfersRepository = new BaseRepository<Transfer>("transfers");
export const investmentsRepository = new BaseRepository<Investment>("investments");
