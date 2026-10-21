import {
  categoriesRepository,
  transactionsRepository,
} from "@/database/repositories";
import type { Category, CategoryKind } from "@/database/schema";
import { DomainError } from "./errors";
import { countRecurrencesUsing } from "./recurrencesService";
import { requirePositiveMoney, requireText } from "./validation";

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");
}

async function assertNameAvailable(name: string, kind: CategoryKind, ignoreId?: number): Promise<void> {
  const all = await categoriesRepository.getAll();
  if (all.some((c) => c.kind === kind && c.id !== ignoreId && sameName(c.name, name))) {
    throw new DomainError(`Já existe uma categoria "${name}" em ${kind === "entrada" ? "entradas" : "saídas"}.`);
  }
}

async function load(id: number): Promise<Category> {
  const category = await categoriesRepository.getById(id);
  if (!category) throw new DomainError("Categoria não encontrada.");
  return category;
}

export async function createCategory(input: { name: string; kind: CategoryKind }): Promise<number> {
  const name = requireText(input.name, "Nome da categoria");
  await assertNameAvailable(name, input.kind);

  const category: Category = {
    // A chave é estável e única (índice by_key); o nome pode ser renomeado depois.
    key: `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name,
    kind: input.kind,
    acceptsCustomLabel: false,
    custom: true,
  };
  return categoriesRepository.create(category);
}

/** Só categorias criadas pelo usuário: os nomes padrão aparecem em backups e exportações. */
export async function renameCategory(id: number, name: string): Promise<void> {
  const category = await load(id);
  if (!category.custom) throw new DomainError("As categorias padrão não podem ser renomeadas.");
  const trimmed = requireText(name, "Nome da categoria");
  await assertNameAvailable(trimmed, category.kind, id);
  await categoriesRepository.update({ ...category, name: trimmed });
}

/** Orçamento mensal de uma categoria de saída; `null` remove. */
export async function setCategoryBudget(id: number, amount: number | null): Promise<void> {
  const category = await load(id);
  if (category.kind !== "saida") throw new DomainError("Orçamento só vale para categorias de saída.");

  const { monthlyBudget: _previous, ...rest } = category;
  await categoriesRepository.update(
    amount === null ? rest : { ...rest, monthlyBudget: requirePositiveMoney(amount, "Orçamento") },
  );
}

/** "Outros" fica sempre disponível: é o destino de tudo que não tem categoria própria. */
export async function setCategoryArchived(id: number, archived: boolean): Promise<void> {
  const category = await load(id);
  if (archived && category.acceptsCustomLabel) {
    throw new DomainError('A categoria "Outros" não pode ser arquivada.');
  }
  const { archived: _previous, ...rest } = category;
  await categoriesRepository.update(archived ? { ...rest, archived: true } : rest);
}

/** Só categorias próprias e sem uso; as demais podem ser arquivadas. */
export async function deleteCategory(id: number): Promise<void> {
  const category = await load(id);
  if (!category.custom) throw new DomainError("As categorias padrão não podem ser excluídas. Arquive-a se não usa.");

  const transactions = await transactionsRepository.getAll();
  const rules = await countRecurrencesUsing({ categoryId: id });
  if (transactions.some((t) => t.categoryId === id) || rules > 0) {
    throw new DomainError("Esta categoria já tem lançamentos ou recorrências. Arquive-a em vez de excluir.");
  }
  await categoriesRepository.remove(id);
}
