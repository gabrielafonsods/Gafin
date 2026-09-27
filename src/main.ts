import { createApp } from "vue";
import { registerSW } from "virtual:pwa-register";
import App from "./App.vue";
import { router } from "./router";
import { initDatabase } from "./database/db";
import "./assets/base.css";

/*
 * Auto-update do PWA: quando o GitHub Actions publica uma nova versão, o
 * navegador detecta o novo Service Worker, ele assume o controle
 * silenciosamente (skipWaiting + clientsClaim, habilitados pelo
 * registerType: "autoUpdate" no vite.config.ts) e este registerSW recarrega
 * a página automaticamente assim que a troca acontece — sem prompt, sem
 * reinstalar o app no iPhone.
 *
 * onRegisteredSW agenda uma checagem periódica de atualização, porque o
 * Safari/iOS só verifica por conta própria em alguns momentos específicos
 * (ex.: reabertura do app); isso garante que, mesmo com o app deixado
 * aberto por um tempo, ele acabe encontrando a versão nova.
 */
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(() => registration.update(), 60 * 60 * 1000); // a cada 1h
  },
});

// Garante que o IndexedDB está pronto (versão criada/migrada) antes de
// montar a aplicação, evitando telas que tentam ler dados inexistentes.
initDatabase()
  .catch((error) => {
    // Nesta etapa apenas logamos: a UI de erro de storage será tratada
    // quando as telas passarem a depender de dados reais.
    console.error("Falha ao inicializar o banco local do Gafin:", error);
  })
  .finally(() => {
    createApp(App).use(router).mount("#app");
  });
