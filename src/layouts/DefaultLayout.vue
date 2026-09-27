<script setup lang="ts">
import BottomNav from "@/components/layout/BottomNav.vue";
</script>

<template>
  <div class="shell">
    <main class="shell__content">
      <slot />
    </main>
    <BottomNav />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.shell__content {
  flex: 1;
  padding: calc(var(--space-4) + var(--safe-top)) var(--space-4)
    calc(var(--nav-height) + var(--safe-bottom) + var(--space-4));
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
}
</style>
