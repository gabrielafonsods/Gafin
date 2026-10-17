<script setup lang="ts">
import BackupSection from "@/components/settings/BackupSection.vue";
import ExportSection from "@/components/settings/ExportSection.vue";
import SecuritySection from "@/components/settings/SecuritySection.vue";
import AppearanceSection from "@/components/settings/AppearanceSection.vue";
import AboutSection from "@/components/settings/AboutSection.vue";
</script>

<template>
  <div class="section">
    <h1 class="section__title">Configurações</h1>
    <BackupSection />
    <ExportSection />
    <SecuritySection />
    <AppearanceSection />
    <AboutSection />
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
</style>
