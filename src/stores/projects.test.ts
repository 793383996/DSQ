import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useProjectsStore } from "./projects";

describe("projects store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("saves, overwrites, loads, and resets projects", () => {
    const store = useProjectsStore();

    store.saveProject("Alpha", {
      singleMake: [{ id: 1, number: 2 }],
      ig_names: ["氢"],
      value: [{ item: { name: "铁块" }, number: 60 }],
      settings: {
        1: { m: "原油精炼机" },
      },
      globalSettings: {
        selmodein: "assemblingMachineMk2",
        furnace: "arcSmelter",
        chemical: "chemicalPlant",
        research: "matrixLab",
        accType: "proliferatorMk1",
        accValue: "none",
      },
      speedSettings: {
        原油精炼机: 2,
      },
      recipeSettings: {
        gear: 3,
      },
      runtimeOptions: {
        pointLength: 4,
        hideSource: true,
        showMaxOneBelt: false,
        isMerge: false,
        isAddSelfAccP: false,
        selfAcc: true,
        manualGzSpeed: true,
        conveyorBeltType: "conveyorBeltMk3",
        stationStackLayer: 1,
        oreMultiplier: 100,
        advancedMinerMultiplier: 100,
        orbitalCollectorGasHydrogen: 1,
        orbitalCollectorDeuterium: 0.02,
        orbitalCollectorFireIce: 0.5,
        orbitalCollectorIceHydrogen: 0.5,
        fractionatorSpeed: 18,
        oilSpeed: 6,
        gzSpeed: 8,
        onlyConveyorBeltMk3: true,
        onlySorterMk3: true,
        useSorterMk4: false,
        conveyorBeltStackLayer: 4,
        generateTeslaTower: true,
        teslaTowerLineInterval: 1,
        maxLabLayers: 15,
        stackLayers: false,
        xToYRatio: 2,
      },
    });

    expect(store.items).toHaveLength(1);
    expect(store.activeProjectName).toBe("Alpha");
    expect(store.items[0]?.settings).toEqual({
      1: { m: "oilRefinery" },
    });

    store.saveProject("Alpha", {
      singleMake: [{ id: "pf-2", number: 5 }],
      ig_names: [],
      value: [{ item: { name: "铜块" }, number: 90 }],
      settings: {},
      globalSettings: {
        selmodein: "assemblingMachineMk3",
        furnace: "planeSmelter",
        chemical: "quantumChemicalPlant",
        research: "selfEvolutionLab",
        accType: "proliferatorMk3",
        accValue: "speedup",
      },
      speedSettings: {
        oilRefinery: 3,
      },
      recipeSettings: {
        copperIngot: 1,
      },
      runtimeOptions: {
        pointLength: 2,
        hideSource: false,
        showMaxOneBelt: true,
        isMerge: true,
        isAddSelfAccP: true,
        selfAcc: false,
        manualGzSpeed: false,
        conveyorBeltType: "conveyorBeltMk2",
        stationStackLayer: 2,
        oreMultiplier: 150,
        advancedMinerMultiplier: 120,
        orbitalCollectorGasHydrogen: 1.1,
        orbitalCollectorDeuterium: 0.04,
        orbitalCollectorFireIce: 0.7,
        orbitalCollectorIceHydrogen: 0.6,
        fractionatorSpeed: 24,
        oilSpeed: 8,
        gzSpeed: 9,
        onlyConveyorBeltMk3: false,
        onlySorterMk3: false,
        useSorterMk4: true,
        conveyorBeltStackLayer: 3,
        generateTeslaTower: false,
        teslaTowerLineInterval: 2,
        maxLabLayers: 9,
        stackLayers: true,
        xToYRatio: 1.5,
      },
    });

    expect(store.items).toHaveLength(1);
    expect(store.loadProject("Alpha")).toEqual({
      name: "Alpha",
      singleMake: [{ id: "pf-2", number: 5 }],
      ig_names: [],
      value: [{ item: { name: "铜块" }, number: 90 }],
      settings: {},
      globalSettings: {
        selmodein: "assemblingMachineMk3",
        furnace: "planeSmelter",
        chemical: "quantumChemicalPlant",
        research: "selfEvolutionLab",
        accType: "proliferatorMk3",
        accValue: "speedup",
      },
      speedSettings: {
        oilRefinery: 3,
      },
      recipeSettings: {
        copperIngot: 1,
      },
      runtimeOptions: {
        pointLength: 2,
        hideSource: false,
        showMaxOneBelt: true,
        isMerge: true,
        isAddSelfAccP: true,
        selfAcc: false,
        manualGzSpeed: false,
        conveyorBeltType: "conveyorBeltMk2",
        stationStackLayer: 2,
        oreMultiplier: 150,
        advancedMinerMultiplier: 120,
        orbitalCollectorGasHydrogen: 1.1,
        orbitalCollectorDeuterium: 0.04,
        orbitalCollectorFireIce: 0.7,
        orbitalCollectorIceHydrogen: 0.6,
        fractionatorSpeed: 24,
        oilSpeed: 8,
        gzSpeed: 9,
        onlyConveyorBeltMk3: false,
        onlySorterMk3: false,
        useSorterMk4: true,
        conveyorBeltStackLayer: 3,
        generateTeslaTower: false,
        teslaTowerLineInterval: 2,
        maxLabLayers: 9,
        stackLayers: true,
        xToYRatio: 1.5,
      },
    });

    store.resetProject();
    expect(store.activeProjectName).toBeNull();
  });
});
