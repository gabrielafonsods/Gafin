import { getDb, promisifyRequest } from "../db";
import type { StoreName } from "../schema";

/**
 * CRUD genérico sobre uma object store do IndexedDB.
 *
 * Cada repositório concreto deve informar o nome da store e o tipo do
 * registro. Mantém a lógica de acesso a dados fora dos componentes visuais,
 * conforme exigido pela arquitetura do projeto.
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

  /** Todos os registros cuja chave do índice casa com `query`. */
  async getAllByIndex(indexName: string, query: IDBValidKey | IDBKeyRange): Promise<T[]> {
    return promisifyRequest(
      this.store("readonly").index(indexName).getAll(query) as IDBRequest<T[]>,
    );
  }

  /** Primeiro registro cuja chave do índice casa com `query`. */
  async getOneByIndex(indexName: string, query: IDBValidKey | IDBKeyRange): Promise<T | undefined> {
    return promisifyRequest(
      this.store("readonly").index(indexName).get(query) as IDBRequest<T | undefined>,
    );
  }

  async countByIndex(indexName: string, query: IDBValidKey | IDBKeyRange): Promise<number> {
    return promisifyRequest(this.store("readonly").index(indexName).count(query));
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

  /**
   * Remove e adiciona registros em UMA transação: ou tudo é gravado ou nada
   * (usado em compras parceladas, que têm várias linhas). Devolve os ids
   * dos registros adicionados, na ordem em que foram passados.
   */
  applyChanges(changes: { remove?: number[]; add?: T[] }): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const tx = getDb().transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const ids: number[] = [];

      tx.oncomplete = () => resolve(ids);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Operação cancelada."));

      try {
        for (const id of changes.remove ?? []) store.delete(id);
        for (const record of changes.add ?? []) {
          const request = store.add(record);
          request.onsuccess = () => ids.push(request.result as number);
        }
      } catch (error) {
        tx.abort();
        reject(error);
      }
    });
  }

  createMany(records: T[]): Promise<number[]> {
    return this.applyChanges({ add: records });
  }
}
