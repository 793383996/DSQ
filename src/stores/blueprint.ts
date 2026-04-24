import { defineStore } from "pinia";

import { cloneJsonValue, type BlueprintResult, type BlueprintSnapshot } from "../types/dsq";

interface BlueprintState {
  snapshot: BlueprintSnapshot | null;
  isGenerating: boolean;
  errorMessage: string;
  lastResult: BlueprintResult | null;
}

export const useBlueprintStore = defineStore("blueprint", {
  state: (): BlueprintState => ({
    snapshot: null,
    isGenerating: false,
    errorMessage: "",
    lastResult: null,
  }),
  actions: {
    setSnapshot(snapshot: BlueprintSnapshot | null | undefined) {
      this.snapshot = snapshot ? cloneJsonValue(snapshot, {}) : null;
    },
    startGeneration() {
      this.isGenerating = true;
      this.errorMessage = "";
    },
    finishGeneration(result: BlueprintResult) {
      this.isGenerating = false;
      this.lastResult = result;
    },
    failGeneration(error: unknown) {
      this.isGenerating = false;
      this.errorMessage = error instanceof Error ? error.message : String(error);
    },
    reset() {
      this.snapshot = null;
      this.isGenerating = false;
      this.errorMessage = "";
      this.lastResult = null;
    },
  },
});
