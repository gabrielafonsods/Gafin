import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { initDatabase } from "./database/db";
import "./assets/base.css";

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
