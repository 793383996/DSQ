import { defineStore } from "pinia";

import {
  cloneJsonValue,
  createBlueprintGenerationConfig,
  createBlueprintConfigSnapshotFromRuntimeOptions,
  normalizeBlueprintConfigSnapshot,
  type BlueprintConfigSnapshot,
  type BlueprintGenerationConfig,
  type BlueprintResult,
  type BlueprintSnapshot,
  type CalculationRuntimeOptions,
} from "../types/dsq";

interface BlueprintState {
  snapshot: BlueprintSnapshot | null;
  config: BlueprintConfigSnapshot;
  isGenerating: boolean;
  errorMessage: string;
  lastResult: BlueprintResult | null;
}

export const useBlueprintStore = defineStore("blueprint", {
  state: (): BlueprintState => ({
    snapshot: null,
    config: createBlueprintConfigSnapshotFromRuntimeOptions(undefined),
    isGenerating: false,
    errorMessage: "",
    lastResult: null,
  }),
  getters: {
    generationContext(state): BlueprintGenerationConfig {
      return createBlueprintGenerationConfig(state.config);
    },
  },
  actions: {
    setSnapshot(snapshot: BlueprintSnapshot | null | undefined) {
      this.snapshot = snapshot ? cloneJsonValue(snapshot, {}) : null;
    },
    hydrateConfigFromRuntimeOptions(runtimeOptions: Partial<CalculationRuntimeOptions> | undefined) {
      this.config = createBlueprintConfigSnapshotFromRuntimeOptions(runtimeOptions);
    },
    patchConfig(patch: Partial<BlueprintConfigSnapshot> | undefined) {
      this.config = normalizeBlueprintConfigSnapshot({
        ...this.config,
        ...(patch && typeof patch === "object" ? patch : {}),
      });
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
      this.config = createBlueprintConfigSnapshotFromRuntimeOptions(undefined);
      this.isGenerating = false;
      this.errorMessage = "";
      this.lastResult = null;
    },
  },
});
