<script setup lang="ts">
import { formatMonthLabel, shiftMonthKey } from "@/utils/date";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const go = (delta: number) => emit("update:modelValue", shiftMonthKey(props.modelValue, delta));
</script>

<template>
  <div class="month-nav">
    <button type="button" class="month-nav__btn" aria-label="Mês anterior" @click="go(-1)">‹</button>
    <span class="month-nav__label">{{ formatMonthLabel(modelValue) }}</span>
    <button type="button" class="month-nav__btn" aria-label="Próximo mês" @click="go(1)">›</button>
  </div>
</template>

<style scoped>
.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1);
}

.month-nav__btn {
  width: 44px;
  height: 40px;
  background: transparent;
  border: none;
  font-size: 22px;
  color: var(--color-text-muted);
}

.month-nav__label {
  font-size: 14px;
  font-weight: 600;
  text-transform: capitalize;
}
</style>
