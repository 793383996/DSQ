import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { installFakeLegacyCalculationRuntime, uninstallFakeLegacyCalculationRuntime } from "../test-support/fake-legacy-runtime";
import {
  createDefaultCalculationRuntimeOptions,
  createDefaultGlobalSettings,
} from "../types/dsq";
import { useCalculationStore } from "./calculation";

describe("calculation store", () => {
  const runtimeWindow = globalThis as typeof globalThis & {
    window?: unknown;
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    Reflect.set(globalThis, "window", runtimeWindow);
    uninstallFakeLegacyCalculationRuntime(runtimeWindow);
  });

  afterEach(() => {
    uninstallFakeLegacyCalculationRuntime(runtimeWindow);
    Reflect.deleteProperty(runtimeWindow, "window");
  });

  it("builds a fallback result from current requirements when runtime data is unavailable", () => {
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

  it("recalculates through the typed domain entrypoint and records the last reason", () => {
    installFakeLegacyCalculationRuntime(runtimeWindow);

    const store = useCalculationStore();
    const result = store.recalculate(
      {
        requirements: [
          {
            item: { name: "铜块", itemId: "copperIngot" },
            number: 30,
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

    expect(result.seoSnapshot.requirementCount).toBe(1);
    expect(store.currentResult?.productionLines).toHaveLength(2);
    expect(store.lastReason).toBe("store-contract");
  });
});
