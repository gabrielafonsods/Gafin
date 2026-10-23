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
    <PlaceholderCard title="Patrimônio" hint="Em construção. A evolução do seu patrimônio ao longo do tempo, com o que está em cada categoria." />
  </div>
</template>
