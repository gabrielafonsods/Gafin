/**
 * Cotações da B3 pela brapi.dev (plano gratuito: 1 ticker por chamada, ~30 min
 * de atraso, 15 mil consultas/mês). O token é pessoal e vai na query string
 * — uma requisição "simples" para o navegador, sem a pré-checagem CORS que o
 * cabeçalho Authorization exigiria.
 */

const BASE_URL = "https://brapi.dev/api/v2/stocks/quote";

export type QuoteErrorKind = "auth" | "rate_limit" | "not_found" | "network" | "server" | "invalid";

export class QuoteError extends Error {
  constructor(
    message: string,
    readonly kind: QuoteErrorKind,
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

export interface Quote {
  symbol: string;
  price: number;
}

interface BrapiItem {
  symbol?: string;
  regularMarketPrice?: unknown;
  data?: { regularMarketPrice?: unknown };
}

/** Aceita o formato v2 (results[].data) e o v1 (results[]) — o preço é o mesmo campo. */
function readPrice(body: unknown): number | null {
  const item = (body as { results?: BrapiItem[] } | null)?.results?.[0];
  const price = item?.data?.regularMarketPrice ?? item?.regularMarketPrice;
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
}

export async function fetchBrapiQuote(
  symbol: string,
  token: string | undefined,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10_000,
): Promise<Quote> {
  const params = new URLSearchParams({ symbols: symbol });
  if (token) params.set("token", token);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(`${BASE_URL}?${params.toString()}`, { signal: controller.signal });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    throw new QuoteError(
      timedOut
        ? "A consulta demorou demais."
        : "Sem conexão ou acesso bloqueado pelo navegador (CORS).",
      "network",
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 || response.status === 403) {
    throw new QuoteError(
      token
        ? "Token recusado ou sem acesso a este ativo no seu plano."
        : "Sem token: só alguns ativos de teste funcionam. Informe o token em Configurações.",
      "auth",
    );
  }
  if (response.status === 429) throw new QuoteError("Limite de consultas atingido. Tente mais tarde.", "rate_limit");
  if (response.status === 404) throw new QuoteError("Ticker não encontrado.", "not_found");
  if (response.status >= 500) throw new QuoteError("O serviço de cotações está instável.", "server");
  if (!response.ok) throw new QuoteError(`Resposta inesperada (${response.status}).`, "invalid");

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new QuoteError("Resposta ilegível do serviço de cotações.", "invalid");
  }

  const price = readPrice(body);
  if (price === null) throw new QuoteError("Cotação indisponível para este ticker.", "not_found");
  return { symbol, price };
}
