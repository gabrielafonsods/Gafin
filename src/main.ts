import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { initDatabase } from "./database/db";
import { initAppLock } from "./composables/useAppLock";
import { useBalance } from "./composables/useBalance";
import "./pwaUpdate"; // registra o Service Worker (ver pwaUpdate.ts)
import "./assets/base.css";

// Garante que o IndexedDB está pronto (versão criada/migrada) antes de
// montar a aplicação, evitando telas que tentam ler dados inexistentes.
initDatabase()
  .then(() => initAppLock())
  // Salário, assinaturas etc.: lança o que venceu desde a última vez que o app abriu.
  .then(() => useBalance().runRecurrences())
  .catch((error) => {
    console.error("Falha ao inicializar o Gafin:", error);
  })
  .finally(() => {
    createApp(App).use(router).mount("#app");
  });

// O app no iPhone raramente é "aberto de novo": ele volta do segundo plano.
// Ao voltar, confere se virou o dia e lança o que venceu.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    useBalance()
      .runRecurrences()
      .catch((error) => console.error("Falha ao lançar recorrências:", error));
  }
});
