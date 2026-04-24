import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { createEmptyCalculationOutput } from "../types/dsq";
import { useCalculationStore } from "./calculation";

describe("calculation store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("builds a fallback result from current requirements when no legacy result exists", () => {
    const store = useCalculationStore();
    store.hydrateRequirements([
      {
        item: { name: "铁块" },
        number: 60,
      },
    ]);
    store.hydrateCalculationResult(null);

    expect(store.requirementCount).toBe(1);
    expect(store.effectiveResult.requirements).toHaveLength(1);
    expect(store.effectiveResult.seoSnapshot.requirementCount).toBe(1);
    expect(store.effectiveResult.seoSnapshot.primaryItemName).toBe("铁块");
    expect(store.effectiveResult.seoSnapshot.primaryRatePerMinute).toBe(60);
  });

  it("prefers the hydrated legacy result when one is available", () => {
    const store = useCalculationStore();
    const legacyResult = createEmptyCalculationOutput();
    legacyResult.seoSnapshot.requirementCount = 9;
    legacyResult.productionLines = [{ id: "legacy-line" }];

    store.hydrateRequirements([
      {
        item: { name: "铁块" },
        number: 60,
      },
    ]);
    store.hydrateCalculationResult(legacyResult);

    expect(store.effectiveResult.seoSnapshot.requirementCount).toBe(9);
    expect(store.effectiveResult.productionLines).toEqual([{ id: "legacy-line" }]);
  });
});
