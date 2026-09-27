<script setup lang="ts"></script>

<template>
  <div class="not-found">
    <h1>Página não encontrada</h1>
    <RouterLink to="/">Voltar para o Início</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}
</style>
