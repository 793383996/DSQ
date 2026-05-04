<template>
  <div v-if="catalog" id="selector" class="selector" data-runtime="vue3-selector">
    <div id="tabs">
      <button
        type="button"
        class="tab selector-tab-button"
        :class="{ selected: uiStore.selectorActiveTab === 'components' }"
        @click="selectTab('components')"
      >
        <img src="./../../img/component-icon.png" :alt="t('selector.components')" />
      </button>
      <button
        type="button"
        class="tab selector-tab-button"
        :class="{ selected: uiStore.selectorActiveTab === 'buildings' }"
        @click="selectTab('buildings')"
      >
        <img src="./../../img/factory-icon.png" :alt="t('selector.buildings')" />
      </button>
    </div>

    <div
      v-for="section in catalog.sections"
      :key="section.id"
      class="icons"
      :class="{ 'icons-selected': uiStore.selectorActiveTab === section.id }"
    >
      <div v-for="(row, rowIndex) in sectionRows[section.id]" :key="`${section.id}-${rowIndex}`" class="iconrow">
        <button
          v-for="(item, columnIndex) in row"
          :key="item ? `${section.id}-${item.name}` : `${section.id}-${rowIndex}-${columnIndex}`"
          type="button"
          class="icon selector-icon-button"
          :data-name="item?.name ?? ''"
          :title="item?.name ?? ''"
          :aria-label="item?.name ?? ''"
          :disabled="!item"
          @click="item && addRequirement(item.name)"
        >
          <img
            v-if="item"
            :src="`data:image/png;base64,${item.iconValue}`"
            :alt="item.name"
            loading="lazy"
          />
          <div v-else class="s" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useUiStore } from "../stores/ui";
import type { RequirementSelectorCatalog, RequirementSelectorItem, RequirementSelectorTabId } from "../types/dsq";

interface LegacyCommandBridge {
  has(commandName: string): boolean;
  invoke<T = unknown>(commandName: string, ...args: unknown[]): T | undefined;
}

const { t } = useI18n();
const uiStore = useUiStore();
const catalog = ref<RequirementSelectorCatalog | null>(null);

function getCommandBridge(): LegacyCommandBridge | null {
  const bridge = window.DSQCommandBridge;
  if (!bridge || typeof bridge.has !== "function" || typeof bridge.invoke !== "function") {
    return null;
  }
  return bridge;
}

function loadCatalog(): RequirementSelectorCatalog | null {
  if (catalog.value) {
    return catalog.value;
  }
  const bridge = getCommandBridge();
  if (!bridge || !bridge.has("getRequirementSelectorCatalog")) {
    return null;
  }
  const nextCatalog = bridge.invoke<RequirementSelectorCatalog>("getRequirementSelectorCatalog");
  if (!nextCatalog) {
    return null;
  }
  catalog.value = nextCatalog;
  return catalog.value;
}

function buildRows(items: RequirementSelectorItem[]): Array<Array<RequirementSelectorItem | null>> {
  const maxRow = items.reduce((currentMax, item) => Math.max(currentMax, item.row), 0);
  const maxColumn = items.reduce((currentMax, item) => Math.max(currentMax, item.column), 0);
  const rows: Array<Array<RequirementSelectorItem | null>> = [];
  for (let rowIndex = 1; rowIndex <= maxRow; rowIndex += 1) {
    const row = new Array<RequirementSelectorItem | null>(maxColumn).fill(null);
    rows.push(row);
  }
  for (const item of items) {
    if (item.row <= 0 || item.column <= 0 || !rows[item.row - 1]) {
      continue;
    }
    rows[item.row - 1][item.column - 1] = item;
  }
  return rows;
}

const sectionRows = computed<Record<RequirementSelectorTabId, Array<Array<RequirementSelectorItem | null>>>>(() => {
  const sections = catalog.value?.sections ?? [];
  const components = sections.find(section => section.id === "components");
  const buildings = sections.find(section => section.id === "buildings");
  return {
    components: buildRows(components?.items ?? []),
    buildings: buildRows(buildings?.items ?? []),
  };
});

function selectTab(tabId: RequirementSelectorTabId): void {
  uiStore.setSelectorActiveTab(tabId);
}

function addRequirement(name: string): void {
  const bridge = getCommandBridge();
  if (!bridge || !bridge.has("addRequirementByName")) {
    return;
  }
  const result = bridge.invoke("addRequirementByName", name);
  if (!result) {
    return;
  }
  window.DSQPanelController?.close?.("uiSelector");
}

watch(
  () => uiStore.activeDialogId,
  activeDialogId => {
    if (activeDialogId === "uiSelector") {
      loadCatalog();
    }
  }
);
</script>

<style scoped>
.selector-tab-button,
.selector-icon-button {
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  margin: 0;
  padding: 0;
  background: transparent;
  min-width: 0;
  min-height: 0;
  height: auto;
  box-shadow: none;
  font: inherit;
  color: inherit;
  line-height: normal;
  transform: none;
}

.selector-tab-button:hover,
.selector-tab-button:active,
.selector-icon-button:hover,
.selector-icon-button:active {
  box-shadow: none;
  transform: none;
}

.selector-tab-button {
  display: block;
  cursor: pointer;
}

.selector-icon-button {
  display: block;
  width: auto;
  background: rgba(255, 255, 255, 0.5);
  transition: background 0.2s ease;
  text-align: center;
}

.selector-icon-button:disabled {
  cursor: default;
}
</style>
