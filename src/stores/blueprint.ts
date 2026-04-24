import { defineStore } from "pinia";

import type { BlueprintResult } from "../types/dsq";

interface BlueprintState {
  isGenerating: boolean;
  errorMessage: string;
  lastResult: BlueprintResult | null;
}

export const useBlueprintStore = defineStore("blueprint", {
  state: (): BlueprintState => ({
    isGenerating: false,
    errorMessage: "",
    lastResult: null,
  }),
  actions: {
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
  },
});
