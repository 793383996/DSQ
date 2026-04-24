import { defineStore } from "pinia";

import type { LocaleCode } from "../types/dsq";

interface UiState {
  locale: LocaleCode;
  commandBridgeReady: boolean;
  activePanelId: string | null;
}

export const useUiStore = defineStore("ui", {
  state: (): UiState => ({
    locale: "zh-CN",
    commandBridgeReady: false,
    activePanelId: null,
  }),
  actions: {
    setLocale(locale: LocaleCode) {
      this.locale = locale;
    },
    markCommandBridgeReady() {
      this.commandBridgeReady = true;
    },
    setActivePanel(panelId: string | null) {
      this.activePanelId = panelId;
    },
  },
});
