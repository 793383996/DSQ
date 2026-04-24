import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useSettingsStore } from "./settings";

describe("settings store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("hydrates and normalizes legacy settings into store state", () => {
    const store = useSettingsStore();

    store.hydrateLegacySettings({
      global: {
        selmodein: "bad-machine",
        furnace: "位面熔炉",
        chemical: "bad-chemical",
        research: "自演化研究站",
        accType: "增产剂Mk.Ⅱ",
        accValue: "加速",
      },
      machine: {
        1: { m: "原油精炼机", accType: "增产剂Mk.Ⅰ", accValue: "增产" },
      },
      speed: {
        原油精炼机: 2,
        badMachine: 0,
      },
      recipe: {
        gear: 3,
      },
    });

    expect(store.global).toEqual({
      selmodein: "assemblingMachineMk1",
      furnace: "planeSmelter",
      chemical: "chemicalPlant",
      research: "selfEvolutionLab",
      accType: "proliferatorMk2",
      accValue: "speedup",
    });
    expect(store.machineSettings).toEqual({
      1: { m: "oilRefinery", accType: "proliferatorMk1", accValue: "extra" },
    });
    expect(store.speedSettings).toEqual({
      oilRefinery: 2,
    });
    expect(store.recipeSettings).toEqual({
      gear: 3,
    });
    expect(store.hasMachineOverrides).toBe(true);
    expect(store.hasSpeedOverrides).toBe(true);
    expect(store.hasRecipeOverrides).toBe(true);
  });
});
