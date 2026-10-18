<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useBalance } from "@/composables/useBalance";
import { toUserMessage } from "@/services/errors";
import { todayISO } from "@/utils/date";
import type { Transfer } from "@/database/schema";

const props = defineProps<{ transfer?: Transfer | null }>();
const emit = defineEmits<{ saved: []; cancel: [] }>();

const { accounts, addTransfer, editTransfer } = useBalance();

// Contas arquivadas só aparecem se já faziam parte desta transferência.
const options = computed(() =>
  accounts.value.filter(
    (a) => !a.archived || a.id === props.transfer?.fromAccountId || a.id === props.transfer?.toAccountId,
  ),
);

const form = reactive({
  fromAccountId: (props.transfer?.fromAccountId ?? null) as number | null,
  toAccountId: (props.transfer?.toAccountId ?? null) as number | null,
  amount: props.transfer ? String(props.transfer.amount) : "",
  date: props.transfer?.date ?? todayISO(),
  description: props.transfer?.description ?? "",
});
const error = ref("");

async function handleSubmit() {
  error.value = "";
  if (form.fromAccountId === null || form.toAccountId === null) {
    error.value = "Escolha as duas contas.";
    return;
  }
  const input = {
    fromAccountId: form.fromAccountId,
    toAccountId: form.toAccountId,
    amount: Number(form.amount),
    date: form.date,
    description: form.description,
  };
  try {
    if (props.transfer?.id !== undefined) await editTransfer(props.transfer.id, input);
    else await addTransfer(input);
    emit("saved");
  } catch (e) {
    error.value = toUserMessage(e);
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="handleSubmit">
    <label class="form-label">
      De
      <select v-model.number="form.fromAccountId" class="form-input" required>
        <option :value="null" disabled>Selecione</option>
        <option v-for="a in options" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
    </label>
    <label class="form-label">
      Para
      <select v-model.number="form.toAccountId" class="form-input" required>
        <option :value="null" disabled>Selecione</option>
        <option v-for="a in options" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
    </label>
    <label class="form-label">
      Valor (R$)
      <input v-model="form.amount" class="form-input" type="number" step="any" min="0" inputmode="decimal" required />
    </label>
    <label class="form-label">
      Data
      <input v-model="form.date" class="form-input" type="date" required />
    </label>
    <label class="form-label form-wide">
      Descrição (opcional)
      <input v-model="form.description" class="form-input" type="text" />
    </label>

    <p class="settings-card__hint form-wide">
      Transferência entre suas contas não conta como entrada nem como saída.
    </p>
    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button type="submit" class="btn-primary">{{ transfer ? "Salvar alterações" : "Transferir" }}</button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
