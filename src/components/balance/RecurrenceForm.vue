<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useBalance } from "@/composables/useBalance";
import type { Recurrence } from "@/database/schema";
import { toUserMessage } from "@/services/errors";
import {
  PAYMENT_METHOD_LABELS,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_FREQUENCY_LABELS,
} from "@/types/balance";
import { todayISO } from "@/utils/date";
import type { PaymentMethod, RecurrenceFrequency } from "@/database/schema";

const props = defineProps<{ rule?: Recurrence | null }>();
const emit = defineEmits<{ saved: []; cancel: [] }>();

const { accounts, cards, categories, addRecurrence, editRecurrence } = useBalance();

const rule = props.rule ?? null;
const ruleAccountId = rule && "accountId" in rule ? rule.accountId : null;
const ruleCardId = rule && "cardId" in rule ? rule.cardId : null;

const form = reactive({
  kind: (rule?.kind ?? "saida") as "entrada" | "saida",
  amount: rule ? String(rule.amount) : "",
  categoryId: (rule?.categoryId ?? null) as number | null,
  customCategory: rule?.customCategory ?? "",
  description: rule?.description ?? "",
  frequency: (rule?.frequency ?? "mensal") as RecurrenceFrequency,
  startDate: rule?.startDate ?? todayISO(),
  endDate: rule?.endDate ?? "",
  paymentMethod: (rule && rule.kind === "saida" ? rule.paymentMethod : "pix") as PaymentMethod,
  accountId: ruleAccountId as number | null,
  cardId: ruleCardId as number | null,
});
const error = ref("");

const categoryOptions = computed(() =>
  categories.value.filter(
    (c) => c.kind === form.kind && (!c.archived || c.id === rule?.categoryId),
  ),
);
const selectedCategory = computed(() => categories.value.find((c) => c.id === form.categoryId));
const accountOptions = computed(() => accounts.value.filter((a) => !a.archived || a.id === ruleAccountId));
const cardOptions = computed(() => cards.value.filter((c) => !c.archived || c.id === ruleCardId));
const usesCard = computed(() => form.kind === "saida" && form.paymentMethod === "cartao");
const startsInPast = computed(() => !rule && form.startDate < todayISO());

function changeKind() {
  form.categoryId = null; // a categoria precisa ser do mesmo tipo
}

async function handleSubmit() {
  error.value = "";
  if (form.categoryId === null) {
    error.value = "Escolha a categoria.";
    return;
  }
  const input = {
    kind: form.kind,
    amount: Number(form.amount),
    categoryId: form.categoryId,
    customCategory: form.customCategory,
    description: form.description,
    frequency: form.frequency,
    startDate: form.startDate,
    ...(form.endDate ? { endDate: form.endDate } : {}),
    ...(form.kind === "saida" ? { paymentMethod: form.paymentMethod } : {}),
    ...(usesCard.value
      ? { cardId: form.cardId ?? undefined }
      : { accountId: form.accountId ?? undefined }),
  };
  try {
    if (rule?.id !== undefined) await editRecurrence(rule.id, input);
    else await addRecurrence(input);
    emit("saved");
  } catch (e) {
    error.value = toUserMessage(e);
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="handleSubmit">
    <label class="form-label">
      Tipo
      <select v-model="form.kind" class="form-input" :disabled="!!rule" @change="changeKind">
        <option value="saida">Saída (assinatura, conta fixa)</option>
        <option value="entrada">Entrada (salário, renda fixa)</option>
      </select>
    </label>
    <label class="form-label">
      Valor de cada vez (R$)
      <input v-model="form.amount" class="form-input" type="number" step="any" min="0" inputmode="decimal" required />
    </label>
    <label class="form-label">
      Categoria
      <select v-model.number="form.categoryId" class="form-input" required>
        <option :value="null" disabled>Selecione</option>
        <option v-for="c in categoryOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </label>
    <label class="form-label">
      Frequência
      <select v-model="form.frequency" class="form-input">
        <option v-for="f in RECURRENCE_FREQUENCIES" :key="f" :value="f">{{ RECURRENCE_FREQUENCY_LABELS[f] }}</option>
      </select>
    </label>
    <label class="form-label">
      Primeira ocorrência
      <input v-model="form.startDate" class="form-input" type="date" required />
    </label>
    <label class="form-label">
      Até (opcional)
      <input v-model="form.endDate" class="form-input" type="date" />
    </label>

    <p v-if="startsInPast" class="settings-card__hint form-wide">
      Essa data já passou: as ocorrências atrasadas serão lançadas agora.
    </p>

    <template v-if="form.kind === 'entrada'">
      <label class="form-label form-wide">
        Conta de destino
        <select v-model.number="form.accountId" class="form-input" required>
          <option :value="null" disabled>Selecione</option>
          <option v-for="a in accountOptions" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </label>
    </template>
    <template v-else>
      <label class="form-label">
        Forma de pagamento
        <select v-model="form.paymentMethod" class="form-input">
          <option v-for="(label, method) in PAYMENT_METHOD_LABELS" :key="method" :value="method">{{ label }}</option>
        </select>
      </label>
      <label v-if="usesCard" class="form-label">
        Cartão
        <select v-model.number="form.cardId" class="form-input" required>
          <option :value="null" disabled>Selecione</option>
          <option v-for="c in cardOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>
      <label v-else class="form-label">
        Conta
        <select v-model.number="form.accountId" class="form-input" required>
          <option :value="null" disabled>Selecione</option>
          <option v-for="a in accountOptions" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </label>
    </template>

    <label v-if="selectedCategory?.acceptsCustomLabel" class="form-label form-wide">
      Descreva a categoria (recomendado)
      <input v-model="form.customCategory" class="form-input" type="text" placeholder="Ex.: plano do celular" />
    </label>
    <label class="form-label form-wide">
      Descrição
      <input v-model="form.description" class="form-input" type="text" placeholder="Ex.: Netflix, Salário" />
    </label>

    <p v-if="rule" class="settings-card__hint form-wide">
      Mudanças valem para as próximas ocorrências. O que já foi lançado não é alterado.
    </p>
    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button type="submit" class="btn-primary">{{ rule ? "Salvar alterações" : "Criar recorrência" }}</button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
