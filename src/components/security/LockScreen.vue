<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAppLock } from "@/composables/useAppLock";
import { useSettings } from "@/composables/useSettings";

const { unlockWithPin, unlockWithBiometrics } = useAppLock();
const { security, biometricAvailable } = useSettings();

const pin = ref("");
const error = ref("");
const checking = ref(false);

async function tryBiometrics() {
  if (!security.value.biometricEnabled) return;
  const ok = await unlockWithBiometrics();
  // Se falhar/indisponível, simplesmente fica na tela de PIN — sem erro
  // assustador, já que cancelar o Face ID é uma ação normal do usuário.
  if (!ok) return;
}

onMounted(tryBiometrics);

async function handleSubmit() {
  error.value = "";
  checking.value = true;
  try {
    const ok = await unlockWithPin(pin.value);
    if (!ok) error.value = "PIN incorreto.";
  } finally {
    pin.value = "";
    checking.value = false;
  }
}
</script>

<template>
  <div class="lock">
    <div class="lock__card">
      <p class="lock__brand">Gafin</p>
      <h1 class="lock__title">App bloqueado</h1>

      <form class="lock__form" @submit.prevent="handleSubmit">
        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          autocomplete="off"
          maxlength="8"
          placeholder="PIN"
          class="form-input lock__input"
          autofocus
        />
        <p v-if="error" class="form-error lock__error">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="checking || pin.length < 4">Desbloquear</button>
      </form>

      <button
        v-if="security.biometricEnabled && biometricAvailable"
        type="button"
        class="link-action lock__biometric"
        @click="tryBiometrics"
      >
        Usar Face ID/Touch ID
      </button>
    </div>
  </div>
</template>

<style scoped>
.lock {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  padding-top: calc(var(--space-5) + var(--safe-top));
  padding-bottom: calc(var(--space-5) + var(--safe-bottom));
  background: var(--color-bg);
}

.lock__card {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}

.lock__brand {
  color: var(--color-brand-strong);
  font-size: 13px;
  font-weight: 600;
}

.lock__title {
  font-size: 18px;
  font-weight: 600;
}

.lock__form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.lock__input {
  text-align: center;
  letter-spacing: 4px;
  font-size: 18px;
}

.lock__error {
  text-align: center;
}

.lock__biometric {
  font-size: 13px;
}
</style>
