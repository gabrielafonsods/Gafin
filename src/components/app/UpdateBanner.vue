<script setup lang="ts">
import { needRefresh, updateNow } from "@/pwaUpdate";
</script>

<template>
  <div v-if="needRefresh" class="update-banner">
    <span class="update-banner__text">Nova versão disponível</span>
    <button type="button" class="update-banner__action" @click="updateNow">Atualizar agora</button>
  </div>
</template>

<style scoped>
.update-banner {
  position: fixed;
  left: var(--space-4);
  right: var(--space-4);
  bottom: calc(var(--nav-height) + var(--safe-bottom) + var(--space-3));
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-brand-strong);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.update-banner__text {
  font-size: 13px;
  font-weight: 600;
}

.update-banner__action {
  flex: none;
  background: var(--color-brand-strong);
  color: var(--color-bg);
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
  font-weight: 600;
}
</style>
