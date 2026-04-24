import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyCalculationOutput } from "../types/dsq";
import { useCalculationStore } from "../stores/calculation";
import { useProjectsStore } from "../stores/projects";
import { initializeLegacyCommandBridge } from "./legacy-command-bridge";

type FakeElement = {
  value?: string;
  checked?: boolean;
};

type RuntimeWindow = typeof globalThis & {
  window?: unknown;
  document?: {
    getElementById: (id: string) => FakeElement | null;
  };
  DSQI18n?: {
    refresh?: () => void;
    updateSeoState?: (snapshot: unknown) => void;
  };
  buildCalculationResult?: () => ReturnType<typeof createEmptyCalculationOutput>;
  currentCalculationResult?: unknown;
  xqs?: Array<Record<string, unknown>>;
  singleMake?: Array<Record<string, unknown>>;
  ig_names?: string[];
  app?: {
    $nextTick?: (callback: () => void) => void;
    [key: string]: unknown;
  } | null;
  saveSetting?: () => void;
  saveSettingPf?: () => void;
  saveSettingProjects?: () => void;
};

describe("legacy command bridge", () => {
  const runtimeWindow = globalThis as RuntimeWindow;
  const elements = new Map<string, FakeElement>();

  beforeEach(() => {
    setActivePinia(createPinia());
    elements.clear();
    ["pointLength", "speed1_5", "selore", "speed1_6", "speed1_1", "speed1_2", "speed1_3", "speed1_4", "fractionatorSpeed", "oilSpeed", "gzSpeed", "conveyorBeltStackLayer", "teslaTowerLineInterval", "maxLabLayers", "x_y_ratio"].forEach(
      id => {
        elements.set(id, { value: "1" });
      }
    );
    ["hideSource", "showMaxOneBelt", "isMerge", "isAddSelfAccP", "selfAcc", "onlyConveyorBeltMk3", "onlySorterMk3", "useSorterMk4", "generateTeslaTower", "stackLayers"].forEach(
      id => {
        elements.set(id, { checked: false });
      }
    );
    elements.set("csd", { value: "conveyorBeltMk3" });

    Reflect.set(globalThis, "window", runtimeWindow);
    runtimeWindow.document = {
      getElementById: (id: string) => elements.get(id) ?? null,
    };
    runtimeWindow.DSQI18n = {
      refresh: vi.fn(),
      updateSeoState: vi.fn(),
    };
    runtimeWindow.app = {
      $nextTick(callback: () => void) {
        callback();
      },
    };
    runtimeWindow.xqs = [];
    runtimeWindow.singleMake = [];
    runtimeWindow.ig_names = [];
    runtimeWindow.saveSetting = vi.fn();
    runtimeWindow.saveSettingPf = vi.fn();
    runtimeWindow.saveSettingProjects = vi.fn();
    runtimeWindow.buildCalculationResult = () => {
      const result = createEmptyCalculationOutput();
      result.requirements = Array.isArray(runtimeWindow.xqs) ? runtimeWindow.xqs.slice() : [];
      result.seoSnapshot.requirementCount = result.requirements.length;
      result.seoSnapshot.primaryItemName = String(result.requirements[0]?.item?.name || "");
      result.blueprintSnapshot = {
        title: "bridge",
        subRecipes: [],
      };
      return result;
    };
  });

  afterEach(() => {
    delete runtimeWindow.document;
    delete runtimeWindow.DSQI18n;
    delete runtimeWindow.app;
    delete runtimeWindow.xqs;
    delete runtimeWindow.singleMake;
    delete runtimeWindow.ig_names;
    delete runtimeWindow.saveSetting;
    delete runtimeWindow.saveSettingPf;
    delete runtimeWindow.saveSettingProjects;
    delete runtimeWindow.buildCalculationResult;
    delete runtimeWindow.currentCalculationResult;
    delete runtimeWindow.window;
  });

  it("exposes an explicit command registry and recalculates from store-owned state", () => {
    const pinia = createPinia();
    const bridge = initializeLegacyCommandBridge(pinia);

    expect(bridge.has("addRequirement")).toBe(true);
    expect(bridge.has("f_add")).toBe(false);

    bridge.invoke("addRequirement", { name: "铁块", itemId: "ironIngot" }, 60);

    expect(useCalculationStore(pinia).requirements).toEqual([{ item: { name: "铁块", itemId: "ironIngot" }, number: 60 }]);
    expect(useCalculationStore(pinia).currentResult?.seoSnapshot.requirementCount).toBe(1);
    expect(runtimeWindow.currentCalculationResult).toEqual(
      expect.objectContaining({
        blueprintSnapshot: expect.objectContaining({ title: "bridge" }),
      })
    );
  });

  it("saves and loads projects through explicit store-backed commands", () => {
    const pinia = createPinia();
    const bridge = initializeLegacyCommandBridge(pinia);

    bridge.invoke("addRequirement", { name: "铜块" }, 90);
    bridge.invoke("appendSingleMake", { id: 3, number: 2 });
    bridge.invoke("addExcludedName", "氢");
    bridge.invoke("saveProject", "Alpha");

    expect(useProjectsStore(pinia).items).toHaveLength(1);
    expect(runtimeWindow.saveSettingProjects).toHaveBeenCalled();

    bridge.invoke("resetRequirements");
    bridge.invoke("clearExcludedNames");

    expect(useCalculationStore(pinia).requirements).toEqual([]);
    expect(useCalculationStore(pinia).excludedNames).toEqual([]);

    bridge.invoke("loadProject", "Alpha");

    expect(useCalculationStore(pinia).requirements[0]?.item?.name).toBe("铜块");
    expect(useCalculationStore(pinia).singleMake).toEqual([{ id: 3, number: 2 }]);
    expect(useCalculationStore(pinia).excludedNames).toEqual(["氢"]);
  });
});
