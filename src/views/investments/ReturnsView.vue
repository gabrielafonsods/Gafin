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
    <PlaceholderCard title="Rentabilidade" hint="Em construção. Quanto a carteira rendeu em cada período, comparando categorias e ativos." />
  </div>
</template>
