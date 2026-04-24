import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAppStore } from "../stores/app";
import { useCalculationStore } from "../stores/calculation";
import { useProjectsStore } from "../stores/projects";
import { useSeoStore } from "../stores/seo";
import { useSettingsStore } from "../stores/settings";
import { useUiStore } from "../stores/ui";
import { syncLegacyRuntimeSnapshot } from "./legacy-state";

type RuntimeWindow = typeof globalThis & {
  window?: unknown;
  DSQI18n?: {
    getLocale?: () => string;
  };
  settings?: Record<string, unknown>;
  global_settings?: Record<string, unknown>;
  settings_time?: Record<string, unknown>;
  settings_pf?: Record<string, unknown>;
  projects?: Array<Record<string, unknown>>;
  xqs?: Array<Record<string, unknown>>;
  currentCalculationResult?: Record<string, unknown> | null;
  isDataLoaded?: boolean;
  currentItem?: {
    name?: string;
  } | null;
};

describe("legacy-state adapter", () => {
  const runtimeWindow = globalThis as RuntimeWindow;

  beforeEach(() => {
    setActivePinia(createPinia());
    Reflect.set(globalThis, "window", runtimeWindow);
    runtimeWindow.DSQI18n = {
      getLocale: () => "en-US",
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
        singleMake: [],
        ig_names: [],
        value: [],
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
    runtimeWindow.currentCalculationResult = null;
    runtimeWindow.isDataLoaded = true;
    runtimeWindow.currentItem = { name: "铁块" };
  });

  afterEach(() => {
    delete runtimeWindow.DSQI18n;
    delete runtimeWindow.settings;
    delete runtimeWindow.global_settings;
    delete runtimeWindow.settings_time;
    delete runtimeWindow.settings_pf;
    delete runtimeWindow.projects;
    delete runtimeWindow.xqs;
    delete runtimeWindow.currentCalculationResult;
    delete runtimeWindow.isDataLoaded;
    delete runtimeWindow.currentItem;
  });

  it("syncs legacy globals into Pinia stores with normalized values", () => {
    const pinia = createPinia();
    const snapshot = syncLegacyRuntimeSnapshot(pinia, undefined);

    expect(snapshot.locale).toBe("en-US");
    expect(useUiStore(pinia).locale).toBe("en-US");
    expect(useSettingsStore(pinia).machineSettings).toEqual({
      1: { m: "oilRefinery", accType: "proliferatorMk1", accValue: "speedup" },
    });
    expect(useSettingsStore(pinia).speedSettings).toEqual({
      oilRefinery: 2,
    });
    expect(useSettingsStore(pinia).recipeSettings).toEqual({
      gear: 3,
    });
    expect(useProjectsStore(pinia).items[0]?.settings).toEqual({
      1: { m: "rayReceiver" },
    });
    expect(useCalculationStore(pinia).effectiveResult.seoSnapshot.primaryItemName).toBe("铁块");
    expect(useSeoStore(pinia).snapshot.requirementCount).toBe(1);
    expect(useAppStore(pinia).isReady).toBe(true);
  });
});
