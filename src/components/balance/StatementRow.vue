<script setup lang="ts">
import type { StatementEntry } from "@/services/balanceViews";
import { formatCurrency } from "@/utils/currency";
import { formatDateBR } from "@/utils/date";

defineProps<{ entry: StatementEntry; actions?: boolean }>();
const emit = defineEmits<{ edit: [entry: StatementEntry]; remove: [entry: StatementEntry] }>();

const SIGN = { in: "+", out: "−", neutral: "" } as const;
const CHIP: Partial<Record<StatementEntry["kind"], string>> = {
  compra_cartao: "no cartão",
  transferencia: "transferência",
  pagamento_fatura: "fatura",
};
</script>

<template>
  <li class="list-row">
    <div class="list-row__main">
      <span class="list-row__title">{{ entry.title }}</span>
      <span class="list-row__sub">
        {{ formatDateBR(entry.date) }}<template v-if="entry.subtitle"> · {{ entry.subtitle }}</template>
      </span>
    </div>
    <div class="list-row__side">
      <span
        class="list-row__amount"
        :class="{ 'text-income': entry.direction === 'in', 'text-expense': entry.direction === 'out' }"
      >
        {{ SIGN[entry.direction] }}{{ formatCurrency(entry.amount) }}
      </span>
      <span v-if="CHIP[entry.kind]" class="chip">{{ CHIP[entry.kind] }}</span>
    </div>
    <div v-if="actions && entry.kind !== 'pagamento_fatura'" class="list-row__actions">
      <button type="button" class="link-action" @click="emit('edit', entry)">Editar</button>
      <button type="button" class="link-action link-action--danger" @click="emit('remove', entry)">Excluir</button>
    </div>
  </li>
</template>
