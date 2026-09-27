import { BaseRepository } from "./base-repository";
import type { Account, Investment } from "../schema";

/**
 * Repositórios concretos disponíveis. Os próximos (cardsRepository,
 * transactionsRepository, categoriesRepository, invoicesRepository) devem
 * ser adicionados aqui do mesmo jeito, cada um em seu próprio arquivo se
 * ganhar métodos específicos de domínio além do CRUD básico.
 */
export const accountsRepository = new BaseRepository<Account>("accounts");
export const investmentsRepository = new BaseRepository<Investment>("investments");
