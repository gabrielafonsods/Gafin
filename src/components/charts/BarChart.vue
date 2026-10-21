<script setup lang="ts">
import { computed } from "vue";
import { formatCompactCurrency } from "@/utils/currency";

const props = defineProps<{
  /** Um grupo por mês: `a` (ex.: entradas) e `b` (ex.: saídas). */
  groups: { label: string; a: number; b: number }[];
  labelA: string;
  labelB: string;
  title: string;
}>();

const W = 320;
const H = 150;
const PAD = { top: 14, right: 12, bottom: 24, left: 52 };

const chart = computed(() => {
  if (props.groups.length === 0) return null;
  const max = Math.max(1, ...props.groups.flatMap((g) => [g.a, g.b]));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / props.groups.length;
  const barW = Math.min(18, slot * 0.34);
  const baseY = PAD.top + innerH;
  const height = (v: number) => (v / max) * innerH;

  const bars = props.groups.map((g, i) => {
    const center = PAD.left + slot * i + slot / 2;
    return {
      label: g.label,
      center,
      a: { x: center - barW - 1, h: height(g.a), v: g.a },
      b: { x: center + 1, h: height(g.b), v: g.b },
    };
  });
  return { max, bars, barW, baseY };
});

const summary = computed(
  () => `${props.title}: ${props.groups.map((g) => `${g.label}, ${props.labelA} ${g.a}, ${props.labelB} ${g.b}`).join("; ")}`,
);
</script>

<template>
  <figure class="chart">
    <figcaption class="chart__title">{{ title }}</figcaption>

    <svg v-if="chart" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="summary" class="chart__svg">
      <line :x1="PAD.left" :x2="W - PAD.right" :y1="PAD.top" :y2="PAD.top" class="chart__grid" />
      <line :x1="PAD.left" :x2="W - PAD.right" :y1="chart.baseY" :y2="chart.baseY" class="chart__grid" />
      <text :x="PAD.left - 6" :y="PAD.top + 3" class="chart__label chart__label--end">{{ formatCompactCurrency(chart.max) }}</text>
      <text :x="PAD.left - 6" :y="chart.baseY + 3" class="chart__label chart__label--end">0</text>

      <g v-for="bar in chart.bars" :key="bar.label">
        <rect :x="bar.a.x" :y="chart.baseY - bar.a.h" :width="chart.barW" :height="bar.a.h" rx="2" class="chart__bar chart__bar--a" />
        <rect :x="bar.b.x" :y="chart.baseY - bar.b.h" :width="chart.barW" :height="bar.b.h" rx="2" class="chart__bar chart__bar--b" />
        <text :x="bar.center" :y="H - 6" class="chart__label chart__label--middle">{{ bar.label }}</text>
      </g>
    </svg>
    <p v-else class="empty-note">Sem dados ainda.</p>

    <div class="chart__legend">
      <span class="chart__key chart__key--a">{{ labelA }}</span>
      <span class="chart__key chart__key--b">{{ labelB }}</span>
    </div>
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

.chart__title {
  font-size: 12px;
  color: var(--color-text-muted);
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

.chart__bar--a {
  fill: var(--color-income);
}

.chart__bar--b {
  fill: var(--color-expense);
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

.chart__legend {
  display: flex;
  gap: var(--space-4);
  font-size: 11px;
  color: var(--color-text-muted);
}

.chart__key::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 6px;
}

.chart__key--a::before {
  background: var(--color-income);
}

.chart__key--b::before {
  background: var(--color-expense);
}
</style>
