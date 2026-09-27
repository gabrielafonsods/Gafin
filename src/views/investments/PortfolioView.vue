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
    <h1 class="section__title">Carteira</h1>
    <SubNav :items="tabs" />
    <PlaceholderCard
      title="Sua carteira"
      hint="Distribuição da carteira por classe de ativo aparecerá aqui (investmentsRepository)."
    />
  </div>
</template>

<style scoped>
.section { display: flex; flex-direction: column; gap: var(--space-4); }
.section__title { font-size: 20px; font-weight: 600; }
</style>
