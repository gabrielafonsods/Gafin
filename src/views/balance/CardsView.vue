<script setup lang="ts">
import { computed, ref } from "vue";
import CardDetail from "@/components/balance/CardDetail.vue";
import CardForm from "@/components/balance/CardForm.vue";
import SubNav from "@/components/layout/SubNav.vue";
import { useBalance } from "@/composables/useBalance";
import { formatCurrency } from "@/utils/currency";

const tabs = [
  { to: "/saldo", label: "Dashboard" },
  { to: "/saldo/contas", label: "Contas" },
  { to: "/saldo/cartoes", label: "Cartões" },
  { to: "/saldo/entradas", label: "Entradas" },
  { to: "/saldo/saidas", label: "Saídas" },
];

const { cards, cardUsage } = useBalance();

type Mode = "list" | "create" | "edit" | "detail";
const mode = ref<Mode>("list");
const selectedId = ref<number | null>(null);
const showArchived = ref(false);

const rows = computed(() => cardUsage.value.filter((row) => showArchived.value || !row.card.archived));
const hasArchived = computed(() => cards.value.some((card) => card.archived));
const editingCard = computed(() => cards.value.find((card) => card.id === selectedId.value) ?? null);

function openDetail(id?: number) {
  if (id === undefined) return;
  selectedId.value = id;
  mode.value = "detail";
}

function toList() {
  selectedId.value = null;
  mode.value = "list";
}

function percent(used: number, limit: number): number {
  return limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">Cartões</h1>
    <SubNav :items="tabs" />

    <CardForm v-if="mode === 'create'" @saved="toList" @cancel="toList" />
    <CardForm
      v-else-if="mode === 'edit' && editingCard"
      :card="editingCard"
      @saved="mode = 'detail'"
      @cancel="mode = 'detail'"
    />
    <CardDetail
      v-else-if="mode === 'detail' && selectedId !== null"
      :card-id="selectedId"
      @back="toList"
      @edit="mode = 'edit'"
      @deleted="toList"
    />

    <template v-else>
      <button type="button" class="btn-primary" @click="mode = 'create'">Novo cartão</button>

      <p v-if="rows.length === 0" class="empty-note">Nenhum cartão ainda. Cadastre um para lançar compras e acompanhar as faturas.</p>

      <ul v-else class="list">
        <li v-for="row in rows" :key="row.card.id">
          <button type="button" class="list-row" @click="openDetail(row.card.id)">
            <div class="list-row__main">
              <span class="list-row__title">{{ row.card.name }}</span>
              <span class="list-row__sub">
                Fecha dia {{ row.card.closingDay }} · vence dia {{ row.card.dueDay }}<template v-if="row.card.archived"> · arquivado</template>
              </span>
            </div>
            <div class="list-row__side">
              <span class="list-row__amount">{{ formatCurrency(row.available) }}</span>
              <span class="list-row__sub">disponível</span>
            </div>
            <div class="progress" style="flex-basis: 100%">
              <div
                class="progress__fill"
                :class="{ 'progress__fill--danger': percent(row.used, row.limit) >= 90 }"
                :style="{ width: percent(row.used, row.limit) + '%' }"
              />
            </div>
          </button>
        </li>
      </ul>

      <label v-if="hasArchived" class="check-row">
        <input v-model="showArchived" type="checkbox" />
        Mostrar cartões arquivados
      </label>
    </template>
  </div>
</template>
