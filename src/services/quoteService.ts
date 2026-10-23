import {
  assetsRepository,
  getSettings,
  investmentOperationsRepository,
} from "@/database/repositories";
import type { Asset } from "@/database/schema";
import { QUOTABLE_TYPES } from "@/types/investments";
import { recordQuoteRun } from "./investmentSettingsService";
import { calculatePosition } from "./portfolioCalculator";
import { QuoteError, fetchBrapiQuote } from "./quotes/brapiProvider";

/** Ativo B3 (ação, FII, ETF) com ticker e sem a atualização automática desligada. */
export function isQuotable(asset: Asset): boolean {
  return (
    QUOTABLE_TYPES.includes(asset.type) && asset.ticker.trim() !== "" && asset.autoQuote !== false
  );
}

export interface QuoteRunResult {
  /** Ativos consultados com sucesso. */
  updated: number;
  failed: { assetId: number; name: string; ticker: string; reason: string }[];
  /** Ativos que entrariam na rodada mas ficaram de fora porque ela foi interrompida. */
  skipped: number;
  /** Preenchido quando a rodada parou antes do fim (token recusado, limite, sem rede). */
  stoppedEarly?: string;
  /** Quantos ativos eram elegíveis (posição em aberto + ticker + automático). */
  total: number;
}

export interface RefreshOptions {
  fetchImpl?: typeof fetch;
  now?: Date;
}

/**
 * Busca a cotação de cada ativo B3 em aberto e grava como preço atual. As
 * consultas são sequenciais (o plano gratuito aceita uma por vez). Erros de
 * token, limite ou rede interrompem a rodada — os próximos falhariam igual.
 */
export async function refreshQuotes(options: RefreshOptions = {}): Promise<QuoteRunResult> {
  const now = options.now ?? new Date();
  const [settings, assets, operations] = await Promise.all([
    getSettings(),
    assetsRepository.getAll(),
    investmentOperationsRepository.getAll(),
  ]);
  const token = settings.quotes?.token;

  // Só vale gastar consulta com quem ainda tem posição.
  const targets = assets.filter(
    (asset) =>
      isQuotable(asset) &&
      calculatePosition(operations.filter((op) => op.assetId === asset.id)).quantity > 0,
  );

  const result: QuoteRunResult = { updated: 0, failed: [], skipped: 0, total: targets.length };

  for (const [index, asset] of targets.entries()) {
    try {
      const quote = await fetchBrapiQuote(asset.ticker.trim().toUpperCase(), token, options.fetchImpl);
      await assetsRepository.update({
        ...asset,
        currentPrice: quote.price,
        priceUpdatedAt: new Date().toISOString(),
      });
      result.updated++;
    } catch (error) {
      const reason = error instanceof QuoteError ? error.message : "Falha inesperada.";
      result.failed.push({ assetId: asset.id as number, name: asset.name, ticker: asset.ticker, reason });

      if (error instanceof QuoteError && ["auth", "rate_limit", "network"].includes(error.kind)) {
        result.stoppedEarly = reason;
        result.skipped = targets.length - index - 1;
        break;
      }
    }
  }

  await recordQuoteRun(now.toISOString());
  return result;
}

/** Pregão da B3: segunda a sexta, 10h às 18h30 (horário de Brasília). */
export function isMarketOpen(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  if (["Sat", "Sun"].includes(get("weekday"))) return false;
  const minutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  return minutes >= 10 * 60 && minutes <= 18 * 60 + 30;
}

/** Com o pregão aberto atualiza a cada 30 min; fora dele, no máximo a cada 6 h. */
export function shouldAutoRefresh(lastRunAt: string | undefined, now: Date = new Date()): boolean {
  if (!lastRunAt) return true;
  const ageMinutes = (now.getTime() - new Date(lastRunAt).getTime()) / 60_000;
  return ageMinutes >= (isMarketOpen(now) ? 30 : 360);
}

/** Atualização automática: só com token salvo, ligada nas configurações e se já passou tempo. */
export async function refreshQuotesIfDue(options: RefreshOptions = {}): Promise<QuoteRunResult | null> {
  const settings = await getSettings();
  const quotes = settings.quotes;
  if (!quotes?.token || quotes.autoRefresh === false) return null;
  if (!shouldAutoRefresh(quotes.lastRunAt, options.now)) return null;
  return refreshQuotes(options);
}

/** Consulta um ticker de teste com o token salvo — para o botão "Testar conexão". */
export async function testQuoteConnection(
  fetchImpl?: typeof fetch,
): Promise<{ symbol: string; price: number }> {
  const settings = await getSettings();
  return fetchBrapiQuote("PETR4", settings.quotes?.token, fetchImpl);
}
