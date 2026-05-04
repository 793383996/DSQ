// @vitest-environment jsdom

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useUiStore } from "../stores/ui";
import { bindLegacyPanelStateBridge, LEGACY_PANEL_STATE_CHANGED_EVENT } from "./legacy-panel-state-bridge";

describe("legacy panel state bridge", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.DSQPanelController = {
      isOpen: vi.fn((id: string) => id === "moreSetting"),
    };
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "DSQPanelController");
  });

  it("hydrates the current controller visibility and mirrors follow-up open/close events", () => {
    const pinia = createPinia();
    const dispose = bindLegacyPanelStateBridge(pinia);
    const uiStore = useUiStore(pinia);

    expect(uiStore.activePanelId).toBe("moreSetting");
    expect(uiStore.activeDialogId).toBeNull();

    window.dispatchEvent(
      new CustomEvent(LEGACY_PANEL_STATE_CHANGED_EVENT, {
        detail: {
          id: "uiSelector",
          isDialog: true,
          isOpen: true,
        },
      })
    );
    expect(uiStore.activeDialogId).toBe("uiSelector");

    window.dispatchEvent(
      new CustomEvent(LEGACY_PANEL_STATE_CHANGED_EVENT, {
        detail: {
          id: "uiSelector",
          isDialog: true,
          isOpen: false,
        },
      })
    );
    expect(uiStore.activeDialogId).toBeNull();

    window.dispatchEvent(
      new CustomEvent(LEGACY_PANEL_STATE_CHANGED_EVENT, {
        detail: {
          id: "moreSetting",
          isDialog: false,
          isOpen: false,
        },
      })
    );
    expect(uiStore.activePanelId).toBeNull();

    dispose();
  });
});
