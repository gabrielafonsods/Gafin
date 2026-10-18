<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useBalance } from "@/composables/useBalance";
import type { InvoiceStatus } from "@/services/balanceCalculator";
import { DomainError, toUserMessage } from "@/services/errors";
import { formatCurrency } from "@/utils/currency";
import { formatDateBR, formatMonthLabel, todayISO } from "@/utils/date";

const props = defineProps<{ cardId: number }>();
const emit = defineEmits<{ back: []; edit: []; deleted: [] }>();

const {
  cardUsage,
  invoiceViews,
  invoiceItemsFor,
  activeAccounts,
  payInvoice,
  undoInvoicePayment,
  removeCard,
  archiveCard,
  unarchiveCard,
} = useBalance();

const usage = computed(() => cardUsage.value.find((item) => item.card.id === props.cardId));
const invoices = computed(() => invoiceViews.value.filter((view) => view.invoice.cardId === props.cardId));
const usedPercent = computed(() =>
  usage.value && usage.value.limit > 0 ? Math.min(100, (usage.value.used / usage.value.limit) * 100) : 0,
);

const expandedId = ref<number | null>(null);
const payingId = ref<number | null>(null);
const payForm = reactive({ accountId: null as number | null, date: todayISO() });
const error = ref("");

const STATUS_LABEL: Record<InvoiceStatus, string> = { aberta: "Aberta", fechada: "Fechada", paga: "Paga" };
const STATUS_CLASS: Record<InvoiceStatus, string> = {
  aberta: "chip",
  fechada: "chip chip--warn",
  paga: "chip chip--ok",
};

async function run(action: () => Promise<unknown>) {
  error.value = "";
  try {
    await action();
  } catch (e) {
    error.value = toUserMessage(e);
  }
}

function toggle(invoiceId?: number) {
  if (invoiceId === undefined) return;
  expandedId.value = expandedId.value === invoiceId ? null : invoiceId;
  payingId.value = null;
}

function startPay(invoiceId?: number) {
  if (invoiceId === undefined) return;
  payingId.value = invoiceId;
  payForm.accountId = activeAccounts.value[0]?.id ?? null;
  payForm.date = todayISO();
}

const confirmPay = () =>
  run(async () => {
    if (payingId.value === null || payForm.accountId === null) {
      throw new DomainError("Escolha a conta de pagamento.");
    }
    await payInvoice(payingId.value, payForm.accountId, payForm.date);
    payingId.value = null;
  });

const undoPay = (invoiceId?: number) =>
  invoiceId !== undefined && run(() => undoInvoicePayment(invoiceId));

function handleDelete() {
  if (!usage.value) return;
  if (!window.confirm(`Excluir o cartão "${usage.value.card.name}"? Esta ação não pode ser desfeita.`)) return;
  void run(async () => {
    await removeCard(props.cardId);
    emit("deleted");
  });
}

const toggleArchive = () =>
  run(() => (usage.value?.card.archived ? unarchiveCard(props.cardId) : archiveCard(props.cardId)));
</script>

<template>
  <div v-if="usage" class="detail">
    <header class="detail__header">
      <button type="button" class="link-action" @click="emit('back')">← Cartões</button>
      <div class="detail__actions">
        <button type="button" class="link-action" @click="emit('edit')">Editar</button>
        <button type="button" class="link-action" @click="toggleArchive">
          {{ usage.card.archived ? "Desarquivar" : "Arquivar" }}
        </button>
        <button type="button" class="link-action link-action--danger" @click="handleDelete">Excluir</button>
      </div>
    </header>

    <div>
      <h2 class="detail__name">{{ usage.card.name }}</h2>
      <span class="list-row__sub">
        Fecha dia {{ usage.card.closingDay }} · vence dia {{ usage.card.dueDay }}
        <template v-if="usage.card.archived"> · arquivado</template>
      </span>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="stat-card">
      <div class="detail__limits">
        <div>
          <span class="stat-card__label">Limite usado</span>
          <strong class="stat-card__value">{{ formatCurrency(usage.used) }}</strong>
        </div>
        <div>
          <span class="stat-card__label">Disponível</span>
          <strong class="stat-card__value" :class="usage.available < 0 ? 'text-expense' : ''">
            {{ formatCurrency(usage.available) }}
          </strong>
        </div>
      </div>
      <div class="progress">
        <div class="progress__fill" :class="{ 'progress__fill--danger': usedPercent >= 90 }" :style="{ width: usedPercent + '%' }" />
      </div>
      <span class="stat-card__hint">Limite total {{ formatCurrency(usage.limit) }}</span>
    </section>

    <h3 class="section-title">Faturas</h3>
    <p v-if="invoices.length === 0" class="empty-note">Nenhuma fatura ainda. Elas aparecem quando você lança uma compra neste cartão.</p>

    <ul v-else class="list">
      <li v-for="view in invoices" :key="view.invoice.id" class="invoice">
        <button type="button" class="list-row" @click="toggle(view.invoice.id)">
          <div class="list-row__main">
            <span class="list-row__title">Fatura de {{ formatMonthLabel(view.invoice.referenceMonth) }}</span>
            <span class="list-row__sub">
              Fecha {{ formatDateBR(view.invoice.closingDate) }} · vence {{ formatDateBR(view.invoice.dueDate) }}
            </span>
          </div>
          <div class="list-row__side">
            <span class="list-row__amount">{{ formatCurrency(view.total) }}</span>
            <span :class="STATUS_CLASS[view.status]">{{ STATUS_LABEL[view.status] }}</span>
          </div>
        </button>

        <div v-if="expandedId === view.invoice.id" class="invoice__body">
          <ul v-if="invoiceItemsFor(view.invoice).length" class="invoice__items">
            <li v-for="item in invoiceItemsFor(view.invoice)" :key="item.transaction.id" class="invoice__item">
              <span class="invoice__item-title">
                {{ item.title }}<template v-if="item.parcel"> · {{ item.parcel }}</template>
              </span>
              <span class="list-row__sub">{{ formatDateBR(item.transaction.date) }}</span>
              <strong class="invoice__item-amount">{{ formatCurrency(item.transaction.amount) }}</strong>
            </li>
          </ul>
          <p v-else class="empty-note">Sem compras nesta fatura.</p>

          <template v-if="view.status === 'paga'">
            <p class="list-row__sub">
              Paga em {{ view.invoice.paidAt ? formatDateBR(view.invoice.paidAt) : "" }}
            </p>
            <button type="button" class="link-action" @click="undoPay(view.invoice.id)">Desfazer pagamento</button>
          </template>

          <template v-else-if="view.status === 'fechada'">
            <button v-if="payingId !== view.invoice.id" type="button" class="btn-primary" @click="startPay(view.invoice.id)">
              Pagar fatura
            </button>
            <form v-else class="form-grid" @submit.prevent="confirmPay">
              <label class="form-label">
                Pagar com a conta
                <select v-model.number="payForm.accountId" class="form-input" required>
                  <option :value="null" disabled>Selecione</option>
                  <option v-for="a in activeAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
                </select>
              </label>
              <label class="form-label">
                Data do pagamento
                <input v-model="payForm.date" class="form-input" type="date" required />
              </label>
              <div class="form-actions">
                <button type="submit" class="btn-primary">Confirmar pagamento</button>
                <button type="button" class="btn-secondary" @click="payingId = null">Cancelar</button>
              </div>
            </form>
          </template>

          <p v-else class="list-row__sub">
            Ainda aberta: dá para pagar depois do fechamento, em {{ formatDateBR(view.invoice.closingDate) }}.
          </p>
        </div>
      </li>
    </ul>
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
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.detail__actions {
  display: flex;
  gap: var(--space-4);
}

.detail__name {
  font-size: 20px;
  font-weight: 600;
}

.detail__limits {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
}

.detail__limits > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.invoice {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.invoice__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}

.invoice__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.invoice__item {
  display: grid;
  grid-template-columns: 1fr auto;
  column-gap: var(--space-3);
  align-items: baseline;
}

.invoice__item-title {
  font-size: 13px;
}

.invoice__item-amount {
  grid-row: span 2;
  grid-column: 2;
  font-size: 13px;
}
</style>
