const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number): string {
  return formatter.format(value);
}

/**
 * Arredonda para 2 casas decimais. Evita erros de ponto flutuante
 * (0.1 + 0.2 = 0.30000000000000004) ao gravar e somar valores em reais.
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Quantidades e preços unitários aceitam até 8 casas (ex.: criptomoedas). */
export function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1e8) / 1e8;
}

export const roundPrice = roundQuantity;

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

const quantityFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 });

export function formatQuantity(value: number): string {
  return quantityFormatter.format(value);
}
