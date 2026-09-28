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
