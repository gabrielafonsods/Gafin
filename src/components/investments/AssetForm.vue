<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useInvestments } from "@/composables/useInvestments";
import { toUserMessage } from "@/services/errors";
import { ASSET_TYPES, ASSET_TYPE_LABELS, QUOTABLE_TYPES } from "@/types/investments";
import type { Asset, AssetType } from "@/database/schema";

const props = defineProps<{ asset?: Asset | null; defaultType?: AssetType }>();
const emit = defineEmits<{ saved: [assetId: number]; cancel: [] }>();

const { addAsset, editAsset } = useInvestments();

const form = reactive({
  name: props.asset?.name ?? "",
  ticker: props.asset?.ticker ?? "",
  type: (props.asset?.type ?? props.defaultType ?? "acoes") as AssetType,
  institution: props.asset?.institution ?? "",
  currentPrice: props.asset?.currentPrice !== undefined ? String(props.asset.currentPrice) : "",
  autoQuote: props.asset?.autoQuote !== false,
});
const quotable = computed(() => QUOTABLE_TYPES.includes(form.type));
const error = ref("");

async function handleSubmit() {
  error.value = "";
  const currentPrice = form.currentPrice.trim() === "" ? undefined : Number(form.currentPrice);
  const input = {
    name: form.name,
    ticker: form.ticker,
    type: form.type,
    institution: form.institution,
    currentPrice,
    // Só tipos da B3 usam cotação automática; nos demais o preço é sempre manual.
    autoQuote: quotable.value ? form.autoQuote : true,
  };

  try {
    if (props.asset?.id !== undefined) {
      await editAsset(props.asset.id, input);
      emit("saved", props.asset.id);
    } else {
      emit("saved", await addAsset(input));
    }
  } catch (e) {
    error.value = toUserMessage(e);
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="handleSubmit">
    <label class="form-label form-wide">
      Nome
      <input v-model="form.name" class="form-input" type="text" placeholder="Ex.: Petrobras, Tesouro Selic 2029" required />
    </label>
    <label class="form-label">
      Ticker
      <input v-model="form.ticker" class="form-input" type="text" placeholder="PETR4" autocapitalize="characters" />
    </label>
    <label class="form-label">
      Tipo
      <select v-model="form.type" class="form-input">
        <option v-for="type in ASSET_TYPES" :key="type" :value="type">{{ ASSET_TYPE_LABELS[type] }}</option>
      </select>
    </label>
    <label class="form-label">
      Instituição/corretora
      <input v-model="form.institution" class="form-input" type="text" placeholder="Ex.: XP, Nubank" />
    </label>
    <label class="form-label">
      Preço atual por unidade (opcional)
      <input v-model="form.currentPrice" class="form-input" type="number" step="any" min="0" inputmode="decimal" />
    </label>

    <label v-if="quotable" class="check-row form-wide">
      <input v-model="form.autoQuote" type="checkbox" />
      Atualizar o preço automaticamente pelo ticker
    </label>
    <p v-if="quotable && form.autoQuote && !form.ticker.trim()" class="settings-card__hint form-wide">
      Informe o ticker (ex.: PETR4) para a cotação automática funcionar.
    </p>
    <p v-else-if="!quotable" class="settings-card__hint form-wide">
      Neste tipo o valor atual é informado por você (cotação por unidade ou valor total no detalhe do ativo).
    </p>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button type="submit" class="btn-primary">{{ asset ? "Salvar alterações" : "Cadastrar ativo" }}</button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
