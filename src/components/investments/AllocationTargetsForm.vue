<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useSettings } from "@/composables/useSettings";
import type { AssetType } from "@/database/schema";
import { toUserMessage } from "@/services/errors";
import { ASSET_TYPE_LABELS } from "@/types/investments";
import { formatPercent } from "@/utils/currency";

const props = defineProps<{ types: readonly AssetType[] }>();
const emit = defineEmits<{ saved: []; cancel: [] }>();

const { allocationTargets, setAllocationTargets } = useSettings();

const form = reactive<Record<string, string>>(
  Object.fromEntries(props.types.map((type) => [type, allocationTargets.value[type]?.toString() ?? ""])),
);
const error = ref("");

const total = computed(() =>
  props.types.reduce((sum, type) => sum + (Number(form[type]) || 0), 0),
);

async function handleSubmit() {
  error.value = "";
  const targets: Partial<Record<AssetType, number>> = {};
  for (const type of props.types) targets[type] = Number(form[type]) || 0;
  try {
    await setAllocationTargets(targets);
    emit("saved");
  } catch (e) {
    error.value = toUserMessage(e);
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="handleSubmit">
    <p class="settings-card__hint form-wide">
      Quanto você quer ter em cada categoria. Aparece em cada cartão como "% na carteira / ideal".
    </p>

    <label v-for="type in types" :key="type" class="form-label">
      {{ ASSET_TYPE_LABELS[type] }} (%)
      <input
        v-model="form[type]"
        class="form-input"
        type="number"
        step="any"
        min="0"
        max="100"
        inputmode="decimal"
        placeholder="0"
      />
    </label>

    <p class="settings-card__hint form-wide" :class="{ 'text-expense': total > 100 }">
      Total: {{ formatPercent(total) }}
      <template v-if="total <= 100">· restam {{ formatPercent(100 - total) }}</template>
      <template v-else>· passou de 100%</template>
    </p>
    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button type="submit" class="btn-primary">Salvar metas</button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
