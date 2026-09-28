<script setup lang="ts">
import { reactive, ref } from "vue";
import { useInvestments } from "@/composables/useInvestments";
import { toUserMessage } from "@/services/errors";
import { INCOME_TYPES, INCOME_TYPE_LABELS } from "@/types/investments";
import { todayISO } from "@/utils/date";
import type { IncomeType } from "@/database/schema";

const props = defineProps<{ assetId: number }>();
const { addIncome } = useInvestments();

const form = reactive({
  type: "dividendo" as IncomeType,
  amount: "",
  date: todayISO(),
  description: "",
});
const error = ref("");

async function handleSubmit() {
  error.value = "";
  try {
    await addIncome({
      assetId: props.assetId,
      type: form.type,
      amount: Number(form.amount),
      date: form.date,
      description: form.description,
    });
    form.amount = "";
    form.description = "";
  } catch (e) {
    error.value = toUserMessage(e);
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="handleSubmit">
    <label class="form-label">
      Tipo
      <select v-model="form.type" class="form-input">
        <option v-for="type in INCOME_TYPES" :key="type" :value="type">{{ INCOME_TYPE_LABELS[type] }}</option>
      </select>
    </label>
    <label class="form-label">
      Data
      <input v-model="form.date" class="form-input" type="date" required />
    </label>
    <label class="form-label">
      Valor recebido (R$)
      <input v-model="form.amount" class="form-input" type="number" step="any" min="0" inputmode="decimal" required />
    </label>
    <label class="form-label">
      Descrição (opcional)
      <input v-model="form.description" class="form-input" type="text" />
    </label>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button type="submit" class="btn-primary">Registrar rendimento</button>
    </div>
  </form>
</template>
