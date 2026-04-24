import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createDefaultCalculationRuntimeOptions,
  createDefaultGlobalSettings,
  createEmptyCalculationOutput,
} from "../types/dsq";
import { useCalculationStore } from "./calculation";

describe("calculation store", () => {
  const runtimeWindow = globalThis as typeof globalThis & {
    window?: unknown;
    buildCalculationResult?: () => ReturnType<typeof createEmptyCalculationOutput>;
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    Reflect.set(globalThis, "window", runtimeWindow);
    delete runtimeWindow.buildCalculationResult;
  });

  it("builds a fallback result from current requirements when no legacy result exists", () => {
    const store = useCalculationStore();
    store.setRequirements([
      {
        item: { name: "铁块", itemId: "ironIngot" },
        number: 60,
      },
    ]);
    store.setSingleMake([{ id: 7, number: 2 }]);
    store.setExcludedNames(["氢"]);
    store.hydrateCalculationResult(null);

    expect(store.requirementCount).toBe(1);
    expect(store.singleMake).toEqual([{ id: 7, number: 2 }]);
    expect(store.excludedNames).toEqual(["氢"]);
    expect(store.effectiveResult.requirements).toHaveLength(1);
    expect(store.effectiveResult.seoSnapshot.requirementCount).toBe(1);
    expect(store.effectiveResult.seoSnapshot.primaryItemName).toBe("铁块");
    expect(store.effectiveResult.seoSnapshot.primaryRatePerMinute).toBe(60);
  });

  it("recalculates through the domain entrypoint and records the last reason", () => {
    runtimeWindow.buildCalculationResult = () => {
      const result = createEmptyCalculationOutput();
      result.requirements = [{ item: { name: "铜块" }, number: 30 }];
      result.seoSnapshot.requirementCount = 3;
      result.productionLines = [{ id: "legacy-line" }];
      return result;
    };

    const store = useCalculationStore();
    const result = store.recalculate(
      {
        requirements: [
          {
            item: { name: "铁块" },
            number: 60,
          },
        ],
        singleMake: [],
        excludedNames: [],
        globalSettings: createDefaultGlobalSettings(),
        machineSettings: {},
        speedSettings: {},
        recipeSettings: {},
        runtimeOptions: createDefaultCalculationRuntimeOptions(),
      },
      "store-contract"
    );

    expect(result.seoSnapshot.requirementCount).toBe(3);
    expect(store.currentResult?.productionLines).toEqual([{ id: "legacy-line" }]);
    expect(store.lastReason).toBe("store-contract");
  });
});
