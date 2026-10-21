<script setup lang="ts">
import { reactive, ref } from "vue";
import { useInvestments } from "@/composables/useInvestments";
import { toUserMessage } from "@/services/errors";
import { OPERATION_TYPES, OPERATION_TYPE_LABELS } from "@/types/investments";
import { todayISO } from "@/utils/date";
import type { InvestmentOperation, OperationType } from "@/database/schema";

const props = defineProps<{ assetId: number; operation?: InvestmentOperation | null }>();
const emit = defineEmits<{ saved: []; cancel: [] }>();

const { addOperation, editOperation } = useInvestments();
const editing = props.operation ?? null;

const form = reactive({
  type: (editing?.type ?? "compra") as OperationType,
  quantity: editing ? String(editing.quantity) : "",
  price: editing ? String(editing.price) : "",
  fees: editing && editing.fees > 0 ? String(editing.fees) : "",
  date: editing?.date ?? todayISO(),
  note: editing?.note ?? "",
});
const error = ref("");

async function handleSubmit() {
  error.value = "";
  const input = {
    assetId: props.assetId,
    type: form.type,
    quantity: Number(form.quantity),
    price: Number(form.price),
    fees: form.fees.trim() === "" ? 0 : Number(form.fees),
    date: form.date,
    note: form.note,
  };
  try {
    if (editing?.id !== undefined) {
      await editOperation(editing.id, input);
    } else {
      await addOperation(input);
      // Novo registro: limpa os campos para lançar outra operação em seguida.
      form.quantity = "";
      form.price = "";
      form.fees = "";
      form.note = "";
    }
    emit("saved");
  } catch (e) {
    // Ex.: a alteração deixaria uma venda maior que a posição — o histórico não é tocado.
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
      <button type="submit" class="btn-primary">{{ editing ? "Salvar alterações" : "Registrar operação" }}</button>
      <button v-if="editing" type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
