/**
 * Hash do PIN via PBKDF2-SHA256 (Web Crypto, nativo do navegador — sem
 * dependência extra). O PIN em si NUNCA é gravado; só salt + hash em
 * base64 + o número de iterações usado (grava o número para permitir
 * aumentar a força no futuro sem invalidar PINs já cadastrados).
 */

const ITERATIONS = 210_000; // recomendação atual da OWASP para PBKDF2-SHA256
const HASH_BITS = 256;

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    HASH_BITS,
  );
  return toBase64(bits);
}

export interface PinHash {
  pinHash: string;
  pinSalt: string;
  pinIterations: number;
}

export async function hashPin(pin: string): Promise<PinHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const pinHash = await derive(pin, salt, ITERATIONS);
  return { pinHash, pinSalt: toBase64(salt.buffer), pinIterations: ITERATIONS };
}

export async function verifyPin(pin: string, stored: PinHash): Promise<boolean> {
  const candidate = await derive(pin, fromBase64(stored.pinSalt), stored.pinIterations);
  // Comparação em tempo constante: evita vazar, por timing, quantos bytes já batem.
  if (candidate.length !== stored.pinHash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ stored.pinHash.charCodeAt(i);
  }
  return diff === 0;
}
