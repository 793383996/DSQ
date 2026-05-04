// @vitest-environment jsdom

import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDsqI18n } from "../services/i18n";
import { useUiStore } from "../stores/ui";
import DsqRequirementSelector from "./DsqRequirementSelector.vue";

type RuntimeWindow = typeof globalThis & {
  window?: unknown;
  DSQCommandBridge?: {
    has: (commandName: string) => boolean;
    invoke: (commandName: string, ...args: unknown[]) => unknown;
  };
  DSQPanelController?: {
    close: (id: string) => boolean;
  };
};

describe("DsqRequirementSelector", () => {
  const runtimeWindow = globalThis as RuntimeWindow;
  const bridgeInvoke = vi.fn();
  const closePanel = vi.fn(() => true);
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    Reflect.set(globalThis, "window", runtimeWindow);
    bridgeInvoke.mockReset();
    closePanel.mockClear();
    runtimeWindow.DSQCommandBridge = {
      has() {
        return true;
      },
      invoke: bridgeInvoke,
    };
    runtimeWindow.DSQPanelController = {
      close: closePanel,
    };
    bridgeInvoke.mockImplementation((commandName: string) => {
      if (commandName === "getRequirementSelectorCatalog") {
        return {
          sections: [
            {
              id: "components",
              items: [
                { name: "铁块", iconValue: "iron-icon", row: 1, column: 1 },
                { name: "铜块", iconValue: "copper-icon", row: 1, column: 2 },
              ],
            },
            {
              id: "buildings",
              items: [{ name: "电弧熔炉", iconValue: "smelter-icon", row: 1, column: 1 }],
            },
          ],
        };
      }
      return { ok: true };
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(runtimeWindow, "DSQCommandBridge");
    Reflect.deleteProperty(runtimeWindow, "DSQPanelController");
    Reflect.deleteProperty(runtimeWindow, "window");
    document.body.innerHTML = "";
  });

  it("lazy-loads the selector catalog, switches tabs and routes item picks through the bridge", async () => {
    const wrapper = mount(DsqRequirementSelector, {
      global: {
        plugins: [pinia, createDsqI18n()],
      },
      attachTo: document.body,
    });

    const uiStore = useUiStore();
    uiStore.setActiveDialog("uiSelector");
    await nextTick();

    expect(bridgeInvoke).toHaveBeenCalledWith("getRequirementSelectorCatalog");
    expect(wrapper.find("#selector").exists()).toBe(true);
    expect(wrapper.find("button[title='铁块']").exists()).toBe(true);

    bridgeInvoke.mockClear();
    await wrapper.findAll("#tabs .tab")[1].trigger("click");
    expect(uiStore.selectorActiveTab).toBe("buildings");
    expect(wrapper.find("button[title='电弧熔炉']").exists()).toBe(true);

    bridgeInvoke.mockClear();
    await wrapper.find("button[title='电弧熔炉']").trigger("click");
    expect(bridgeInvoke).toHaveBeenCalledWith("addRequirementByName", "电弧熔炉");
    expect(closePanel).toHaveBeenCalledWith("uiSelector");
  });
});
