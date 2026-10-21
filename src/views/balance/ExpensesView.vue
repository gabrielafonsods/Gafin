<script setup lang="ts">
import { computed, ref } from "vue";
import ExpenseEntryForm from "@/components/balance/ExpenseEntryForm.vue";
import MonthNav from "@/components/balance/MonthNav.vue";
import StatementRow from "@/components/balance/StatementRow.vue";
import SubNav from "@/components/layout/SubNav.vue";
import { BALANCE_TABS } from "@/types/navigation";
import { useBalance } from "@/composables/useBalance";
import { isCardExpense } from "@/services/balanceCalculator";
import type { StatementEntry } from "@/services/balanceViews";
import { toUserMessage } from "@/services/errors";
import { formatCurrency } from "@/utils/currency";
import { monthKey, todayISO } from "@/utils/date";

const tabs = BALANCE_TABS;

const { transactions, activeAccounts, statementFor, summaryFor, removeTransaction } = useBalance();

const month = ref(monthKey(todayISO()));
const mode = ref<"list" | "create" | "edit">("list");
const selectedId = ref<number | null>(null);
const error = ref("");

const OUT_KINDS: StatementEntry["kind"][] = ["saida", "compra_cartao", "pagamento_fatura"];
const entries = computed(() => statementFor({ month: month.value }).filter((e) => OUT_KINDS.includes(e.kind)));
const summary = computed(() => summaryFor(month.value));
const editing = computed(() => {
  const found = transactions.value.find((t) => t.id === selectedId.value);
  return found && found.type === "saida" ? found : null;
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
  const id = entry.transactionId;
  if (id === undefined) return;

  const target = transactions.value.find((t) => t.id === id);
  const parcels = target && isCardExpense(target) ? target.installment?.count : undefined;
  const message = parcels
    ? `Excluir esta compra parcelada? As ${parcels} parcelas saem das faturas.`
    : "Excluir esta saída?";
  if (!window.confirm(message)) return;

  error.value = "";
  try {
    await removeTransaction(id);
  } catch (e) {
    error.value = toUserMessage(e);
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">Saídas</h1>
    <SubNav :items="tabs" />

    <ExpenseEntryForm v-if="mode === 'create'" @saved="toList" @cancel="toList" />
    <ExpenseEntryForm v-else-if="mode === 'edit' && editing" :transaction="editing" @saved="toList" @cancel="toList" />

    <template v-else>
      <MonthNav v-model="month" />

      <section class="stat-grid">
        <article class="stat-card">
          <span class="stat-card__label">Saídas do mês</span>
          <strong class="stat-card__value text-expense">{{ formatCurrency(summary.saidasMes) }}</strong>
          <span class="stat-card__hint">Dinheiro, PIX e faturas pagas</span>
        </article>
        <article class="stat-card">
          <span class="stat-card__label">No cartão</span>
          <strong class="stat-card__value">{{ formatCurrency(summary.gastosCartaoMes) }}</strong>
          <span class="stat-card__hint">Ainda na fatura</span>
        </article>
      </section>

      <button
        type="button"
        class="btn-primary"
        :disabled="activeAccounts.length === 0"
        @click="mode = 'create'"
      >
        Nova saída
      </button>
      <p v-if="activeAccounts.length === 0" class="empty-note">Crie uma conta em Contas antes de registrar saídas.</p>

      <p v-if="error" class="form-error">{{ error }}</p>

      <p v-if="entries.length === 0" class="empty-note">Nenhuma saída neste mês.</p>
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
