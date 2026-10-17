<script setup lang="ts">
import { useSettings } from "@/composables/useSettings";
import type { Theme } from "@/database/schema";

const { theme, setTheme } = useSettings();

const options: { value: Theme; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Automático" },
];
</script>

<template>
  <section class="settings-card">
    <h2 class="settings-card__title">Aparência</h2>
    <div class="settings-card__segmented">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="settings-card__segment"
        :class="{ 'settings-card__segment--active': theme === option.value }"
        @click="setTheme(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
    <p class="settings-card__hint">"Automático" segue o tema do sistema do iPhone.</p>
  </section>
</template>
