import { ref } from "vue";
import { checkPin, tryBiometricUnlock } from "@/services/securityService";
import { loadSettings, useSettings } from "./useSettings";

/*
 * Trava do app: bloqueado ao abrir (se o bloqueio estiver ativo) e de novo
 * depois de X minutos em segundo plano. Um único estado em nível de módulo
 * — não existe "instância" por componente, é o app inteiro que fica
 * travado ou não.
 */
const locked = ref(false);
const initialized = ref(false);
let backgroundedAt: number | null = null;

function getTimeoutMs(): number {
  const { security } = useSettings();
  const minutes = security.value.inactivityTimeoutMinutes;
  return minutes > 0 ? minutes * 60_000 : Infinity;
}

function handleVisibilityChange(): void {
  const { security } = useSettings();
  if (!security.value.enabled) return;

  if (document.visibilityState === "hidden") {
    backgroundedAt = Date.now();
    return;
  }

  if (backgroundedAt !== null && Date.now() - backgroundedAt >= getTimeoutMs()) {
    locked.value = true;
  }
  backgroundedAt = null;
}

/**
 * Chamada uma vez no boot, ANTES de montar o app (ver main.ts): espera as
 * configurações carregarem e já define `locked`, então o conteúdo nunca
 * aparece nem por um instante antes da tela de PIN.
 */
export async function initAppLock(): Promise<void> {
  if (initialized.value) return;
  initialized.value = true;

  await loadSettings();
  const { security } = useSettings();
  if (security.value.enabled) locked.value = true;

  document.addEventListener("visibilitychange", handleVisibilityChange);
}

export function useAppLock() {
  return {
    locked,
    async unlockWithPin(pin: string): Promise<boolean> {
      const ok = await checkPin(pin);
      if (ok) locked.value = false;
      return ok;
    },
    async unlockWithBiometrics(): Promise<boolean> {
      const ok = await tryBiometricUnlock();
      if (ok) locked.value = false;
      return ok;
    },
    lockNow(): void {
      locked.value = true;
    },
  };
}
