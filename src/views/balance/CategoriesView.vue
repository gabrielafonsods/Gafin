<script setup lang="ts">
import { computed, ref } from "vue";
import SubNav from "@/components/layout/SubNav.vue";
import { useBalance } from "@/composables/useBalance";
import type { Category, CategoryKind } from "@/database/schema";
import { toUserMessage } from "@/services/errors";
import { BALANCE_TABS } from "@/types/navigation";
import { formatCurrency } from "@/utils/currency";

const tabs = BALANCE_TABS;

const { categories, addCategory, renameCategory, setCategoryBudget, setCategoryArchived, removeCategory } =
  useBalance();

const showForm = ref(false);
const newName = ref("");
const newKind = ref<CategoryKind>("saida");
const showArchived = ref(false);
const editing = ref<{ id: number; field: "rename" | "budget" } | null>(null);
const inputValue = ref("");
const error = ref("");

const hasArchived = computed(() => categories.value.some((c) => c.archived));
const visible = (kind: CategoryKind) =>
  categories.value
    .filter((c) => c.kind === kind && (showArchived.value || !c.archived))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
const expense = computed(() => visible("saida"));
const income = computed(() => visible("entrada"));

async function run(action: () => Promise<unknown>) {
  error.value = "";
  try {
    await action();
    return true;
  } catch (e) {
    error.value = toUserMessage(e);
    return false;
  }
}

async function handleCreate() {
  if (await run(() => addCategory({ name: newName.value, kind: newKind.value }))) {
    newName.value = "";
    showForm.value = false;
  }
}

function startEdit(category: Category, field: "rename" | "budget") {
  if (category.id === undefined) return;
  editing.value = { id: category.id, field };
  inputValue.value = field === "rename" ? category.name : category.monthlyBudget ? String(category.monthlyBudget) : "";
  error.value = "";
}

async function saveEdit() {
  const current = editing.value;
  if (!current) return;
  const ok = await run(() =>
    current.field === "rename"
      ? renameCategory(current.id, inputValue.value)
      : setCategoryBudget(current.id, Number(inputValue.value)),
  );
  if (ok) editing.value = null;
}

async function clearBudget(id?: number) {
  if (id === undefined) return;
  if (await run(() => setCategoryBudget(id, null))) editing.value = null;
}

function handleRemove(category: Category) {
  if (category.id === undefined) return;
  const id = category.id;
  if (!window.confirm(`Excluir a categoria "${category.name}"?`)) return;
  void run(() => removeCategory(id));
}

const toggleArchive = (category: Category) =>
  category.id !== undefined && run(() => setCategoryArchived(category.id as number, !category.archived));
</script>

<template>
  <div class="page">
    <h1 class="page-title">Categorias</h1>
    <SubNav :items="tabs" />

    <form v-if="showForm" class="form-grid" @submit.prevent="handleCreate">
      <label class="form-label form-wide">
        Nome da categoria
        <input v-model="newName" class="form-input" type="text" placeholder="Ex.: Pets, Viagem" required />
      </label>
      <label class="form-label form-wide">
        Tipo
        <select v-model="newKind" class="form-input">
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
      </label>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Criar categoria</button>
        <button type="button" class="btn-secondary" @click="showForm = false">Cancelar</button>
      </div>
    </form>
    <button v-else type="button" class="btn-primary" @click="showForm = true">Nova categoria</button>

    <p v-if="error" class="form-error">{{ error }}</p>

    <template v-for="section in [{ title: 'Saídas', items: expense, kind: 'saida' }, { title: 'Entradas', items: income, kind: 'entrada' }]" :key="section.kind">
      <h2 class="section-title">{{ section.title }}</h2>
      <ul class="list">
        <li v-for="category in section.items" :key="category.id" class="list-row">
          <div class="list-row__main">
            <span class="list-row__title">{{ category.name }}</span>
            <span class="list-row__sub">
              {{ category.custom ? "personalizada" : "padrão" }}<template v-if="category.archived"> · arquivada</template
              ><template v-if="category.kind === 'saida'">
                ·
                <template v-if="category.monthlyBudget">orçamento {{ formatCurrency(category.monthlyBudget) }}/mês</template>
                <template v-else>sem orçamento</template>
              </template>
            </span>
          </div>

          <div class="list-row__actions">
            <button v-if="category.kind === 'saida'" type="button" class="link-action" @click="startEdit(category, 'budget')">
              Orçamento
            </button>
            <button v-if="category.custom" type="button" class="link-action" @click="startEdit(category, 'rename')">
              Renomear
            </button>
            <button v-if="!category.acceptsCustomLabel" type="button" class="link-action" @click="toggleArchive(category)">
              {{ category.archived ? "Desarquivar" : "Arquivar" }}
            </button>
            <button v-if="category.custom" type="button" class="link-action link-action--danger" @click="handleRemove(category)">
              Excluir
            </button>
          </div>

          <form v-if="editing && editing.id === category.id" class="inline-edit" @submit.prevent="saveEdit">
            <input
              v-model="inputValue"
              class="form-input"
              :type="editing.field === 'budget' ? 'number' : 'text'"
              :step="editing.field === 'budget' ? 'any' : undefined"
              min="0"
              :inputmode="editing.field === 'budget' ? 'decimal' : 'text'"
              :placeholder="editing.field === 'budget' ? 'Orçamento mensal (R$)' : 'Novo nome'"
              required
            />
            <button type="submit" class="btn-secondary">Salvar</button>
            <button type="button" class="link-action" @click="editing = null">Cancelar</button>
            <button
              v-if="editing.field === 'budget' && category.monthlyBudget"
              type="button"
              class="link-action link-action--danger"
              @click="clearBudget(category.id)"
            >
              Remover orçamento
            </button>
          </form>
        </li>
      </ul>
    </template>

    <label v-if="hasArchived" class="check-row">
      <input v-model="showArchived" type="checkbox" />
      Mostrar categorias arquivadas
    </label>
    <p class="settings-card__hint">
      Categorias arquivadas somem dos formulários, mas continuam aparecendo no histórico. "Outros" fica sempre disponível.
    </p>
  </div>
</template>

<style scoped>
.inline-edit {
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.inline-edit .form-input {
  flex: 1;
  min-width: 140px;
}
</style>
