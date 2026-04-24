import { defineStore } from "pinia";

import { createDefaultGlobalSettings, type GlobalSettings } from "../types/dsq";

interface SettingsState {
  global: GlobalSettings;
  machineSettings: Record<string, Record<string, unknown>>;
  speedSettings: Record<string, number>;
  recipeSettings: Record<string, number>;
}

function normalizeGlobalSettings(nextValue: Partial<GlobalSettings> | undefined): GlobalSettings {
  const defaults = createDefaultGlobalSettings();
  if (!nextValue) {
    return defaults;
  }
  const output = { ...defaults };
  const entries = Object.entries(nextValue) as Array<[keyof GlobalSettings, unknown]>;
  for (const [key, value] of entries) {
    if (typeof value === "string" && value.length > 0) {
      output[key] = value;
    }
  }
  return output;
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
      this.global = normalizeGlobalSettings(snapshot);
    },
  },
});
