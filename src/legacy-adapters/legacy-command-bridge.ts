import type { Pinia } from "pinia";

import {
  buildRequirementEntryFromName,
  getRequirementSelectorCatalog,
  getSplitDialogPayload as getSplitDialogPayloadFromLegacy,
} from "./legacy-recipe-ui";
import { hydrateStoresFromLegacy, syncDerivedStoresFromCalculation, syncLegacyProjection } from "./legacy-state";
import { dsqServices } from "../services/app-services";
import { LEGACY_STORAGE_KEY_PREFIXES } from "../services/legacy-storage";
import { clearPersistedState } from "../services/persistence";
import { useBlueprintStore } from "../stores/blueprint";
import { useCalculationStore } from "../stores/calculation";
import { useProjectsStore } from "../stores/projects";
import { useSeoStore } from "../stores/seo";
import { useSettingsStore } from "../stores/settings";
import { useUiStore } from "../stores/ui";
import {
  createBlueprintGenerationConfig,
  cloneJsonValue,
  createDefaultCalculationRuntimeOptions,
  createDefaultGlobalSettings,
  type CalculationOutput,
  type CalculationSnapshot,
  type BlueprintResult,
  type ProjectSnapshot,
  type RequirementEntry,
  type SingleMakeEntry,
} from "../types/dsq";

type LegacyCommandHandler = (...args: any[]) => unknown;

export interface LegacyCommandBridge {
  has(commandName: string): boolean;
  invoke<T = unknown>(commandName: string, ...args: unknown[]): T | undefined;
}

type LegacyCommandRegistry = Record<string, LegacyCommandHandler>;

let legacyCommandBridge: LegacyCommandBridge | null = null;
let scheduledRecalculateHandle: number | ReturnType<typeof setTimeout> | null = null;
let scheduledReason = "";
let hasHydratedLegacyState = false;

function requestNextFrame(callback: () => void): number | ReturnType<typeof setTimeout> {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(callback, 0);
}

function cancelNextFrame(handle: number | ReturnType<typeof setTimeout> | null): void {
  if (handle == null) {
    return;
  }
  if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function" && typeof handle === "number") {
    window.cancelAnimationFrame(handle);
    return;
  }
  clearTimeout(handle as ReturnType<typeof setTimeout>);
}

function refreshLegacyI18nDom(): void {
  if (typeof window.DSQI18n?.refresh === "function") {
    if (window.app && typeof window.app.$nextTick === "function") {
      window.app.$nextTick(() => {
        window.DSQI18n?.refresh?.();
      });
      return;
    }
    window.DSQI18n.refresh();
  }
}

function persistLegacyState(kind: "machine" | "speed" | "recipe" | "project" | "global"): void {
  if (kind === "machine" && typeof window.saveSetting === "function") {
    window.saveSetting();
    return;
  }
  if (kind === "speed" && typeof window.saveSettingTime === "function") {
    window.saveSettingTime();
    return;
  }
  if (kind === "global" && typeof window.saveGlobalSettings === "function") {
    window.saveGlobalSettings();
    return;
  }
  if (kind === "recipe" && typeof window.saveSettingPf === "function") {
    window.saveSettingPf();
    return;
  }
  if (kind === "project" && typeof window.saveSettingProjects === "function") {
    window.saveSettingProjects();
  }
}

function normalizeBlueprintResult(result: unknown): BlueprintResult {
  const source = result && typeof result === "object" ? (result as BlueprintResult) : null;
  return {
    text: typeof source?.text === "string" ? source.text : "",
    durationMs: Number.isFinite(source?.durationMs) ? Number(source?.durationMs) : undefined,
    meta: source?.meta && typeof source.meta === "object" && !Array.isArray(source.meta) ? cloneJsonValue(source.meta, {}) : undefined,
  };
}

function clearScopedRuntimeStorage(): void {
  dsqServices.storage.clearByPrefixes([...LEGACY_STORAGE_KEY_PREFIXES, "dsq_"]);
  clearPersistedState();
}

function reloadRuntimePage(): void {
  if (typeof window.__DSQReloadPage === "function") {
    window.__DSQReloadPage();
    return;
  }
  window.location?.reload?.();
}

function ensureLegacyStateHydrated(pinia: Pinia): void {
  if (hasHydratedLegacyState) {
    return;
  }
  hydrateStoresFromLegacy(pinia);
  hasHydratedLegacyState = true;
}

function withHydratedLegacyState<T>(pinia: Pinia, action: () => T): T {
  ensureLegacyStateHydrated(pinia);
  return action();
}

function createCalculationSnapshot(pinia: Pinia): CalculationSnapshot {
  const settingsStore = useSettingsStore(pinia);
  const calculationStore = useCalculationStore(pinia);

  return {
    requirements: cloneJsonValue(calculationStore.requirements, []),
    singleMake: cloneJsonValue(calculationStore.singleMake, []),
    excludedNames: cloneJsonValue(calculationStore.excludedNames, []),
    globalSettings: cloneJsonValue(settingsStore.global, settingsStore.global),
    machineSettings: cloneJsonValue(settingsStore.machineSettings, {}),
    speedSettings: cloneJsonValue(settingsStore.speedSettings, {}),
    recipeSettings: cloneJsonValue(settingsStore.recipeSettings, {}),
    runtimeOptions: cloneJsonValue(settingsStore.runtimeOptions, settingsStore.runtimeOptions),
    currentResult: calculationStore.currentResult,
  };
}

function runStoreRecalculation(pinia: Pinia, reason = ""): CalculationOutput {
  ensureLegacyStateHydrated(pinia);
  const calculationStore = useCalculationStore(pinia);
  const result = calculationStore.recalculate(createCalculationSnapshot(pinia), reason);
  syncDerivedStoresFromCalculation(pinia);
  syncLegacyProjection(pinia);
  refreshLegacyI18nDom();
  return result;
}

function syncFromLegacyAndRecalculate(pinia: Pinia, reason = ""): CalculationOutput {
  ensureLegacyStateHydrated(pinia);
  return runStoreRecalculation(pinia, reason);
}

function createProjectSnapshotFromStores(pinia: Pinia, name: string): ProjectSnapshot {
  ensureLegacyStateHydrated(pinia);
  const calculationStore = useCalculationStore(pinia);
  const settingsStore = useSettingsStore(pinia);

  return {
    name,
    singleMake: cloneJsonValue(calculationStore.singleMake, []),
    ig_names: cloneJsonValue(calculationStore.excludedNames, []),
    value: cloneJsonValue(calculationStore.requirements, []),
    settings: cloneJsonValue(settingsStore.machineSettings, {}),
    globalSettings: cloneJsonValue(settingsStore.global, settingsStore.global),
    speedSettings: cloneJsonValue(settingsStore.speedSettings, {}),
    recipeSettings: cloneJsonValue(settingsStore.recipeSettings, {}),
    runtimeOptions: cloneJsonValue(settingsStore.runtimeOptions, settingsStore.runtimeOptions),
  };
}

function hydrateProjectIntoStores(pinia: Pinia, project: ProjectSnapshot): void {
  const settingsStore = useSettingsStore(pinia);
  const calculationStore = useCalculationStore(pinia);

  calculationStore.setRequirements(project.value);
  calculationStore.setSingleMake(project.singleMake);
  calculationStore.setExcludedNames(project.ig_names);
  settingsStore.hydrateMachineSettings(project.settings);
  if (project.globalSettings) {
    settingsStore.hydrateGlobalSettings(project.globalSettings);
  }
  if (project.speedSettings) {
    settingsStore.hydrateSpeedSettings(project.speedSettings);
  }
  if (project.recipeSettings) {
    settingsStore.hydrateRecipeSettings(project.recipeSettings);
  }
  if (project.runtimeOptions) {
    settingsStore.applyRuntimeOptions(project.runtimeOptions);
  }
}

function getCurrentCalculationResultFromStores(pinia: Pinia): CalculationOutput {
  ensureLegacyStateHydrated(pinia);
  const calculationStore = useCalculationStore(pinia);
  if (!calculationStore.currentResult) {
    return runStoreRecalculation(pinia, "bridge-read-current-result");
  }
  return cloneJsonValue(calculationStore.currentResult, calculationStore.currentResult);
}

function getRequirementDraftFromStores(pinia: Pinia) {
  const uiStore = useUiStore(pinia);
  return cloneJsonValue(uiStore.requirementDraft, uiStore.requirementDraft);
}

function getCurrentBlueprintConfigFromStores(pinia: Pinia) {
  ensureLegacyStateHydrated(pinia);
  const blueprintStore = useBlueprintStore(pinia);
  return createBlueprintGenerationConfig(blueprintStore.config);
}

function resetStoreOwnedRuntimeState(pinia: Pinia): void {
  const calculationStore = useCalculationStore(pinia);
  const settingsStore = useSettingsStore(pinia);
  const projectsStore = useProjectsStore(pinia);
  const blueprintStore = useBlueprintStore(pinia);
  const seoStore = useSeoStore(pinia);
  const uiStore = useUiStore(pinia);

  settingsStore.hydrateGlobalSettings(createDefaultGlobalSettings());
  settingsStore.resetMachineSettings();
  settingsStore.resetSpeedSettings();
  settingsStore.resetRecipeSettings();
  settingsStore.applyRuntimeOptions(createDefaultCalculationRuntimeOptions());

  calculationStore.resetRequirements();
  calculationStore.clearSingleMake();
  calculationStore.clearExcludedNames();
  calculationStore.clearCalculationResult();

  projectsStore.clearProjects();
  blueprintStore.reset();
  seoStore.setSnapshot(undefined);
  uiStore.resetRuntimeUiState();

  syncLegacyProjection(pinia);
}

function createLegacyCommandRegistry(pinia: Pinia): LegacyCommandRegistry {
  return {
    scheduleRecalculate(reason?: string) {
      if (typeof reason === "string" && reason) {
        scheduledReason = reason;
      }
      if (scheduledRecalculateHandle != null) {
        return;
      }
      scheduledRecalculateHandle = requestNextFrame(() => {
        const nextReason = scheduledReason || reason || "legacy-scheduled-update";
        scheduledRecalculateHandle = null;
        scheduledReason = "";
        syncFromLegacyAndRecalculate(pinia, String(nextReason));
      });
    },
    flushRecalculate(reason?: string) {
      if (typeof reason === "string" && reason) {
        scheduledReason = reason;
      }
      cancelNextFrame(scheduledRecalculateHandle);
      scheduledRecalculateHandle = null;
      const nextReason = scheduledReason || reason || "legacy-flush-update";
      scheduledReason = "";
      return syncFromLegacyAndRecalculate(pinia, String(nextReason));
    },
    syncFromLegacyAndRecalculate(reason?: string) {
      return syncFromLegacyAndRecalculate(pinia, typeof reason === "string" ? reason : "");
    },
    recalculate(reason?: string) {
      return runStoreRecalculation(pinia, typeof reason === "string" ? reason : "");
    },
    getCurrentCalculationResult() {
      return getCurrentCalculationResultFromStores(pinia);
    },
    getRequirementDraft() {
      return withHydratedLegacyState(pinia, () => getRequirementDraftFromStores(pinia));
    },
    getRequirementSelectorCatalog() {
      return getRequirementSelectorCatalog();
    },
    setRequirementDraft(snapshot: { ratePerMinute?: number; machineCount?: number | null } | null | undefined) {
      return withHydratedLegacyState(pinia, () => {
        const uiStore = useUiStore(pinia);
        uiStore.setRequirementDraft(snapshot ?? undefined);
        return getRequirementDraftFromStores(pinia);
      });
    },
    getCurrentBlueprintConfig() {
      return getCurrentBlueprintConfigFromStores(pinia);
    },
    startBlueprintGeneration(meta?: Record<string, unknown>) {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        const blueprintStore = useBlueprintStore(pinia);
        blueprintStore.setSnapshot(calculationStore.currentResult?.blueprintSnapshot ?? null);
        blueprintStore.startGeneration();
        return meta ?? null;
      });
    },
    finishBlueprintGeneration(result?: BlueprintResult) {
      return withHydratedLegacyState(pinia, () => {
        const blueprintStore = useBlueprintStore(pinia);
        const normalizedResult = normalizeBlueprintResult(result);
        blueprintStore.finishGeneration(normalizedResult);
        return cloneJsonValue(blueprintStore.lastResult, normalizedResult);
      });
    },
    failBlueprintGeneration(error: unknown) {
      return withHydratedLegacyState(pinia, () => {
        const blueprintStore = useBlueprintStore(pinia);
        blueprintStore.failGeneration(error);
        return blueprintStore.errorMessage;
      });
    },
    addRequirement(item: RequirementEntry["item"], number: number) {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        calculationStore.addRequirement({
          item,
          number,
        });
        return runStoreRecalculation(pinia, "add-requirement");
      });
    },
    addRequirementByName(name: string) {
      return withHydratedLegacyState(pinia, () => {
        const entry = buildRequirementEntryFromName(name, getRequirementDraftFromStores(pinia));
        if (!entry) {
          return null;
        }
        const calculationStore = useCalculationStore(pinia);
        calculationStore.addRequirement(entry);
        return runStoreRecalculation(pinia, "add-requirement-by-name");
      });
    },
    updateRequirementNumber(index: number, number: number) {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        calculationStore.updateRequirementNumber(index, number);
        return runStoreRecalculation(pinia, "requirement-number-edit");
      });
    },
    scaleRequirementsByFactor(index: number, nextMachineCount: number) {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        const currentResult = calculationStore.currentResult ?? calculationStore.effectiveResult;
        const currentLine = currentResult.productionLines[index] as { number2?: string | number } | undefined;
        const previousMachineCount = Number(currentLine?.number2) || 1;
        if (!Number.isFinite(nextMachineCount) || nextMachineCount <= 0 || !Number.isFinite(previousMachineCount) || previousMachineCount <= 0) {
          return runStoreRecalculation(pinia, "requirement-scale-noop");
        }
        calculationStore.scaleRequirementNumbers(nextMachineCount / previousMachineCount);
        let result = runStoreRecalculation(pinia, "requirement-scale-pass-1");
        const refreshedLine = result.productionLines[index] as { number2?: string | number } | undefined;
        const refreshedMachineCount = Number(refreshedLine?.number2) || nextMachineCount;
        if (Number.isFinite(refreshedMachineCount) && refreshedMachineCount > 0) {
          calculationStore.scaleRequirementNumbers(nextMachineCount / refreshedMachineCount);
          result = runStoreRecalculation(pinia, "requirement-scale-pass-2");
        }
        return result;
      });
    },
    removeRequirement(index: number) {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        calculationStore.removeRequirement(index);
        return runStoreRecalculation(pinia, "requirement-remove");
      });
    },
    resetRequirements() {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        calculationStore.resetRequirements();
        calculationStore.clearSingleMake();
        return runStoreRecalculation(pinia, "reset-requirements");
      });
    },
    addExcludedName(name: string) {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        calculationStore.addExcludedName(name);
        return runStoreRecalculation(pinia, "exclude-item");
      });
    },
    removeExcludedName(name: string) {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        calculationStore.removeExcludedName(name);
        return runStoreRecalculation(pinia, "remove-excluded-item");
      });
    },
    clearExcludedNames() {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        calculationStore.clearExcludedNames();
        return runStoreRecalculation(pinia, "reset-excluded-items");
      });
    },
    excludeAllAcc(names?: string[]) {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        const normalizedNames = Array.isArray(names) && names.length > 0 ? names : ["proliferatorMk1", "proliferatorMk2", "proliferatorMk3"];
        normalizedNames.forEach(name => {
          calculationStore.addExcludedName(name);
        });
        return runStoreRecalculation(pinia, "exclude-all-acc");
      });
    },
    appendSingleMake(entry: SingleMakeEntry) {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        calculationStore.appendSingleMake(entry);
        return runStoreRecalculation(pinia, "split-recipe-confirm");
      });
    },
    getSplitDialogPayload(name: string) {
      return getSplitDialogPayloadFromLegacy(name);
    },
    prepareSplitDialog(name: string) {
      return withHydratedLegacyState(pinia, () => {
        const payload = getSplitDialogPayloadFromLegacy(name);
        const uiStore = useUiStore(pinia);
        if (!payload) {
          uiStore.closeSplitDialog();
          return null;
        }
        uiStore.openSplitDialog(payload);
        return cloneJsonValue(payload, payload);
      });
    },
    setSingleMake(entries: SingleMakeEntry[]) {
      return withHydratedLegacyState(pinia, () => {
        const calculationStore = useCalculationStore(pinia);
        calculationStore.setSingleMake(entries);
        return runStoreRecalculation(pinia, "set-single-make");
      });
    },
    updateMachineSelection(id: number | string, machineId: string) {
      return withHydratedLegacyState(pinia, () => {
        const settingsStore = useSettingsStore(pinia);
        settingsStore.updateMachineSetting(id, { m: machineId });
        const result = runStoreRecalculation(pinia, "row-machine-change");
        persistLegacyState("machine");
        return result;
      });
    },
    updateAccType(id: number | string, accType: string) {
      return withHydratedLegacyState(pinia, () => {
        const settingsStore = useSettingsStore(pinia);
        settingsStore.updateMachineSetting(id, { accType });
        const result = runStoreRecalculation(pinia, "row-acc-type-change");
        persistLegacyState("machine");
        return result;
      });
    },
    updateAccValue(id: number | string, accValue: string) {
      return withHydratedLegacyState(pinia, () => {
        const settingsStore = useSettingsStore(pinia);
        settingsStore.updateMachineSetting(id, { accValue });
        const result = runStoreRecalculation(pinia, "row-acc-value-change");
        persistLegacyState("machine");
        return result;
      });
    },
    updateMachineSpeed(machineId: string, speed: number) {
      return withHydratedLegacyState(pinia, () => {
        const settingsStore = useSettingsStore(pinia);
        settingsStore.updateSpeedSetting(machineId, speed);
        const result = runStoreRecalculation(pinia, "machine-speed-change");
        persistLegacyState("speed");
        return result;
      });
    },
    updateRecipeSelection(name: string, value: unknown) {
      return withHydratedLegacyState(pinia, () => {
        const settingsStore = useSettingsStore(pinia);
        settingsStore.updateRecipeSetting(name, value);
        const result = runStoreRecalculation(pinia, "row-recipe-change");
        persistLegacyState("recipe");
        return result;
      });
    },
    updateGlobalSetting(key: string, value: unknown, reason?: string) {
      return withHydratedLegacyState(pinia, () => {
        const settingsStore = useSettingsStore(pinia);
        if (key !== "selmodein" && key !== "furnace" && key !== "chemical" && key !== "research" && key !== "accType" && key !== "accValue") {
          return runStoreRecalculation(pinia, "global-setting-noop");
        }
        settingsStore.updateGlobalSetting(key, value);
        if (key === "accType" || key === "accValue") {
          settingsStore.clearMachineSettingField(key);
        }
        const result = runStoreRecalculation(pinia, typeof reason === "string" && reason ? reason : "global-setting-change");
        persistLegacyState("global");
        if (key === "accType" || key === "accValue") {
          persistLegacyState("machine");
        }
        return result;
      });
    },
    updateRuntimeOptions(patch: Record<string, unknown>, reason?: string) {
      return withHydratedLegacyState(pinia, () => {
        const settingsStore = useSettingsStore(pinia);
        settingsStore.updateRuntimeOptions(patch);
        return runStoreRecalculation(pinia, typeof reason === "string" && reason ? reason : "runtime-options-change");
      });
    },
    resetMachineSettings() {
      return withHydratedLegacyState(pinia, () => {
        const settingsStore = useSettingsStore(pinia);
        settingsStore.resetMachineSettings();
        const result = runStoreRecalculation(pinia, "reset-machine-settings");
        persistLegacyState("machine");
        return result;
      });
    },
    resetSpeedSettings() {
      return withHydratedLegacyState(pinia, () => {
        const settingsStore = useSettingsStore(pinia);
        settingsStore.resetSpeedSettings();
        const result = runStoreRecalculation(pinia, "reset-speed-settings");
        persistLegacyState("speed");
        return result;
      });
    },
    resetRecipeSettings() {
      return withHydratedLegacyState(pinia, () => {
        const settingsStore = useSettingsStore(pinia);
        settingsStore.resetRecipeSettings();
        const result = runStoreRecalculation(pinia, "reset-recipe-settings");
        persistLegacyState("recipe");
        return result;
      });
    },
    saveProject(name: string) {
      const projectsStore = useProjectsStore(pinia);
      ensureLegacyStateHydrated(pinia);
      projectsStore.replaceProject(createProjectSnapshotFromStores(pinia, name));
      syncLegacyProjection(pinia);
      persistLegacyState("project");
      return projectsStore.loadProject(name);
    },
    loadProject(name: string) {
      const projectsStore = useProjectsStore(pinia);
      ensureLegacyStateHydrated(pinia);
      projectsStore.selectProject(name);
      const project = projectsStore.loadProject(name);
      if (!project) {
        return null;
      }
      hydrateProjectIntoStores(pinia, project);
      return runStoreRecalculation(pinia, "load-project");
    },
    resetProject() {
      const projectsStore = useProjectsStore(pinia);
      ensureLegacyStateHydrated(pinia);
      projectsStore.resetProject();
      syncLegacyProjection(pinia);
      return null;
    },
    clearProjects() {
      const projectsStore = useProjectsStore(pinia);
      ensureLegacyStateHydrated(pinia);
      projectsStore.clearProjects();
      syncLegacyProjection(pinia);
      persistLegacyState("project");
      return null;
    },
    resetAllRuntimeState() {
      return withHydratedLegacyState(pinia, () => {
        resetStoreOwnedRuntimeState(pinia);
        clearScopedRuntimeStorage();
        reloadRuntimePage();
        return true;
      });
    },
  };
}

export function initializeLegacyCommandBridge(pinia: Pinia): LegacyCommandBridge {
  hasHydratedLegacyState = false;
  cancelNextFrame(scheduledRecalculateHandle);
  scheduledRecalculateHandle = null;
  scheduledReason = "";
  const registry = createLegacyCommandRegistry(pinia);
  legacyCommandBridge = {
    has(commandName: string): boolean {
      return Object.prototype.hasOwnProperty.call(registry, commandName);
    },
    invoke<T = unknown>(commandName: string, ...args: unknown[]): T | undefined {
      const handler = registry[commandName];
      if (!handler) {
        return undefined;
      }
      return handler(...args) as T;
    },
  };
  window.DSQCommandBridge = legacyCommandBridge;
  return legacyCommandBridge;
}

export function getLegacyCommandBridge(): LegacyCommandBridge {
  if (!legacyCommandBridge) {
    throw new Error("legacy command bridge has not been initialized");
  }
  return legacyCommandBridge;
}
