<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuotes } from "@/composables/useQuotes";
import { useSettings } from "@/composables/useSettings";
import { toUserMessage } from "@/services/errors";
import { QuoteError } from "@/services/quotes/brapiProvider";
import { testQuoteConnection } from "@/services/quoteService";
import { formatCurrency } from "@/utils/currency";
import { formatRelativeTime } from "@/utils/date";

const { quotes, saveQuoteSettings } = useSettings();
const { refresh, refreshing } = useQuotes();

const tokenInput = ref("");
const message = ref("");
const error = ref("");
const testing = ref(false);

const hasToken = computed(() => !!quotes.value.token);

/** Executa uma ação mostrando sucesso ou o motivo do erro (inclusive erros de rede/cotação). */
async function run(action: () => Promise<string | void>) {
  error.value = "";
  message.value = "";
  try {
    const success = await action();
    if (success) message.value = success;
  } catch (e) {
    error.value = e instanceof QuoteError ? e.message : toUserMessage(e);
  }
}

const saveToken = () =>
  run(async () => {
    await saveQuoteSettings({ token: tokenInput.value });
    tokenInput.value = "";
    return "Token salvo neste aparelho.";
  });

const removeToken = () =>
  run(async () => {
    await saveQuoteSettings({ token: null });
    return "Token removido.";
  });

async function testConnection() {
  testing.value = true;
  await run(async () => {
    const quote = await testQuoteConnection();
    return `Funcionou: PETR4 está em ${formatCurrency(quote.price)}.`;
  });
  testing.value = false;
}

const updateNow = () =>
  run(async () => {
    const result = await refresh();
    if (!result) return;
    return result.stoppedEarly
      ? `Atualização interrompida: ${result.stoppedEarly}`
      : `${result.updated} de ${result.total} cotações atualizadas.`;
  });
</script>

<template>
  <section class="settings-card">
    <h2 class="settings-card__title">Cotações automáticas</h2>
    <p class="settings-card__hint">
      Ações, FIIs e ETFs são atualizados pelo ticker usando a brapi.dev (gratuita, com cerca de 30 minutos de atraso).
      Renda Fixa, Tesouro Direto e os demais tipos continuam com valor informado por você.
    </p>

    <template v-if="!hasToken">
      <label class="form-label">
        Token da brapi.dev
        <input v-model="tokenInput" class="form-input" type="password" autocomplete="off" placeholder="Cole seu token aqui" />
      </label>
      <button type="button" class="btn-primary" :disabled="!tokenInput.trim()" @click="saveToken">Salvar token</button>
      <p class="settings-card__hint">
        Crie uma conta gratuita em brapi.dev para obter o token (plano grátis: 15 mil consultas por mês). Sem token,
        só alguns ativos de teste funcionam.
      </p>
      <button type="button" class="btn-secondary" :disabled="testing" @click="testConnection">
        {{ testing ? "Testando…" : "Testar conexão (sem token)" }}
      </button>
    </template>

    <template v-else>
      <p class="settings-card__hint">Token salvo neste aparelho.</p>
      <label class="check-row">
        <input
          type="checkbox"
          :checked="quotes.autoRefresh"
          @change="saveQuoteSettings({ autoRefresh: ($event.target as HTMLInputElement).checked })"
        />
        Atualizar sozinho ao abrir o app (a cada 30 min com a bolsa aberta)
      </label>
      <div class="settings-card__actions">
        <button type="button" class="btn-secondary" :disabled="testing" @click="testConnection">
          {{ testing ? "Testando…" : "Testar conexão" }}
        </button>
        <button type="button" class="btn-secondary" :disabled="refreshing" @click="updateNow">
          {{ refreshing ? "Atualizando…" : "Atualizar agora" }}
        </button>
        <button type="button" class="btn-secondary" @click="removeToken">Remover token</button>
      </div>
    </template>

    <p v-if="quotes.lastRunAt" class="settings-card__hint">Última atualização {{ formatRelativeTime(quotes.lastRunAt) }}.</p>
    <p v-if="message" class="settings-card__message">{{ message }}</p>
    <p v-if="error" class="form-error">{{ error }}</p>
    <p class="settings-card__hint">O token fica só neste aparelho: não entra no backup nem nas exportações.</p>
  </section>
</template>
