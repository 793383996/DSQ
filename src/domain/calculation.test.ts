import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { calculateProductionPlan } from "./calculation";
import {
  createDefaultCalculationRuntimeOptions,
  createDefaultGlobalSettings,
  createEmptyCalculationOutput,
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
    buildCalculationResult?: () => ReturnType<typeof createEmptyCalculationOutput>;
  };

  beforeEach(() => {
    Reflect.set(globalThis, "window", runtimeWindow);
  });

  afterEach(() => {
    delete runtimeWindow.buildCalculationResult;
    delete runtimeWindow.window;
  });

  it("uses the legacy calculation builder when it is available", () => {
    runtimeWindow.buildCalculationResult = () => {
      const result = createEmptyCalculationOutput();
      result.requirements = [{ item: { name: "铜块" }, number: 120 }];
      result.productionLines = [{ id: "legacy-line" }];
      result.seoSnapshot.requirementCount = 1;
      result.blueprintSnapshot = {
        title: "legacy",
        subRecipes: [],
      };
      return result;
    };

    const result = calculateProductionPlan(createSnapshot());

    expect(result.requirements[0]?.item?.name).toBe("铜块");
    expect(result.productionLines).toEqual([{ id: "legacy-line" }]);
    expect(result.blueprintSnapshot?.title).toBe("legacy");
  });

  it("falls back to a typed placeholder output when legacy runtime is unavailable", () => {
    const result = calculateProductionPlan(createSnapshot());

    expect(result.requirements).toHaveLength(1);
    expect(result.seoSnapshot.requirementCount).toBe(1);
    expect(result.seoSnapshot.primaryItemName).toBe("铁块");
    expect(result.blueprintSnapshot?.outputIds).toEqual(["ironIngot"]);
  });
});
