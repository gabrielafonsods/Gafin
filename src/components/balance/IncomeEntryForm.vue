<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useBalance } from "@/composables/useBalance";
import { toUserMessage } from "@/services/errors";
import { todayISO } from "@/utils/date";
import type { IncomeTransaction } from "@/database/schema";

const props = defineProps<{ transaction?: IncomeTransaction | null }>();
const emit = defineEmits<{ saved: []; cancel: [] }>();

const { accounts, categories, addIncome, editIncome } = useBalance();

// Contas arquivadas só aparecem se já eram a conta deste lançamento.
const accountOptions = computed(() =>
  accounts.value.filter((a) => !a.archived || a.id === props.transaction?.accountId),
);

const form = reactive({
  amount: props.transaction ? String(props.transaction.amount) : "",
  date: props.transaction?.date ?? todayISO(),
  categoryId: (props.transaction?.categoryId ?? null) as number | null,
  customCategory: props.transaction?.customCategory ?? "",
  description: props.transaction?.description ?? "",
  accountId: (props.transaction?.accountId ?? null) as number | null,
});
const error = ref("");

// Categorias arquivadas só aparecem se já eram a categoria deste lançamento.
const categoryOptions = computed(() =>
  categories.value.filter(
    (c) => c.kind === "entrada" && (!c.archived || c.id === props.transaction?.categoryId),
  ),
);
const selectedCategory = computed(() => categories.value.find((c) => c.id === form.categoryId));

async function handleSubmit() {
  error.value = "";
  if (form.categoryId === null || form.accountId === null) {
    error.value = "Escolha a categoria e a conta de destino.";
    return;
  }
  const input = {
    amount: Number(form.amount),
    date: form.date,
    categoryId: form.categoryId,
    customCategory: form.customCategory,
    description: form.description,
    accountId: form.accountId,
  };
  try {
    if (props.transaction?.id !== undefined) await editIncome(props.transaction.id, input);
    else await addIncome(input);
    emit("saved");
  } catch (e) {
    error.value = toUserMessage(e);
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="handleSubmit">
    <label class="form-label">
      Valor (R$)
      <input v-model="form.amount" class="form-input" type="number" step="any" min="0" inputmode="decimal" required />
    </label>
    <label class="form-label">
      Data
      <input v-model="form.date" class="form-input" type="date" required />
    </label>
    <label class="form-label">
      Categoria
      <select v-model.number="form.categoryId" class="form-input" required>
        <option :value="null" disabled>Selecione</option>
        <option v-for="c in categoryOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </label>
    <label class="form-label">
      Conta de destino
      <select v-model.number="form.accountId" class="form-input" required>
        <option :value="null" disabled>Selecione</option>
        <option v-for="a in accountOptions" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
    </label>
    <label v-if="selectedCategory?.acceptsCustomLabel" class="form-label form-wide">
      Que tipo de entrada? (recomendado)
      <input v-model="form.customCategory" class="form-input" type="text" placeholder="Ex.: reembolso, presente" />
    </label>
    <label class="form-label form-wide">
      Descrição (opcional)
      <input v-model="form.description" class="form-input" type="text" />
    </label>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button type="submit" class="btn-primary">{{ transaction ? "Salvar alterações" : "Registrar entrada" }}</button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
