<script setup lang="ts">
import LineChart from "@/components/charts/LineChart.vue";
import SubNav from "@/components/layout/SubNav.vue";
import { computed } from "vue";
import { useEvolution } from "@/composables/useEvolution";
import { useInvestments } from "@/composables/useInvestments";
import { formatCurrency, formatPercent } from "@/utils/currency";
import { formatMonthShort, monthKey, todayISO } from "@/utils/date";

const tabs = [
  { to: "/investimentos", label: "Dashboard" },
  { to: "/investimentos/carteira", label: "Carteira" },
  { to: "/investimentos/ativos", label: "Ativos" },
];

const { summary } = useInvestments();
const evolution = useEvolution();

// Só há histórico de custo (não de cotações): mostra quanto estava investido em cada mês.
const investedPoints = computed(() =>
  evolution
    .invested(monthKey(todayISO()), 12)
    .map((p) => ({ label: formatMonthShort(p.month), value: p.invested })),
);
</script>

<template>
  <div class="section">
    <h1 class="section__title">Investimentos</h1>
    <SubNav :items="tabs" />

    <article class="summary-card summary-card--main">
      <span class="summary-card__label">Patrimônio investido</span>
      <strong class="summary-card__value">{{ formatCurrency(summary.patrimonioInvestido) }}</strong>
    </article>

    <div class="summary-grid">
      <article class="summary-card">
        <span class="summary-card__label">Valor atual</span>
        <strong class="summary-card__value">{{ formatCurrency(summary.valorAtual) }}</strong>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Lucro/prejuízo</span>
        <strong
          class="summary-card__value"
          :class="summary.lucroPrejuizo >= 0 ? 'text-income' : 'text-expense'"
        >
          {{ formatCurrency(summary.lucroPrejuizo) }}
        </strong>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Rentabilidade</span>
        <strong
          class="summary-card__value"
          :class="summary.rentabilidadePercent >= 0 ? 'text-income' : 'text-expense'"
        >
          {{ formatPercent(summary.rentabilidadePercent) }}
        </strong>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Rendimentos recebidos</span>
        <strong class="summary-card__value">{{ formatCurrency(summary.rendimentosRecebidos) }}</strong>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Ativos em carteira</span>
        <strong class="summary-card__value">{{ summary.quantidadeAtivos }}</strong>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Maior posição</span>
        <strong class="summary-card__value summary-card__value--small">
          {{ summary.maiorPosicao ? summary.maiorPosicao.asset.name : "—" }}
        </strong>
        <span v-if="summary.maiorPosicao" class="summary-card__hint">
          {{ formatPercent(summary.maiorPosicao.sharePercent) }} da carteira
        </span>
      </article>
    </div>

    <LineChart title="Investido ao longo do tempo (custo, 12 meses)" :points="investedPoints" />

    <RouterLink to="/investimentos/ativos" class="cta-link">Gerenciar ativos →</RouterLink>
  </div>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.section__title {
  font-size: 20px;
  font-weight: 600;
}

.summary-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.summary-card--main {
  background: linear-gradient(155deg, var(--color-surface-raised), var(--color-surface));
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.summary-card__label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.summary-card__value {
  font-size: 20px;
  font-weight: 600;
}

.summary-card__value--small {
  font-size: 15px;
}

.summary-card__hint {
  font-size: 11px;
  color: var(--color-text-muted);
}

.cta-link {
  align-self: flex-start;
  color: var(--color-brand-strong);
  font-size: 13px;
  font-weight: 600;
}
</style>
