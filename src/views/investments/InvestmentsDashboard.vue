<script setup lang="ts">
import { computed } from "vue";
import SubNav from "@/components/layout/SubNav.vue";
import { useInvestments } from "@/composables/useInvestments";
import { formatCurrency } from "@/utils/currency";

const tabs = [
  { to: "/investimentos", label: "Dashboard" },
  { to: "/investimentos/carteira", label: "Carteira" },
  { to: "/investimentos/ativos", label: "Ativos" },
];

const { investments, totalInvested } = useInvestments();

const biggestHolding = computed(() => {
  if (investments.value.length === 0) return null;
  return [...investments.value].sort(
    (a, b) => b.quantity * b.averagePrice - a.quantity * a.averagePrice,
  )[0];
});
</script>

<template>
  <div class="section">
    <h1 class="section__title">Investimentos</h1>
    <SubNav :items="tabs" />

    <article class="summary-card summary-card--main">
      <span class="summary-card__label">Patrimônio investido</span>
      <strong class="summary-card__value">{{ formatCurrency(totalInvested) }}</strong>
    </article>

    <div class="summary-grid">
      <article class="summary-card">
        <span class="summary-card__label">Ativos cadastrados</span>
        <strong class="summary-card__value">{{ investments.length }}</strong>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Maior posição</span>
        <strong class="summary-card__value summary-card__value--small">
          {{ biggestHolding ? biggestHolding.assetName : "—" }}
        </strong>
      </article>
    </div>

    <RouterLink to="/investimentos/ativos" class="cta-link">
      Gerenciar ativos →
    </RouterLink>
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

.cta-link {
  align-self: flex-start;
  color: var(--color-brand-strong);
  font-size: 13px;
  font-weight: 600;
}
</style>
