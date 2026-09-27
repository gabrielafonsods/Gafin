import { ref, computed } from "vue";
import { investmentsRepository } from "@/database/repositories";
import type { Investment } from "@/database/schema";

/*
 * Estado em nível de módulo (não dentro da função) de propósito: assim,
 * Ativos e Carteira compartilham a mesma lista reativa sem precisar de
 * Pinia — qualquer alteração feita em uma tela aparece imediatamente na
 * outra. Se o app crescer e precisar de mais stores assim, aí sim vale
 * migrar para Pinia.
 */
const investments = ref<Investment[]>([]);
const loaded = ref(false);
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    investments.value = await investmentsRepository.getAll();
    loaded.value = true;
  } finally {
    loading.value = false;
  }
}

async function addInvestment(data: Omit<Investment, "id">): Promise<void> {
  await investmentsRepository.create(data as Investment);
  await load();
}

async function updateInvestment(data: Investment): Promise<void> {
  await investmentsRepository.update(data);
  await load();
}

async function removeInvestment(id: number): Promise<void> {
  await investmentsRepository.remove(id);
  await load();
}

const totalInvested = computed(() =>
  investments.value.reduce((sum, item) => sum + item.quantity * item.averagePrice, 0),
);

export function useInvestments() {
  if (!loaded.value && !loading.value) {
    void load();
  }

  return {
    investments,
    loaded,
    totalInvested,
    addInvestment,
    updateInvestment,
    removeInvestment,
    reload: load,
  };
}
