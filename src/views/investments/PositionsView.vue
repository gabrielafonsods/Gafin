<script setup lang="ts">
import { computed, ref } from "vue";
import DonutChart from "@/components/charts/DonutChart.vue";
import AllocationTargetsForm from "@/components/investments/AllocationTargetsForm.vue";
import AssetDetail from "@/components/investments/AssetDetail.vue";
import AssetForm from "@/components/investments/AssetForm.vue";
import CategoryCard from "@/components/investments/CategoryCard.vue";
import PercentBadge from "@/components/investments/PercentBadge.vue";
import SubNav from "@/components/layout/SubNav.vue";
import { useInvestments } from "@/composables/useInvestments";
import { useQuotes } from "@/composables/useQuotes";
import { useSettings } from "@/composables/useSettings";
import type { AssetType } from "@/database/schema";
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from "@/types/investments";
import { INVESTMENT_TABS } from "@/types/navigation";
import { formatCompactCurrency, formatCurrency } from "@/utils/currency";
import { formatRelativeTime } from "@/utils/date";

const tabs = INVESTMENT_TABS;

const { assetViews, summary, categoryGroups, lastPriceUpdate } = useInvestments();
const { allocationTargets, quotes } = useSettings();
const { refreshing, lastResult, refresh } = useQuotes();

type Mode = "list" | "create" | "edit" | "detail" | "targets";
const mode = ref<Mode>("list");
const selectedId = ref<number | null>(null);
const createType = ref<AssetType | undefined>(undefined);
const expanded = ref<AssetType[]>([]);

const editingAsset = computed(
  () => assetViews.value.find((view) => view.asset.id === selectedId.value)?.asset ?? null,
);

// Cada fatia da pizza é uma categoria com posição em aberto.
const slices = computed(() =>
  categoryGroups.value
    .filter((group) => group.value > 0)
    .map((group) => ({
      label: ASSET_TYPE_LABELS[group.type],
      value: group.value,
      percent: group.sharePercent,
      color: ASSET_TYPE_COLORS[group.type],
    })),
);

const hasAssets = computed(() => assetViews.value.length > 0);
const targetTypes = computed(() => categoryGroups.value.map((group) => group.type));
const hasAutoQuotes = computed(() =>
  assetViews.value.some((view) => view.position.quantity > 0 && view.asset.ticker && view.asset.autoQuote !== false),
);

const quoteStatus = computed(() => {
  const result = lastResult.value;
  if (result) {
    if (result.stoppedEarly) return `Não foi possível atualizar: ${result.stoppedEarly}`;
    if (result.total === 0) return "Nenhum ativo da B3 com ticker para atualizar.";
    const base = `${result.updated} de ${result.total} cotações atualizadas.`;
    return result.failed.length ? `${base} Falharam: ${result.failed.map((f) => f.ticker).join(", ")}.` : base;
  }
  return lastPriceUpdate.value ? `Última cotação ${formatRelativeTime(lastPriceUpdate.value)}.` : "";
});
const quoteFailed = computed(() => !!lastResult.value && (lastResult.value.failed.length > 0 || !!lastResult.value.stoppedEarly));

function toggle(type: AssetType) {
  expanded.value = expanded.value.includes(type)
    ? expanded.value.filter((item) => item !== type)
    : [...expanded.value, type];
}

function openDetail(id: number) {
  selectedId.value = id;
  mode.value = "detail";
}

function startCreate(type?: AssetType) {
  createType.value = type;
  mode.value = "create";
}

function toList() {
  selectedId.value = null;
  mode.value = "list";
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">Investimentos</h1>
    <SubNav :items="tabs" />

    <AssetForm
      v-if="mode === 'create'"
      :default-type="createType"
      @saved="openDetail"
      @cancel="toList"
    />
    <AssetForm
      v-else-if="mode === 'edit' && editingAsset"
      :asset="editingAsset"
      @saved="openDetail"
      @cancel="mode = 'detail'"
    />
    <AssetDetail
      v-else-if="mode === 'detail' && selectedId !== null"
      :asset-id="selectedId"
      @back="toList"
      @edit="mode = 'edit'"
      @deleted="toList"
    />
    <AllocationTargetsForm v-else-if="mode === 'targets'" :types="targetTypes" @saved="toList" @cancel="toList" />

    <template v-else>
      <article class="stat-card stat-card--wide">
        <span class="stat-card__label">Patrimônio total</span>
        <div class="positions__row">
          <strong class="stat-card__value">{{ formatCurrency(summary.valorAtual) }}</strong>
          <PercentBadge :value="summary.variacaoPercent" :empty="summary.quantidadeAtivos === 0" />
        </div>
        <span class="stat-card__hint">Valor investido {{ formatCurrency(summary.patrimonioInvestido) }}</span>
        <div class="positions__quotes">
          <button type="button" class="btn-secondary positions__refresh" :disabled="refreshing" @click="refresh">
            {{ refreshing ? "Atualizando…" : "↻ Atualizar cotações" }}
          </button>
          <span v-if="quoteStatus" class="stat-card__hint" :class="{ 'text-expense': quoteFailed }">{{ quoteStatus }}</span>
        </div>
        <span v-if="hasAutoQuotes && !quotes.token" class="stat-card__hint">
          Para atualizar sozinho, informe seu token em Configurações → Cotações.
        </span>
      </article>

      <DonutChart
        v-if="slices.length > 0"
        title="Ativos na carteira"
        :slices="slices"
        center-label="Total"
        :center-value="formatCompactCurrency(summary.valorAtual)"
      />

      <div class="section-head">
        <h2 class="section-title">Meus ativos ({{ summary.quantidadeAtivos }})</h2>
        <button type="button" class="link-action" @click="mode = 'targets'">% ideal</button>
      </div>

      <p v-if="!hasAssets" class="empty-note">
        Nenhum ativo ainda. Cadastre o primeiro e registre as compras dele — as categorias abaixo se preenchem sozinhas.
      </p>

      <CategoryCard
        v-for="group in categoryGroups"
        :key="group.type"
        :group="group"
        :target-percent="allocationTargets[group.type]"
        :expanded="expanded.includes(group.type)"
        @toggle="toggle(group.type)"
        @open-asset="openDetail"
        @add="startCreate(group.type)"
      />

      <button type="button" class="btn-primary" @click="startCreate()">Novo ativo</button>

      <details class="howto">
        <summary>Como calculamos variação e rentabilidade</summary>
        <p>
          <strong>Variação</strong> compara o preço atual com o seu preço médio nas posições em aberto. É o que o ativo
          subiu ou caiu desde que você comprou.
        </p>
        <p>
          <strong>Rentabilidade</strong> é o retorno total sobre o que você já comprou: soma o valor atual, os proventos
          recebidos e o que entrou em vendas, e desconta tudo que foi aportado (com taxas). Por isso um ativo que caiu
          pode ter rentabilidade positiva se pagou bons proventos.
        </p>
        <p>
          A rentabilidade é um retorno simples sobre o capital aportado; não considera o tempo em que cada aporte
          ficou investido.
        </p>
      </details>
    </template>
  </div>
</template>

<style scoped>
.positions__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.positions__quotes {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

.positions__refresh {
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
}

.howto {
  font-size: 12px;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}

.howto summary {
  font-weight: 600;
  color: var(--color-text);
}

.howto p {
  margin-top: var(--space-2);
  line-height: 1.5;
}
</style>
