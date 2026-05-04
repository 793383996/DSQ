<template>
  <section data-runtime="vue3-control">
    <div class="control-bar" role="toolbar" aria-label="产量控制" data-i18n-aria-label="control.toolbar_aria">
      <div class="control-row-main">
        <div class="control-field-inline">
          <span data-i18n="control.rate_per_min" class="control-label-muted">{{ t("control.rate_per_min") }}</span>
          <input
            id="txtnumber"
            :value="ratePerMinuteDisplay"
            aria-label="每分钟产量"
            data-i18n-aria-label="control.rate_per_min_aria"
            type="text"
            class="input-min-70"
            @input="onRequirementRateInput"
            @change="onRequirementRateCommit"
          />
        </div>
        <div class="control-field-inline">
          <span data-i18n="control.device_count" class="control-label-muted">{{ t("control.device_count") }}</span>
          <input
            id="selmaince"
            :value="machineCountDisplay"
            aria-label="生产设备数"
            data-i18n-aria-label="control.device_count_aria"
            type="number"
            min="1"
            max="1000"
            class="input-min-70 input-number-plain"
            @input="onMachineCountInput"
            @change="onMachineCountCommit"
          />
        </div>
        <a
          id="btnAddRequirement"
          href="#"
          data-click-action="addRequirement"
          class="btn-add-requirement"
          :title="t('action.add_requirement_title')"
          data-i18n-title="action.add_requirement_title"
          aria-haspopup="dialog"
          aria-controls="UIselector"
          :aria-expanded="uiStore.activeDialogId === 'uiSelector' ? 'true' : 'false'"
          @click="openRequirementSelector"
        >
          <img alt="添加需求" data-i18n-alt="action.add_requirement_alt" :src="ADD_ICON" class="icon-20" />
        </a>
        <div class="custom-dropdown">
          <button
            id="btnSetting"
            data-i18n="control.settings"
            aria-controls="MoreSetting"
            :aria-expanded="isMoreSettingOpen ? 'true' : 'false'"
            @click="toggleMoreSetting"
          >
            {{ t("control.settings") }}
          </button>
          <button id="btnReset1" data-i18n="control.fix_blank" class="btn-gradient-orange" @click="resetAllRuntimeState">
            {{ t("control.fix_blank") }}
          </button>
        </div>
      </div>
    </div>

    <div class="control-bar">
      <div class="control-row-options">
        <input
          id="hideSource"
          :checked="runtimeOptions.hideSource"
          type="checkbox"
          @change="event => updateRuntimeBoolean('hideSource', event, 'toggle-hide-source')"
        />
        <label for="hideSource" data-i18n="control.hide_source">{{ t("control.hide_source") }}</label>

        <select
          v-for="field in globalSelectFields"
          :id="field.id"
          :key="field.id"
          :value="field.value"
          :aria-label="field.ariaLabel"
          :data-i18n-aria-label="field.ariaKey"
          @change="event => updateGlobalSetting(field.id, event, field.reason)"
        >
          <option v-for="option in field.options" :key="option.value" :value="option.value" :data-i18n="option.key">
            {{ t(option.key) }}
          </option>
        </select>
      </div>

      <div class="control-row-options margin-top-12">
        <template v-for="field in controlCheckboxFields" :key="field.id">
          <input :id="field.id" :checked="field.value" type="checkbox" @change="event => updateRuntimeBoolean(field.key, event, field.reason)" />
          <label :for="field.id" :data-i18n="field.labelKey">{{ t(field.labelKey) }}</label>
        </template>

        <span id="projectdiv" class="project-panel-hidden" v-show="projectsStore.items.length > 0">
          <select
            id="selprojects"
            :value="selectedProjectName"
            aria-label="方案列表"
            data-i18n-aria-label="control.project_list_aria"
            @change="selectProject"
          >
            <option v-for="project in projectsStore.items" :key="project.name" :value="project.name">{{ project.name }}</option>
          </select>
          <button id="btnLoadProject" data-i18n="control.load_project" @click="loadProject">{{ t("control.load_project") }}</button>
          <button id="btnReset5" data-i18n="control.reset_project" class="btn-gradient-orange" @click="clearProjects">
            {{ t("control.reset_project") }}
          </button>
        </span>
      </div>
    </div>
  </section>

  <Teleport to="#MoreSetting">
    <div class="settings-layout-row" data-runtime="vue3-settings">
      <div class="settings-col-gap">
        <h4 data-i18n="settings.speed.title">{{ t("settings.speed.title") }}</h4>
        <p v-for="field in speedFields" :key="field.id">
          <span class="label" :data-i18n="field.labelKey">{{ t(field.labelKey) }}</span>
          <input
            :id="field.id"
            :value="field.value"
            :data-name="field.dataName"
            :aria-label="field.ariaLabel"
            :data-i18n-aria-label="field.ariaKey"
            :class="field.className"
            type="number"
            :step="field.step"
            @change="event => updateRuntimeNumber(field.key, event, field.reason, field.options)"
          />
          <span v-if="field.suffix">{{ field.suffix }}</span>
        </p>
      </div>

      <div class="settings-col-width">
        <div>
          <h4 data-i18n="settings.logistics.title">{{ t("settings.logistics.title") }}</h4>
          <p>
            <span class="label" data-i18n="settings.logistics.station_stack">{{ t("settings.logistics.station_stack") }}</span>
            <input
              id="speed1_5"
              :value="runtimeOptions.stationStackLayer"
              aria-label="运输站集装物流堆叠层数"
              data-i18n-aria-label="settings.logistics.station_stack_aria"
              class="textbox"
              type="number"
              min="1"
              max="4"
              @change="event => updateRuntimeNumber('stationStackLayer', event, 'station-stack-layer-change', numberOptions.stationStack)"
            />
            <span data-i18n="settings.logistics.belt_stack_layers">{{ t("settings.logistics.belt_stack_layers") }}</span>
          </p>
          <p>
            <span class="label" data-i18n="settings.logistics.belt_capacity_calc">{{ t("settings.logistics.belt_capacity_calc") }}</span>
            <select
              id="csd"
              :value="runtimeOptions.conveyorBeltType"
              aria-label="计算传送带支持设备类型"
              data-i18n-aria-label="settings.logistics.belt_capacity_calc_aria"
              @change="event => updateRuntimeSelect('conveyorBeltType', event, 'belt-type-change')"
            >
              <option v-for="option in beltOptions" :key="option.value" :value="option.value" :data-i18n="option.key">
                {{ t(option.key) }}
              </option>
            </select>
          </p>
        </div>

        <div>
          <h4 data-i18n="settings.blueprint.title">{{ t("settings.blueprint.title") }}</h4>
          <div class="settings-blueprint-inner">
            <template v-for="field in blueprintCheckboxFields" :key="field.id">
              <span class="label" :data-i18n="field.labelKey">{{ t(field.labelKey) }}</span>
              <input
                :id="field.id"
                :checked="field.value"
                type="checkbox"
                :aria-label="field.ariaLabel"
                :data-i18n-aria-label="field.ariaKey"
                @change="event => field.change(event)"
              />
              <span v-if="field.trailingKey" :data-i18n="field.trailingKey">{{ t(field.trailingKey) }}</span>
              <br />
            </template>

            <template v-for="field in blueprintNumberFields" :key="field.id">
              <span class="label" :data-i18n="field.labelKey">{{ t(field.labelKey) }}</span>
              <input
                :id="field.id"
                :value="field.value"
                type="number"
                :aria-label="field.ariaLabel"
                :data-i18n-aria-label="field.ariaKey"
                :min="field.min"
                :max="field.max"
                :step="field.step"
                class="textbox"
                @change="event => updateRuntimeNumber(field.key, event, field.reason, field.options)"
              />
              <span v-if="field.trailingKey" :data-i18n="field.trailingKey">{{ t(field.trailingKey) }}</span>
              <br />
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, Teleport } from "vue";
import { useI18n } from "vue-i18n";

import { dsqServices } from "../services/app-services";
import { useAppStore } from "../stores/app";
import { useProjectsStore } from "../stores/projects";
import { useSettingsStore } from "../stores/settings";
import { useUiStore } from "../stores/ui";
import type { CalculationRuntimeOptions } from "../types/dsq";

type RuntimeOptionKey = keyof CalculationRuntimeOptions;
type NumericOptions = Parameters<typeof dsqServices.numeric.readInput>[1];

const ADD_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAZVJREFUWEftl89VwkAQh3+DBRjTgHpYrtKBdCB0gEfDRSsQK5AL8YgdiB1gB3gll1CAMRTgjm9XCZslIf7Je8khe0y+N5m3mfl2h1Dxooq/jyQB5yHothhPAJx0UhxKRj8ethfquTNZdlqkODqxko8loR9fibnmdDyeFnFJAq4fxAAOs3aEgJc3T3TVO9cPQgDHOTsXR544KuY4jLz2qeLMBHjf74g8oVnXD0rlmgRqtQO5xcWM5/eh6H3XgOqGs5x6WUWe0N1RUKwJt23DybJzQDRm4NwMrj7O4JHZhgQaEeHC5FSnfDBfm1xWPJurj4iqMmLqF+QYbiGZL9MmpCmATrExizmzC8oowsaE+K2yayWiUg+Znx5aZRfhOvKEvk/8yYQtokdbs1mGy+IAvErmgdWuO/FsrjFhyoREdE+AvnptFgMzZr5LHUZEtwTo09FYO8bMiTdn5ptNvJKLcHvXc/1gz7Hd3AmRGLMxYdmDyT9M+DWaKXPZU89KMvcsw80yuLUk9JLRTI9wlMWtJGGw4RoTfgKyI5kwSL6MMgAAAABJRU5ErkJggg==";

const { t } = useI18n();
const appStore = useAppStore();
const uiStore = useUiStore();
const settingsStore = useSettingsStore();
const projectsStore = useProjectsStore();

const runtimeOptions = computed(() => settingsStore.runtimeOptions);
const isMoreSettingOpen = computed(() => uiStore.activePanelId === "moreSetting");
const selectedProjectName = computed(() => projectsStore.activeProjectName ?? "");
const ratePerMinuteDisplay = computed(() => String(uiStore.requirementDraft.ratePerMinute));
const machineCountDisplay = computed(() => (uiStore.requirementDraft.machineCount == null ? "" : String(uiStore.requirementDraft.machineCount)));

const numberOptions = {
  ratePerMinute: { fieldLabel: "每分钟产量", fallbackValue: 60, requirePositive: true, min: 0.000001, maxFractionDigits: 6 },
  machineCount: { fieldLabel: "生产设备数", fallbackValue: 1, requirePositive: true, min: 1, max: 1000, integer: true, clamp: true },
  pointLength: { fieldLabel: "小数点后保留", fallbackValue: 3, min: 0, max: 6, integer: true, clamp: true },
  ore: { fieldLabel: "采矿作业速度", fallbackValue: 100, requirePositive: true, maxFractionDigits: 3 },
  advancedMiner: { fieldLabel: "大型采矿机", fallbackValue: 100, requirePositive: true, maxFractionDigits: 3 },
  fractionator: { fieldLabel: "分馏塔每分钟产量", fallbackValue: 18, requirePositive: true, maxFractionDigits: 6 },
  oil: { fieldLabel: "原油速度", fallbackValue: 4, requirePositive: true, maxFractionDigits: 6 },
  orbitalGas: { fieldLabel: "轨道采集-氢(气态)", fallbackValue: 1, requirePositive: true, maxFractionDigits: 6 },
  orbitalDeuterium: { fieldLabel: "轨道采集-重氢", fallbackValue: 0.02, requirePositive: true, maxFractionDigits: 6 },
  orbitalFireIce: { fieldLabel: "轨道采集-可燃冰", fallbackValue: 0.5, requirePositive: true, maxFractionDigits: 6 },
  orbitalIceHydrogen: { fieldLabel: "轨道采集-氢(巨冰)", fallbackValue: 0.5, requirePositive: true, maxFractionDigits: 6 },
  criticalPhoton: { fieldLabel: "临界光子每分钟产量", fallbackValue: 5, requirePositive: true, maxFractionDigits: 6 },
  stationStack: { fieldLabel: "运输站集装物流", fallbackValue: 1, min: 1, max: 4, integer: true, clamp: true },
  teslaInterval: { fieldLabel: "电力感应塔间隔排数", fallbackValue: 1, min: 1, max: 2, integer: true, clamp: true },
  beltStack: { fieldLabel: "传送带物品堆叠层数", fallbackValue: 4, min: 1, max: 4, integer: true, clamp: true },
  labLayers: { fieldLabel: "研究站层数", fallbackValue: 15, min: 1, max: 15, integer: true, clamp: true },
  ratio: { fieldLabel: "蓝图长宽比", fallbackValue: 2, min: 1, requirePositive: true, maxFractionDigits: 3 },
} satisfies Record<string, NumericOptions>;

const globalSelectFields = computed(() => [
  {
    id: "selmodein",
    value: settingsStore.global.selmodein,
    ariaKey: "control.machine_type_aria",
    ariaLabel: "制造台类型",
    reason: "global-assembler-change",
    options: [
      { value: "assemblingMachineMk1", key: "option.machine.mk1" },
      { value: "assemblingMachineMk2", key: "option.machine.mk2" },
      { value: "assemblingMachineMk3", key: "option.machine.mk3" },
      { value: "recomposingAssembler", key: "option.machine.recomposing" },
    ],
  },
  {
    id: "furnace",
    value: settingsStore.global.furnace,
    ariaKey: "control.furnace_type_aria",
    ariaLabel: "熔炉类型",
    reason: "global-furnace-change",
    options: [
      { value: "arcSmelter", key: "option.furnace.arc" },
      { value: "planeSmelter", key: "option.furnace.plane" },
      { value: "negentropySmelter", key: "option.furnace.negentropy" },
    ],
  },
  {
    id: "chemical",
    value: settingsStore.global.chemical,
    ariaKey: "control.chemical_type_aria",
    ariaLabel: "化工厂类型",
    reason: "global-chemical-change",
    options: [
      { value: "chemicalPlant", key: "option.chemical.plant" },
      { value: "quantumChemicalPlant", key: "option.chemical.quantum" },
    ],
  },
  {
    id: "accType",
    value: settingsStore.global.accType,
    ariaKey: "control.acc_type_aria",
    ariaLabel: "增产剂等级",
    reason: "global-acc-type-change",
    options: [
      { value: "proliferatorMk1", key: "option.acc_type.mk1" },
      { value: "proliferatorMk2", key: "option.acc_type.mk2" },
      { value: "proliferatorMk3", key: "option.acc_type.mk3" },
    ],
  },
  {
    id: "accValue",
    value: settingsStore.global.accValue,
    ariaKey: "control.acc_value_aria",
    ariaLabel: "增产剂效果",
    reason: "global-acc-value-change",
    options: [
      { value: "none", key: "option.acc_value.none" },
      { value: "speedup", key: "option.acc_value.speedup" },
      { value: "extra", key: "option.acc_value.production" },
    ],
  },
  {
    id: "research",
    value: settingsStore.global.research,
    ariaKey: "control.research_type_aria",
    ariaLabel: "研究站类型",
    reason: "global-research-change",
    options: [
      { value: "matrixLab", key: "option.research.matrix" },
      { value: "selfEvolutionLab", key: "option.research.self_evolution" },
    ],
  },
]);

const controlCheckboxFields = computed(() => [
  { id: "selfAcc", key: "selfAcc" as RuntimeOptionKey, reason: "toggle-self-acc", labelKey: "control.self_acc", value: runtimeOptions.value.selfAcc },
  { id: "isAddSelfAccP", key: "isAddSelfAccP" as RuntimeOptionKey, reason: "toggle-external-acc-input", labelKey: "control.external_acc", value: runtimeOptions.value.isAddSelfAccP },
  { id: "showMaxOneBelt", key: "showMaxOneBelt" as RuntimeOptionKey, reason: "toggle-show-max-one-belt", labelKey: "control.max_one_belt", value: runtimeOptions.value.showMaxOneBelt },
]);

const speedFields = computed(() => [
  { id: "selore", key: "oreMultiplier" as RuntimeOptionKey, labelKey: "settings.speed.mining_speed", ariaKey: "settings.speed.mining_speed_aria", ariaLabel: "采矿作业速度百分比", value: runtimeOptions.value.oreMultiplier, options: numberOptions.ore, reason: "ore-base-speed-change", className: "textbox", suffix: "%", step: undefined, dataName: undefined },
  { id: "fractionatorSpeed", key: "fractionatorSpeed" as RuntimeOptionKey, labelKey: "settings.speed.fractionator_speed", ariaKey: "settings.speed.fractionator_speed_aria", ariaLabel: "分馏塔每分钟产量", value: runtimeOptions.value.fractionatorSpeed, options: numberOptions.fractionator, reason: "fractionator-speed-change", className: "textbox", suffix: "", step: undefined, dataName: undefined },
  { id: "speed1_6", key: "advancedMinerMultiplier" as RuntimeOptionKey, labelKey: "settings.speed.advanced_miner", ariaKey: "settings.speed.advanced_miner_aria", ariaLabel: "大型采矿机速度", value: runtimeOptions.value.advancedMinerMultiplier, options: numberOptions.advancedMiner, reason: "ore-speed-multiplier-change", className: "textbox", suffix: "", step: undefined, dataName: undefined },
  { id: "oilSpeed", key: "oilSpeed" as RuntimeOptionKey, labelKey: "settings.speed.oil_speed", ariaKey: "settings.speed.oil_speed_aria", ariaLabel: "原油速度", value: runtimeOptions.value.oilSpeed, options: numberOptions.oil, reason: "oil-speed-change", className: "textbox", suffix: "", step: undefined, dataName: undefined },
  { id: "speed1_2", key: "orbitalCollectorDeuterium" as RuntimeOptionKey, labelKey: "settings.speed.orbital_deuterium", ariaKey: "settings.speed.orbital_deuterium_aria", ariaLabel: "轨道采集重氢速度", value: runtimeOptions.value.orbitalCollectorDeuterium, options: numberOptions.orbitalDeuterium, reason: "orbital-collector-speed-change", className: "speed1 textbox", suffix: "", step: "0.01", dataName: "重氢" },
  { id: "speed1_3", key: "orbitalCollectorFireIce" as RuntimeOptionKey, labelKey: "settings.speed.orbital_fire_ice", ariaKey: "settings.speed.orbital_fire_ice_aria", ariaLabel: "轨道采集可燃冰速度", value: runtimeOptions.value.orbitalCollectorFireIce, options: numberOptions.orbitalFireIce, reason: "orbital-collector-speed-change", className: "speed1 textbox", suffix: "", step: "0.1", dataName: "可燃冰" },
  { id: "speed1_4", key: "orbitalCollectorIceHydrogen" as RuntimeOptionKey, labelKey: "settings.speed.orbital_hydrogen_ice", ariaKey: "settings.speed.orbital_hydrogen_ice_aria", ariaLabel: "轨道采集氢巨冰速度", value: runtimeOptions.value.orbitalCollectorIceHydrogen, options: numberOptions.orbitalIceHydrogen, reason: "orbital-collector-speed-change", className: "speed1 textbox", suffix: "", step: "0.1", dataName: "氢" },
  { id: "speed1_1", key: "orbitalCollectorGasHydrogen" as RuntimeOptionKey, labelKey: "settings.speed.orbital_hydrogen_gas", ariaKey: "settings.speed.orbital_hydrogen_gas_aria", ariaLabel: "轨道采集氢气态速度", value: runtimeOptions.value.orbitalCollectorGasHydrogen, options: numberOptions.orbitalGas, reason: "orbital-collector-speed-change", className: "speed1 textbox", suffix: "", step: "0.1", dataName: "氢" },
  { id: "gzSpeed", key: "gzSpeed" as RuntimeOptionKey, labelKey: "settings.speed.critical_photon", ariaKey: "settings.speed.critical_photon_aria", ariaLabel: "临界光子每分钟产量", value: runtimeOptions.value.gzSpeed, options: numberOptions.criticalPhoton, reason: "critical-photon-speed-change", className: "textbox", suffix: "", step: undefined, dataName: undefined },
  { id: "pointLength", key: "pointLength" as RuntimeOptionKey, labelKey: "settings.speed.decimal_places", ariaKey: "settings.speed.decimal_places_aria", ariaLabel: "小数点后保留位数", value: runtimeOptions.value.pointLength, options: numberOptions.pointLength, reason: "decimal-point-length-change", className: "textbox", suffix: t("settings.speed.decimal_places_unit"), step: undefined, dataName: undefined },
]);

const beltOptions = [
  { value: "conveyorBeltMk1", key: "option.belt.mk1" },
  { value: "conveyorBeltMk2", key: "option.belt.mk2" },
  { value: "conveyorBeltMk3", key: "option.belt.mk3" },
];

const blueprintCheckboxFields = computed(() => [
  {
    id: "onlyConveyorBeltMk3",
    labelKey: "settings.blueprint.only_belt_mk3",
    ariaKey: "settings.blueprint.only_belt_mk3_aria",
    ariaLabel: "只使用三级传送带",
    value: runtimeOptions.value.onlyConveyorBeltMk3,
    change: (event: Event) => updateRuntimeBoolean("onlyConveyorBeltMk3", event, "blueprint-belt-tier-change"),
    trailingKey: "",
  },
  {
    id: "onlySorterMk3",
    labelKey: "settings.blueprint.only_sorter_mk3",
    ariaKey: "settings.blueprint.only_sorter_mk3_aria",
    ariaLabel: "只使用三级分拣器",
    value: runtimeOptions.value.onlySorterMk3,
    change: (event: Event) => updateSorterMode(event, "onlySorterMk3"),
    trailingKey: "",
  },
  {
    id: "useSorterMk4",
    labelKey: "settings.blueprint.use_sorter_mk4",
    ariaKey: "settings.blueprint.use_sorter_mk4_aria",
    ariaLabel: "只使用四级分拣器",
    value: runtimeOptions.value.useSorterMk4,
    change: (event: Event) => updateSorterMode(event, "useSorterMk4"),
    trailingKey: "",
  },
  {
    id: "generateTeslaTower",
    labelKey: "settings.blueprint.auto_tesla",
    ariaKey: "settings.blueprint.auto_tesla_aria",
    ariaLabel: "自动插入电力感应塔",
    value: runtimeOptions.value.generateTeslaTower,
    change: (event: Event) => updateRuntimeBoolean("generateTeslaTower", event, "blueprint-tesla-toggle"),
    trailingKey: "",
  },
  {
    id: "stackLayers",
    labelKey: "settings.blueprint.enable_stack",
    ariaKey: "settings.blueprint.enable_stack_aria",
    ariaLabel: "开启堆叠",
    value: runtimeOptions.value.stackLayers,
    change: (event: Event) => updateRuntimeBoolean("stackLayers", event, "blueprint-stack-toggle"),
    trailingKey: "settings.blueprint.vertical_4",
  },
]);

const blueprintNumberFields = computed(() => [
  { id: "teslaTowerLineInterval", key: "teslaTowerLineInterval" as RuntimeOptionKey, labelKey: "settings.blueprint.tesla_interval", ariaKey: "settings.blueprint.tesla_interval_aria", ariaLabel: "电力感应塔间隔排数", value: runtimeOptions.value.teslaTowerLineInterval, min: 1, max: 2, step: undefined, options: numberOptions.teslaInterval, reason: "blueprint-tesla-interval-change", trailingKey: "settings.blueprint.tesla_interval_hint" },
  { id: "conveyorBeltStackLayer", key: "conveyorBeltStackLayer" as RuntimeOptionKey, labelKey: "settings.blueprint.belt_stack", ariaKey: "settings.blueprint.belt_stack_aria", ariaLabel: "传送带物品堆叠层数", value: runtimeOptions.value.conveyorBeltStackLayer, min: 1, max: 4, step: undefined, options: numberOptions.beltStack, reason: "blueprint-belt-stack-change", trailingKey: "" },
  { id: "maxLabLayers", key: "maxLabLayers" as RuntimeOptionKey, labelKey: "settings.blueprint.lab_layers", ariaKey: "settings.blueprint.lab_layers_aria", ariaLabel: "研究站层数", value: runtimeOptions.value.maxLabLayers, min: 1, max: 15, step: undefined, options: numberOptions.labLayers, reason: "blueprint-lab-layers-change", trailingKey: "" },
  { id: "x_y_ratio", key: "xToYRatio" as RuntimeOptionKey, labelKey: "settings.blueprint.xy_ratio", ariaKey: "settings.blueprint.xy_ratio_aria", ariaLabel: "蓝图长宽比", value: runtimeOptions.value.xToYRatio, min: 1, max: undefined, step: "0.1", options: numberOptions.ratio, reason: "blueprint-ratio-change", trailingKey: "" },
]);

function stopLegacyEvent(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
  }
}

function invokeBridge(commandName: string, ...args: unknown[]) {
  const bridge = window.DSQCommandBridge;
  if (!bridge || typeof bridge.has !== "function" || typeof bridge.invoke !== "function" || !bridge.has(commandName)) {
    return undefined;
  }
  return bridge.invoke(commandName, ...args);
}

function readNumeric(event: Event, options: NumericOptions): number {
  return dsqServices.numeric.readInput(event.currentTarget as HTMLInputElement, options);
}

function onRequirementRateInput(event: Event): void {
  const target = event.currentTarget as HTMLInputElement | null;
  const nextValue = Number(target?.value);
  if (Number.isFinite(nextValue) && nextValue > 0) {
    uiStore.setRequirementDraft({ ratePerMinute: nextValue });
  }
}

function onRequirementRateCommit(event: Event): void {
  uiStore.setRequirementDraft({ ratePerMinute: readNumeric(event, numberOptions.ratePerMinute) });
  invokeBridge("setRequirementDraft", uiStore.requirementDraft);
}

function onMachineCountInput(event: Event): void {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target?.value) {
    uiStore.setRequirementDraft({ machineCount: null });
    return;
  }
  const nextValue = Number(target.value);
  if (Number.isFinite(nextValue) && nextValue > 0) {
    uiStore.setRequirementDraft({ machineCount: nextValue });
  }
}

function onMachineCountCommit(event: Event): void {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target?.value) {
    uiStore.setRequirementDraft({ machineCount: null });
  } else {
    uiStore.setRequirementDraft({ machineCount: readNumeric(event, numberOptions.machineCount) });
  }
  invokeBridge("setRequirementDraft", uiStore.requirementDraft);
}

function openRequirementSelector(event: Event): void {
  stopLegacyEvent(event);
  if (appStore.bootPhase !== "ready" || window.isDataLoaded !== true) {
    window.alert?.(t("alert.data_not_ready"));
    return;
  }
  const bridge = window.DSQCommandBridge;
  if (!bridge || typeof bridge.has !== "function" || typeof bridge.invoke !== "function" || !bridge.has("getRequirementSelectorCatalog")) {
    window.alert?.(t("alert.data_load_failed"));
    return;
  }
  const catalog = bridge.invoke("getRequirementSelectorCatalog");
  if (!catalog) {
    window.alert?.(t("alert.data_load_failed"));
    return;
  }
  if (!uiStore.selectorActiveTab) {
    uiStore.setSelectorActiveTab("components");
  }
  window.DSQPanelController?.open?.("uiSelector", {
    triggerElement: event.currentTarget as Element | null,
    initialFocusSelector: ".selector .icon",
  });
}

function toggleMoreSetting(event: Event): void {
  stopLegacyEvent(event);
  window.DSQPanelController?.toggle?.("moreSetting", { triggerElement: event.currentTarget as Element | null });
}

function resetAllRuntimeState(event: Event): void {
  stopLegacyEvent(event);
  if (typeof window.confirm === "function" && !window.confirm(t("dialog.confirm_reset_all"))) {
    return;
  }
  invokeBridge("resetAllRuntimeState");
}

function updateGlobalSetting(id: string, event: Event, reason: string): void {
  stopLegacyEvent(event);
  invokeBridge("updateGlobalSetting", id, (event.currentTarget as HTMLSelectElement | null)?.value ?? "", reason);
}

function updateRuntimeBoolean(key: RuntimeOptionKey, event: Event, reason: string): void {
  stopLegacyEvent(event);
  invokeBridge("updateRuntimeOptions", { [key]: (event.currentTarget as HTMLInputElement | null)?.checked === true }, reason);
}

function updateRuntimeSelect(key: RuntimeOptionKey, event: Event, reason: string): void {
  stopLegacyEvent(event);
  invokeBridge("updateRuntimeOptions", { [key]: (event.currentTarget as HTMLSelectElement | null)?.value ?? "" }, reason);
}

function updateRuntimeNumber(key: RuntimeOptionKey, event: Event, reason: string, options: NumericOptions): void {
  stopLegacyEvent(event);
  const patch: Record<string, unknown> = { [key]: readNumeric(event, options) };
  if (key === "gzSpeed") {
    patch.manualGzSpeed = true;
  }
  invokeBridge("updateRuntimeOptions", patch, reason);
}

function updateSorterMode(event: Event, key: "onlySorterMk3" | "useSorterMk4"): void {
  stopLegacyEvent(event);
  const checked = (event.currentTarget as HTMLInputElement | null)?.checked === true;
  invokeBridge(
    "updateRuntimeOptions",
    key === "onlySorterMk3"
      ? { onlySorterMk3: checked, useSorterMk4: checked ? false : runtimeOptions.value.useSorterMk4 }
      : { useSorterMk4: checked, onlySorterMk3: checked ? false : runtimeOptions.value.onlySorterMk3 },
    "blueprint-sorter-mode-change"
  );
}

function selectProject(event: Event): void {
  projectsStore.selectProject((event.currentTarget as HTMLSelectElement | null)?.value || null);
}

function loadProject(event: Event): void {
  stopLegacyEvent(event);
  if (selectedProjectName.value) {
    invokeBridge("loadProject", selectedProjectName.value);
  }
}

function clearProjects(event: Event): void {
  stopLegacyEvent(event);
  invokeBridge("clearProjects");
}
</script>
