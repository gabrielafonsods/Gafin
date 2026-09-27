import { getDb, promisifyRequest } from "../db";
import type { StoreName } from "../schema";

/**
 * CRUD genérico sobre uma object store do IndexedDB.
 *
 * Cada repositório concreto (ex.: AccountsRepository) deve estender esta
 * classe informando o nome da store e o tipo do registro, e adicionar por
 * cima apenas os métodos de consulta específicos do domínio (ex.:
 * findByMonth, findByCard). Mantém a lógica de acesso a dados fora dos
 * componentes visuais, conforme exigido pela arquitetura do projeto.
 */
export class BaseRepository<T extends { id?: number }> {
  constructor(private readonly storeName: StoreName) {}

  private store(mode: IDBTransactionMode): IDBObjectStore {
    return getDb().transaction(this.storeName, mode).objectStore(this.storeName);
  }

  async getAll(): Promise<T[]> {
    return promisifyRequest(this.store("readonly").getAll() as IDBRequest<T[]>);
  }

  async getById(id: number): Promise<T | undefined> {
    return promisifyRequest(this.store("readonly").get(id) as IDBRequest<T | undefined>);
  }

  async create(record: T): Promise<number> {
    return promisifyRequest(this.store("readwrite").add(record) as IDBRequest<number>);
  }

  async update(record: T): Promise<number> {
    return promisifyRequest(this.store("readwrite").put(record) as IDBRequest<number>);
  }

  async remove(id: number): Promise<void> {
    await promisifyRequest(this.store("readwrite").delete(id));
  }
}
