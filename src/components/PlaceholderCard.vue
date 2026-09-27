<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    hint?: string;
  }>(),
  { hint: "Ainda não implementado nesta etapa" },
);
</script>

<template>
  <section class="placeholder-card">
    <h2 class="placeholder-card__title">{{ title }}</h2>
    <p class="placeholder-card__hint">{{ hint }}</p>
  </section>
</template>

<style scoped>
.placeholder-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.placeholder-card__title {
  font-size: 15px;
  font-weight: 600;
}

.placeholder-card__hint {
  font-size: 13px;
  color: var(--color-text-muted);
}
</style>
