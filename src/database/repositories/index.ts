import { BaseRepository } from "./base-repository";
import type { Account } from "../schema";

/**
 * Único repositório concreto desta primeira etapa — serve como exemplo do
 * padrão a seguir. Os próximos (cardsRepository, transactionsRepository,
 * categoriesRepository, invoicesRepository, investmentsRepository) devem
 * ser criados aqui do mesmo jeito, cada um em seu próprio arquivo se
 * ganhar métodos específicos de domínio.
 */
export const accountsRepository = new BaseRepository<Account>("accounts");
