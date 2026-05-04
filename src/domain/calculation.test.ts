import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { installFakeLegacyCalculationRuntime, uninstallFakeLegacyCalculationRuntime } from "../test-support/fake-legacy-runtime";
import { calculateProductionPlan } from "./calculation";
import {
  createDefaultCalculationRuntimeOptions,
  createDefaultGlobalSettings,
  type CalculationSnapshot,
} from "../types/dsq";

function createSnapshot(): CalculationSnapshot {
  return {
    requirements: [
      {
        item: { name: "铁块", itemId: "ironIngot" },
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
    currentResult: null,
  };
}

describe("calculateProductionPlan", () => {
  const runtimeWindow = globalThis as typeof globalThis & {
    window?: unknown;
  };

  beforeEach(() => {
    Reflect.set(globalThis, "window", runtimeWindow);
  });

  afterEach(() => {
    uninstallFakeLegacyCalculationRuntime(runtimeWindow);
    Reflect.deleteProperty(runtimeWindow, "window");
  });

  it("builds results from the typed legacy runtime adapter when runtime data is available", () => {
    installFakeLegacyCalculationRuntime(runtimeWindow);

    const result = calculateProductionPlan(createSnapshot());

    expect(result.requirements[0]?.item?.name).toBe("铁块");
    expect(result.productionLines).toHaveLength(2);
    expect(result.seoSnapshot.requirementCount).toBe(1);
    expect(result.seoSnapshot.primaryItemName).toBe("铁块");
    expect(result.blueprintSnapshot?.title).toContain("铁块");
  });

  it("falls back to a typed placeholder output when runtime data is unavailable", () => {
    const result = calculateProductionPlan(createSnapshot());

    expect(result.requirements).toHaveLength(1);
    expect(result.seoSnapshot.requirementCount).toBe(1);
    expect(result.seoSnapshot.primaryItemName).toBe("铁块");
    expect(result.blueprintSnapshot?.outputIds).toEqual(["ironIngot"]);
  });
});
