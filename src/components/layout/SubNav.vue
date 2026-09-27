<script setup lang="ts">
defineProps<{
  items: { to: string; label: string }[];
}>();
</script>

<template>
  <nav class="sub-nav">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="sub-nav__item"
      active-class="sub-nav__item--active"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.sub-nav {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-1);
}

.sub-nav__item {
  flex: none;
  padding: var(--space-2) var(--space-3);
  border-radius: 999px;
  font-size: 13px;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  white-space: nowrap;
}

.sub-nav__item--active {
  color: var(--color-bg);
  background: var(--color-brand-strong);
  border-color: var(--color-brand-strong);
}
</style>
