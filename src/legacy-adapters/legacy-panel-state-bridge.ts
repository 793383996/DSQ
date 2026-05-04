import type { Pinia } from "pinia";

import { useUiStore } from "../stores/ui";

export const LEGACY_PANEL_STATE_CHANGED_EVENT = "dsq:panel-state-changed";

interface LegacyPanelStateChangedDetail {
  id?: unknown;
  isDialog?: unknown;
  isOpen?: unknown;
}

let removePanelStateListener: (() => void) | null = null;

function syncKnownPanelState(pinia: Pinia): void {
  const uiStore = useUiStore(pinia);
  const controller = window.DSQPanelController;
  const isOpen = typeof controller?.isOpen === "function" ? controller.isOpen.bind(controller) : null;

  uiStore.setActiveDialog(isOpen?.("split") ? "split" : isOpen?.("uiSelector") ? "uiSelector" : null);
  uiStore.setActivePanel(isOpen?.("moreSetting") ? "moreSetting" : null);
}

function applyPanelState(pinia: Pinia, detail?: LegacyPanelStateChangedDetail | null): void {
  const id = typeof detail?.id === "string" ? detail.id : null;
  if (!id) {
    syncKnownPanelState(pinia);
    return;
  }

  const isDialog = detail?.isDialog === true;
  const isOpen = detail?.isOpen === true;
  const uiStore = useUiStore(pinia);

  if (isDialog) {
    uiStore.setActiveDialog(isOpen ? id : uiStore.activeDialogId === id ? null : uiStore.activeDialogId);
    return;
  }

  uiStore.setActivePanel(isOpen ? id : uiStore.activePanelId === id ? null : uiStore.activePanelId);
}

export function bindLegacyPanelStateBridge(pinia: Pinia): () => void {
  removePanelStateListener?.();
  syncKnownPanelState(pinia);

  const handlePanelStateChanged = (event: Event) => {
    const detail = event instanceof CustomEvent ? (event.detail as LegacyPanelStateChangedDetail | null) : null;
    applyPanelState(pinia, detail);
  };

  window.addEventListener(LEGACY_PANEL_STATE_CHANGED_EVENT, handlePanelStateChanged);

  removePanelStateListener = () => {
    window.removeEventListener(LEGACY_PANEL_STATE_CHANGED_EVENT, handlePanelStateChanged);
    removePanelStateListener = null;
  };

  return removePanelStateListener;
}
