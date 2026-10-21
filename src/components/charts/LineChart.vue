<script setup lang="ts">
import { computed } from "vue";
import { formatCompactCurrency, formatCurrency } from "@/utils/currency";

const props = defineProps<{
  /** Série na ordem do tempo (antigo -> novo). */
  points: { label: string; value: number }[];
  title: string;
}>();

const W = 320;
const H = 150;
const PAD = { top: 14, right: 12, bottom: 24, left: 52 };

const chart = computed(() => {
  const values = props.points.map((p) => p.value);
  if (values.length === 0) return null;

  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // Série constante: abre uma folga para a linha ficar no meio em vez de dividir por zero.
  const min = lo === hi ? lo - 1 : lo;
  const max = lo === hi ? hi + 1 : hi;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;

  const coords = props.points.map((p, i) => ({ x: x(i), y: y(p.value), label: p.label, value: p.value }));
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const baseY = PAD.top + innerH;
  const first = coords[0];
  const last = coords[coords.length - 1];
  const area = first && last ? `${line} L${last.x.toFixed(1)} ${baseY} L${first.x.toFixed(1)} ${baseY} Z` : "";

  // Com muitos pontos, mostra um rótulo sim, um não (sempre incluindo o último).
  const step = coords.length > 8 ? 2 : 1;
  const labelled = coords.filter((_, i) => (coords.length - 1 - i) % step === 0);

  return { lo, hi, coords, line, area, baseY, labelled, last };
});

const summary = computed(() => {
  const last = chart.value?.last;
  return last ? `${props.title}: ${formatCurrency(last.value)} em ${last.label}` : props.title;
});
</script>

<template>
  <figure class="chart">
    <figcaption class="chart__head">
      <span class="chart__title">{{ title }}</span>
      <span v-if="chart?.last" class="chart__last">{{ formatCurrency(chart.last.value) }}</span>
    </figcaption>

    <svg v-if="chart" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="summary" class="chart__svg">
      <line :x1="PAD.left" :x2="W - PAD.right" :y1="PAD.top" :y2="PAD.top" class="chart__grid" />
      <line :x1="PAD.left" :x2="W - PAD.right" :y1="chart.baseY" :y2="chart.baseY" class="chart__grid" />
      <text :x="PAD.left - 6" :y="PAD.top + 3" class="chart__label chart__label--end">{{ formatCompactCurrency(chart.hi) }}</text>
      <text :x="PAD.left - 6" :y="chart.baseY + 3" class="chart__label chart__label--end">{{ formatCompactCurrency(chart.lo) }}</text>

      <path :d="chart.area" class="chart__area" />
      <path :d="chart.line" class="chart__line" />
      <circle v-for="c in chart.coords" :key="c.label" :cx="c.x" :cy="c.y" r="2.5" class="chart__dot" />

      <text v-for="c in chart.labelled" :key="'l' + c.label" :x="c.x" :y="H - 6" class="chart__label chart__label--middle">
        {{ c.label }}
      </text>
    </svg>
    <p v-else class="empty-note">Sem dados ainda.</p>
  </figure>
</template>

<style scoped>
.chart {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}

.chart__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.chart__title {
  font-size: 12px;
  color: var(--color-text-muted);
}

.chart__last {
  font-size: 14px;
  font-weight: 600;
}

.chart__svg {
  width: 100%;
  height: auto;
  display: block;
}

.chart__grid {
  stroke: var(--color-border);
  stroke-width: 1;
}

.chart__line {
  fill: none;
  stroke: var(--color-brand-strong);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.chart__area {
  fill: var(--color-brand-strong);
  fill-opacity: 0.12;
}

.chart__dot {
  fill: var(--color-brand-strong);
}

.chart__label {
  fill: var(--color-text-muted);
  font-size: 9px;
}

.chart__label--end {
  text-anchor: end;
}

.chart__label--middle {
  text-anchor: middle;
}
</style>
