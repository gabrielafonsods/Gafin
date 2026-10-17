<script setup lang="ts">
import { APP_VERSION } from "@/version";
</script>

<template>
  <section class="settings-card">
    <h2 class="settings-card__title">Sobre</h2>
    <p class="settings-card__about-name">Gafin</p>
    <p class="settings-card__hint">Seu dinheiro, sob controle.</p>
    <p class="settings-card__hint">Versão {{ APP_VERSION }}</p>
    <p class="settings-card__hint">
      PWA pessoal de controle financeiro — 100% local (IndexedDB), sem backend, sem serviços pagos.
    </p>
  </section>
</template>
