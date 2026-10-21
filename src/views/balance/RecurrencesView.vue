<script setup lang="ts">
import { computed, ref } from "vue";
import RecurrenceForm from "@/components/balance/RecurrenceForm.vue";
import SubNav from "@/components/layout/SubNav.vue";
import { useBalance } from "@/composables/useBalance";
import { toUserMessage } from "@/services/errors";
import { RECURRENCE_FREQUENCY_LABELS } from "@/types/balance";
import { BALANCE_TABS } from "@/types/navigation";
import { formatCurrency } from "@/utils/currency";
import { formatDateBR } from "@/utils/date";

const tabs = BALANCE_TABS;

const {
  categories,
  accounts,
  recurrences,
  recurrenceViews,
  recurrenceNotice,
  toggleRecurrence,
  removeRecurrence,
  dismissRecurrenceNotice,
} = useBalance();

const mode = ref<"list" | "create" | "edit">("list");
const selectedId = ref<number | null>(null);
const error = ref("");

const editing = computed(() => recurrences.value.find((r) => r.id === selectedId.value) ?? null);
const monthly = computed(() => {
  const active = recurrenceViews.value.filter((v) => v.rule.active);
  const sum = (kind: "entrada" | "saida") =>
    active.filter((v) => v.rule.kind === kind).reduce((total, v) => total + v.perMonth, 0);
  return { in: sum("entrada"), out: sum("saida") };
});

const categoryName = (id: number) => categories.value.find((c) => c.id === id)?.name ?? "Sem categoria";

function toList() {
  mode.value = "list";
  selectedId.value = null;
}

function startEdit(id?: number) {
  if (id === undefined) return;
  selectedId.value = id;
  mode.value = "edit";
}

async function run(action: () => Promise<unknown>) {
  error.value = "";
  try {
    await action();
  } catch (e) {
    error.value = toUserMessage(e);
  }
}

function handleRemove(id?: number, label?: string) {
  if (id === undefined) return;
  if (!window.confirm(`Excluir a recorrência "${label}"? Os lançamentos que ela já gerou continuam no histórico.`)) return;
  void run(() => removeRecurrence(id));
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">Recorrentes</h1>
    <SubNav :items="tabs" />

    <RecurrenceForm v-if="mode === 'create'" @saved="toList" @cancel="toList" />
    <RecurrenceForm v-else-if="mode === 'edit' && editing" :rule="editing" @saved="toList" @cancel="toList" />

    <template v-else>
      <section v-if="recurrenceNotice.length > 0" class="notice">
        <p class="notice__title">Algumas ocorrências não puderam ser lançadas:</p>
        <ul class="notice__list">
          <li v-for="(item, i) in recurrenceNotice" :key="i">
            {{ item.description || "Recorrência" }} · {{ formatDateBR(item.date) }} — {{ item.reason }}
          </li>
        </ul>
        <button type="button" class="link-action" @click="dismissRecurrenceNotice">Entendi</button>
      </section>

      <section class="stat-grid">
        <article class="stat-card">
          <span class="stat-card__label">Entradas fixas / mês</span>
          <strong class="stat-card__value text-income">{{ formatCurrency(monthly.in) }}</strong>
        </article>
        <article class="stat-card">
          <span class="stat-card__label">Saídas fixas / mês</span>
          <strong class="stat-card__value text-expense">{{ formatCurrency(monthly.out) }}</strong>
        </article>
      </section>

      <button type="button" class="btn-primary" :disabled="accounts.length === 0" @click="mode = 'create'">
        Nova recorrência
      </button>
      <p v-if="accounts.length === 0" class="empty-note">Crie uma conta em Contas antes de cadastrar recorrências.</p>
      <p class="settings-card__hint">
        Os lançamentos são criados sozinhos quando chega o dia — na próxima vez que você abrir o app.
      </p>

      <p v-if="error" class="form-error">{{ error }}</p>

      <p v-if="recurrenceViews.length === 0" class="empty-note">
        Nenhuma recorrência. Cadastre salário, assinaturas e contas fixas para não precisar lançar todo mês.
      </p>

      <ul v-else class="list">
        <li v-for="view in recurrenceViews" :key="view.rule.id" class="list-row">
          <div class="list-row__main">
            <span class="list-row__title">{{ view.rule.description || categoryName(view.rule.categoryId) }}</span>
            <span class="list-row__sub">
              {{ RECURRENCE_FREQUENCY_LABELS[view.rule.frequency] }} · {{ view.targetName }} ·
              <template v-if="!view.rule.active">pausada</template>
              <template v-else-if="view.next">próxima {{ formatDateBR(view.next) }}</template>
              <template v-else>encerrada</template>
            </span>
          </div>
          <div class="list-row__side">
            <span class="list-row__amount" :class="view.rule.kind === 'entrada' ? 'text-income' : 'text-expense'">
              {{ view.rule.kind === "entrada" ? "+" : "−" }}{{ formatCurrency(view.rule.amount) }}
            </span>
            <span v-if="view.rule.kind === 'saida' && view.rule.paymentMethod === 'cartao'" class="chip">cartão</span>
          </div>
          <div class="list-row__actions">
            <button type="button" class="link-action" @click="startEdit(view.rule.id)">Editar</button>
            <button
              v-if="view.rule.id !== undefined"
              type="button"
              class="link-action"
              @click="run(() => toggleRecurrence(view.rule.id as number, !view.rule.active))"
            >
              {{ view.rule.active ? "Pausar" : "Reativar" }}
            </button>
            <button
              type="button"
              class="link-action link-action--danger"
              @click="handleRemove(view.rule.id, view.rule.description || categoryName(view.rule.categoryId))"
            >
              Excluir
            </button>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.notice {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-expense);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: 12px;
}

.notice__title {
  font-weight: 600;
}

.notice__list {
  margin: 0;
  padding-left: var(--space-4);
  color: var(--color-text-muted);
}
</style>
