<script setup lang="ts">
import { computed, ref } from "vue";
import SubNav from "@/components/layout/SubNav.vue";
import AssetDetail from "@/components/investments/AssetDetail.vue";
import AssetForm from "@/components/investments/AssetForm.vue";
import { useInvestments } from "@/composables/useInvestments";
import { ASSET_TYPE_LABELS } from "@/types/investments";
import { formatCurrency, formatPercent, formatQuantity } from "@/utils/currency";

const tabs = [
  { to: "/investimentos", label: "Dashboard" },
  { to: "/investimentos/carteira", label: "Carteira" },
  { to: "/investimentos/ativos", label: "Ativos" },
];

const { assetViews } = useInvestments();

type Mode = "list" | "create" | "edit" | "detail";
const mode = ref<Mode>("list");
const selectedId = ref<number | null>(null);

const editingAsset = computed(
  () => assetViews.value.find((view) => view.asset.id === selectedId.value)?.asset ?? null,
);

function openDetail(id: number) {
  selectedId.value = id;
  mode.value = "detail";
}

function backToList() {
  selectedId.value = null;
  mode.value = "list";
}
</script>

<template>
  <div class="section">
    <h1 class="section__title">Ativos</h1>
    <SubNav :items="tabs" />

    <AssetForm v-if="mode === 'create'" @saved="openDetail" @cancel="backToList" />

    <AssetForm
      v-else-if="mode === 'edit' && editingAsset"
      :asset="editingAsset"
      @saved="openDetail"
      @cancel="mode = 'detail'"
    />

    <AssetDetail
      v-else-if="mode === 'detail' && selectedId !== null"
      :asset-id="selectedId"
      @back="backToList"
      @edit="mode = 'edit'"
      @deleted="backToList"
    />

    <template v-else>
      <button type="button" class="btn-primary asset-add" @click="mode = 'create'">Novo ativo</button>

      <p v-if="assetViews.length === 0" class="asset-empty">
        Nenhum ativo cadastrado ainda. Cadastre o primeiro e registre as operações dele.
      </p>

      <ul v-else class="asset-list">
        <li v-for="view in assetViews" :key="view.asset.id">
          <button type="button" class="asset-list__item" @click="openDetail(view.asset.id as number)">
            <div class="asset-list__info">
              <span class="asset-list__name">{{ view.asset.name }}</span>
              <span class="asset-list__detail">
                {{ [view.asset.ticker, ASSET_TYPE_LABELS[view.asset.type]].filter(Boolean).join(" · ") }}
                · {{ formatQuantity(view.position.quantity) }} un.
              </span>
            </div>
            <div class="asset-list__numbers">
              <span class="asset-list__value">{{ formatCurrency(view.currentValue) }}</span>
              <span
                class="asset-list__profit"
                :class="view.profit >= 0 ? 'text-income' : 'text-expense'"
              >
                {{ formatPercent(view.profitPercent) }}
              </span>
            </div>
          </button>
        </li>
      </ul>
    </template>
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

.asset-add {
  flex: none;
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
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-align: left;
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

.asset-list__numbers {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.asset-list__value {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.asset-list__profit {
  font-size: 12px;
}
</style>
