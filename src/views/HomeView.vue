<script setup lang="ts">
import PlaceholderCard from "@/components/PlaceholderCard.vue";
import { formatCurrency } from "@/utils/currency";

// Valores fixos em zero apenas para dar forma ao layout. Serão substituídos
// por dados reais quando os repositórios de transações/faturas existirem.
const summary = {
  saldoTotal: 0,
  saldoDisponivel: 0,
  entradasMes: 0,
  saidasMes: 0,
  gastosCartao: 0,
  patrimonioInvestido: 0,
};
</script>

<template>
  <div class="home">
    <header class="home__header">
      <p class="home__eyebrow">Gafin</p>
      <h1 class="home__title">Seu dinheiro, sob controle.</h1>
    </header>

    <section class="home__grid">
      <article class="summary-card summary-card--main">
        <span class="summary-card__label">Saldo total</span>
        <strong class="summary-card__value">{{ formatCurrency(summary.saldoTotal) }}</strong>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Saldo disponível</span>
        <strong class="summary-card__value">{{ formatCurrency(summary.saldoDisponivel) }}</strong>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Entradas do mês</span>
        <strong class="summary-card__value summary-card__value--income">
          {{ formatCurrency(summary.entradasMes) }}
        </strong>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Saídas do mês</span>
        <strong class="summary-card__value summary-card__value--expense">
          {{ formatCurrency(summary.saidasMes) }}
        </strong>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Gastos no cartão</span>
        <strong class="summary-card__value">{{ formatCurrency(summary.gastosCartao) }}</strong>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Patrimônio investido</span>
        <strong class="summary-card__value">{{ formatCurrency(summary.patrimonioInvestido) }}</strong>
      </article>
    </section>

    <PlaceholderCard
      title="Próximas faturas"
      hint="Lista de faturas em aberto aparecerá aqui quando cartões e faturas forem implementados."
    />
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.home__eyebrow {
  color: var(--color-brand-strong);
  font-size: 13px;
  font-weight: 600;
}

.home__title {
  font-size: 22px;
  font-weight: 600;
  margin-top: var(--space-1);
}

.home__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.summary-card {
  grid-column: span 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.summary-card--main {
  grid-column: span 2;
  background: linear-gradient(155deg, var(--color-surface-raised), var(--color-surface));
}

.summary-card__label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.summary-card__value {
  font-size: 20px;
  font-weight: 600;
}

.summary-card__value--income {
  color: var(--color-income);
}

.summary-card__value--expense {
  color: var(--color-expense);
}
</style>
