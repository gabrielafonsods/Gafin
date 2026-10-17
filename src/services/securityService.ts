import { getSettings, saveSettings } from "@/database/repositories";
import type { SecuritySettings } from "@/database/schema";
import { DomainError } from "./errors";
import { hashPin, verifyPin } from "./security/pinCrypto";
import {
  isBiometricAvailable,
  registerBiometricCredential,
  verifyBiometricCredential,
} from "./security/webauthn";

function requirePin(pin: string): string {
  if (!/^\d{4,8}$/.test(pin)) throw new DomainError("O PIN deve ter de 4 a 8 números.");
  return pin;
}

/** Ativa o bloqueio com um PIN novo (ou troca o PIN de um bloqueio já ativo). */
export async function setupPin(pin: string): Promise<void> {
  const { pinHash, pinSalt, pinIterations } = await hashPin(requirePin(pin));
  const settings = await getSettings();
  await saveSettings({
    ...settings,
    security: { ...settings.security, enabled: true, pinHash, pinSalt, pinIterations },
  });
}

/** Desativa o bloqueio por completo (PIN e biometria). */
export async function disableLock(): Promise<void> {
  const settings = await getSettings();
  await saveSettings({
    ...settings,
    security: {
      enabled: false,
      inactivityTimeoutMinutes: settings.security.inactivityTimeoutMinutes,
      biometricEnabled: false,
    },
  });
}

export async function setInactivityTimeout(minutes: number): Promise<void> {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new DomainError("Tempo de inatividade inválido.");
  }
  const settings = await getSettings();
  await saveSettings({
    ...settings,
    security: { ...settings.security, inactivityTimeoutMinutes: minutes },
  });
}

export async function checkPin(pin: string): Promise<boolean> {
  const { security } = await getSettings();
  if (!security.pinHash || !security.pinSalt || !security.pinIterations) return false;
  return verifyPin(pin, {
    pinHash: security.pinHash,
    pinSalt: security.pinSalt,
    pinIterations: security.pinIterations,
  });
}

export { isBiometricAvailable };

/** Cadastra o Face ID/Touch ID como atalho — o PIN continua funcionando sempre. */
export async function enableBiometric(): Promise<void> {
  const settings = await getSettings();
  if (!settings.security.enabled) {
    throw new DomainError("Configure um PIN antes de ativar o Face ID/Touch ID.");
  }
  const credentialId = await registerBiometricCredential();
  await saveSettings({
    ...settings,
    security: { ...settings.security, biometricEnabled: true, biometricCredentialId: credentialId },
  });
}

export async function disableBiometric(): Promise<void> {
  const settings = await getSettings();
  const security: SecuritySettings = { ...settings.security, biometricEnabled: false };
  delete security.biometricCredentialId;
  await saveSettings({ ...settings, security });
}

/** false também quando o biométrico não está ativo/disponível — o chamador cai para o PIN. */
export async function tryBiometricUnlock(): Promise<boolean> {
  const { security } = await getSettings();
  if (!security.biometricEnabled || !security.biometricCredentialId) return false;
  return verifyBiometricCredential(security.biometricCredentialId);
}
