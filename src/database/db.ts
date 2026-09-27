import { DB_NAME, DB_VERSION, STORES } from "./schema";

let dbInstance: IDBDatabase | null = null;
let openPromise: Promise<IDBDatabase> | null = null;

/**
 * Abre (ou reaproveita) a conexão com o IndexedDB e garante que todas as
 * object stores descritas em STORES existam. Deve ser chamada uma vez, no
 * bootstrap da aplicação (ver main.ts).
 */
export function initDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (openPromise) return openPromise;

  openPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of Object.values(STORES)) {
        if (db.objectStoreNames.contains(store.name)) continue;
        const objectStore = db.createObjectStore(store.name, {
          keyPath: store.keyPath,
          autoIncrement: store.autoIncrement ?? false,
        });
        for (const index of store.indexes ?? []) {
          objectStore.createIndex(index.name, index.keyPath, {
            unique: index.unique ?? false,
          });
        }
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      openPromise = null;
      reject(request.error);
    };
  });

  return openPromise;
}

/** Retorna a conexão já aberta. Lança erro se chamada antes de initDatabase(). */
export function getDb(): IDBDatabase {
  if (!dbInstance) {
    throw new Error(
      "IndexedDB ainda não foi inicializado. initDatabase() deve ser " +
        "aguardado antes de qualquer acesso a repositórios.",
    );
  }
  return dbInstance;
}

/** Promisifica uma IDBRequest qualquer. */
export function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
