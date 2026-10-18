<script setup lang="ts">
import { computed, ref } from "vue";
import MonthNav from "@/components/balance/MonthNav.vue";
import StatementRow from "@/components/balance/StatementRow.vue";
import SubNav from "@/components/layout/SubNav.vue";
import { useBalance } from "@/composables/useBalance";
import { formatCurrency, formatPercent } from "@/utils/currency";
import { monthKey, todayISO } from "@/utils/date";

const tabs = [
  { to: "/saldo", label: "Dashboard" },
  { to: "/saldo/contas", label: "Contas" },
  { to: "/saldo/cartoes", label: "Cartões" },
  { to: "/saldo/entradas", label: "Entradas" },
  { to: "/saldo/saidas", label: "Saídas" },
];

const { summaryFor, breakdownFor, statementFor } = useBalance();

const month = ref(monthKey(todayISO()));
const summary = computed(() => summaryFor(month.value));
const spending = computed(() => breakdownFor(month.value, "saida"));
const recent = computed(() => statementFor({ month: month.value }).slice(0, 8));
</script>

<template>
  <div class="page">
    <h1 class="page-title">Saldo</h1>
    <SubNav :items="tabs" />
    <MonthNav v-model="month" />

    <section class="stat-grid">
      <article class="stat-card stat-card--wide">
        <span class="stat-card__label">Saldo total</span>
        <strong class="stat-card__value">{{ formatCurrency(summary.saldoTotal) }}</strong>
        <span class="stat-card__hint">Soma atual de todas as contas</span>
      </article>

      <article class="stat-card">
        <span class="stat-card__label">Saldo disponível</span>
        <strong class="stat-card__value">{{ formatCurrency(summary.saldoDisponivel) }}</strong>
        <span class="stat-card__hint">Já descontadas as faturas a pagar</span>
      </article>

      <article class="stat-card">
        <span class="stat-card__label">Faturas em aberto</span>
        <strong class="stat-card__value">{{ formatCurrency(summary.faturasEmAberto) }}</strong>
        <span class="stat-card__hint">Inclui parcelas futuras</span>
      </article>

      <article class="stat-card">
        <span class="stat-card__label">Entradas do mês</span>
        <strong class="stat-card__value text-income">{{ formatCurrency(summary.entradasMes) }}</strong>
      </article>

      <article class="stat-card">
        <span class="stat-card__label">Saídas do mês</span>
        <strong class="stat-card__value text-expense">{{ formatCurrency(summary.saidasMes) }}</strong>
        <span class="stat-card__hint">Dinheiro, PIX e faturas pagas</span>
      </article>

      <article class="stat-card stat-card--wide">
        <span class="stat-card__label">Compras no cartão no mês</span>
        <strong class="stat-card__value">{{ formatCurrency(summary.gastosCartaoMes) }}</strong>
        <span class="stat-card__hint">Só sai da conta quando a fatura for paga</span>
      </article>
    </section>

    <h2 class="section-title">Gastos por categoria</h2>
    <p v-if="spending.length === 0" class="empty-note">Nenhum gasto neste mês.</p>
    <ul v-else class="list">
      <li v-for="slice in spending" :key="slice.categoryId" class="list-row">
        <div class="list-row__main">
          <div class="section-head">
            <span class="list-row__title">{{ slice.name }}</span>
            <span class="list-row__amount">{{ formatCurrency(slice.total) }}</span>
          </div>
          <div class="progress">
            <div class="progress__fill" :style="{ width: slice.percent + '%' }" />
          </div>
          <span class="list-row__sub">{{ formatPercent(slice.percent) }} dos gastos</span>
        </div>
      </li>
    </ul>

    <h2 class="section-title">Movimentações do mês</h2>
    <p v-if="recent.length === 0" class="empty-note">Nenhuma movimentação neste mês.</p>
    <ul v-else class="list">
      <StatementRow v-for="entry in recent" :key="entry.key" :entry="entry" />
    </ul>
  </div>
</template>
