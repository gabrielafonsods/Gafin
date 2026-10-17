import { ref } from "vue";
import { registerSW } from "virtual:pwa-register";

/*
 * registerType "prompt" (ver vite.config.ts): o novo Service Worker fica
 * esperando em vez de assumir sozinho. needRefresh liga o aviso
 * "Nova versão disponível"; só quando o usuário toca em "Atualizar agora"
 * (updateNow) é que ele assume e a página recarrega uma vez.
 *
 * Isso nunca encosta no IndexedDB: o Service Worker só controla os
 * arquivos estáticos (JS/CSS/HTML) via Cache Storage, que é um mecanismo
 * completamente separado de onde os dados financeiros ficam gravados.
 */
export const needRefresh = ref(false);
export const offlineReady = ref(false);

const updateSW = registerSW({
  onNeedRefresh() {
    needRefresh.value = true;
  },
  onOfflineReady() {
    offlineReady.value = true;
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // O Safari/iOS nem sempre confere atualização sozinho; força de tempos
    // em tempos enquanto o app estiver aberto.
    setInterval(() => registration.update(), 60 * 60 * 1000);
  },
});

export function updateNow(): void {
  needRefresh.value = false;
  void updateSW(true);
}
