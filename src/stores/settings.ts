import { defineStore } from "pinia";

import { cloneJsonValue } from "../types/dsq";
import { dsqServices } from "../services/app-services";
import {
  normalizeMachineSettingsForStorage,
  normalizeMachineSettingRecord,
  normalizeSpeedSettingsForStorage,
} from "../services/legacy-storage";
import {
  createDefaultCalculationRuntimeOptions,
  createDefaultGlobalSettings,
  normalizeCalculationRuntimeOptions,
  type CalculationRuntimeOptions,
  type GlobalSettings,
  type MachineSettingRecord,
  type MachineSettingsSnapshot,
  type SpeedSettingsSnapshot,
} from "../types/dsq";

interface SettingsState {
  global: GlobalSettings;
  machineSettings: MachineSettingsSnapshot;
  speedSettings: SpeedSettingsSnapshot;
  recipeSettings: Record<string, unknown>;
  runtimeOptions: CalculationRuntimeOptions;
}

export const useSettingsStore = defineStore("settings", {
  state: (): SettingsState => ({
    global: createDefaultGlobalSettings(),
    machineSettings: {},
    speedSettings: {},
    recipeSettings: {},
    runtimeOptions: createDefaultCalculationRuntimeOptions(),
  }),
  getters: {
    hasMachineOverrides: state => Object.keys(state.machineSettings).length > 0,
    hasSpeedOverrides: state => Object.keys(state.speedSettings).length > 0,
    hasRecipeOverrides: state => Object.keys(state.recipeSettings).length > 0,
  },
  actions: {
    hydrateGlobalSettings(snapshot: Partial<GlobalSettings> | undefined) {
      this.global = dsqServices.globalSettings.createSnapshot(snapshot);
    },
    hydrateMachineSettings(snapshot: MachineSettingsSnapshot | undefined) {
      this.machineSettings = normalizeMachineSettingsForStorage(snapshot);
    },
    hydrateSpeedSettings(snapshot: SpeedSettingsSnapshot | undefined) {
      this.speedSettings = normalizeSpeedSettingsForStorage(snapshot);
    },
    hydrateRecipeSettings(snapshot: Record<string, unknown> | undefined) {
      this.recipeSettings =
        snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? cloneJsonValue(snapshot, {}) : {};
    },
    applyRuntimeOptions(snapshot: Partial<CalculationRuntimeOptions> | undefined) {
      this.runtimeOptions = normalizeCalculationRuntimeOptions(snapshot);
    },
    updateGlobalSetting(key: keyof GlobalSettings, value: unknown) {
      this.hydrateGlobalSettings({
        ...this.global,
        [key]: value,
      });
    },
    updateMachineSetting(id: number | string, patch: Partial<MachineSettingRecord>) {
      const nextKey = String(id);
      const currentValue = this.machineSettings[nextKey] || {};
      this.machineSettings = {
        ...this.machineSettings,
        [nextKey]: normalizeMachineSettingRecord({
          ...currentValue,
          ...patch,
        }),
      };
    },
    resetMachineSettings() {
      this.machineSettings = {};
    },
    updateSpeedSetting(machineId: string, value: number) {
      if (!machineId) {
        return;
      }
      this.speedSettings = normalizeSpeedSettingsForStorage({
        ...this.speedSettings,
        [machineId]: value,
      });
    },
    resetSpeedSettings() {
      this.speedSettings = {};
    },
    updateRecipeSetting(name: string, value: unknown) {
      if (!name) {
        return;
      }
      this.recipeSettings = {
        ...this.recipeSettings,
        [name]: value,
      };
    },
    resetRecipeSettings() {
      this.recipeSettings = {};
    },
    hydrateLegacySettings(snapshot: {
      global?: Partial<GlobalSettings>;
      machine?: MachineSettingsSnapshot;
      speed?: SpeedSettingsSnapshot;
      recipe?: Record<string, unknown>;
      runtimeOptions?: Partial<CalculationRuntimeOptions>;
    }) {
      this.hydrateGlobalSettings(snapshot.global);
      this.hydrateMachineSettings(snapshot.machine);
      this.hydrateSpeedSettings(snapshot.speed);
      this.hydrateRecipeSettings(snapshot.recipe);
      this.applyRuntimeOptions(snapshot.runtimeOptions);
    },
  },
});
