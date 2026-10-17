<script setup lang="ts">
import { ref } from "vue";
import {
  exportAccountsCsv,
  exportAssetsCsv,
  exportCardsCsv,
  exportExpensesCsv,
  exportIncomesCsv,
  exportOperationsCsv,
} from "@/services/csvExportService";
import { exportAllXlsx } from "@/services/xlsxExportService";
import { toUserMessage } from "@/services/errors";

const options = [
  { label: "Entradas (CSV)", run: exportIncomesCsv },
  { label: "Saídas (CSV)", run: exportExpensesCsv },
  { label: "Contas (CSV)", run: exportAccountsCsv },
  { label: "Cartões (CSV)", run: exportCardsCsv },
  { label: "Ativos (CSV)", run: exportAssetsCsv },
  { label: "Operações (CSV)", run: exportOperationsCsv },
];

const busy = ref<string | null>(null);
const error = ref("");

async function run(label: string, action: () => Promise<void>) {
  error.value = "";
  busy.value = label;
  try {
    await action();
  } catch (e) {
    error.value = toUserMessage(e);
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <section class="settings-card">
    <h2 class="settings-card__title">Exportar dados</h2>
    <p class="settings-card__hint">
      Planilhas para consulta e análise — não servem para restaurar o app (use o Backup para isso).
    </p>

    <div class="settings-card__grid">
      <button
        v-for="option in options"
        :key="option.label"
        type="button"
        class="btn-secondary"
        :disabled="busy !== null"
        @click="run(option.label, option.run)"
      >
        {{ busy === option.label ? "Exportando…" : option.label }}
      </button>
    </div>

    <button
      type="button"
      class="btn-primary"
      :disabled="busy !== null"
      @click="run('xlsx', exportAllXlsx)"
    >
      {{ busy === "xlsx" ? "Exportando…" : "Exportar tudo em uma planilha (XLSX)" }}
    </button>

    <p v-if="error" class="form-error">{{ error }}</p>
  </section>
</template>
