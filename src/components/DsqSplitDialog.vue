<template>
  <div v-if="splitDialog" data-runtime="vue3-split">
    <p>{{ t("split.select_recipe") }}</p>
    <button
      v-for="recipe in splitDialog.recipes"
      :key="String(recipe.id)"
      type="button"
      class="split-pf"
      :class="{ 'split-pf-selected': selectedRecipeId === recipe.id }"
      @click="selectedRecipeId = recipe.id"
      v-html="recipe.titleHtml"
    />

    <p>{{ t("split.device_count") }}</p>
    <div>
      <input ref="splitNumberInput" v-model="machineCountInput" type="text" class="split-number" />
    </div>
    <div>
      <button type="button" @click="confirmSplit">{{ t("action.confirm") }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { dsqServices } from "../services/app-services";
import { useUiStore } from "../stores/ui";

interface LegacyCommandBridge {
  has(commandName: string): boolean;
  invoke<T = unknown>(commandName: string, ...args: unknown[]): T | undefined;
}

const { t } = useI18n();
const uiStore = useUiStore();
const splitDialog = computed(() => uiStore.splitDialog);
const selectedRecipeId = ref<number | string | null>(null);
const machineCountInput = ref("1");
const splitNumberInput = ref<HTMLInputElement | null>(null);

function getCommandBridge(): LegacyCommandBridge | null {
  const bridge = window.DSQCommandBridge;
  if (!bridge || typeof bridge.has !== "function" || typeof bridge.invoke !== "function") {
    return null;
  }
  return bridge;
}

function confirmSplit(): void {
  if (!splitDialog.value) {
    return;
  }
  if (selectedRecipeId.value == null) {
    window.alert?.(t("alert.recipe_not_selected"));
    return;
  }
  const number = dsqServices.numeric.readInput(splitNumberInput.value, {
    fieldLabel: t("split.device_count"),
    fallbackValue: splitDialog.value.defaultNumber || 1,
    previousValue: splitDialog.value.defaultNumber || 1,
    requirePositive: true,
    maxFractionDigits: 6,
  });
  const bridge = getCommandBridge();
  if (!bridge || !bridge.has("appendSingleMake")) {
    return;
  }
  bridge.invoke("appendSingleMake", {
    id: selectedRecipeId.value,
    number,
  });
  uiStore.closeSplitDialog();
  window.DSQPanelController?.close?.("split");
}

watch(
  () => splitDialog.value,
  nextSplitDialog => {
    selectedRecipeId.value = null;
    machineCountInput.value = String(nextSplitDialog?.defaultNumber ?? 1);
  },
  { immediate: true }
);

watch(
  () => uiStore.activeDialogId,
  activeDialogId => {
    if (activeDialogId !== "split" && uiStore.splitDialog) {
      uiStore.closeSplitDialog();
    }
  }
);
</script>
