import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCalculationStore } from "../stores/calculation";
import { useProjectsStore } from "../stores/projects";
import { useSettingsStore } from "../stores/settings";
import { installFakeLegacyCalculationRuntime, uninstallFakeLegacyCalculationRuntime, type FakeLegacyElement } from "../test-support/fake-legacy-runtime";
import { initializeLegacyCommandBridge } from "./legacy-command-bridge";

type RuntimeWindow = typeof globalThis & {
  window?: unknown;
  document?: unknown;
  DSQI18n?: {
    refresh?: () => void;
    updateSeoState?: (snapshot: unknown) => void;
  };
  currentCalculationResult?: unknown;
  xqs?: Array<{ item?: { name?: string; itemId?: string }; number: number }>;
  singleMake?: Array<{ id: number | string; number: number }>;
  ig_names?: string[];
  app?: {
    $nextTick?: (callback: () => void) => void;
    [key: string]: unknown;
  } | null;
  saveSetting?: () => void;
  saveSettingTime?: () => void;
  saveGlobalSettings?: () => void;
  saveSettingPf?: () => void;
  saveSettingProjects?: () => void;
};

describe("legacy command bridge", () => {
  const runtimeWindow = globalThis as RuntimeWindow;
  const elements = new Map<string, FakeLegacyElement>();

  beforeEach(() => {
    setActivePinia(createPinia());
    elements.clear();
    [
      "pointLength",
      "speed1_5",
      "selore",
      "speed1_6",
      "speed1_1",
      "speed1_2",
      "speed1_3",
      "speed1_4",
      "fractionatorSpeed",
      "oilSpeed",
      "gzSpeed",
      "conveyorBeltStackLayer",
      "teslaTowerLineInterval",
      "maxLabLayers",
      "x_y_ratio",
    ].forEach(id => {
      elements.set(id, { value: "1" });
    });
    [
      "hideSource",
      "showMaxOneBelt",
      "isMerge",
      "isAddSelfAccP",
      "selfAcc",
      "onlyConveyorBeltMk3",
      "onlySorterMk3",
      "useSorterMk4",
      "generateTeslaTower",
      "stackLayers",
    ].forEach(id => {
      elements.set(id, { checked: false });
    });
    elements.set("csd", { value: "conveyorBeltMk3" });

    Reflect.set(globalThis, "window", runtimeWindow);
    runtimeWindow.document = {
      getElementById: (id: string) => elements.get(id) ?? null,
    } as unknown as Document;
    runtimeWindow.DSQI18n = {
      refresh: vi.fn(),
      updateSeoState: vi.fn(),
    };
    runtimeWindow.app = {
      $nextTick(callback: () => void) {
        callback();
      },
    };
    runtimeWindow.xqs = [{ item: { name: "铁块", itemId: "ironIngot" }, number: 60 }];
    runtimeWindow.singleMake = [];
    runtimeWindow.ig_names = [];
    runtimeWindow.saveSetting = vi.fn();
    runtimeWindow.saveSettingTime = vi.fn();
    runtimeWindow.saveGlobalSettings = vi.fn();
    runtimeWindow.saveSettingPf = vi.fn();
    runtimeWindow.saveSettingProjects = vi.fn();
    installFakeLegacyCalculationRuntime(runtimeWindow);
  });

  afterEach(() => {
    uninstallFakeLegacyCalculationRuntime(runtimeWindow);
    Reflect.deleteProperty(runtimeWindow, "document");
    Reflect.deleteProperty(runtimeWindow, "DSQI18n");
    Reflect.deleteProperty(runtimeWindow, "app");
    Reflect.deleteProperty(runtimeWindow, "xqs");
    Reflect.deleteProperty(runtimeWindow, "singleMake");
    Reflect.deleteProperty(runtimeWindow, "ig_names");
    Reflect.deleteProperty(runtimeWindow, "saveSetting");
    Reflect.deleteProperty(runtimeWindow, "saveSettingTime");
    Reflect.deleteProperty(runtimeWindow, "saveGlobalSettings");
    Reflect.deleteProperty(runtimeWindow, "saveSettingPf");
    Reflect.deleteProperty(runtimeWindow, "saveSettingProjects");
    Reflect.deleteProperty(runtimeWindow, "currentCalculationResult");
    Reflect.deleteProperty(runtimeWindow, "window");
  });

  it("hydrates from legacy once and then keeps recalculation store-first", () => {
    const pinia = createPinia();
    const bridge = initializeLegacyCommandBridge(pinia);

    expect(bridge.has("addRequirement")).toBe(true);
    expect(bridge.has("f_add")).toBe(false);

    bridge.invoke("syncFromLegacyAndRecalculate", "initial-compat-pass");
    expect(useCalculationStore(pinia).requirements).toEqual([{ item: { name: "铁块", itemId: "ironIngot" }, number: 60 }]);

    bridge.invoke("addRequirement", { name: "铜块", itemId: "copperIngot" }, 90);
    runtimeWindow.xqs = [{ item: { name: "错误覆盖", itemId: "copperIngot" }, number: 1 }];

    bridge.invoke("recalculate", "store-first-pass");

    expect(useCalculationStore(pinia).requirements).toEqual([
      { item: { name: "铁块", itemId: "ironIngot" }, number: 60 },
      { item: { name: "铜块", itemId: "copperIngot" }, number: 90 },
    ]);
    expect(useCalculationStore(pinia).lastReason).toBe("store-first-pass");
    expect(runtimeWindow.currentCalculationResult).toEqual(
      expect.objectContaining({
        blueprintSnapshot: expect.objectContaining({
          title: expect.stringContaining("铁块"),
        }),
      })
    );
  });

  it("saves and loads full project context through store-backed commands", () => {
    const pinia = createPinia();
    const bridge = initializeLegacyCommandBridge(pinia);

    bridge.invoke("syncFromLegacyAndRecalculate", "initial-project-pass");
    bridge.invoke("addRequirement", { name: "铜块", itemId: "copperIngot" }, 90);
    bridge.invoke("appendSingleMake", { id: 3, number: 2 });
    bridge.invoke("addExcludedName", "氢");
    bridge.invoke("updateGlobalSetting", "furnace", "planeSmelter", "global-furnace-change");
    bridge.invoke("updateMachineSpeed", "arcSmelter", 2);
    bridge.invoke("updateRuntimeOptions", { pointLength: 4, manualGzSpeed: true, gzSpeed: 8 }, "runtime-options-change");
    bridge.invoke("saveProject", "Alpha");

    expect(useProjectsStore(pinia).items).toHaveLength(1);
    expect(runtimeWindow.saveSettingProjects).toHaveBeenCalled();
    expect(runtimeWindow.saveSettingTime).toHaveBeenCalled();
    expect(runtimeWindow.saveGlobalSettings).toHaveBeenCalled();

    bridge.invoke("resetRequirements");
    bridge.invoke("clearExcludedNames");
    bridge.invoke("updateGlobalSetting", "furnace", "arcSmelter", "global-furnace-rollback");
    bridge.invoke("updateRuntimeOptions", { pointLength: 2, manualGzSpeed: false, gzSpeed: 5 }, "runtime-options-rollback");

    bridge.invoke("loadProject", "Alpha");

    expect(useCalculationStore(pinia).requirements[1]?.item?.name).toBe("铜块");
    expect(useCalculationStore(pinia).singleMake).toEqual([{ id: 3, number: 2 }]);
    expect(useCalculationStore(pinia).excludedNames).toEqual(["氢"]);
    expect(useSettingsStore(pinia).global.furnace).toBe("planeSmelter");
    expect(useSettingsStore(pinia).speedSettings.arcSmelter).toBe(2);
    expect(useSettingsStore(pinia).runtimeOptions).toMatchObject({
      pointLength: 4,
      manualGzSpeed: true,
      gzSpeed: 8,
    });
  });
});
