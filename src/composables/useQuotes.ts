import { ref } from "vue";
import { refreshQuotes, refreshQuotesIfDue, type QuoteRunResult } from "@/services/quoteService";
import { useInvestments } from "./useInvestments";
import { useSettings } from "./useSettings";

/*
 * Atualização de cotações. Só uma rodada por vez: se o app pedir de novo
 * enquanto uma está em andamento (ex.: voltar do segundo plano), reaproveita
 * a que já está rodando — o plano gratuito aceita uma consulta por vez.
 */
const refreshing = ref(false);
const lastResult = ref<QuoteRunResult | null>(null);
let inFlight: Promise<QuoteRunResult | null> | null = null;

function run(task: () => Promise<QuoteRunResult | null>): Promise<QuoteRunResult | null> {
  if (inFlight) return inFlight;

  refreshing.value = true;
  inFlight = task()
    .then(async (result) => {
      if (result) {
        lastResult.value = result;
        // Recarrega os preços novos e o horário da última rodada.
        await Promise.all([useInvestments().reload(), useSettings().reload()]);
      }
      return result;
    })
    .finally(() => {
      refreshing.value = false;
      inFlight = null;
    });
  return inFlight;
}

export function useQuotes() {
  return {
    refreshing,
    lastResult,
    /** Atualiza agora (botão). */
    refresh: () => run(() => refreshQuotes()),
    /** Atualiza só se já passou tempo suficiente (abertura do app / volta do segundo plano). */
    refreshIfDue: () =>
      run(() => refreshQuotesIfDue()).catch((error) => {
        console.error("Falha ao atualizar cotações:", error);
        return null;
      }),
  };
}
