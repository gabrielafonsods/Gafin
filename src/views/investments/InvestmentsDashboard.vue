<script setup lang="ts">
import SubNav from "@/components/layout/SubNav.vue";
import PlaceholderCard from "@/components/PlaceholderCard.vue";

const tabs = [
  { to: "/investimentos", label: "Dashboard" },
  { to: "/investimentos/carteira", label: "Carteira" },
  { to: "/investimentos/ativos", label: "Ativos" },
];
</script>

<template>
  <div class="section">
    <h1 class="section__title">Investimentos</h1>
    <SubNav :items="tabs" />
    <PlaceholderCard
      title="Visão geral dos investimentos"
      hint="Patrimônio total investido e rentabilidade aparecerão aqui."
    />
  </div>
</template>

<style scoped>
.section { display: flex; flex-direction: column; gap: var(--space-4); }
.section__title { font-size: 20px; font-weight: 600; }
</style>
