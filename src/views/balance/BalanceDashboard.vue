<script setup lang="ts">
import SubNav from "@/components/layout/SubNav.vue";
import PlaceholderCard from "@/components/PlaceholderCard.vue";

const tabs = [
  { to: "/saldo", label: "Dashboard" },
  { to: "/saldo/contas", label: "Contas" },
  { to: "/saldo/cartoes", label: "Cartões" },
  { to: "/saldo/entradas", label: "Entradas" },
  { to: "/saldo/saidas", label: "Saídas" },
];
</script>

<template>
  <div class="section">
    <h1 class="section__title">Saldo</h1>
    <SubNav :items="tabs" />
    <PlaceholderCard
      title="Visão geral do saldo"
      hint="Resumo de contas, cartões e movimentações aparecerá aqui."
    />
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
</style>
