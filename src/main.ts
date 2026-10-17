import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { initDatabase } from "./database/db";
import { initAppLock } from "./composables/useAppLock";
import "./pwaUpdate"; // registra o Service Worker (ver pwaUpdate.ts)
import "./assets/base.css";

// Garante que o IndexedDB está pronto (versão criada/migrada) antes de
// montar a aplicação, evitando telas que tentam ler dados inexistentes.
initDatabase()
  .then(() => initAppLock())
  .catch((error) => {
    console.error("Falha ao inicializar o banco local do Gafin:", error);
  })
  .finally(() => {
    createApp(App).use(router).mount("#app");
  });
