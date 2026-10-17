/**
 * Face ID/Touch ID via WebAuthn, usado apenas como trava LOCAL do app (não
 * há servidor: o "challenge" não precisa ser verificado remotamente, só
 * serve para o navegador aceitar prosseguir com o autenticador da
 * plataforma). A credencial fica associada a este PWA neste iPhone.
 *
 * AVISO IMPORTANTE: no iOS, o suporte a WebAuthn dentro de um PWA instalado
 * (modo standalone, "Adicionar à Tela de Início") é inconsistente entre
 * versões do iOS — em alguns aparelhos o prompt do Face ID simplesmente não
 * aparece dentro do app instalado, mesmo funcionando no Safari normal. Por
 * isso o Gafin trata isso como reforço OPCIONAL: o PIN é sempre o método
 * confiável, e qualquer falha ou indisponibilidade do WebAuthn cai
 * silenciosamente de volta para a tela de PIN — nunca trava o acesso.
 */

const RP_NAME = "Gafin";
const RP_ID = typeof location !== "undefined" ? location.hostname : "localhost";
const USER_ID = new TextEncoder().encode("gafin-local-user");

function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Cria a credencial local (dispara o prompt de Face ID/Touch ID). */
export async function registerBiometricCredential(): Promise<string> {
  const credential = await navigator.credentials.create({
    publicKey: {
      rp: { name: RP_NAME, id: RP_ID },
      user: { id: USER_ID, name: "Gafin", displayName: "Gafin" },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60_000,
    },
  });
  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Não foi possível criar a credencial biométrica.");
  }
  return toBase64Url(credential.rawId);
}

/** Pede o Face ID/Touch ID para a credencial já cadastrada. */
export async function verifyBiometricCredential(credentialId: string): Promise<boolean> {
  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: "public-key", id: fromBase64Url(credentialId) as BufferSource }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return credential instanceof PublicKeyCredential;
  } catch {
    // Cancelado, indisponível ou não suportado: a chamada trata como "não
    // autenticou por biometria" e deixa o PIN assumir.
    return false;
  }
}
