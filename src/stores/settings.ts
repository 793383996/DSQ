import { defineStore } from "pinia";

import { cloneJsonValue } from "../types/dsq";
import { dsqServices } from "../services/app-services";
import {
  normalizeMachineSettingsForStorage,
  normalizeSpeedSettingsForStorage,
} from "../services/legacy-storage";
import {
  createDefaultGlobalSettings,
  type GlobalSettings,
  type MachineSettingsSnapshot,
  type SpeedSettingsSnapshot,
} from "../types/dsq";

interface SettingsState {
  global: GlobalSettings;
  machineSettings: MachineSettingsSnapshot;
  speedSettings: SpeedSettingsSnapshot;
  recipeSettings: Record<string, unknown>;
}

export const useSettingsStore = defineStore("settings", {
  state: (): SettingsState => ({
    global: createDefaultGlobalSettings(),
    machineSettings: {},
    speedSettings: {},
    recipeSettings: {},
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
    hydrateLegacySettings(snapshot: {
      global?: Partial<GlobalSettings>;
      machine?: MachineSettingsSnapshot;
      speed?: SpeedSettingsSnapshot;
      recipe?: Record<string, unknown>;
    }) {
      this.hydrateGlobalSettings(snapshot.global);
      this.hydrateMachineSettings(snapshot.machine);
      this.hydrateSpeedSettings(snapshot.speed);
      this.hydrateRecipeSettings(snapshot.recipe);
    },
  },
});
