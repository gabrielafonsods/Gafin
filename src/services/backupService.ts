import { getDb } from "@/database/db";
import {
  accountsRepository,
  assetsRepository,
  cardsRepository,
  categoriesRepository,
  getSettings,
  investmentIncomesRepository,
  investmentOperationsRepository,
  invoicesRepository,
  recurrencesRepository,
  transactionsRepository,
  transfersRepository,
} from "@/database/repositories";
import {
  DB_VERSION,
  MIN_BACKUP_SCHEMA_VERSION,
  STORES,
  STORE_ADDED_IN,
  type AppSettings,
  type Theme,
} from "@/database/schema";
import { jsonFile, saveFile } from "@/utils/fileSaver";
import { DomainError } from "./errors";

const APP_ID = "gafin";

export interface BackupPayload {
  app: typeof APP_ID;
  schemaVersion: number;
  exportedAt: string;
  data: Record<string, unknown[]>;
}

/**
 * O backup leva só preferências (tema e tempo de bloqueio). PIN, hash e
 * Face ID ficam de fora: o arquivo é texto puro e credenciais pertencem ao
 * aparelho — restaurar um backup antigo nunca deve trancar você com um PIN
 * que já esqueceu.
 */
function sanitizeSettingsForBackup(settings: AppSettings): AppSettings {
  return {
    id: "main",
    theme: settings.theme,
    security: {
      enabled: false,
      inactivityTimeoutMinutes: settings.security.inactivityTimeoutMinutes,
      biometricEnabled: false,
    },
    // As metas de alocação são dado do usuário e vão no backup; o token de
    // cotações (settings.quotes) é credencial e fica de fora, como o PIN.
    ...(settings.allocationTargets ? { allocationTargets: settings.allocationTargets } : {}),
  };
}

function validTargets(value: unknown): AppSettings["allocationTargets"] | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, percent]) => typeof percent === "number" && Number.isFinite(percent) && percent > 0 && percent <= 100,
  );
  return entries.length > 0 ? (Object.fromEntries(entries) as AppSettings["allocationTargets"]) : undefined;
}

const THEMES: readonly Theme[] = ["light", "dark", "system"];

/** Tema e tempo vêm do backup; o PIN/biometria atuais do aparelho são mantidos. */
async function mergeSettingsForRestore(payload: BackupPayload): Promise<AppSettings> {
  const current = await getSettings();
  const imported = payload.data.settings?.[0] as Partial<AppSettings> | undefined;

  const theme = THEMES.includes(imported?.theme as Theme) ? (imported?.theme as Theme) : current.theme;
  const timeout = imported?.security?.inactivityTimeoutMinutes;
  const inactivityTimeoutMinutes =
    typeof timeout === "number" && Number.isInteger(timeout) && timeout >= 0
      ? timeout
      : current.security.inactivityTimeoutMinutes;

  const allocationTargets = validTargets(imported?.allocationTargets) ?? current.allocationTargets;

  return {
    id: "main",
    theme,
    security: { ...current.security, inactivityTimeoutMinutes },
    // Token de cotações é do aparelho: nunca vem do arquivo, e o atual é mantido.
    ...(current.quotes ? { quotes: current.quotes } : {}),
    ...(allocationTargets ? { allocationTargets } : {}),
  };
}

async function collectData(): Promise<Record<string, unknown[]>> {
  const [
    accounts,
    cards,
    categories,
    transactions,
    invoices,
    transfers,
    investments,
    investmentOperations,
    investmentIncomes,
    recurrences,
    settings,
  ] = await Promise.all([
    accountsRepository.getAll(),
    cardsRepository.getAll(),
    categoriesRepository.getAll(),
    transactionsRepository.getAll(),
    invoicesRepository.getAll(),
    transfersRepository.getAll(),
    assetsRepository.getAll(),
    investmentOperationsRepository.getAll(),
    investmentIncomesRepository.getAll(),
    recurrencesRepository.getAll(),
    getSettings(),
  ]);

  // As chaves batem 1:1 com as stores em schema.ts (ver STORES); isso é
  // conferido na validação e usado tal qual na restauração.
  return {
    accounts,
    cards,
    categories,
    transactions,
    invoices,
    transfers,
    investments,
    investmentOperations,
    investmentIncomes,
    recurrences,
    settings: [sanitizeSettingsForBackup(settings)],
  };
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  return {
    app: APP_ID,
    schemaVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    data: await collectData(),
  };
}

/** Só lê o banco e entrega uma cópia ao usuário — nunca grava nada. */
export async function exportBackup(): Promise<void> {
  const payload = await buildBackupPayload();
  await saveFile(jsonFile(`gafin-backup-${payload.exportedAt.slice(0, 10)}.json`, payload));
}

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null);
}

/** Confere a forma do arquivo. Não toca no banco — pode ser chamada livremente. */
export function validateBackupPayload(payload: unknown): asserts payload is BackupPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new DomainError("Arquivo de backup inválido.");
  }
  const candidate = payload as Partial<BackupPayload>;

  if (candidate.app !== APP_ID) {
    throw new DomainError("Este arquivo não é um backup do Gafin.");
  }
  const version = candidate.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    throw new DomainError("Arquivo de backup inválido: versão ausente.");
  }
  if (version > DB_VERSION) {
    throw new DomainError(
      `Este backup foi feito numa versão mais nova do Gafin (v${version}; este app está na v${DB_VERSION}). Atualize o app antes de restaurar.`,
    );
  }
  if (version < MIN_BACKUP_SCHEMA_VERSION) {
    throw new DomainError("Este backup é de uma versão antiga demais do Gafin para ser restaurado.");
  }
  if (typeof candidate.data !== "object" || candidate.data === null) {
    throw new DomainError("Arquivo de backup corrompido: dados ausentes.");
  }
  for (const storeName of Object.keys(STORES)) {
    const value = (candidate.data as Record<string, unknown>)[storeName];
    // Backup antigo não tem as stores criadas depois dele: ficam vazias na restauração.
    if (value === undefined && (STORE_ADDED_IN[storeName] ?? 1) > version) continue;
    if (!isRecordArray(value)) {
      throw new DomainError(`Arquivo de backup corrompido: dados de "${storeName}" ausentes ou inválidos.`);
    }
  }
}

async function parseBackupFile(file: File): Promise<BackupPayload> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new DomainError("Arquivo inválido: não é um JSON válido.");
  }
  validateBackupPayload(raw);
  return raw;
}

/**
 * Restaura tudo em UMA transação: se qualquer gravação falhar, o IndexedDB
 * aborta a transação inteira automaticamente e os dados atuais permanecem
 * exatamente como estavam — nunca fica pela metade.
 */
export async function restoreBackup(payload: BackupPayload): Promise<void> {
  validateBackupPayload(payload); // repete a checagem mesmo se o chamador já validou
  const storeNames = Object.keys(STORES);
  const data: Record<string, unknown[]> = {
    ...payload.data,
    settings: [await mergeSettingsForRestore(payload)],
  };

  await new Promise<void>((resolve, reject) => {
    const tx = getDb().transaction(storeNames, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DomainError("A restauração foi cancelada."));

    for (const storeName of storeNames) {
      const store = tx.objectStore(storeName);
      store.clear();
      for (const record of data[storeName] ?? []) {
        store.add(record); // ids originais preservados (contas, faturas etc. continuam referenciáveis)
      }
    }
  });
}

/**
 * Ponto de entrada da tela: valida o arquivo ANTES de mexer no banco. Se for
 * inválido, lança DomainError e os dados atuais não são tocados.
 */
export async function importBackupFromFile(file: File): Promise<void> {
  const payload = await parseBackupFile(file);
  await restoreBackup(payload);
}
