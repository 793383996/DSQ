<template>
  <div class="list" v-if="requirements.length">
    <span v-for="(requirement, index) in requirements" :key="`${requirement.item?.itemId || requirement.item?.name || 'requirement'}-${index}`">
      <img
        v-if="iconValue(requirement.item?.name)"
        :src="iconSrc(requirement.item?.name)"
        :alt="requirement.item?.name || ''"
        class="icon-40"
        :title="requirement.item?.name || ''"
        @contextmenu.prevent="removeRequirement(index)"
      />
      <span v-else class="name">{{ requirement.item?.name }}</span>
      *
      <span class="item_number" @click="openRequirementEditor(index)">
        <span>{{ formatRequirementNumber(requirement.number) }}</span>
        <div v-if="requirementEditorIndex === index" class="number_editor_container">
          <input
            :ref="setRequirementEditorInput"
            v-model.number="requirementEditorValue"
            class="number_editor"
            type="number"
            @blur="submitRequirementEditor"
            @focus="selectInputText"
            @change="submitRequirementEditor"
            @keydown.enter.prevent="submitRequirementEditor"
            @keydown.esc.prevent="cancelRequirementEditor"
          />
        </div>
      </span>
    </span>
    <span class="result-actions-row">
      <button
        id="btnResetRequirement"
        data-click-action="resetRequirement"
        data-i18n="action.reset_requirement"
        class="btn-gradient-red"
        @click="resetRequirements"
      >
        {{ t("action.reset_requirement") }}
      </button>
      <button
        id="btnSaveProject"
        data-click-action="saveProject"
        data-i18n="action.save_project"
        class="btn-gradient-green"
        @click="saveProject"
      >
        {{ t("action.save_project") }}
      </button>
      <button
        id="btnGenerateBlueprint"
        data-click-action="generateBlueprint"
        data-i18n="action.generate_blueprint"
        class="btn-gradient-purple"
        @click="generateBlueprint"
      >
        {{ t("action.generate_blueprint") }}
      </button>
      <br />
      <small data-i18n="hint.requirement_edit">{{ t("hint.requirement_edit") }}</small>
    </span>
  </div>

  <div class="list" v-if="excludedNames.length">
    <span data-i18n="exclude.title">{{ t("exclude.title") }}</span>
    <span v-for="name in excludedNames" :key="name">
      <img
        v-if="iconValue(name)"
        :src="iconSrc(name)"
        :alt="name"
        class="icon-40"
        :title="name"
        @contextmenu.prevent="removeExcludedName(name)"
      />
      <span v-else class="name">{{ name }}</span>
    </span>
    <button id="btnResetExclude" data-click-action="resetExclude" data-i18n="action.reset" @click="resetExcludedNames">
      {{ t("action.reset") }}
    </button>
    <br />
    <small data-i18n="hint.exclude_edit">{{ t("hint.exclude_edit") }}</small>
  </div>

  <div class="list">
    <table border="0" cellspacing="0" cellpadding="0">
      <tbody>
        <tr class="header">
          <td class="table-col-100">
            <span data-i18n="table.header.operation">{{ t("table.header.operation") }}</span>
          </td>
          <td class="table-col-100">
            <span data-i18n="table.header.item">{{ t("table.header.item") }}</span>
            <br />
            <span class="table-header-note" data-i18n="table.header.item_hint">{{ t("table.header.item_hint") }}</span>
          </td>
          <td class="table-col-100">
            <span data-i18n="table.header.per_min_need">{{ t("table.header.per_min_need") }}</span>
            <br />
            <span class="table-header-note" data-i18n="table.header.negative_hint">{{ t("table.header.negative_hint") }}</span>
          </td>
          <td class="table-col-100">
            <span data-i18n="table.header.device_count">{{ t("table.header.device_count") }}</span>
            <br />
            <span class="table-header-note" data-i18n="table.header.device_hint">{{ t("table.header.device_hint") }}</span>
          </td>
          <td>
            <span data-i18n="table.header.recipe">{{ t("table.header.recipe") }}</span>
            <br />
            <span class="table-header-note" data-i18n="table.header.optional">{{ t("table.header.optional") }}</span>
          </td>
          <td>
            <span data-i18n="table.header.acc_type">{{ t("table.header.acc_type") }}</span>
            <br />
            <span class="table-header-note" data-i18n="table.header.optional">{{ t("table.header.optional") }}</span>
          </td>
          <td>
            <span data-i18n="table.header.acc_value">{{ t("table.header.acc_value") }}</span>
            <br />
            <span class="table-header-note" data-i18n="table.header.optional">{{ t("table.header.optional") }}</span>
          </td>
          <td>
            <span data-i18n="table.header.machine">{{ t("table.header.machine") }}</span>
            <br />
            <span class="table-header-note" data-i18n="table.header.optional">{{ t("table.header.optional") }}</span>
          </td>
        </tr>

        <tr v-for="(item, index) in independentLines" :key="`independent-${item.name || 'item'}-${index}`" :class="String(item.rowClass || '')">
          <td />
          <td class="cell-name" :data-name="String(item.name || '')">
            <span class="name">
              <img
                v-if="iconValue(item.name)"
                :src="iconSrc(item.name)"
                :alt="String(item.name || '')"
                class="icon-40"
                :title="String(item.name || '')"
              />
              <span v-else class="name">{{ item.name }}</span>
            </span>
          </td>
          <td><span class="number1">{{ item.number1 }}</span></td>
          <td><span class="number2">{{ item.number2 }}</span></td>
          <td>
            <a class="pf selected" v-html="String(item.pfTitle || '')" />
          </td>
          <td>
            <a class="m selected">{{ item.mName }}</a>
          </td>
        </tr>

        <tr
          v-for="(item, index) in productionLines"
          :key="`production-${item.id ?? item.name ?? 'item'}-${index}`"
          :class="productionRowClass(item, index)"
        >
          <td class="opcell">
            <a
              href="#"
              data-action="ig"
              :data-name="String(item.name || '')"
              data-i18n="action.exclude"
              @click="excludeLine($event, String(item.name || ''))"
            >
              {{ t("action.exclude") }}
            </a>
            <a
              v-if="Array.isArray(item.pf) && item.pf.length > 1"
              href="#"
              data-action="split"
              :data-name="String(item.name || '')"
              aria-haspopup="dialog"
              aria-controls="Split"
              @click="openSplitDialog($event, String(item.name || ''))"
            >
              <span data-i18n="action.multi_recipe">{{ t("action.multi_recipe") }}</span>
            </a>
            <a
              href="#"
              data-action="tag"
              :data-name="String(item.name || '')"
              data-i18n="action.tag"
              @click="toggleTaggedRow($event, item, index)"
            >
              {{ t("action.tag") }}
            </a>
          </td>
          <td class="cell-name" :data-name="String(item.name || '')">
            <img
              v-if="iconValue(item.name)"
              :src="iconSrc(item.name)"
              :alt="String(item.name || '')"
              class="icon-40"
              :title="String(item.name || '')"
            />
            <span v-else class="name">{{ item.name }}</span>
          </td>
          <td><span class="number1">{{ item.number1 }}</span></td>
          <td class="cell-infra">
            <span class="number2 number2-hidden" v-html="String(item.number2full || '')" />
            <span class="number2" v-html="String(item.number2img || '')" />
            <span class="item_number" @click="openProductionEditor(index)">
              <span class="number2">{{ item.number2 }}</span>
              <div v-if="productionEditorIndex === index" class="number_editor_container">
                <input
                  :ref="setProductionEditorInput"
                  v-model.number="productionEditorValue"
                  class="number_editor"
                  type="number"
                  @blur="submitProductionEditor"
                  @focus="selectInputText"
                  @change="submitProductionEditor"
                  @keydown.enter.prevent="submitProductionEditor"
                  @keydown.esc.prevent="cancelProductionEditor"
                />
              </div>
            </span>
            <span v-if="item.numberOther" v-html="String(item.numberOther)" />
          </td>
          <td>
            <div class="pfs">
              <a
                v-for="pf in item.pf"
                :key="`pf-${item.id ?? item.name}-${String(pf.recipeId ?? pf.title ?? '')}`"
                :class="String(pf.class || '')"
                href="#"
                @click.prevent="selectRecipe(String(item.name || ''), pf.recipeId, String(pf.class || '') === 'pf selected')"
                v-html="String(pf.title || '')"
              />
            </div>
          </td>
          <td>
            <div class="ms">
              <a
                v-for="accTypeOption in item.accType"
                :key="`acc-type-${item.id ?? item.name}-${String(accTypeOption.id ?? accTypeOption.name ?? '')}`"
                :data-modein="String(accTypeOption.id || '')"
                :data-name="String(accTypeOption.itemName || '')"
                :title="String(accTypeOption.title || '')"
                :class="String(accTypeOption.class || '')"
                href="#"
                @click.prevent="
                  selectAccType(
                    item.id,
                    String(accTypeOption.id || ''),
                    String(accTypeOption.class || '') === 'm selected'
                  )
                "
              >
                <img
                  v-if="iconValue(accTypeOption.iconName || accTypeOption.name)"
                  :src="iconSrc(accTypeOption.iconName || accTypeOption.name)"
                  :alt="String(accTypeOption.name || '')"
                />
                {{ accTypeOption.showName }}
              </a>
            </div>
          </td>
          <td>
            <div class="ms">
              <a
                v-for="accValueOption in item.accValue"
                :key="`acc-value-${item.id ?? item.name}-${String(accValueOption.id ?? accValueOption.name ?? '')}`"
                :data-modein="String(accValueOption.id || '')"
                :data-name="String(accValueOption.itemName || '')"
                :title="String(accValueOption.title || '')"
                :class="String(accValueOption.class || '')"
                href="#"
                @click.prevent="
                  selectAccValue(
                    item.id,
                    String(accValueOption.id || ''),
                    String(accValueOption.class || '') === 'm selected'
                  )
                "
              >
                {{ accValueOption.showName }}
              </a>
            </div>
            <span v-if="numericValue(item.accTotal) > 0" class="number1">
              {{ String(item.accTotalLabel || t("table.acc_need_prefix")) }}{{ numericValue(item.accTotal).toFixed(2) }}
            </span>
          </td>
          <td>
            <div class="ms">
              <a
                v-for="machineOption in item.m"
                :key="`machine-${item.id ?? item.name}-${String(machineOption.id ?? machineOption.name ?? '')}`"
                :data-modein="String(machineOption.id || '')"
                :data-name="String(machineOption.itemName || '')"
                :title="String(machineOption.title || '')"
                :class="String(machineOption.class || '')"
                href="#"
                @click.prevent="
                  selectMachine(
                    item.id,
                    String(machineOption.id || ''),
                    String(machineOption.class || '') === 'm selected'
                  )
                "
              >
                <img
                  v-if="iconValue(machineOption.iconName || machineOption.name)"
                  :src="iconSrc(machineOption.iconName || machineOption.name)"
                  :alt="String(machineOption.name || '')"
                />
                {{ machineOption.showName }}
              </a>
            </div>
          </td>
        </tr>

        <tr class="total">
          <td colspan="3" align="right" class="table-total-label" data-i18n="table.total">{{ t("table.total") }}</td>
          <td colspan="5">
            <div v-if="totalDisplay.length" class="total-display-row">
              <span v-for="item in totalDisplay" :key="`${item.name}-${item.value}`" class="total-display-chip">
                {{ item.name }}*{{ item.value }}
              </span>
            </div>
            <div class="total-stats-row">
              <span :title="t('table.total_acc_title')" data-i18n-title="table.total_acc_title" class="total-acc-color">
                {{ t("table.total_acc_prefix") }}{{ totalAccDisplay }}
              </span>
              <a
                href="#"
                id="btnExcludeAccLine"
                data-click-action="excludeAccLine"
                data-i18n="action.exclude_acc_line"
                class="btn-exclude-acc-line"
                @click="excludeAccLines"
              >
                {{ t("action.exclude_acc_line") }}
              </a>
              <span class="total-space-color">{{ t("table.total_space_prefix") }}{{ totalSpaceDisplay }}</span>
              <span class="total-energy-color">{{ t("table.total_energy_prefix") }}{{ totalEnergyDisplay }}M</span>
            </div>
          </td>
        </tr>

        <tr v-if="excessOutputs.length">
          <td colspan="8" align="left">
            <span data-i18n="table.excess_products">{{ t("table.excess_products") }}</span>
            <br />
            <span data-i18n="table.excess_products_hint">{{ t("table.excess_products_hint") }}</span>
          </td>
        </tr>

        <tr v-for="(item, index) in excessOutputs" :key="`excess-${item.name || 'item'}-${index}`" :class="String(item.rowClass || '')">
          <td />
          <td>
            <span class="name">
              <img
                v-if="iconValue(item.name)"
                :src="iconSrc(item.name)"
                :alt="String(item.name || '')"
                class="icon-40"
                :title="String(item.name || '')"
              />
              <span v-else class="name">{{ item.name }}</span>
            </span>
          </td>
          <td><span class="number1">{{ item.number1 }}</span></td>
          <td><span class="number2">{{ item.number2 }}</span></td>
          <td />
          <td />
          <td />
          <td />
        </tr>

        <tr>
          <td colspan="1" align="right" class="section-title-cell" data-i18n="section.update_notes">
            {{ t("section.update_notes") }}
          </td>
          <td colspan="7">
            <div data-include="updata" v-html="quoteIncludes.updata" />
          </td>
        </tr>
        <tr>
          <td colspan="1" align="right" class="section-title-cell" data-i18n="section.usage_notes">
            {{ t("section.usage_notes") }}
          </td>
          <td colspan="7">
            <div data-include="explanation" v-html="quoteIncludes.explanation" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { domainDictionary } from "../domain/domain-dictionary";
import { dsqServices, normalizeProjectName } from "../services/app-services";
import { useCalculationStore } from "../stores/calculation";
import { useProjectsStore } from "../stores/projects";
import { useSettingsStore } from "../stores/settings";
import { useUiStore } from "../stores/ui";

interface LegacyCommandBridge {
  has(commandName: string): boolean;
  invoke<T = unknown>(commandName: string, ...args: unknown[]): T | undefined;
}

interface ResultRecipeOption {
  class?: string;
  recipeId?: number | string;
  title?: string;
}

interface ResultActionOption {
  class?: string;
  id?: number | string;
  itemName?: string;
  name?: string;
  iconName?: string;
  title?: string;
  showName?: string;
}

interface ResultLine {
  id?: number | string;
  name?: string;
  itemId?: string;
  number1?: string | number;
  number2?: string | number;
  number2full?: string;
  number2img?: string;
  numberOther?: string;
  rowClass?: string;
  pfTitle?: string;
  mName?: string;
  accTotal?: number | string;
  accTotalLabel?: string;
  pf?: ResultRecipeOption[];
  accType?: ResultActionOption[];
  accValue?: ResultActionOption[];
  m?: ResultActionOption[];
  [key: string]: unknown;
}

const { t } = useI18n();
const calculationStore = useCalculationStore();
const projectsStore = useProjectsStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const requirementEditorIndex = ref(-1);
const requirementEditorValue = ref(0);
const productionEditorIndex = ref(-1);
const productionEditorValue = ref(0);
const taggedRowKeys = ref<string[]>([]);
const requirementEditorInput = ref<HTMLInputElement | null>(null);
const productionEditorInput = ref<HTMLInputElement | null>(null);

const currentResult = computed(() => calculationStore.currentResult ?? calculationStore.effectiveResult);
const requirements = computed(() => calculationStore.requirements);
const excludedNames = computed(() => calculationStore.excludedNames);
const independentLines = computed(() => (currentResult.value.independentLines as ResultLine[]) ?? []);
const productionLines = computed(() => (currentResult.value.productionLines as ResultLine[]) ?? []);
const excessOutputs = computed(() => (currentResult.value.excessOutputs as ResultLine[]) ?? []);
const pointLength = computed(() => settingsStore.runtimeOptions.pointLength);
const icons = computed<Record<string, string>>(() => window.icons ?? {});
const quoteIncludes = computed(() => uiStore.quoteIncludes);
const totalDisplay = computed(() =>
  currentResult.value.totals.machines.map(item => ({
    name: translateMachineDisplayName((item as { name?: unknown }).name),
    value: (item as { value?: string | number }).value ?? 0,
  }))
);
const totalAccDisplay = computed(() => numericValue(currentResult.value.totals.totalAcc).toFixed(2));
const totalSpaceDisplay = computed(() => String(currentResult.value.totals.totalSpace ?? 0));
const totalEnergyDisplay = computed(() => numericValue(currentResult.value.totals.totalEnergy).toFixed(pointLength.value));

function getCommandBridge(): LegacyCommandBridge | null {
  const bridge = window.DSQCommandBridge;
  if (!bridge || typeof bridge.has !== "function" || typeof bridge.invoke !== "function") {
    return null;
  }
  return bridge;
}

function invokeBridge(commandName: string, ...args: unknown[]): void {
  const bridge = getCommandBridge();
  if (!bridge || !bridge.has(commandName)) {
    return;
  }
  bridge.invoke(commandName, ...args);
}

function productionRowKey(item: ResultLine, index: number): string {
  return String(item.id ?? item.itemId ?? item.name ?? index);
}

function stopLegacyAction(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
  }
}

function numericValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatRequirementNumber(value: unknown): string {
  return numericValue(value).toFixed(pointLength.value);
}

function iconValue(name: unknown): string | undefined {
  if (typeof name !== "string" || name.length === 0) {
    return undefined;
  }
  return icons.value[name];
}

function iconSrc(name: unknown): string {
  const value = iconValue(name);
  return value ? `data:image/png;base64,${value}` : "";
}

function translateMachineDisplayName(value: unknown): string {
  const fallback = domainDictionary.getDisplayName(value);
  const i18nKey = domainDictionary.getMachineI18nKey(value);
  return i18nKey ? t(i18nKey) : fallback;
}

function isTaggedRow(item: ResultLine, index: number): boolean {
  return taggedRowKeys.value.includes(productionRowKey(item, index));
}

function productionRowClass(item: ResultLine, index: number): Array<string> {
  const classes = [String(item.rowClass || "")].filter(Boolean);
  if (isTaggedRow(item, index)) {
    classes.push("row-tag");
  }
  return classes;
}

function selectInputText(event: FocusEvent): void {
  if (event.target instanceof HTMLInputElement) {
    event.target.select();
  }
}

function focusRequirementEditor(): void {
  if (requirementEditorInput.value) {
    requirementEditorInput.value.focus();
    requirementEditorInput.value.select();
  }
}

function focusProductionEditor(): void {
  if (productionEditorInput.value) {
    productionEditorInput.value.focus();
    productionEditorInput.value.select();
  }
}

function setRequirementEditorInput(element: unknown): void {
  requirementEditorInput.value = element instanceof HTMLInputElement ? element : null;
}

function setProductionEditorInput(element: unknown): void {
  productionEditorInput.value = element instanceof HTMLInputElement ? element : null;
}

function openRequirementEditor(index: number): void {
  const requirement = requirements.value[index];
  if (!requirement) {
    return;
  }
  requirementEditorIndex.value = index;
  requirementEditorValue.value = numericValue(requirement.number);
  productionEditorIndex.value = -1;
  void nextTick(focusRequirementEditor);
}

function submitRequirementEditor(): void {
  const index = requirementEditorIndex.value;
  const requirement = requirements.value[index];
  if (!requirement) {
    requirementEditorIndex.value = -1;
    return;
  }
  const nextValue = numericValue(requirementEditorValue.value);
  if (nextValue > 0) {
    invokeBridge("updateRequirementNumber", index, nextValue);
  }
  requirementEditorIndex.value = -1;
}

function cancelRequirementEditor(): void {
  requirementEditorIndex.value = -1;
}

function openProductionEditor(index: number): void {
  const line = productionLines.value[index];
  if (!line) {
    return;
  }
  productionEditorIndex.value = index;
  productionEditorValue.value = numericValue(line.number2);
  requirementEditorIndex.value = -1;
  void nextTick(focusProductionEditor);
}

function submitProductionEditor(): void {
  const index = productionEditorIndex.value;
  const line = productionLines.value[index];
  if (!line) {
    productionEditorIndex.value = -1;
    return;
  }
  const nextValue = numericValue(productionEditorValue.value);
  if (nextValue > 0) {
    invokeBridge("scaleRequirementsByFactor", index, nextValue);
  }
  productionEditorIndex.value = -1;
}

function cancelProductionEditor(): void {
  productionEditorIndex.value = -1;
}

function removeRequirement(index: number): void {
  invokeBridge("removeRequirement", index);
  if (requirementEditorIndex.value === index) {
    cancelRequirementEditor();
  }
}

function removeExcludedName(name: string): void {
  invokeBridge("removeExcludedName", name);
}

function resetRequirements(event: Event): void {
  stopLegacyAction(event);
  invokeBridge("resetRequirements");
}

function resetExcludedNames(event: Event): void {
  stopLegacyAction(event);
  invokeBridge("clearExcludedNames");
}

function excludeAccLines(event: Event): void {
  stopLegacyAction(event);
  invokeBridge("excludeAllAcc");
}

function generateBlueprint(event: Event): void {
  stopLegacyAction(event);
  window.generateBlueprint?.();
}

function excludeLine(event: Event, name: string): void {
  stopLegacyAction(event);
  if (!name) {
    return;
  }
  invokeBridge("addExcludedName", name);
}

function saveProject(event: Event): void {
  stopLegacyAction(event);
  const rawName = window.prompt(t("dialog.prompt_project_name"));
  const normalizedName = normalizeProjectName(rawName);
  if (!normalizedName.valid) {
    dsqServices.notify.warning(normalizedName.message, 3000);
    return;
  }
  const existingProject = projectsStore.items.find(project => project.name === normalizedName.value);
  if (
    existingProject &&
    !window.confirm(t("dialog.confirm_project_overwrite", { name: normalizedName.value }))
  ) {
    return;
  }
  invokeBridge("saveProject", normalizedName.value);
}

function selectRecipe(itemName: string, recipeId: number | string | undefined, isSelected: boolean): void {
  if (isSelected || recipeId == null) {
    return;
  }
  invokeBridge("updateRecipeSelection", itemName, recipeId);
}

function selectMachine(itemId: number | string | undefined, machineId: string, isSelected: boolean): void {
  if (isSelected || itemId == null) {
    return;
  }
  invokeBridge("updateMachineSelection", itemId, machineId);
}

function selectAccType(itemId: number | string | undefined, accType: string, isSelected: boolean): void {
  if (isSelected || itemId == null) {
    return;
  }
  invokeBridge("updateAccType", itemId, accType);
}

function selectAccValue(itemId: number | string | undefined, accValue: string, isSelected: boolean): void {
  if (isSelected || itemId == null) {
    return;
  }
  invokeBridge("updateAccValue", itemId, accValue);
}

function openSplitDialog(event: Event, itemName: string): void {
  stopLegacyAction(event);
  if (!itemName) {
    return;
  }
  const bridge = getCommandBridge();
  if (!bridge || !bridge.has("getSplitDialogPayload")) {
    return;
  }
  const payload = bridge.invoke("getSplitDialogPayload", itemName);
  if (!payload || typeof payload !== "object") {
    window.alert?.(t("alert.no_multiple_recipe"));
    return;
  }
  uiStore.openSplitDialog(payload as Parameters<typeof uiStore.openSplitDialog>[0]);
  const opened = window.DSQPanelController?.open?.("split", {
    triggerElement: event.currentTarget as Element | null,
    initialFocusSelector: ".split-number",
  });
  if (opened === false) {
    uiStore.closeSplitDialog();
  }
}

function toggleTaggedRow(event: Event, item: ResultLine, index: number): void {
  stopLegacyAction(event);
  const key = productionRowKey(item, index);
  if (taggedRowKeys.value.includes(key)) {
    taggedRowKeys.value = taggedRowKeys.value.filter(entry => entry !== key);
    return;
  }
  taggedRowKeys.value = [...taggedRowKeys.value, key];
}

watch(
  () => calculationStore.currentResult,
  () => {
    taggedRowKeys.value = [];
  }
);
</script>
