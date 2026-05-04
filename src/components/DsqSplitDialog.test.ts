// @vitest-environment jsdom

import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDsqI18n } from "../services/i18n";
import { useUiStore } from "../stores/ui";
import DsqSplitDialog from "./DsqSplitDialog.vue";

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

describe("DsqSplitDialog", () => {
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
  });

  afterEach(() => {
    Reflect.deleteProperty(runtimeWindow, "DSQCommandBridge");
    Reflect.deleteProperty(runtimeWindow, "DSQPanelController");
    Reflect.deleteProperty(runtimeWindow, "window");
    document.body.innerHTML = "";
  });

  it("renders the split payload, validates selection and routes confirmation through the bridge", async () => {
    const wrapper = mount(DsqSplitDialog, {
      global: {
        plugins: [pinia, createDsqI18n()],
      },
      attachTo: document.body,
    });

    const uiStore = useUiStore();
    uiStore.openSplitDialog({
      itemName: "铁块",
      recipes: [
        { id: 2, titleHtml: "<span>配方A</span>" },
        { id: 4, titleHtml: "<span>配方B</span>" },
      ],
      defaultNumber: 1,
    });
    uiStore.setActiveDialog("split");
    await nextTick();

    expect(wrapper.findAll(".split-pf")).toHaveLength(2);

    await wrapper.findAll(".split-pf")[1].trigger("click");
    await wrapper.get("input.split-number").setValue("3");
    await wrapper.findAll("button")[2].trigger("click");

    expect(bridgeInvoke).toHaveBeenCalledWith("appendSingleMake", { id: 4, number: 3 });
    expect(closePanel).toHaveBeenCalledWith("split");
    expect(uiStore.splitDialog).toBeNull();
  });
});
