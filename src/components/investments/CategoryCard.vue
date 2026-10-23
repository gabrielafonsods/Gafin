<script setup lang="ts">
import { computed } from "vue";
import PercentBadge from "@/components/investments/PercentBadge.vue";
import type { CategoryGroup } from "@/services/portfolioCalculator";
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from "@/types/investments";
import { formatCurrency, formatPercent, formatQuantity } from "@/utils/currency";

const props = defineProps<{
  group: CategoryGroup;
  /** % ideal da carteira para esta categoria, se o usuário definiu. */
  targetPercent?: number;
  expanded: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  openAsset: [assetId: number];
  add: [];
}>();

const label = computed(() => ASSET_TYPE_LABELS[props.group.type]);
const color = computed(() => ASSET_TYPE_COLORS[props.group.type]);
const hasPositions = computed(() => props.group.count > 0);
const barWidth = computed(() => Math.min(100, props.group.sharePercent));
</script>

<template>
  <article class="cat">
    <button type="button" class="cat__head" :aria-expanded="expanded" @click="emit('toggle')">
      <span class="cat__dot" :style="{ background: color }" />
      <span class="cat__name">{{ label }}</span>
      <span class="cat__chevron" :class="{ 'cat__chevron--open': expanded }" aria-hidden="true">▾</span>
    </button>

    <dl class="cat__metrics">
      <div class="cat__metric">
        <dt>Ativos</dt>
        <dd>{{ group.count }}</dd>
      </div>
      <div class="cat__metric">
        <dt>Valor total</dt>
        <dd>{{ formatCurrency(group.value) }}</dd>
      </div>
      <div class="cat__metric">
        <dt>Variação</dt>
        <dd><PercentBadge :value="group.variationPercent" :empty="!hasPositions" /></dd>
      </div>
      <div class="cat__metric">
        <dt>Rentabilidade</dt>
        <dd><PercentBadge :value="group.returnPercent" :empty="!hasPositions && group.returnPercent === 0" /></dd>
      </div>
    </dl>

    <div class="cat__share">
      <div class="cat__share-text">
        <span>% na carteira</span>
        <strong>
          {{ formatPercent(group.sharePercent) }}
          <template v-if="targetPercent"> <span class="cat__target">/ {{ formatPercent(targetPercent) }}</span></template>
        </strong>
      </div>
      <div class="progress cat__bar">
        <div class="progress__fill" :style="{ width: barWidth + '%', background: color }" />
        <span v-if="targetPercent" class="cat__marker" :style="{ left: Math.min(100, targetPercent) + '%' }" />
      </div>
    </div>

    <div v-if="expanded" class="cat__assets">
      <p v-if="group.views.length === 0" class="empty-note">Nenhum ativo nesta categoria ainda.</p>

      <ul v-else class="list">
        <li v-for="view in group.views" :key="view.asset.id">
          <button
            type="button"
            class="asset"
            :class="{ 'asset--closed': view.position.quantity === 0 }"
            @click="emit('openAsset', view.asset.id as number)"
          >
            <div class="asset__main">
              <span class="asset__name">{{ view.asset.ticker || view.asset.name }}</span>
              <span class="asset__sub">
                <template v-if="view.asset.ticker">{{ view.asset.name }} · </template>
                <template v-if="view.position.quantity > 0">
                  {{ formatQuantity(view.position.quantity) }} un. · PM {{ formatCurrency(view.position.averagePrice) }} ·
                  atual {{ formatCurrency(view.currentPrice) }}<template v-if="!view.hasManualPrice"> (sem cotação)</template>
                </template>
                <template v-else>posição encerrada</template>
              </span>
            </div>
            <div class="asset__side">
              <span class="asset__value">{{ formatCurrency(view.currentValue) }}</span>
              <span v-if="view.position.quantity > 0" class="asset__pct">
                <PercentBadge :value="view.variationPercent" />
              </span>
              <span class="asset__sub">
                rent. <span :class="view.returnPercent >= 0 ? 'text-income' : 'text-expense'">{{ formatPercent(view.returnPercent) }}</span>
                <template v-if="view.position.quantity > 0"> · {{ formatPercent(view.sharePercent) }} da carteira</template>
              </span>
            </div>
          </button>
        </li>
      </ul>

      <button type="button" class="btn-secondary cat__add" @click="emit('add')">+ Adicionar em {{ label }}</button>
    </div>
  </article>
</template>

<style scoped>
.cat {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.cat__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: transparent;
  border: none;
  padding: 0;
  text-align: left;
  width: 100%;
}

.cat__dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  flex: none;
}

.cat__name {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
}

.cat__chevron {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  color: var(--color-text-muted);
  transition: transform 0.15s ease;
}

.cat__chevron--open {
  transform: rotate(180deg);
}

.cat__metrics {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.cat__metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cat__metric dt {
  font-size: 11px;
  color: var(--color-text-muted);
}

.cat__metric dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.cat__share {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cat__share-text {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-text-muted);
}

.cat__share-text strong {
  color: var(--color-text);
}

.cat__target {
  color: var(--color-text-muted);
  font-weight: 400;
}

.cat__bar {
  position: relative;
  overflow: visible;
}

.cat__marker {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 12px;
  background: var(--color-text);
  border-radius: 1px;
  transform: translateX(-1px);
}

.cat__assets {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.asset {
  width: 100%;
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  text-align: left;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
}

.asset--closed {
  opacity: 0.6;
}

.asset__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.asset__name {
  font-size: 14px;
  font-weight: 600;
}

.asset__sub {
  font-size: 11px;
  color: var(--color-text-muted);
}

.asset__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-align: right;
}

.asset__value {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.cat__add {
  align-self: flex-start;
}

@media (min-width: 480px) {
  .cat__metrics {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
