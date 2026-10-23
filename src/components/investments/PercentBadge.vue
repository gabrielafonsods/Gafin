<script setup lang="ts">
import { computed } from "vue";
import { formatSignedPercent } from "@/utils/currency";

const props = defineProps<{ value: number; empty?: boolean }>();

const direction = computed(() => (props.value > 0.005 ? "up" : props.value < -0.005 ? "down" : "flat"));
const arrow = computed(() => ({ up: "▲", down: "▼", flat: "▶" })[direction.value]);
</script>

<template>
  <span v-if="empty" class="badge badge--flat">—</span>
  <span v-else class="badge" :class="`badge--${direction}`">
    {{ formatSignedPercent(value) }}
    <span class="badge__arrow" aria-hidden="true">{{ arrow }}</span>
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  background: var(--color-bg);
}

.badge__arrow {
  font-size: 8px;
}

.badge--up {
  color: var(--color-income);
}

.badge--down {
  color: var(--color-expense);
}

.badge--flat {
  color: var(--color-text-muted);
}
</style>
