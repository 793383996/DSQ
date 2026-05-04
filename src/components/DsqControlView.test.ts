// @vitest-environment jsdom

import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bindLegacyPanelStateBridge, LEGACY_PANEL_STATE_CHANGED_EVENT } from "../legacy-adapters/legacy-panel-state-bridge";
import { createDsqI18n } from "../services/i18n";
import { useAppStore } from "../stores/app";
import { useProjectsStore } from "../stores/projects";
import { useSettingsStore } from "../stores/settings";
import { useUiStore } from "../stores/ui";
import DsqControlView from "./DsqControlView.vue";

type RuntimeWindow = typeof globalThis & {
  window?: unknown;
  DSQCommandBridge?: {
    has: (commandName: string) => boolean;
    invoke: (commandName: string, ...args: unknown[]) => unknown;
  };
  DSQPanelController?: {
    isOpen: (id: string) => boolean;
    toggle: (id: string, options?: { triggerElement?: Element | null }) => boolean;
    open: (id: string, options?: { triggerElement?: Element | null; initialFocusSelector?: string | null }) => boolean;
  };
  confirm?: (message?: string) => boolean;
  alert?: (message?: string) => void;
  isDataLoaded?: boolean;
};

describe("DsqControlView", () => {
  const runtimeWindow = globalThis as RuntimeWindow;
  const bridgeInvoke = vi.fn();
  const panelState = {
    uiSelector: false,
    moreSetting: false,
  };
  const panelToggle = vi.fn((id: string) => {
    if (!(id in panelState)) {
      return false;
    }
    panelState[id as keyof typeof panelState] = !panelState[id as keyof typeof panelState];
    window.dispatchEvent(
      new CustomEvent(LEGACY_PANEL_STATE_CHANGED_EVENT, {
        detail: {
          id,
          isDialog: id === "uiSelector",
          isOpen: panelState[id as keyof typeof panelState],
        },
      })
    );
    return true;
  });
  const panelOpen = vi.fn((id: string) => {
    if (!(id in panelState)) {
      return false;
    }
    panelState[id as keyof typeof panelState] = true;
    window.dispatchEvent(
      new CustomEvent(LEGACY_PANEL_STATE_CHANGED_EVENT, {
        detail: {
          id,
          isDialog: id === "uiSelector",
          isOpen: true,
        },
      })
    );
    return true;
  });
  let pinia: ReturnType<typeof createPinia>;
  let disposePanelBridge: (() => void) | null = null;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    document.body.innerHTML = '<div id="MoreSetting"></div>';
    Reflect.set(globalThis, "window", runtimeWindow);
    runtimeWindow.DSQCommandBridge = {
      has() {
        return true;
      },
      invoke: bridgeInvoke,
    };
    runtimeWindow.DSQPanelController = {
      isOpen(id: string) {
        return !!panelState[id as keyof typeof panelState];
      },
      toggle: panelToggle,
      open: panelOpen,
    };
    runtimeWindow.confirm = vi.fn(() => true);
    runtimeWindow.alert = vi.fn();
    runtimeWindow.isDataLoaded = true;
    panelState.uiSelector = false;
    panelState.moreSetting = false;
    bridgeInvoke.mockReset();
    panelToggle.mockClear();
    panelOpen.mockClear();
    bridgeInvoke.mockImplementation((commandName: string) => {
      if (commandName === "getRequirementSelectorCatalog") {
        return {
          sections: [
            { id: "components", items: [{ name: "铁块", iconValue: "iron-icon", row: 1, column: 1 }] },
            { id: "buildings", items: [{ name: "电弧熔炉", iconValue: "smelter-icon", row: 1, column: 1 }] },
          ],
        };
      }
      return undefined;
    });
    disposePanelBridge = bindLegacyPanelStateBridge(pinia);

    useAppStore().markReady();
    const uiStore = useUiStore();
    const settingsStore = useSettingsStore();
    const projectsStore = useProjectsStore();
    uiStore.hydrateRequirementDraft({ ratePerMinute: 60, machineCount: null });
    settingsStore.hydrateGlobalSettings({
      selmodein: "assemblingMachineMk2",
      furnace: "planeSmelter",
      chemical: "chemicalPlant",
      research: "matrixLab",
      accType: "proliferatorMk1",
      accValue: "none",
    });
    settingsStore.applyRuntimeOptions({
      hideSource: true,
      selfAcc: true,
      isAddSelfAccP: false,
      showMaxOneBelt: false,
      onlySorterMk3: true,
      useSorterMk4: false,
      pointLength: 3,
    });
    projectsStore.hydrateProjects([
      {
        name: "Alpha",
        singleMake: [],
        ig_names: [],
        value: [],
        settings: {},
      },
    ]);
  });

  afterEach(() => {
    disposePanelBridge?.();
    disposePanelBridge = null;
    Reflect.deleteProperty(runtimeWindow, "DSQCommandBridge");
    Reflect.deleteProperty(runtimeWindow, "DSQPanelController");
    Reflect.deleteProperty(runtimeWindow, "confirm");
    Reflect.deleteProperty(runtimeWindow, "alert");
    Reflect.deleteProperty(runtimeWindow, "isDataLoaded");
    Reflect.deleteProperty(runtimeWindow, "window");
    document.body.innerHTML = "";
  });

  it("updates requirement draft, project actions and panel state through store-first commands", async () => {
    const wrapper = mount(DsqControlView, {
      global: {
        plugins: [pinia, createDsqI18n()],
      },
      attachTo: document.body,
    });

    const uiStore = useUiStore();

    await wrapper.get("#txtnumber").setValue("120");
    expect(uiStore.requirementDraft.ratePerMinute).toBe(120);
    expect(bridgeInvoke).toHaveBeenCalledWith("setRequirementDraft", expect.objectContaining({ ratePerMinute: 120 }));

    bridgeInvoke.mockClear();
    await wrapper.get("#btnAddRequirement").trigger("click");
    expect(bridgeInvoke).toHaveBeenCalledWith("getRequirementSelectorCatalog");
    expect(panelOpen).toHaveBeenCalledWith("uiSelector", expect.any(Object));
    expect(uiStore.activeDialogId).toBe("uiSelector");

    bridgeInvoke.mockClear();
    await wrapper.get("#btnSetting").trigger("click");
    expect(panelToggle).toHaveBeenCalledWith("moreSetting", expect.any(Object));
    expect(uiStore.activePanelId).toBe("moreSetting");

    bridgeInvoke.mockClear();
    await wrapper.get("#selprojects").setValue("Alpha");
    await wrapper.get("#btnLoadProject").trigger("click");
    expect(bridgeInvoke).toHaveBeenCalledWith("loadProject", "Alpha");
  });

  it("routes global/runtime control changes through the shared bridge", async () => {
    const wrapper = mount(DsqControlView, {
      global: {
        plugins: [pinia, createDsqI18n()],
      },
      attachTo: document.body,
    });

    bridgeInvoke.mockClear();
    await wrapper.get("#accType").setValue("proliferatorMk3");
    expect(bridgeInvoke).toHaveBeenCalledWith("updateGlobalSetting", "accType", "proliferatorMk3", "global-acc-type-change");

    bridgeInvoke.mockClear();
    const sorterCheckbox = document.getElementById("onlySorterMk3") as HTMLInputElement | null;
    expect(sorterCheckbox).not.toBeNull();
    sorterCheckbox!.checked = false;
    sorterCheckbox!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(bridgeInvoke).toHaveBeenCalledWith(
      "updateRuntimeOptions",
      expect.objectContaining({ onlySorterMk3: false, useSorterMk4: false }),
      "blueprint-sorter-mode-change"
    );
  });

  it("routes reset-all through the Vue 3 command flow without relying on legacy click bindings", async () => {
    const wrapper = mount(DsqControlView, {
      global: {
        plugins: [pinia, createDsqI18n()],
      },
      attachTo: document.body,
    });

    bridgeInvoke.mockClear();
    await wrapper.get("#btnReset1").trigger("click");

    expect(runtimeWindow.confirm).toHaveBeenCalled();
    expect(bridgeInvoke).toHaveBeenCalledWith("resetAllRuntimeState");
  });
});
