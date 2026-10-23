<script setup lang="ts">
import { computed } from "vue";
import LineChart from "@/components/charts/LineChart.vue";
import PercentBadge from "@/components/investments/PercentBadge.vue";
import SubNav from "@/components/layout/SubNav.vue";
import { useEvolution } from "@/composables/useEvolution";
import { useInvestments } from "@/composables/useInvestments";
import { INVESTMENT_TABS } from "@/types/navigation";
import { formatCurrency } from "@/utils/currency";
import { formatMonthShort, monthKey, todayISO } from "@/utils/date";

const tabs = INVESTMENT_TABS;

const { summary, incomesLast12Months } = useInvestments();
const evolution = useEvolution();

// Só há histórico de custo (não de cotações): mostra quanto estava investido em cada mês.
const investedPoints = computed(() =>
  evolution
    .invested(monthKey(todayISO()), 12)
    .map((p) => ({ label: formatMonthShort(p.month), value: p.invested })),
);

// Atalhos para as demais abas.
const shortcuts = computed(() => [
  {
    to: "/investimentos/posicoes",
    title: "Posições",
    sub: `${summary.value.quantidadeAtivos} ${summary.value.quantidadeAtivos === 1 ? "ativo" : "ativos"} em carteira`,
    value: formatCurrency(summary.value.valorAtual),
  },
  {
    to: "/investimentos/proventos",
    title: "Proventos",
    sub: "Últimos 12 meses",
    value: formatCurrency(incomesLast12Months.value),
  },
  {
    to: "/investimentos/patrimonio",
    title: "Patrimônio",
    sub: "Evolução ao longo do tempo",
    value: "",
  },
  {
    to: "/investimentos/rentabilidade",
    title: "Rentabilidade",
    sub: "Quanto sua carteira rendeu",
    value: "",
  },
]);
</script>

<template>
  <div class="page">
    <h1 class="page-title">Investimentos</h1>
    <SubNav :items="tabs" />

    <section class="stat-grid">
      <article class="stat-card stat-card--wide">
        <span class="stat-card__label">Patrimônio total</span>
        <div class="summary__row">
          <strong class="stat-card__value">{{ formatCurrency(summary.valorAtual) }}</strong>
          <PercentBadge :value="summary.variacaoPercent" :empty="summary.quantidadeAtivos === 0" />
        </div>
        <span class="stat-card__hint">Valor investido {{ formatCurrency(summary.patrimonioInvestido) }}</span>
      </article>

      <article class="stat-card">
        <span class="stat-card__label">Lucro/prejuízo</span>
        <strong class="stat-card__value" :class="summary.lucroPrejuizo >= 0 ? 'text-income' : 'text-expense'">
          {{ formatCurrency(summary.lucroPrejuizo) }}
        </strong>
        <span class="stat-card__hint">Preço atual x preço médio</span>
      </article>

      <article class="stat-card">
        <span class="stat-card__label">Rentabilidade</span>
        <strong class="stat-card__value" :class="summary.retornoTotalPercent >= 0 ? 'text-income' : 'text-expense'">
          {{ formatCurrency(summary.retornoTotal) }}
        </strong>
        <span class="stat-card__hint">
          <PercentBadge :value="summary.retornoTotalPercent" :empty="summary.quantidadeAtivos === 0 && summary.retornoTotal === 0" />
          com proventos
        </span>
      </article>

      <article class="stat-card">
        <span class="stat-card__label">Proventos recebidos</span>
        <strong class="stat-card__value">{{ formatCurrency(summary.rendimentosRecebidos) }}</strong>
        <span class="stat-card__hint">{{ formatCurrency(incomesLast12Months) }} nos últimos 12 meses</span>
      </article>

      <article class="stat-card">
        <span class="stat-card__label">Maior posição</span>
        <strong class="stat-card__value summary__small">
          {{ summary.maiorPosicao ? summary.maiorPosicao.asset.ticker || summary.maiorPosicao.asset.name : "—" }}
        </strong>
        <span v-if="summary.maiorPosicao" class="stat-card__hint">
          {{ summary.maiorPosicao.sharePercent.toFixed(1).replace(".", ",") }}% da carteira
        </span>
      </article>
    </section>

    <LineChart title="Investido ao longo do tempo (custo, 12 meses)" :points="investedPoints" />

    <h2 class="section-title">Ver mais</h2>
    <ul class="list">
      <li v-for="item in shortcuts" :key="item.to">
        <RouterLink :to="item.to" class="list-row">
          <div class="list-row__main">
            <span class="list-row__title">{{ item.title }}</span>
            <span class="list-row__sub">{{ item.sub }}</span>
          </div>
          <span v-if="item.value" class="list-row__amount">{{ item.value }}</span>
          <span class="summary__chevron" aria-hidden="true">›</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.summary__small {
  font-size: 16px;
}

.summary__chevron {
  font-size: 20px;
  color: var(--color-text-muted);
}

.list-row {
  text-decoration: none;
}
</style>
