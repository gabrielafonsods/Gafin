<script setup lang="ts">
import { computed, ref } from "vue";
import IncomeForm from "@/components/investments/IncomeForm.vue";
import OperationForm from "@/components/investments/OperationForm.vue";
import { useInvestments } from "@/composables/useInvestments";
import { toUserMessage } from "@/services/errors";
import {
  ASSET_TYPE_LABELS,
  INCOME_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
} from "@/types/investments";
import { formatCurrency, formatPercent, formatQuantity } from "@/utils/currency";
import { formatDateBR } from "@/utils/date";

const props = defineProps<{ assetId: number }>();
const emit = defineEmits<{ back: []; edit: []; deleted: [] }>();

const {
  assetViews,
  operationsOf,
  incomesOf,
  removeAsset,
  removeOperation,
  removeIncome,
  updateCurrentPrice,
  updateCurrentValue,
} = useInvestments();

const view = computed(() => assetViews.value.find((item) => item.asset.id === props.assetId));
const operations = computed(() => operationsOf(props.assetId));
const incomes = computed(() => incomesOf(props.assetId));

const priceInput = ref("");
const valueInput = ref("");
const error = ref("");

async function run(action: () => Promise<unknown>) {
  error.value = "";
  try {
    await action();
  } catch (e) {
    error.value = toUserMessage(e);
  }
}

const savePrice = () =>
  run(async () => {
    await updateCurrentPrice(props.assetId, Number(priceInput.value));
    priceInput.value = "";
  });

const saveValue = () =>
  run(async () => {
    await updateCurrentValue(props.assetId, Number(valueInput.value));
    valueInput.value = "";
  });

const clearPrice = () => run(() => updateCurrentPrice(props.assetId, null));

function handleRemoveAsset() {
  const current = view.value;
  if (!current) return;
  const confirmed = window.confirm(
    `Excluir "${current.asset.name}" e todo o histórico (${operations.value.length} operações, ${incomes.value.length} rendimentos)? Esta ação não pode ser desfeita.`,
  );
  if (!confirmed) return;
  void run(async () => {
    await removeAsset(props.assetId);
    emit("deleted");
  });
}

const handleRemoveOperation = (id?: number) => id !== undefined && run(() => removeOperation(id));
const handleRemoveIncome = (id?: number) => id !== undefined && run(() => removeIncome(id));
</script>

<template>
  <div v-if="view" class="detail">
    <header class="detail__header">
      <button type="button" class="link-action" @click="emit('back')">← Ativos</button>
      <div class="detail__title">
        <h2 class="detail__name">{{ view.asset.name }}</h2>
        <span class="detail__sub">
          {{ [view.asset.ticker, ASSET_TYPE_LABELS[view.asset.type], view.asset.institution].filter(Boolean).join(" · ") }}
        </span>
      </div>
      <div class="detail__actions">
        <button type="button" class="link-action" @click="emit('edit')">Editar</button>
        <button type="button" class="link-action link-action--danger" @click="handleRemoveAsset">Excluir</button>
      </div>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="metrics">
      <article class="metric">
        <span class="metric__label">Quantidade</span>
        <strong class="metric__value">{{ formatQuantity(view.position.quantity) }}</strong>
      </article>
      <article class="metric">
        <span class="metric__label">Preço médio</span>
        <strong class="metric__value">{{ formatCurrency(view.position.averagePrice) }}</strong>
      </article>
      <article class="metric">
        <span class="metric__label">Valor investido</span>
        <strong class="metric__value">{{ formatCurrency(view.position.investedValue) }}</strong>
      </article>
      <article class="metric">
        <span class="metric__label">Valor atual</span>
        <strong class="metric__value">{{ formatCurrency(view.currentValue) }}</strong>
        <span v-if="view.position.quantity > 0 && !view.hasManualPrice" class="metric__hint">
          sem cotação informada
        </span>
      </article>
      <article class="metric">
        <span class="metric__label">Lucro/prejuízo</span>
        <strong class="metric__value" :class="view.profit >= 0 ? 'text-income' : 'text-expense'">
          {{ formatCurrency(view.profit) }}
        </strong>
      </article>
      <article class="metric">
        <span class="metric__label">Rentabilidade</span>
        <strong class="metric__value" :class="view.profitPercent >= 0 ? 'text-income' : 'text-expense'">
          {{ formatPercent(view.profitPercent) }}
        </strong>
      </article>
      <article class="metric">
        <span class="metric__label">Rendimentos recebidos</span>
        <strong class="metric__value">{{ formatCurrency(view.incomesReceived) }}</strong>
      </article>
      <article class="metric">
        <span class="metric__label">Lucro realizado (vendas)</span>
        <strong class="metric__value">{{ formatCurrency(view.position.realizedProfit) }}</strong>
      </article>
    </section>

    <section class="block">
      <h3 class="block__title">Valor atual</h3>
      <p class="block__hint">Informado manualmente. Use a cotação por unidade ou o valor total da posição (comum em renda fixa).</p>
      <div class="inline-form">
        <input v-model="priceInput" class="form-input" type="number" step="any" min="0" inputmode="decimal" placeholder="Cotação por unidade" />
        <button type="button" class="btn-secondary" @click="savePrice">Salvar</button>
      </div>
      <div class="inline-form">
        <input v-model="valueInput" class="form-input" type="number" step="any" min="0" inputmode="decimal" placeholder="Valor total da posição" />
        <button type="button" class="btn-secondary" @click="saveValue">Salvar</button>
      </div>
      <button v-if="view.hasManualPrice" type="button" class="link-action" @click="clearPrice">
        Remover cotação informada
      </button>
    </section>

    <section class="block">
      <h3 class="block__title">Operações</h3>
      <OperationForm :asset-id="assetId" />
      <p v-if="operations.length === 0" class="block__hint">Nenhuma operação registrada.</p>
      <ul v-else class="history">
        <li v-for="operation in operations" :key="operation.id" class="history__item">
          <div class="history__info">
            <span class="history__title">
              {{ OPERATION_TYPE_LABELS[operation.type] }} · {{ formatQuantity(operation.quantity) }} × {{ formatCurrency(operation.price) }}
            </span>
            <span class="history__detail">
              {{ formatDateBR(operation.date) }}<template v-if="operation.fees > 0"> · taxas {{ formatCurrency(operation.fees) }}</template><template v-if="operation.note"> · {{ operation.note }}</template>
            </span>
          </div>
          <button type="button" class="link-action link-action--danger" @click="handleRemoveOperation(operation.id)">Excluir</button>
        </li>
      </ul>
    </section>

    <section class="block">
      <h3 class="block__title">Rendimentos</h3>
      <IncomeForm :asset-id="assetId" />
      <p v-if="incomes.length === 0" class="block__hint">Nenhum rendimento registrado.</p>
      <ul v-else class="history">
        <li v-for="income in incomes" :key="income.id" class="history__item">
          <div class="history__info">
            <span class="history__title">{{ INCOME_TYPE_LABELS[income.type] }} · {{ formatCurrency(income.amount) }}</span>
            <span class="history__detail">
              {{ formatDateBR(income.date) }}<template v-if="income.description"> · {{ income.description }}</template>
            </span>
          </div>
          <button type="button" class="link-action link-action--danger" @click="handleRemoveIncome(income.id)">Excluir</button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.detail__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.detail__title {
  flex-basis: 100%;
  order: 3;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail__name {
  font-size: 20px;
  font-weight: 600;
}

.detail__sub {
  font-size: 12px;
  color: var(--color-text-muted);
}

.detail__actions {
  display: flex;
  gap: var(--space-4);
}

.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.metric {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric__label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.metric__value {
  font-size: 16px;
  font-weight: 600;
}

.metric__hint {
  font-size: 11px;
  color: var(--color-text-muted);
}

.block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.block__title {
  font-size: 15px;
  font-weight: 600;
}

.block__hint {
  font-size: 12px;
  color: var(--color-text-muted);
}

.inline-form {
  display: flex;
  gap: var(--space-2);
}

.history {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.history__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}

.history__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history__title {
  font-size: 13px;
  font-weight: 600;
}

.history__detail {
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
