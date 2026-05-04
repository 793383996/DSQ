// @vitest-environment jsdom

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBlueprintStore } from "../stores/blueprint";
import { useCalculationStore } from "../stores/calculation";
import { useProjectsStore } from "../stores/projects";
import { useSettingsStore } from "../stores/settings";
import { useUiStore } from "../stores/ui";
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
  version?: string;
  __DSQReloadPage?: () => void;
};

describe("legacy command bridge", () => {
  const runtimeWindow = globalThis as RuntimeWindow;
  const elements = new Map<string, FakeLegacyElement>();
  const reloadSpy = vi.fn();

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
    runtimeWindow.version = "test";
    runtimeWindow.__DSQReloadPage = reloadSpy;
    localStorage.clear();
    installFakeLegacyCalculationRuntime(runtimeWindow);
    reloadSpy.mockReset();
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
    Reflect.deleteProperty(runtimeWindow, "version");
    Reflect.deleteProperty(runtimeWindow, "__DSQReloadPage");
    Reflect.deleteProperty(runtimeWindow, "currentCalculationResult");
    Reflect.deleteProperty(runtimeWindow, "window");
    localStorage.clear();
    reloadSpy.mockReset();
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

  it("exposes requirement drafts and blueprint config from store-owned state", () => {
    const pinia = createPinia();
    const bridge = initializeLegacyCommandBridge(pinia);

    bridge.invoke("setRequirementDraft", { ratePerMinute: 180, machineCount: 12 });
    expect(bridge.invoke("getRequirementDraft")).toEqual({
      ratePerMinute: 180,
      machineCount: 12,
    });
    expect(useUiStore(pinia).requirementDraft).toEqual({
      ratePerMinute: 180,
      machineCount: 12,
    });

    bridge.invoke(
      "updateRuntimeOptions",
      {
        onlySorterMk3: false,
        useSorterMk4: true,
        conveyorBeltStackLayer: 3,
        maxLabLayers: 9,
        generateTeslaTower: false,
        teslaTowerLineInterval: 2,
        stackLayers: true,
        xToYRatio: 1.5,
        selfAcc: false,
      },
      "blueprint-config-change"
    );

    expect(bridge.invoke("getCurrentBlueprintConfig")).toEqual(
      expect.objectContaining({
        conveyorBeltStackLayer: 3,
        useSorterMk4: true,
        onlySorterMk3: false,
        maxLabLayers: 9,
        generateTeslaTower: false,
        teslaTowerLineInterval: 2,
        x_y_ratio: 1.5,
        selfSpray: false,
        stackLayers: 4,
      })
    );
    expect(useBlueprintStore(pinia).config.useSorterMk4).toBe(true);
  });

  it("exposes selector catalog and split payload while adding requirements by name through the bridge", () => {
    const pinia = createPinia();
    const bridge = initializeLegacyCommandBridge(pinia);

    expect(bridge.invoke("getRequirementSelectorCatalog")).toEqual(
      expect.objectContaining({
        sections: expect.arrayContaining([
          expect.objectContaining({
            id: "components",
            items: expect.arrayContaining([
              expect.objectContaining({
                name: "铁块",
                iconValue: "iron-icon",
              }),
            ]),
          }),
          expect.objectContaining({
            id: "buildings",
            items: expect.arrayContaining([
              expect.objectContaining({
                name: "电弧熔炉",
                iconValue: "smelter-icon",
              }),
            ]),
          }),
        ]),
      })
    );

    bridge.invoke("setRequirementDraft", { ratePerMinute: 60, machineCount: 2 });
    bridge.invoke("addRequirementByName", "铜块");

    expect(useCalculationStore(pinia).requirements).toEqual([
      { item: { name: "铁块", itemId: "ironIngot" }, number: 60 },
      expect.objectContaining({
        item: expect.objectContaining({
          name: "铜块",
          itemId: "copperIngot",
        }),
        number: 120,
      }),
    ]);

    expect(bridge.invoke("getSplitDialogPayload", "铁块")).toEqual({
      itemName: "铁块",
      recipes: [
        { id: 2, titleHtml: "<span>铁块</span><sub></sub>" },
        { id: 4, titleHtml: "<span>铁块</span><sub></sub>" },
      ],
      defaultNumber: 1,
    });
    expect(bridge.invoke("getSplitDialogPayload", "铜块")).toBeNull();
  });

  it("tracks blueprint lifecycle commands and clears runtime state on full reset", () => {
    const pinia = createPinia();
    const bridge = initializeLegacyCommandBridge(pinia);

    bridge.invoke("syncFromLegacyAndRecalculate", "initial-pass");
    bridge.invoke("startBlueprintGeneration", { protocol: "https:" });
    expect(useBlueprintStore(pinia).isGenerating).toBe(true);

    bridge.invoke("finishBlueprintGeneration", {
      text: "blueprint-code",
      durationMs: 1200,
      meta: { recipeCount: 1 },
    });
    expect(useBlueprintStore(pinia).isGenerating).toBe(false);
    expect(useBlueprintStore(pinia).lastResult).toEqual(
      expect.objectContaining({
        text: "blueprint-code",
        durationMs: 1200,
      })
    );

    bridge.invoke("startBlueprintGeneration");
    bridge.invoke("failBlueprintGeneration", new Error("blueprint_failed"));
    expect(useBlueprintStore(pinia).isGenerating).toBe(false);
    expect(useBlueprintStore(pinia).errorMessage).toBe("blueprint_failed");

    localStorage.setItem("machine_settingstest", "{}");
    localStorage.setItem("settings_projectstest", "[]");
    localStorage.setItem("dsq:vue3:bootstrap", JSON.stringify({ locale: "zh-CN" }));

    bridge.invoke("resetAllRuntimeState");

    expect(useCalculationStore(pinia).requirements).toEqual([]);
    expect(useCalculationStore(pinia).singleMake).toEqual([]);
    expect(useCalculationStore(pinia).excludedNames).toEqual([]);
    expect(useProjectsStore(pinia).items).toEqual([]);
    expect(useSettingsStore(pinia).machineSettings).toEqual({});
    expect(useSettingsStore(pinia).speedSettings).toEqual({});
    expect(useSettingsStore(pinia).recipeSettings).toEqual({});
    expect(useBlueprintStore(pinia).isGenerating).toBe(false);
    expect(localStorage.getItem("machine_settingstest")).toBeNull();
    expect(localStorage.getItem("settings_projectstest")).toBeNull();
    expect(localStorage.getItem("dsq:vue3:bootstrap")).toBeNull();
    expect(reloadSpy).toHaveBeenCalled();
  });
});
