<script setup lang="ts">
import { reactive, ref } from "vue";
import { useSettings } from "@/composables/useSettings";
import { toUserMessage } from "@/services/errors";

const { security, biometricAvailable, setupPin, disableLock, setInactivityTimeout, enableBiometric, disableBiometric } =
  useSettings();

const TIMEOUT_OPTIONS = [
  { minutes: 0, label: "Só ao abrir o app" },
  { minutes: 1, label: "1 minuto em segundo plano" },
  { minutes: 5, label: "5 minutos em segundo plano" },
  { minutes: 15, label: "15 minutos em segundo plano" },
  { minutes: 30, label: "30 minutos em segundo plano" },
];

const showPinForm = ref(false);
const pinForm = reactive({ pin: "", confirm: "" });
const error = ref("");
const busy = ref(false);

function openPinForm() {
  error.value = "";
  pinForm.pin = "";
  pinForm.confirm = "";
  showPinForm.value = true;
}

async function handleSetupPin() {
  error.value = "";
  if (pinForm.pin !== pinForm.confirm) {
    error.value = "Os dois PINs não são iguais.";
    return;
  }
  busy.value = true;
  try {
    await setupPin(pinForm.pin);
    showPinForm.value = false;
  } catch (e) {
    error.value = toUserMessage(e);
  } finally {
    busy.value = false;
  }
}

async function handleDisableLock() {
  if (!window.confirm("Desativar o bloqueio do app? O PIN e o Face ID/Touch ID cadastrados serão removidos.")) return;
  error.value = "";
  busy.value = true;
  try {
    await disableLock();
  } catch (e) {
    error.value = toUserMessage(e);
  } finally {
    busy.value = false;
  }
}

async function handleTimeoutChange(event: Event) {
  const minutes = Number((event.target as HTMLSelectElement).value);
  error.value = "";
  try {
    await setInactivityTimeout(minutes);
  } catch (e) {
    error.value = toUserMessage(e);
  }
}

async function toggleBiometric() {
  error.value = "";
  busy.value = true;
  try {
    if (security.value.biometricEnabled) await disableBiometric();
    else await enableBiometric();
  } catch (e) {
    error.value = toUserMessage(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="settings-card">
    <h2 class="settings-card__title">Segurança</h2>

    <template v-if="!security.enabled">
      <p class="settings-card__hint">O app está sem bloqueio: qualquer pessoa com o iPhone desbloqueado consegue abrir o Gafin.</p>
      <button v-if="!showPinForm" type="button" class="btn-primary" @click="openPinForm">
        Ativar bloqueio com PIN
      </button>
    </template>

    <template v-else>
      <p class="settings-card__hint">Bloqueio ativo — o Gafin pede o PIN ao abrir.</p>

      <label class="form-label">
        Pedir de novo depois de
        <select class="form-input" :value="security.inactivityTimeoutMinutes" @change="handleTimeoutChange">
          <option v-for="opt in TIMEOUT_OPTIONS" :key="opt.minutes" :value="opt.minutes">{{ opt.label }}</option>
        </select>
      </label>

      <label v-if="biometricAvailable" class="settings-card__toggle">
        <input type="checkbox" :checked="security.biometricEnabled" @change="toggleBiometric" />
        Usar Face ID/Touch ID além do PIN
      </label>
      <p v-if="biometricAvailable" class="settings-card__hint">
        No iPhone, o Face ID dentro do app instalado (fora do Safari) pode não funcionar em todas as versões do
        iOS — se isso acontecer, o PIN continua funcionando normalmente.
      </p>

      <div class="settings-card__actions">
        <button v-if="!showPinForm" type="button" class="btn-secondary" @click="openPinForm">Trocar PIN</button>
        <button type="button" class="btn-secondary" :disabled="busy" @click="handleDisableLock">
          Desativar bloqueio
        </button>
      </div>
    </template>

    <form v-if="showPinForm" class="form-grid" @submit.prevent="handleSetupPin">
      <label class="form-label">
        Novo PIN (4 a 8 números)
        <input v-model="pinForm.pin" class="form-input" type="password" inputmode="numeric" minlength="4" maxlength="8" required />
      </label>
      <label class="form-label">
        Confirmar PIN
        <input v-model="pinForm.confirm" class="form-input" type="password" inputmode="numeric" minlength="4" maxlength="8" required />
      </label>
      <div class="form-actions">
        <button type="submit" class="btn-primary" :disabled="busy">Salvar PIN</button>
        <button type="button" class="btn-secondary" @click="showPinForm = false">Cancelar</button>
      </div>
    </form>

    <p v-if="error" class="form-error">{{ error }}</p>
  </section>
</template>
