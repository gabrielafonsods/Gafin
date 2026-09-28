import { roundMoney, roundPrice, roundQuantity } from "@/utils/currency";
import { isValidISODate } from "@/utils/date";
import { DomainError } from "./errors";

export function requireText(value: string, label: string): string {
  const text = value.trim();
  if (!text) throw new DomainError(`${label} é obrigatório.`);
  return text;
}

/** Valor > 0, arredondado para centavos. */
export function requirePositiveMoney(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainError(`${label} deve ser maior que zero.`);
  }
  return roundMoney(value);
}

/** Qualquer valor numérico (inclusive negativo, ex.: conta no vermelho). */
export function requireMoney(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new DomainError(`${label} é inválido.`);
  return roundMoney(value);
}

export function requireDayOfMonth(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 31) {
    throw new DomainError(`${label} deve ser um dia entre 1 e 31.`);
  }
  return value;
}

export function requireISODate(value: string, label = "Data"): string {
  if (!isValidISODate(value)) throw new DomainError(`${label} inválida.`);
  return value;
}

export function requireQuantity(value: number, label = "Quantidade"): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainError(`${label} deve ser maior que zero.`);
  }
  return roundQuantity(value);
}

/** Preço unitário >= 0 (0 permitido, ex.: bonificação). */
export function requirePrice(value: number, label = "Preço"): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new DomainError(`${label} não pode ser negativo.`);
  }
  return roundPrice(value);
}

export function requireFees(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new DomainError("Taxas não podem ser negativas.");
  return roundMoney(value);
}
