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
      runtimeOptions: {
        pointLength: 4,
        hideSource: true,
        showMaxOneBelt: true,
        oilSpeed: 6,
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
    expect(store.runtimeOptions.pointLength).toBe(4);
    expect(store.runtimeOptions.hideSource).toBe(true);
    expect(store.runtimeOptions.showMaxOneBelt).toBe(true);
    expect(store.runtimeOptions.oilSpeed).toBe(6);
    expect(store.hasMachineOverrides).toBe(true);
    expect(store.hasSpeedOverrides).toBe(true);
    expect(store.hasRecipeOverrides).toBe(true);
  });

  it("updates runtime and machine settings through explicit actions", () => {
    const store = useSettingsStore();

    store.updateMachineSetting(9, {
      m: "位面熔炉",
      accType: "增产剂Mk.Ⅲ",
      accValue: "加速",
    });
    store.applyRuntimeOptions({
      pointLength: 2,
      selfAcc: false,
      conveyorBeltType: "conveyorBeltMk2",
    });

    expect(store.machineSettings["9"]).toEqual({
      m: "planeSmelter",
      accType: "proliferatorMk3",
      accValue: "speedup",
    });
    expect(store.runtimeOptions.pointLength).toBe(2);
    expect(store.runtimeOptions.selfAcc).toBe(false);
    expect(store.runtimeOptions.conveyorBeltType).toBe("conveyorBeltMk2");
  });
});
