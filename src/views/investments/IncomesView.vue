<script setup lang="ts">
import PlaceholderCard from "@/components/PlaceholderCard.vue";
import SubNav from "@/components/layout/SubNav.vue";
import { INVESTMENT_TABS } from "@/types/navigation";

const tabs = INVESTMENT_TABS;
</script>

<template>
  <div class="page">
    <h1 class="page-title">Investimentos</h1>
    <SubNav :items="tabs" />
    <PlaceholderCard title="Proventos" hint="Em construção. Dividendos, JCP e rendimentos recebidos mês a mês, por ativo e por categoria." />
  </div>
</template>
