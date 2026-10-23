import { computed, ref } from "vue";
import { getSettings } from "@/database/repositories";
import type { AppSettings } from "@/database/schema";
import { applyTheme, setTheme } from "@/services/appearanceService";
import {
  saveQuoteSettings,
  setAllocationTargets,
  type QuoteSettingsPatch,
} from "@/services/investmentSettingsService";
import {
  disableBiometric,
  disableLock,
  enableBiometric,
  isBiometricAvailable,
  setInactivityTimeout,
  setupPin,
} from "@/services/securityService";

/*
 * Mesmo padrão dos outros módulos: estado em nível de módulo, sem Pinia.
 * O tema é aplicado ao <html> assim que carrega (e de novo a cada troca),
 * então qualquer tela que montar depois já vê o tema certo.
 */
const settings = ref<AppSettings | null>(null);
const biometricAvailable = ref(false);
const loaded = ref(false);
const loading = ref(false);

async function loadAll(): Promise<void> {
  loading.value = true;
  try {
    const [current, canUseBiometric] = await Promise.all([getSettings(), isBiometricAvailable()]);
    settings.value = current;
    biometricAvailable.value = canUseBiometric;
    applyTheme(current.theme);
    loaded.value = true;
  } finally {
    loading.value = false;
  }
}

/** Carrega as configurações e aplica o tema. Usada também no boot (main.ts). */
export async function loadSettings(): Promise<void> {
  await loadAll();
}

async function mutate<T>(operation: () => Promise<T>): Promise<T> {
  const result = await operation();
  await loadAll();
  return result;
}

const theme = computed(() => settings.value?.theme ?? "system");
const security = computed(
  () => settings.value?.security ?? { enabled: false, inactivityTimeoutMinutes: 5, biometricEnabled: false },
);

const quotes = computed(() => settings.value?.quotes ?? { autoRefresh: true });
const allocationTargets = computed(() => settings.value?.allocationTargets ?? {});

export function useSettings() {
  if (!loaded.value && !loading.value) {
    void loadAll();
  }

  return {
    settings,
    loaded,
    theme,
    security,
    quotes,
    allocationTargets,
    biometricAvailable,
    saveQuoteSettings: (patch: QuoteSettingsPatch) => mutate(() => saveQuoteSettings(patch)),
    setAllocationTargets: (targets: AppSettings["allocationTargets"] & object) =>
      mutate(() => setAllocationTargets(targets)),
    setTheme: (value: AppSettings["theme"]) => mutate(() => setTheme(value)),
    setupPin: (pin: string) => mutate(() => setupPin(pin)),
    disableLock: () => mutate(() => disableLock()),
    setInactivityTimeout: (minutes: number) => mutate(() => setInactivityTimeout(minutes)),
    enableBiometric: () => mutate(() => enableBiometric()),
    disableBiometric: () => mutate(() => disableBiometric()),
    reload: loadAll,
  };
}
