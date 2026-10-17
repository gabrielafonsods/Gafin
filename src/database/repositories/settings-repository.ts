import { getDb, promisifyRequest } from "../db";
import type { AppSettings } from "../schema";

const SETTINGS_ID = "main";

const FALLBACK: AppSettings = {
  id: "main",
  theme: "system",
  security: { enabled: false, inactivityTimeoutMinutes: 5, biometricEnabled: false },
};

function store(mode: IDBTransactionMode): IDBObjectStore {
  return getDb().transaction("settings", mode).objectStore("settings");
}

/**
 * Sempre devolve um registro (o seed já garante isso desde a migração v5,
 * mas o fallback cobre qualquer corrida entre abas/instalações antigas).
 */
export async function getSettings(): Promise<AppSettings> {
  const settings = await promisifyRequest(
    store("readonly").get(SETTINGS_ID) as IDBRequest<AppSettings | undefined>,
  );
  return settings ?? FALLBACK;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await promisifyRequest(store("readwrite").put({ ...settings, id: SETTINGS_ID }));
}
