<script setup lang="ts">
interface SettingsItem {
  label: string;
  description: string;
}

const items: SettingsItem[] = [
  { label: "Backup", description: "Backup local completo do banco (IndexedDB)." },
  { label: "Importar dados", description: "Importar um backup ou planilha existente." },
  { label: "Exportar dados", description: "Exportar seus dados em JSON ou CSV." },
  { label: "Segurança", description: "Bloqueio por senha/Face ID ao abrir o app." },
  { label: "Aparência", description: "Tema, densidade e formato de moeda." },
  { label: "Sobre", description: "Versão do Gafin e informações do projeto." },
];
</script>

<template>
  <div class="section">
    <h1 class="section__title">Configurações</h1>

    <ul class="settings-list">
      <li v-for="item in items" :key="item.label" class="settings-list__item">
        <span class="settings-list__label">{{ item.label }}</span>
        <span class="settings-list__description">{{ item.description }}</span>
      </li>
    </ul>
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

.settings-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.settings-list__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-4);
  background: var(--color-surface);
}

.settings-list__item + .settings-list__item {
  border-top: 1px solid var(--color-border);
}

.settings-list__label {
  font-size: 14px;
  font-weight: 600;
}

.settings-list__description {
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
