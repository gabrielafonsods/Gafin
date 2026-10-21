<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useBalance } from "@/composables/useBalance";
import { isCardExpense } from "@/services/balanceCalculator";
import { toUserMessage } from "@/services/errors";
import { MAX_INSTALLMENTS, splitAmount } from "@/services/transactionsService";
import { PAYMENT_METHOD_LABELS } from "@/types/balance";
import { formatCurrency } from "@/utils/currency";
import { shiftDateByMonths, todayISO } from "@/utils/date";
import type { ExpenseTransaction, PaymentMethod } from "@/database/schema";

const props = defineProps<{ transaction?: ExpenseTransaction | null }>();
const emit = defineEmits<{ saved: []; cancel: [] }>();

const { accounts, cards, categories, transactions, addExpense, editExpense } = useBalance();

const editing = props.transaction ?? null;
const editingCard = editing && isCardExpense(editing) ? editing : null;
const parcel = editingCard?.installment ?? null;

/** Em compra parcelada, o formulário trabalha com o valor total e a data da 1ª parcela. */
function originalDate(): string {
  if (!editing) return todayISO();
  if (!parcel) return editing.date;
  const first = transactions.value.find(
    (t) => isCardExpense(t) && t.installment?.groupId === parcel.groupId && t.installment.number === 1,
  );
  return first?.date ?? shiftDateByMonths(editing.date, -(parcel.number - 1));
}

const form = reactive({
  amount: editing ? String(parcel?.totalAmount ?? editing.amount) : "",
  date: originalDate(),
  categoryId: (editing?.categoryId ?? null) as number | null,
  customCategory: editing?.customCategory ?? "",
  description: editing?.description ?? "",
  paymentMethod: (editing?.paymentMethod ?? "pix") as PaymentMethod,
  accountId: (editing && !isCardExpense(editing) ? editing.accountId : null) as number | null,
  cardId: (editingCard?.cardId ?? null) as number | null,
  installments: String(parcel?.count ?? 1),
});
const error = ref("");

const accountOptions = computed(() =>
  accounts.value.filter(
    (a) => !a.archived || (editing && !isCardExpense(editing) && a.id === editing.accountId),
  ),
);
const cardOptions = computed(() =>
  cards.value.filter((c) => !c.archived || c.id === editingCard?.cardId),
);

// Categorias arquivadas só aparecem se já eram a categoria deste lançamento.
const categoryOptions = computed(() =>
  categories.value.filter((c) => c.kind === "saida" && (!c.archived || c.id === editing?.categoryId)),
);
const selectedCategory = computed(() => categories.value.find((c) => c.id === form.categoryId));
const isCard = computed(() => form.paymentMethod === "cartao");
const installmentCount = computed(() => Math.max(1, Math.floor(Number(form.installments) || 1)));

/** Prévia "3x de R$ 33,34" para o usuário conferir antes de salvar. */
const installmentPreview = computed(() => {
  const total = Number(form.amount);
  const count = installmentCount.value;
  if (!isCard.value || count < 2 || !(total > 0)) return "";
  const [first, ...rest] = splitAmount(total, count);
  const last = rest[rest.length - 1] ?? first;
  return first === last
    ? `${count}x de ${formatCurrency(first ?? 0)}`
    : `${count}x de ${formatCurrency(last ?? 0)} (1ª de ${formatCurrency(first ?? 0)})`;
});

async function handleSubmit() {
  error.value = "";
  if (form.categoryId === null) {
    error.value = "Escolha a categoria.";
    return;
  }
  const common = {
    amount: Number(form.amount),
    date: form.date,
    categoryId: form.categoryId,
    customCategory: form.customCategory,
    description: form.description,
  };

  try {
    if (isCard.value) {
      if (form.cardId === null) throw new Error("card");
      const input = { ...common, paymentMethod: "cartao" as const, cardId: form.cardId, installments: installmentCount.value };
      if (editing?.id !== undefined) await editExpense(editing.id, input);
      else await addExpense(input);
    } else {
      if (form.accountId === null) throw new Error("account");
      const input = { ...common, paymentMethod: form.paymentMethod as "dinheiro" | "pix", accountId: form.accountId };
      if (editing?.id !== undefined) await editExpense(editing.id, input);
      else await addExpense(input);
    }
    emit("saved");
  } catch (e) {
    if (e instanceof Error && (e.message === "card" || e.message === "account")) {
      error.value = e.message === "card" ? "Escolha o cartão." : "Escolha a conta.";
    } else {
      error.value = toUserMessage(e);
    }
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="handleSubmit">
    <label class="form-label">
      {{ isCard && installmentCount > 1 ? "Valor total (R$)" : "Valor (R$)" }}
      <input v-model="form.amount" class="form-input" type="number" step="any" min="0" inputmode="decimal" required />
    </label>
    <label class="form-label">
      Data{{ isCard && installmentCount > 1 ? " da compra" : "" }}
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
      Forma de pagamento
      <select v-model="form.paymentMethod" class="form-input">
        <option v-for="(label, method) in PAYMENT_METHOD_LABELS" :key="method" :value="method">{{ label }}</option>
      </select>
    </label>

    <label v-if="!isCard" class="form-label form-wide">
      Conta utilizada
      <select v-model.number="form.accountId" class="form-input" required>
        <option :value="null" disabled>Selecione</option>
        <option v-for="a in accountOptions" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
    </label>

    <template v-else>
      <label class="form-label">
        Cartão utilizado
        <select v-model.number="form.cardId" class="form-input" required>
          <option :value="null" disabled>Selecione</option>
          <option v-for="c in cardOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>
      <label class="form-label">
        Parcelas
        <input
          v-model="form.installments"
          class="form-input"
          type="number"
          min="1"
          :max="MAX_INSTALLMENTS"
          inputmode="numeric"
        />
      </label>
      <p v-if="installmentPreview" class="settings-card__hint form-wide">{{ installmentPreview }}</p>
      <p class="settings-card__hint form-wide">
        A compra entra na fatura do cartão e só sai da conta quando você pagar a fatura.
      </p>
    </template>

    <label v-if="selectedCategory?.acceptsCustomLabel" class="form-label form-wide">
      Em que foi o gasto? (recomendado)
      <input v-model="form.customCategory" class="form-input" type="text" placeholder="Ex.: presente, conserto" />
    </label>
    <label class="form-label form-wide">
      Descrição (opcional)
      <input v-model="form.description" class="form-input" type="text" />
    </label>

    <p v-if="parcel" class="settings-card__hint form-wide">
      Esta compra tem {{ parcel.count }} parcelas. Ao salvar, todas elas são recalculadas.
    </p>
    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button type="submit" class="btn-primary">{{ transaction ? "Salvar alterações" : "Registrar saída" }}</button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
