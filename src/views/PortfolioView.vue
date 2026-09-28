<script setup lang="ts">
import SubNav from "@/components/layout/SubNav.vue";
import PlaceholderCard from "@/components/PlaceholderCard.vue";
import { useInvestments } from "@/composables/useInvestments";
import { ASSET_TYPE_LABELS } from "@/types/investments";
import { formatCurrency, formatPercent } from "@/utils/currency";

const tabs = [
  { to: "/investimentos", label: "Dashboard" },
  { to: "/investimentos/carteira", label: "Carteira" },
  { to: "/investimentos/ativos", label: "Ativos" },
];

const { summary, typeAllocation, assetAllocation } = useInvestments();
</script>

<template>
  <div class="section">
    <h1 class="section__title">Carteira</h1>
    <SubNav :items="tabs" />

    <article class="total-card">
      <span class="total-card__label">Valor atual da carteira</span>
      <strong class="total-card__value">{{ formatCurrency(summary.valorAtual) }}</strong>
      <span class="total-card__hint">Investido: {{ formatCurrency(summary.patrimonioInvestido) }}</span>
    </article>

    <PlaceholderCard
      v-if="assetAllocation.length === 0"
      title="Sua carteira está vazia"
      hint="Cadastre ativos e registre operações de compra em Investimentos → Ativos."
    />

    <template v-else>
      <h2 class="section__subtitle">Por tipo de investimento</h2>
      <ul class="allocation-list">
        <li v-for="slice in typeAllocation" :key="slice.type" class="allocation-list__item">
          <div class="allocation-list__header">
            <span class="allocation-list__name">{{ ASSET_TYPE_LABELS[slice.type] }}</span>
            <span class="allocation-list__value">{{ formatCurrency(slice.value) }}</span>
          </div>
          <div class="allocation-list__bar">
            <div class="allocation-list__bar-fill" :style="{ width: slice.percent + '%' }" />
          </div>
          <span class="allocation-list__percentage">{{ formatPercent(slice.percent) }} da carteira</span>
        </li>
      </ul>

      <h2 class="section__subtitle">Por ativo</h2>
      <ul class="allocation-list">
        <li v-for="view in assetAllocation" :key="view.asset.id" class="allocation-list__item">
          <div class="allocation-list__header">
            <span class="allocation-list__name">
              {{ view.asset.name }}<template v-if="view.asset.ticker"> · {{ view.asset.ticker }}</template>
            </span>
            <span class="allocation-list__value">{{ formatCurrency(view.currentValue) }}</span>
          </div>
          <div class="allocation-list__bar">
            <div class="allocation-list__bar-fill" :style="{ width: view.sharePercent + '%' }" />
          </div>
          <span class="allocation-list__percentage">{{ formatPercent(view.sharePercent) }} da carteira</span>
        </li>
      </ul>
    </template>
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
.section__subtitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.total-card {
  background: linear-gradient(155deg, var(--color-surface-raised), var(--color-surface));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.total-card__label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.total-card__value {
  font-size: 22px;
  font-weight: 600;
}

.total-card__hint {
  font-size: 12px;
  color: var(--color-text-muted);
}

.allocation-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.allocation-list__item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.allocation-list__header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: 14px;
}

.allocation-list__name {
  font-weight: 600;
}

.allocation-list__bar {
  height: 6px;
  border-radius: 999px;
  background: var(--color-bg);
  overflow: hidden;
}

.allocation-list__bar-fill {
  height: 100%;
  background: var(--color-brand-strong);
  border-radius: 999px;
}

.allocation-list__percentage {
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
