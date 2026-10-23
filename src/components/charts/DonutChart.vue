<script setup lang="ts">
import { computed } from "vue";
import { formatPercent } from "@/utils/currency";

const props = defineProps<{
  title: string;
  slices: { label: string; value: number; percent: number; color: string }[];
  centerLabel: string;
  centerValue: string;
}>();

const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R;

const segments = computed(() => {
  let offset = 0;
  return props.slices
    .filter((slice) => slice.value > 0)
    .map((slice) => {
      const length = (slice.percent / 100) * CIRCUMFERENCE;
      const segment = { ...slice, dash: `${length} ${CIRCUMFERENCE - length}`, offset: -offset };
      offset += length;
      return segment;
    });
});

const summary = computed(
  () => `${props.title}: ${segments.value.map((s) => `${s.label} ${formatPercent(s.percent)}`).join(", ")}`,
);
</script>

<template>
  <figure class="donut">
    <figcaption class="donut__title">{{ title }}</figcaption>

    <div class="donut__body">
      <svg viewBox="0 0 120 120" role="img" :aria-label="summary" class="donut__svg">
        <circle cx="60" cy="60" :r="R" class="donut__track" />
        <g transform="rotate(-90 60 60)">
          <circle
            v-for="segment in segments"
            :key="segment.label"
            cx="60"
            cy="60"
            :r="R"
            fill="none"
            stroke-width="16"
            :stroke="segment.color"
            :stroke-dasharray="segment.dash"
            :stroke-dashoffset="segment.offset"
          />
        </g>
        <text x="60" y="56" class="donut__center-label">{{ centerLabel }}</text>
        <text x="60" y="70" class="donut__center-value">{{ centerValue }}</text>
      </svg>

      <ul class="donut__legend">
        <li v-for="segment in segments" :key="segment.label" class="donut__item">
          <span class="donut__dot" :style="{ background: segment.color }" />
          <span class="donut__name">{{ segment.label }}</span>
          <span class="donut__percent">{{ formatPercent(segment.percent) }}</span>
        </li>
      </ul>
    </div>
  </figure>
</template>

<style scoped>
.donut {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.donut__title {
  font-size: 14px;
  font-weight: 600;
}

.donut__body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
}

.donut__svg {
  width: 168px;
  height: 168px;
  flex: none;
}

.donut__track {
  fill: none;
  stroke: var(--color-bg);
  stroke-width: 16;
  cx: 60;
  cy: 60;
}

.donut__center-label {
  fill: var(--color-text-muted);
  font-size: 7px;
  text-anchor: middle;
}

.donut__center-value {
  fill: var(--color-text);
  font-size: 9px;
  font-weight: 600;
  text-anchor: middle;
}

.donut__legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 150px;
}

.donut__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 13px;
}

.donut__dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex: none;
}

.donut__name {
  flex: 1;
}

.donut__percent {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
