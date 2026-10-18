<script setup lang="ts">
import { reactive, ref } from "vue";
import { useBalance } from "@/composables/useBalance";
import { toUserMessage } from "@/services/errors";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from "@/types/balance";
import type { Account, AccountType } from "@/database/schema";

const props = defineProps<{ account?: Account | null; currentBalance?: number }>();
const emit = defineEmits<{ saved: []; cancel: [] }>();

const { addAccount, editAccount } = useBalance();

const form = reactive({
  name: props.account?.name ?? "",
  type: (props.account?.type ?? "banco") as AccountType,
  balance: props.account ? String(props.currentBalance ?? 0) : "",
});
const error = ref("");

async function handleSubmit() {
  error.value = "";
  const input = { name: form.name, type: form.type, balance: Number(form.balance || 0) };
  try {
    if (props.account?.id !== undefined) await editAccount(props.account.id, input);
    else await addAccount(input);
    emit("saved");
  } catch (e) {
    error.value = toUserMessage(e);
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="handleSubmit">
    <label class="form-label form-wide">
      Nome da conta
      <input v-model="form.name" class="form-input" type="text" placeholder="Ex.: Nubank, Carteira" required />
    </label>
    <label class="form-label">
      Tipo
      <select v-model="form.type" class="form-input">
        <option v-for="type in ACCOUNT_TYPES" :key="type" :value="type">{{ ACCOUNT_TYPE_LABELS[type] }}</option>
      </select>
    </label>
    <label class="form-label">
      {{ account ? "Saldo atual (R$)" : "Saldo inicial (R$)" }}
      <input v-model="form.balance" class="form-input" type="number" step="any" inputmode="decimal" placeholder="0,00" />
    </label>

    <p v-if="account" class="settings-card__hint form-wide">
      Ao mudar o saldo, o histórico é mantido: o Gafin só ajusta o ponto de partida da conta.
    </p>
    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button type="submit" class="btn-primary">{{ account ? "Salvar alterações" : "Criar conta" }}</button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
