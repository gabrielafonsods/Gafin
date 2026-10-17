<script setup lang="ts">
import { ref } from "vue";
import { exportBackup, importBackupFromFile } from "@/services/backupService";
import { toUserMessage } from "@/services/errors";

const exporting = ref(false);
const importing = ref(false);
const message = ref("");
const error = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

async function handleExport() {
  error.value = "";
  message.value = "";
  exporting.value = true;
  try {
    await exportBackup();
    message.value = "Backup exportado. Escolha onde salvar na folha que abriu.";
  } catch (e) {
    error.value = toUserMessage(e);
  } finally {
    exporting.value = false;
  }
}

function openFilePicker() {
  error.value = "";
  message.value = "";
  fileInput.value?.click();
}

async function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ""; // permite selecionar o mesmo arquivo de novo depois
  if (!file) return;

  const confirmed = window.confirm(
    "Importar este backup vai SUBSTITUIR todos os dados atuais do Gafin (contas, cartões, entradas, saídas, investimentos e configurações) pelos deste arquivo. Essa ação não pode ser desfeita. Deseja continuar?",
  );
  if (!confirmed) return;

  importing.value = true;
  try {
    await importBackupFromFile(file);
    message.value = "Backup restaurado. Recarregando o app...";
    setTimeout(() => window.location.reload(), 1200);
  } catch (e) {
    // Se a validação falhar, o banco não foi tocado — os dados atuais continuam intactos.
    error.value = toUserMessage(e);
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <section class="settings-card">
    <h2 class="settings-card__title">Backup</h2>
    <p class="settings-card__hint">
      O backup é só uma cópia: exportar nunca apaga ou altera os dados no seu iPhone. O arquivo não é
      criptografado — guarde-o em um lugar seguro. PIN e Face ID não entram no backup.
    </p>

    <div class="settings-card__actions">
      <button type="button" class="btn-primary" :disabled="exporting" @click="handleExport">
        {{ exporting ? "Exportando…" : "Exportar backup completo" }}
      </button>
      <button type="button" class="btn-secondary" :disabled="importing" @click="openFilePicker">
        {{ importing ? "Importando…" : "Importar backup" }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        class="settings-card__file-input"
        @change="handleFileSelected"
      />
    </div>

    <p v-if="message" class="settings-card__message">{{ message }}</p>
    <p v-if="error" class="form-error">{{ error }}</p>
  </section>
</template>
