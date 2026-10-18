<script setup lang="ts">
import { computed, ref } from "vue";
import IncomeEntryForm from "@/components/balance/IncomeEntryForm.vue";
import MonthNav from "@/components/balance/MonthNav.vue";
import StatementRow from "@/components/balance/StatementRow.vue";
import SubNav from "@/components/layout/SubNav.vue";
import { useBalance } from "@/composables/useBalance";
import type { StatementEntry } from "@/services/balanceViews";
import { toUserMessage } from "@/services/errors";
import { formatCurrency } from "@/utils/currency";
import { monthKey, todayISO } from "@/utils/date";

const tabs = [
  { to: "/saldo", label: "Dashboard" },
  { to: "/saldo/contas", label: "Contas" },
  { to: "/saldo/cartoes", label: "Cartões" },
  { to: "/saldo/entradas", label: "Entradas" },
  { to: "/saldo/saidas", label: "Saídas" },
];

const { transactions, activeAccounts, statementFor, summaryFor, removeTransaction } = useBalance();

const month = ref(monthKey(todayISO()));
const mode = ref<"list" | "create" | "edit">("list");
const selectedId = ref<number | null>(null);
const error = ref("");

const entries = computed(() => statementFor({ month: month.value }).filter((e) => e.kind === "entrada"));
const total = computed(() => summaryFor(month.value).entradasMes);
const editing = computed(() => {
  const found = transactions.value.find((t) => t.id === selectedId.value);
  return found && found.type === "entrada" ? found : null;
});

function toList() {
  mode.value = "list";
  selectedId.value = null;
}

function startEdit(entry: StatementEntry) {
  if (entry.transactionId === undefined) return;
  selectedId.value = entry.transactionId;
  mode.value = "edit";
}

async function handleRemove(entry: StatementEntry) {
  if (entry.transactionId === undefined) return;
  if (!window.confirm("Excluir esta entrada? O valor sai do saldo da conta de destino.")) return;
  error.value = "";
  try {
    await removeTransaction(entry.transactionId);
  } catch (e) {
    error.value = toUserMessage(e);
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">Entradas</h1>
    <SubNav :items="tabs" />

    <IncomeEntryForm v-if="mode === 'create'" @saved="toList" @cancel="toList" />
    <IncomeEntryForm v-else-if="mode === 'edit' && editing" :transaction="editing" @saved="toList" @cancel="toList" />

    <template v-else>
      <MonthNav v-model="month" />

      <article class="stat-card stat-card--wide">
        <span class="stat-card__label">Entradas do mês</span>
        <strong class="stat-card__value text-income">{{ formatCurrency(total) }}</strong>
      </article>

      <button
        type="button"
        class="btn-primary"
        :disabled="activeAccounts.length === 0"
        @click="mode = 'create'"
      >
        Nova entrada
      </button>
      <p v-if="activeAccounts.length === 0" class="empty-note">Crie uma conta em Contas antes de registrar entradas.</p>

      <p v-if="error" class="form-error">{{ error }}</p>

      <p v-if="entries.length === 0" class="empty-note">Nenhuma entrada neste mês.</p>
      <ul v-else class="list">
        <StatementRow
          v-for="entry in entries"
          :key="entry.key"
          :entry="entry"
          actions
          @edit="startEdit"
          @remove="handleRemove"
        />
      </ul>
    </template>
  </div>
</template>
