<script setup lang="ts">
import { computed } from "vue";
import SubNav from "@/components/layout/SubNav.vue";
import PlaceholderCard from "@/components/PlaceholderCard.vue";
import { useInvestments } from "@/composables/useInvestments";
import { formatCurrency } from "@/utils/currency";

const tabs = [
  { to: "/investimentos", label: "Dashboard" },
  { to: "/investimentos/carteira", label: "Carteira" },
  { to: "/investimentos/ativos", label: "Ativos" },
];

const { investments, totalInvested } = useInvestments();

const allocation = computed(() => {
  const total = totalInvested.value;
  return [...investments.value]
    .map((item) => {
      const value = item.quantity * item.averagePrice;
      return {
        id: item.id,
        assetName: item.assetName,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.value - a.value);
});
</script>

<template>
  <div class="section">
    <h1 class="section__title">Carteira</h1>
    <SubNav :items="tabs" />

    <article class="total-card">
      <span class="total-card__label">Total investido</span>
      <strong class="total-card__value">{{ formatCurrency(totalInvested) }}</strong>
    </article>

    <PlaceholderCard
      v-if="allocation.length === 0"
      title="Sua carteira está vazia"
      hint="Cadastre ativos em Investimentos → Ativos para ver a distribuição aqui."
    />

    <ul v-else class="allocation-list">
      <li v-for="item in allocation" :key="item.id" class="allocation-list__item">
        <div class="allocation-list__header">
          <span class="allocation-list__name">{{ item.assetName }}</span>
          <span class="allocation-list__value">{{ formatCurrency(item.value) }}</span>
        </div>
        <div class="allocation-list__bar">
          <div class="allocation-list__bar-fill" :style="{ width: item.percentage + '%' }" />
        </div>
        <span class="allocation-list__percentage">{{ item.percentage.toFixed(1) }}% da carteira</span>
      </li>
    </ul>
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
