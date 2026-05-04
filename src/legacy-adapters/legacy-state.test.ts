import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAppStore } from "../stores/app";
import { useCalculationStore } from "../stores/calculation";
import { useProjectsStore } from "../stores/projects";
import { useSeoStore } from "../stores/seo";
import { useSettingsStore } from "../stores/settings";
import { useUiStore } from "../stores/ui";
import { syncLegacyProjection, syncLegacyRuntimeSnapshot } from "./legacy-state";

type FakeElement = {
  value?: string;
  checked?: boolean;
};

type LegacyInputEntry = [string, FakeElement];

type RuntimeWindow = typeof globalThis & {
  window?: unknown;
  document?: {
    getElementById: (id: string) => FakeElement | null;
  };
  DSQI18n?: {
    getLocale?: () => string;
    updateSeoState?: (snapshot: unknown) => void;
    refresh?: () => void;
  };
  settings?: Record<string, unknown>;
  global_settings?: Record<string, unknown>;
  settings_time?: Record<string, unknown>;
  settings_pf?: Record<string, unknown>;
  projects?: Array<Record<string, unknown>>;
  xqs?: Array<Record<string, unknown>>;
  singleMake?: Array<Record<string, unknown>>;
  ig_names?: string[];
  currentCalculationResult?: Record<string, unknown> | null;
  isDataLoaded?: boolean;
  currentItem?: {
    name?: string;
  } | null;
  pointLength?: number;
  manualGzSpeed?: boolean;
  app?: {
    $nextTick?: (callback: () => void) => void;
    [key: string]: unknown;
  } | null;
};

describe("legacy-state adapter", () => {
  const runtimeWindow = globalThis as RuntimeWindow;
  const updateSeoState = vi.fn();
  const elements = new Map<string, FakeElement>();

  beforeEach(() => {
    setActivePinia(createPinia());
    elements.clear();
    const runtimeInputs: LegacyInputEntry[] = [
      ["pointLength", { value: "4" }],
      ["hideSource", { checked: true }],
      ["showMaxOneBelt", { checked: true }],
      ["isMerge", { checked: false }],
      ["isAddSelfAccP", { checked: true }],
      ["selfAcc", { checked: false }],
      ["csd", { value: "conveyorBeltMk2" }],
      ["speed1_5", { value: "3" }],
      ["selore", { value: "120" }],
      ["speed1_6", { value: "150" }],
      ["speed1_1", { value: "1.2" }],
      ["speed1_2", { value: "0.05" }],
      ["speed1_3", { value: "0.8" }],
      ["speed1_4", { value: "0.7" }],
      ["fractionatorSpeed", { value: "24" }],
      ["oilSpeed", { value: "6" }],
      ["gzSpeed", { value: "7" }],
      ["onlyConveyorBeltMk3", { checked: false }],
      ["onlySorterMk3", { checked: true }],
      ["useSorterMk4", { checked: true }],
      ["conveyorBeltStackLayer", { value: "2" }],
      ["generateTeslaTower", { checked: false }],
      ["teslaTowerLineInterval", { value: "2" }],
      ["maxLabLayers", { value: "9" }],
      ["stackLayers", { checked: true }],
      ["x_y_ratio", { value: "1.5" }],
    ];
    runtimeInputs.forEach(([id, value]) => {
      elements.set(id, value);
    });

    Reflect.set(globalThis, "window", runtimeWindow);
    runtimeWindow.document = {
      getElementById: (id: string) => elements.get(id) ?? null,
    } as unknown as Document;
    runtimeWindow.DSQI18n = {
      getLocale: () => "en-US",
      updateSeoState,
      refresh: vi.fn(),
    };
    runtimeWindow.settings = {
      1: { m: "原油精炼机", accType: "增产剂Mk.Ⅰ", accValue: "加速" },
    };
    runtimeWindow.global_settings = {
      furnace: "位面熔炉",
      accType: "增产剂Mk.Ⅲ",
      accValue: "增产",
    };
    runtimeWindow.settings_time = {
      原油精炼机: 2,
    };
    runtimeWindow.settings_pf = {
      gear: 3,
    };
    runtimeWindow.projects = [
      {
        name: "Legacy",
        singleMake: [{ id: 1, number: 2 }],
        ig_names: ["氢"],
        value: [{ item: { name: "铁块" }, number: 60 }],
        settings: {
          1: { m: "射线接收塔" },
        },
      },
    ];
    runtimeWindow.xqs = [
      {
        item: { name: "铁块" },
        number: 60,
      },
    ];
    runtimeWindow.singleMake = [{ id: 4, number: 1.5 }];
    runtimeWindow.ig_names = ["石墨烯"];
    runtimeWindow.currentCalculationResult = null;
    runtimeWindow.isDataLoaded = true;
    runtimeWindow.currentItem = { name: "铁块" };
    runtimeWindow.pointLength = 4;
    runtimeWindow.manualGzSpeed = true;
    runtimeWindow.app = {
      $nextTick(callback: () => void) {
        callback();
      },
    };
  });

  afterEach(() => {
    updateSeoState.mockReset();
    Reflect.deleteProperty(runtimeWindow, "DSQI18n");
    Reflect.deleteProperty(runtimeWindow, "document");
    Reflect.deleteProperty(runtimeWindow, "settings");
    Reflect.deleteProperty(runtimeWindow, "global_settings");
    Reflect.deleteProperty(runtimeWindow, "settings_time");
    Reflect.deleteProperty(runtimeWindow, "settings_pf");
    Reflect.deleteProperty(runtimeWindow, "projects");
    Reflect.deleteProperty(runtimeWindow, "xqs");
    Reflect.deleteProperty(runtimeWindow, "singleMake");
    Reflect.deleteProperty(runtimeWindow, "ig_names");
    Reflect.deleteProperty(runtimeWindow, "currentCalculationResult");
    Reflect.deleteProperty(runtimeWindow, "isDataLoaded");
    Reflect.deleteProperty(runtimeWindow, "currentItem");
    Reflect.deleteProperty(runtimeWindow, "pointLength");
    Reflect.deleteProperty(runtimeWindow, "manualGzSpeed");
    Reflect.deleteProperty(runtimeWindow, "app");
    Reflect.deleteProperty(runtimeWindow, "window");
  });

  it("syncs legacy globals into Pinia stores with normalized values", () => {
    const pinia = createPinia();
    const snapshot = syncLegacyRuntimeSnapshot(pinia, undefined);

    expect(snapshot.locale).toBe("en-US");
    expect(useUiStore(pinia).locale).toBe("en-US");
    expect(useSettingsStore(pinia).machineSettings).toEqual({
      1: { m: "oilRefinery", accType: "proliferatorMk1", accValue: "speedup" },
    });
    expect(useSettingsStore(pinia).runtimeOptions).toMatchObject({
      pointLength: 4,
      hideSource: true,
      showMaxOneBelt: true,
      oilSpeed: 6,
      conveyorBeltType: "conveyorBeltMk2",
      manualGzSpeed: true,
    });
    expect(useProjectsStore(pinia).items[0]?.settings).toEqual({
      1: { m: "rayReceiver" },
    });
    expect(useCalculationStore(pinia).singleMake).toEqual([{ id: 4, number: 1.5 }]);
    expect(useCalculationStore(pinia).excludedNames).toEqual(["石墨烯"]);
    expect(useSeoStore(pinia).snapshot.requirementCount).toBe(1);
    expect(useAppStore(pinia).isReady).toBe(true);
  });

  it("projects store state back to legacy globals and app view model", () => {
    const pinia = createPinia();
    syncLegacyRuntimeSnapshot(pinia, undefined);

    const calculationStore = useCalculationStore(pinia);
    calculationStore.hydrateCalculationResult({
      requirements: [{ item: { name: "铜块" }, number: 120 }],
      independentLines: [{ id: "independent" }],
      productionLines: [{ id: "production" }],
      excessOutputs: [{ id: "out" }],
      totals: {
        machines: [{ name: "oilRefinery", value: 2, energy: 100, space: 20 }],
        totalAcc: 9.5,
        totalEnergy: 100,
        totalSpace: 20,
      },
      seoSnapshot: {
        requirementCount: 1,
        primaryItemName: "铜块",
        primaryRatePerMinute: 120,
        totalLineCount: 1,
        totalEnergy: 100,
        totalSpace: 20,
      },
      blueprintSnapshot: {
        title: "Copper",
        subRecipes: [],
      },
    });

    syncLegacyProjection(pinia);

    expect(runtimeWindow.xqs).toEqual([{ item: { name: "铁块" }, number: 60 }]);
    expect(runtimeWindow.singleMake).toEqual([{ id: 4, number: 1.5 }]);
    expect(runtimeWindow.ig_names).toEqual(["石墨烯"]);
    expect(runtimeWindow.currentCalculationResult?.productionLines).toEqual([{ id: "production" }]);
    expect(runtimeWindow.app?.items).toEqual([{ id: "production" }]);
    expect(runtimeWindow.app?.totalEnergy).toBe("100.0000");
    expect(elements.get("pointLength")?.value).toBe("4");
    expect(elements.get("hideSource")?.checked).toBe(true);
    expect(runtimeWindow.manualGzSpeed).toBe(true);
    expect(updateSeoState).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryItemName: "铜块",
      })
    );
  });
});
