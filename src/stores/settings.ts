import { defineStore } from "pinia";

import { dsqServices } from "../services/app-services";
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
  actions: {
    hydrateGlobalSettings(snapshot: Partial<GlobalSettings> | undefined) {
      this.global = dsqServices.globalSettings.createSnapshot(snapshot);
    },
  },
});
