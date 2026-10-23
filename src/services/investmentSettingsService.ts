import { getSettings, saveSettings } from "@/database/repositories";
import type { AssetType } from "@/database/schema";
import { ASSET_TYPES } from "@/types/investments";
import { DomainError } from "./errors";

/** % ideal por tipo de ativo; categorias zeradas/ausentes ficam sem meta. */
export async function setAllocationTargets(targets: Partial<Record<AssetType, number>>): Promise<void> {
  const clean: Partial<Record<AssetType, number>> = {};
  let total = 0;

  for (const type of ASSET_TYPES) {
    const value = targets[type];
    if (value === undefined || value === 0) continue;
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new DomainError("Cada percentual ideal deve ficar entre 0 e 100.");
    }
    clean[type] = Math.round(value * 100) / 100;
    total += clean[type] ?? 0;
  }
  if (total > 100.0001) {
    throw new DomainError(`A soma dos percentuais ideais é ${total.toFixed(2).replace(".", ",")}% e não pode passar de 100%.`);
  }

  const settings = await getSettings();
  const { allocationTargets: _previous, ...rest } = settings;
  await saveSettings(Object.keys(clean).length > 0 ? { ...rest, allocationTargets: clean } : rest);
}

export interface QuoteSettingsPatch {
  /** Texto novo salva; vazio ou null remove. */
  token?: string | null;
  autoRefresh?: boolean;
}

export async function saveQuoteSettings(patch: QuoteSettingsPatch): Promise<void> {
  const settings = await getSettings();
  const current = settings.quotes ?? { autoRefresh: true };
  const next = { ...current };

  if (patch.token !== undefined) {
    const token = patch.token?.trim();
    if (token) next.token = token;
    else delete next.token;
  }
  if (patch.autoRefresh !== undefined) next.autoRefresh = patch.autoRefresh;

  await saveSettings({ ...settings, quotes: next });
}

/** Registra que uma rodada de atualização aconteceu agora. */
export async function recordQuoteRun(whenISO: string): Promise<void> {
  const settings = await getSettings();
  await saveSettings({
    ...settings,
    quotes: { ...(settings.quotes ?? { autoRefresh: true }), lastRunAt: whenISO },
  });
}
