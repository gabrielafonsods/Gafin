<script setup lang="ts">
import { reactive, ref } from "vue";
import { useInvestments } from "@/composables/useInvestments";
import { toUserMessage } from "@/services/errors";
import { OPERATION_TYPES, OPERATION_TYPE_LABELS } from "@/types/investments";
import { todayISO } from "@/utils/date";
import type { OperationType } from "@/database/schema";

const props = defineProps<{ assetId: number }>();
const { addOperation } = useInvestments();

const form = reactive({
  type: "compra" as OperationType,
  quantity: "",
  price: "",
  fees: "",
  date: todayISO(),
  note: "",
});
const error = ref("");

async function handleSubmit() {
  error.value = "";
  try {
    await addOperation({
      assetId: props.assetId,
      type: form.type,
      quantity: Number(form.quantity),
      price: Number(form.price),
      fees: form.fees.trim() === "" ? 0 : Number(form.fees),
      date: form.date,
      note: form.note,
    });
    form.quantity = "";
    form.price = "";
    form.fees = "";
    form.note = "";
  } catch (e) {
    error.value = toUserMessage(e);
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="handleSubmit">
    <label class="form-label">
      Operação
      <select v-model="form.type" class="form-input">
        <option v-for="type in OPERATION_TYPES" :key="type" :value="type">{{ OPERATION_TYPE_LABELS[type] }}</option>
      </select>
    </label>
    <label class="form-label">
      Data
      <input v-model="form.date" class="form-input" type="date" required />
    </label>
    <label class="form-label">
      Quantidade
      <input v-model="form.quantity" class="form-input" type="number" step="any" min="0" inputmode="decimal" required />
    </label>
    <label class="form-label">
      Preço por unidade (R$)
      <input v-model="form.price" class="form-input" type="number" step="any" min="0" inputmode="decimal" required />
    </label>
    <label class="form-label">
      Taxas (R$, opcional)
      <input v-model="form.fees" class="form-input" type="number" step="any" min="0" inputmode="decimal" />
    </label>
    <label class="form-label">
      Observação (opcional)
      <input v-model="form.note" class="form-input" type="text" />
    </label>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button type="submit" class="btn-primary">Registrar operação</button>
    </div>
  </form>
</template>
