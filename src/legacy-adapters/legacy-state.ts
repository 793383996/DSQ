import type { Pinia } from "pinia";

import { applyLegacyRuntimeOptions, readLegacyRuntimeOptions } from "./legacy-runtime-options";
import { syncI18nLocale, type DsqI18nInstance } from "../services/i18n";
import { normalizeMachineSettingsForStorage, normalizeSpeedSettingsForStorage } from "../services/legacy-storage";
import { useAppStore } from "../stores/app";
import { useBlueprintStore } from "../stores/blueprint";
import { useCalculationStore } from "../stores/calculation";
import { useProjectsStore } from "../stores/projects";
import { useSeoStore } from "../stores/seo";
import { useSettingsStore } from "../stores/settings";
import { useUiStore } from "../stores/ui";
import {
  cloneJsonValue,
  createEmptyCalculationOutput,
  normalizeLocale,
  normalizeRequirementEntries,
  normalizeSingleMakeEntries,
  normalizeStringList,
  type CalculationOutput,
  type LegacyRuntimeSnapshot,
  type ProjectSnapshot,
  type RequirementEntry,
  type SeoSnapshot,
} from "../types/dsq";

function readLegacyLocale() {
  return normalizeLocale(window.DSQI18n?.getLocale?.(), "zh-CN");
}

function readLegacyProjects(): ProjectSnapshot[] {
  return Array.isArray(window.projects) ? cloneJsonValue(window.projects, []) : [];
}

function readLegacyMachineSettings() {
  return normalizeMachineSettingsForStorage(window.settings);
}

function readLegacySpeedSettings() {
  return normalizeSpeedSettingsForStorage(window.settings_time);
}

function readLegacyRecipeSettings() {
  return window.settings_pf && typeof window.settings_pf === "object" && !Array.isArray(window.settings_pf)
    ? cloneJsonValue(window.settings_pf, {})
    : {};
}

function readLegacyRequirements(): RequirementEntry[] {
  return normalizeRequirementEntries(window.xqs);
}

function readLegacySingleMake() {
  return normalizeSingleMakeEntries(window.singleMake);
}

function readLegacyExcludedNames() {
  return normalizeStringList(window.ig_names);
}

function readLegacyCalculationResult(): CalculationOutput | null {
  return window.currentCalculationResult
    ? cloneJsonValue(window.currentCalculationResult, createEmptyCalculationOutput())
    : null;
}

function readLegacySeoSnapshot(): SeoSnapshot | null {
  if (!window.currentCalculationResult?.seoSnapshot) {
    return null;
  }
  return cloneJsonValue(window.currentCalculationResult.seoSnapshot, {
    requirementCount: 0,
    primaryItemName: "",
    primaryRatePerMinute: null,
    totalLineCount: 0,
    totalEnergy: 0,
    totalSpace: 0,
  });
}

function hydrateStoresFromLegacySnapshot(pinia: Pinia, snapshot: LegacyRuntimeSnapshot) {
  const uiStore = useUiStore(pinia);
  const settingsStore = useSettingsStore(pinia);
  const projectsStore = useProjectsStore(pinia);
  const calculationStore = useCalculationStore(pinia);
  const seoStore = useSeoStore(pinia);
  const blueprintStore = useBlueprintStore(pinia);

  uiStore.setLocale(snapshot.locale);
  settingsStore.hydrateLegacySettings({
    global: snapshot.globalSettings,
    machine: snapshot.machineSettings,
    speed: snapshot.speedSettings,
    recipe: snapshot.recipeSettings,
    runtimeOptions: snapshot.runtimeOptions,
  });
  projectsStore.hydrateProjects(snapshot.projects);
  calculationStore.hydrateRequirements(snapshot.requirements);
  calculationStore.hydrateSingleMake(snapshot.singleMake);
  calculationStore.hydrateExcludedNames(snapshot.excludedNames);
  calculationStore.hydrateCalculationResult(snapshot.currentCalculationResult);
  const effectiveResult = snapshot.currentCalculationResult ?? calculationStore.effectiveResult;
  seoStore.setSnapshot(effectiveResult.seoSnapshot ?? readLegacySeoSnapshot() ?? undefined);
  blueprintStore.setSnapshot(effectiveResult.blueprintSnapshot ?? null);
}

export function captureLegacyRuntimeSnapshot(): LegacyRuntimeSnapshot {
  return {
    locale: readLegacyLocale(),
    projects: readLegacyProjects(),
    globalSettings:
      window.global_settings && typeof window.global_settings === "object"
        ? cloneJsonValue(window.global_settings, {})
        : {},
    machineSettings: readLegacyMachineSettings(),
    speedSettings: readLegacySpeedSettings(),
    recipeSettings: readLegacyRecipeSettings(),
    runtimeOptions: readLegacyRuntimeOptions(),
    currentCalculationResult: readLegacyCalculationResult(),
    requirements: readLegacyRequirements(),
    singleMake: readLegacySingleMake(),
    excludedNames: readLegacyExcludedNames(),
    isDataLoaded: window.isDataLoaded === true,
    currentItemName: window.currentItem && typeof window.currentItem.name === "string" ? window.currentItem.name : null,
  };
}

export function syncLegacyRuntimeSnapshot(
  pinia: Pinia,
  options: { i18n: DsqI18nInstance } | undefined
): LegacyRuntimeSnapshot {
  const snapshot = captureLegacyRuntimeSnapshot();
  const appStore = useAppStore(pinia);

  hydrateStoresFromLegacySnapshot(pinia, snapshot);

  if (options?.i18n) {
    syncI18nLocale(options.i18n, snapshot.locale);
  }

  appStore.markReady();
  return snapshot;
}

export function syncLegacyProjection(
  pinia: Pinia,
  options: { i18n?: DsqI18nInstance; seoSnapshot?: SeoSnapshot | null } = {}
): LegacyRuntimeSnapshot {
  const uiStore = useUiStore(pinia);
  const settingsStore = useSettingsStore(pinia);
  const projectsStore = useProjectsStore(pinia);
  const calculationStore = useCalculationStore(pinia);
  const seoStore = useSeoStore(pinia);
  useBlueprintStore(pinia);

  window.projects = cloneJsonValue(projectsStore.items, []);
  window.settings = cloneJsonValue(settingsStore.machineSettings, {});
  window.global_settings = cloneJsonValue(settingsStore.global, settingsStore.global);
  window.settings_time = cloneJsonValue(settingsStore.speedSettings, {});
  window.settings_pf = cloneJsonValue(settingsStore.recipeSettings, {});
  window.xqs = cloneJsonValue(calculationStore.requirements, []);
  window.singleMake = cloneJsonValue(calculationStore.singleMake, []);
  window.ig_names = cloneJsonValue(calculationStore.excludedNames, []);
  window.currentCalculationResult = calculationStore.currentResult
    ? cloneJsonValue(calculationStore.currentResult, createEmptyCalculationOutput())
    : null;
  window.defaultAccType = settingsStore.global.accType;
  window.defaultAccValue = settingsStore.global.accValue;

  const runtimeOptions = applyLegacyRuntimeOptions(settingsStore.runtimeOptions);

  const projectedSeoSnapshot = options.seoSnapshot ?? calculationStore.currentResult?.seoSnapshot ?? seoStore.snapshot;
  if (typeof window.DSQI18n?.updateSeoState === "function") {
    window.DSQI18n.updateSeoState(projectedSeoSnapshot);
  }

  if (options.i18n) {
    syncI18nLocale(options.i18n, uiStore.locale);
  }

  return {
    locale: uiStore.locale,
    projects: cloneJsonValue(projectsStore.items, []),
    globalSettings: cloneJsonValue(settingsStore.global, settingsStore.global),
    machineSettings: cloneJsonValue(settingsStore.machineSettings, {}),
    speedSettings: cloneJsonValue(settingsStore.speedSettings, {}),
    recipeSettings: cloneJsonValue(settingsStore.recipeSettings, {}),
    runtimeOptions,
    currentCalculationResult: calculationStore.currentResult
      ? cloneJsonValue(calculationStore.currentResult, createEmptyCalculationOutput())
      : null,
    requirements: cloneJsonValue(calculationStore.requirements, []),
    singleMake: cloneJsonValue(calculationStore.singleMake, []),
    excludedNames: cloneJsonValue(calculationStore.excludedNames, []),
    isDataLoaded: window.isDataLoaded === true,
    currentItemName: window.currentItem && typeof window.currentItem.name === "string" ? window.currentItem.name : null,
  };
}

export function hydrateStoresFromLegacy(pinia: Pinia): LegacyRuntimeSnapshot {
  const snapshot = captureLegacyRuntimeSnapshot();
  hydrateStoresFromLegacySnapshot(pinia, snapshot);
  return snapshot;
}

export function syncDerivedStoresFromCalculation(pinia: Pinia) {
  const calculationStore = useCalculationStore(pinia);
  const seoStore = useSeoStore(pinia);
  const blueprintStore = useBlueprintStore(pinia);

  seoStore.syncFromCalculationResult(calculationStore.currentResult);
  blueprintStore.setSnapshot(calculationStore.currentResult?.blueprintSnapshot ?? null);
}
