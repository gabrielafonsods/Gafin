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
    <h1 class="section__title">Contas</h1>
    <SubNav :items="tabs" />
    <PlaceholderCard
      title="Suas contas"
      hint="Lista de contas correntes, poupanças e carteiras aparecerá aqui (accountsRepository)."
    />
  </div>
</template>

<style scoped>
.section { display: flex; flex-direction: column; gap: var(--space-4); }
.section__title { font-size: 20px; font-weight: 600; }
</style>
