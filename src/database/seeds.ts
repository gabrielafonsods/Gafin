import type { Category } from "./schema";

type CategorySeed = Omit<Category, "id">;

export const DEFAULT_CATEGORIES: readonly CategorySeed[] = [
  // Entradas
  { key: "salario", name: "Salário", kind: "entrada", acceptsCustomLabel: false },
  { key: "beneficios", name: "Vale/benefícios", kind: "entrada", acceptsCustomLabel: false },
  { key: "freelance", name: "Freelance", kind: "entrada", acceptsCustomLabel: false },
  { key: "venda", name: "Venda", kind: "entrada", acceptsCustomLabel: false },
  { key: "transferencia_recebida", name: "Transferência recebida", kind: "entrada", acceptsCustomLabel: false },
  { key: "outros_entrada", name: "Outros", kind: "entrada", acceptsCustomLabel: true },
  // Saídas
  { key: "alimentacao", name: "Alimentação", kind: "saida", acceptsCustomLabel: false },
  { key: "transporte", name: "Transporte", kind: "saida", acceptsCustomLabel: false },
  { key: "faculdade", name: "Faculdade", kind: "saida", acceptsCustomLabel: false },
  { key: "assinaturas", name: "Assinaturas", kind: "saida", acceptsCustomLabel: false },
  { key: "lazer", name: "Lazer", kind: "saida", acceptsCustomLabel: false },
  { key: "compras", name: "Compras", kind: "saida", acceptsCustomLabel: false },
  { key: "contas", name: "Contas", kind: "saida", acceptsCustomLabel: false },
  { key: "dividas", name: "Dívidas", kind: "saida", acceptsCustomLabel: false },
  { key: "outros_saida", name: "Outros", kind: "saida", acceptsCustomLabel: true },
];

/**
 * Dados iniciais por store. São gravados dentro da própria transação de
 * upgrade, no momento em que a store é criada — atômico e uma única vez,
 * sem risco de duplicar em reaberturas do app.
 */
export const SEEDS: Record<string, readonly object[]> = {
  categories: DEFAULT_CATEGORIES,
};
