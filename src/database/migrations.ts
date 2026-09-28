import type { Asset, InvestmentOperation } from "./schema";

/**
 * Migrações de DADOS de stores que já existiam em versões anteriores.
 * Rodam dentro da própria transação de upgrade do IndexedDB: ou tudo é
 * aplicado, ou nada é (o banco antigo continua intacto).
 */
export function runMigrations(db: IDBDatabase, tx: IDBTransaction, oldVersion: number): void {
  if (oldVersion < 4) migrateInvestmentsToAssetsAndOperations(db, tx);
}

interface LegacyInvestment {
  id?: number;
  assetName?: string;
  quantity?: number;
  averagePrice?: number;
  createdAt?: string;
}

/**
 * v4: o "investimento" antigo (nome + quantidade + preço médio digitados à
 * mão) vira um ativo + uma operação de compra inicial com esses mesmos
 * valores, preservando a posição que o usuário já tinha cadastrado.
 */
function migrateInvestmentsToAssetsAndOperations(db: IDBDatabase, tx: IDBTransaction): void {
  if (!db.objectStoreNames.contains("investments")) return;

  const assets = tx.objectStore("investments");
  if (assets.indexNames.contains("by_asset_name")) assets.deleteIndex("by_asset_name");
  if (!assets.indexNames.contains("by_name")) assets.createIndex("by_name", "name");

  const operations = tx.objectStore("investmentOperations");
  const request = assets.openCursor();

  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;

    const legacy = cursor.value as LegacyInvestment;
    if (legacy.assetName !== undefined && legacy.id !== undefined) {
      const createdAt = legacy.createdAt ?? new Date().toISOString();

      const asset: Asset = {
        id: legacy.id,
        name: legacy.assetName,
        ticker: "",
        type: "outros",
        institution: "",
        createdAt,
      };
      cursor.update(asset);

      if (
        typeof legacy.quantity === "number" &&
        typeof legacy.averagePrice === "number" &&
        legacy.quantity > 0
      ) {
        const initialPosition: InvestmentOperation = {
          assetId: legacy.id,
          type: "compra",
          quantity: legacy.quantity,
          price: legacy.averagePrice,
          fees: 0,
          date: createdAt.slice(0, 10),
          note: "Posição inicial (migrada da versão anterior)",
          createdAt,
        };
        operations.add(initialPosition);
      }
    }
    cursor.continue();
  };
}
