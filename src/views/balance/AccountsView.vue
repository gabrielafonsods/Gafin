<script setup lang="ts">
import { computed, ref } from "vue";
import AccountForm from "@/components/balance/AccountForm.vue";
import StatementRow from "@/components/balance/StatementRow.vue";
import TransferForm from "@/components/balance/TransferForm.vue";
import SubNav from "@/components/layout/SubNav.vue";
import { BALANCE_TABS } from "@/types/navigation";
import { useBalance } from "@/composables/useBalance";
import type { StatementEntry } from "@/services/balanceViews";
import { toUserMessage } from "@/services/errors";
import { ACCOUNT_TYPE_LABELS } from "@/types/balance";
import { formatCurrency } from "@/utils/currency";

const tabs = BALANCE_TABS;

const {
  accounts,
  accountBalances,
  transfers,
  statementFor,
  removeAccount,
  archiveAccount,
  unarchiveAccount,
  removeTransfer,
} = useBalance();

type Mode = "list" | "createAccount" | "editAccount" | "createTransfer" | "editTransfer";
const mode = ref<Mode>("list");
const selectedId = ref<number | null>(null);
const showArchived = ref(false);
const error = ref("");

const rows = computed(() =>
  accountBalances.value.filter((row) => showArchived.value || !row.account.archived),
);
const hasArchived = computed(() => accounts.value.some((account) => account.archived));
const editingRow = computed(() => accountBalances.value.find((row) => row.account.id === selectedId.value));
const editingTransfer = computed(() => transfers.value.find((t) => t.id === selectedId.value) ?? null);
const transferEntries = computed(() =>
  statementFor()
    .filter((entry) => entry.kind === "transferencia")
    .slice(0, 20),
);
const canTransfer = computed(() => accounts.value.filter((a) => !a.archived).length >= 2);

function toList() {
  mode.value = "list";
  selectedId.value = null;
}

function startEditAccount(id?: number) {
  if (id === undefined) return;
  selectedId.value = id;
  mode.value = "editAccount";
}

async function run(action: () => Promise<unknown>) {
  error.value = "";
  try {
    await action();
  } catch (e) {
    error.value = toUserMessage(e);
  }
}

function handleRemoveAccount(id?: number, name?: string) {
  if (id === undefined) return;
  if (!window.confirm(`Excluir a conta "${name}"? Esta ação não pode ser desfeita.`)) return;
  void run(() => removeAccount(id));
}

const toggleArchive = (id: number | undefined, archived: boolean | undefined) =>
  id !== undefined && run(() => (archived ? unarchiveAccount(id) : archiveAccount(id)));

function startEditTransfer(entry: StatementEntry) {
  if (entry.transferId === undefined) return;
  selectedId.value = entry.transferId;
  mode.value = "editTransfer";
}

function handleRemoveTransfer(entry: StatementEntry) {
  if (entry.transferId === undefined) return;
  const id = entry.transferId;
  if (!window.confirm("Excluir esta transferência? Os saldos das duas contas voltam ao que eram antes.")) return;
  void run(() => removeTransfer(id));
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">Contas</h1>
    <SubNav :items="tabs" />

    <AccountForm v-if="mode === 'createAccount'" @saved="toList" @cancel="toList" />
    <AccountForm
      v-else-if="mode === 'editAccount' && editingRow"
      :account="editingRow.account"
      :current-balance="editingRow.balance"
      @saved="toList"
      @cancel="toList"
    />
    <TransferForm v-else-if="mode === 'createTransfer'" @saved="toList" @cancel="toList" />
    <TransferForm
      v-else-if="mode === 'editTransfer' && editingTransfer"
      :transfer="editingTransfer"
      @saved="toList"
      @cancel="toList"
    />

    <template v-else>
      <div class="section-head">
        <button type="button" class="btn-primary" @click="mode = 'createAccount'">Nova conta</button>
        <button type="button" class="btn-secondary" :disabled="!canTransfer" @click="mode = 'createTransfer'">
          Transferir
        </button>
      </div>

      <p v-if="error" class="form-error">{{ error }}</p>

      <p v-if="rows.length === 0" class="empty-note">Nenhuma conta ainda. Crie a primeira para começar a lançar entradas e saídas.</p>

      <ul v-else class="list">
        <li v-for="row in rows" :key="row.account.id" class="list-row">
          <div class="list-row__main">
            <span class="list-row__title">{{ row.account.name }}</span>
            <span class="list-row__sub">
              {{ ACCOUNT_TYPE_LABELS[row.account.type] }}<template v-if="row.account.archived"> · arquivada</template>
            </span>
          </div>
          <span class="list-row__amount" :class="row.balance < 0 ? 'text-expense' : ''">
            {{ formatCurrency(row.balance) }}
          </span>
          <div class="list-row__actions">
            <button type="button" class="link-action" @click="startEditAccount(row.account.id)">Editar</button>
            <button type="button" class="link-action" @click="toggleArchive(row.account.id, row.account.archived)">
              {{ row.account.archived ? "Desarquivar" : "Arquivar" }}
            </button>
            <button
              type="button"
              class="link-action link-action--danger"
              @click="handleRemoveAccount(row.account.id, row.account.name)"
            >
              Excluir
            </button>
          </div>
        </li>
      </ul>

      <label v-if="hasArchived" class="check-row">
        <input v-model="showArchived" type="checkbox" />
        Mostrar contas arquivadas
      </label>

      <h2 class="section-title">Transferências entre contas</h2>
      <p v-if="transferEntries.length === 0" class="empty-note">Nenhuma transferência registrada.</p>
      <ul v-else class="list">
        <StatementRow
          v-for="entry in transferEntries"
          :key="entry.key"
          :entry="entry"
          actions
          @edit="startEditTransfer"
          @remove="handleRemoveTransfer"
        />
      </ul>
    </template>
  </div>
</template>
