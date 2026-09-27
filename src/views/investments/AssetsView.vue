<script setup lang="ts">
import { reactive, ref } from "vue";
import SubNav from "@/components/layout/SubNav.vue";
import { useInvestments } from "@/composables/useInvestments";
import { formatCurrency } from "@/utils/currency";
import type { Investment } from "@/database/schema";

const tabs = [
  { to: "/investimentos", label: "Dashboard" },
  { to: "/investimentos/carteira", label: "Carteira" },
  { to: "/investimentos/ativos", label: "Ativos" },
];

const { investments, addInvestment, updateInvestment, removeInvestment } = useInvestments();

const editingId = ref<number | null>(null);

const form = reactive({
  assetName: "",
  quantity: "",
  averagePrice: "",
});

function resetForm() {
  editingId.value = null;
  form.assetName = "";
  form.quantity = "";
  form.averagePrice = "";
}

function startEdit(item: Investment) {
  editingId.value = item.id ?? null;
  form.assetName = item.assetName;
  form.quantity = String(item.quantity);
  form.averagePrice = String(item.averagePrice);
}

async function handleSubmit() {
  const assetName = form.assetName.trim();
  const quantity = Number(form.quantity);
  const averagePrice = Number(form.averagePrice);

  if (!assetName || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(averagePrice) || averagePrice < 0) {
    return;
  }

  if (editingId.value !== null) {
    await updateInvestment({
      id: editingId.value,
      assetName,
      quantity,
      averagePrice,
      createdAt: investments.value.find((i) => i.id === editingId.value)?.createdAt ?? new Date().toISOString(),
    });
  } else {
    await addInvestment({
      assetName,
      quantity,
      averagePrice,
      createdAt: new Date().toISOString(),
    });
  }

  resetForm();
}

async function handleRemove(id?: number) {
  if (id === undefined) return;
  await removeInvestment(id);
  if (editingId.value === id) resetForm();
}
</script>

<template>
  <div class="section">
    <h1 class="section__title">Ativos</h1>
    <SubNav :items="tabs" />

    <form class="asset-form" @submit.prevent="handleSubmit">
      <input
        v-model="form.assetName"
        type="text"
        placeholder="Nome do ativo (ex: PETR4, Tesouro Selic)"
        class="asset-form__input asset-form__input--wide"
        required
      />
      <input
        v-model="form.quantity"
        type="number"
        step="any"
        min="0"
        placeholder="Quantidade"
        class="asset-form__input"
        required
      />
      <input
        v-model="form.averagePrice"
        type="number"
        step="any"
        min="0"
        placeholder="Preço médio (R$)"
        class="asset-form__input"
        required
      />
      <div class="asset-form__actions">
        <button type="submit" class="asset-form__submit">
          {{ editingId !== null ? "Salvar alterações" : "Adicionar ativo" }}
        </button>
        <button
          v-if="editingId !== null"
          type="button"
          class="asset-form__cancel"
          @click="resetForm"
        >
          Cancelar
        </button>
      </div>
    </form>

    <p v-if="investments.length === 0" class="asset-empty">
      Nenhum ativo cadastrado ainda. Adicione o primeiro acima.
    </p>

    <ul v-else class="asset-list">
      <li v-for="item in investments" :key="item.id" class="asset-list__item">
        <div class="asset-list__info">
          <span class="asset-list__name">{{ item.assetName }}</span>
          <span class="asset-list__detail">
            {{ item.quantity }} un. · preço médio {{ formatCurrency(item.averagePrice) }}
          </span>
        </div>
        <div class="asset-list__value">
          {{ formatCurrency(item.quantity * item.averagePrice) }}
        </div>
        <div class="asset-list__actions">
          <button type="button" class="asset-list__action" @click="startEdit(item)">Editar</button>
          <button type="button" class="asset-list__action asset-list__action--danger" @click="handleRemove(item.id)">
            Excluir
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.section__title {
  font-size: 20px;
  font-weight: 600;
}

.asset-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.asset-form__input {
  grid-column: span 1;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: 14px;
}

.asset-form__input--wide {
  grid-column: span 2;
}

.asset-form__actions {
  grid-column: span 2;
  display: flex;
  gap: var(--space-2);
}

.asset-form__submit {
  flex: 1;
  background: var(--color-brand-strong);
  color: var(--color-bg);
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  font-weight: 600;
}

.asset-form__cancel {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-muted);
}

.asset-empty {
  color: var(--color-text-muted);
  font-size: 13px;
}

.asset-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.asset-list__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}

.asset-list__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.asset-list__name {
  font-size: 14px;
  font-weight: 600;
}

.asset-list__detail {
  font-size: 12px;
  color: var(--color-text-muted);
}

.asset-list__value {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.asset-list__actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asset-list__action {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 12px;
  padding: 2px 0;
  text-align: right;
}

.asset-list__action--danger {
  color: var(--color-expense);
}
</style>
