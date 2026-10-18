<script setup lang="ts">
import { reactive, ref } from "vue";
import { useBalance } from "@/composables/useBalance";
import { toUserMessage } from "@/services/errors";
import type { Card } from "@/database/schema";

const props = defineProps<{ card?: Card | null }>();
const emit = defineEmits<{ saved: []; cancel: [] }>();

const { addCard, editCard } = useBalance();

const form = reactive({
  name: props.card?.name ?? "",
  limit: props.card ? String(props.card.limit) : "",
  closingDay: props.card ? String(props.card.closingDay) : "",
  dueDay: props.card ? String(props.card.dueDay) : "",
});
const error = ref("");

async function handleSubmit() {
  error.value = "";
  const input = {
    name: form.name,
    limit: Number(form.limit),
    closingDay: Number(form.closingDay),
    dueDay: Number(form.dueDay),
  };
  try {
    if (props.card?.id !== undefined) await editCard(props.card.id, input);
    else await addCard(input);
    emit("saved");
  } catch (e) {
    error.value = toUserMessage(e);
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="handleSubmit">
    <label class="form-label">
      Nome do cartão
      <input v-model="form.name" class="form-input" type="text" placeholder="Ex.: Nubank Visa" required />
    </label>
    <label class="form-label">
      Limite (R$)
      <input v-model="form.limit" class="form-input" type="number" step="any" min="0" inputmode="decimal" required />
    </label>
    <label class="form-label">
      Dia de fechamento
      <input v-model="form.closingDay" class="form-input" type="number" min="1" max="31" inputmode="numeric" required />
    </label>
    <label class="form-label">
      Dia de vencimento
      <input v-model="form.dueDay" class="form-input" type="number" min="1" max="31" inputmode="numeric" required />
    </label>

    <p v-if="card" class="settings-card__hint form-wide">
      Faturas que já existem mantêm as datas atuais; os novos dias valem para as próximas.
    </p>
    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button type="submit" class="btn-primary">{{ card ? "Salvar alterações" : "Criar cartão" }}</button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
