import { defineStore } from "pinia";

import type { AppBootPhase } from "../types/dsq";

interface AppState {
  bootPhase: AppBootPhase;
  mounted: boolean;
  legacyRuntimeLoaded: boolean;
  errorMessage: string;
}

export const useAppStore = defineStore("app", {
  state: (): AppState => ({
    bootPhase: "idle",
    mounted: false,
    legacyRuntimeLoaded: false,
    errorMessage: "",
  }),
  getters: {
    isReady: state => state.bootPhase === "ready",
  },
  actions: {
    markMounting() {
      this.bootPhase = "mounting";
      this.mounted = true;
      this.errorMessage = "";
    },
    markLegacyLoading() {
      this.bootPhase = "legacy-loading";
    },
    markLegacyReady() {
      this.bootPhase = "legacy-ready";
      this.legacyRuntimeLoaded = true;
    },
    markReady() {
      this.bootPhase = "ready";
      this.legacyRuntimeLoaded = true;
    },
    markError(error: unknown) {
      this.bootPhase = "error";
      this.errorMessage = error instanceof Error ? error.message : String(error);
    },
  },
});
