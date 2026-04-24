import { defineStore } from "pinia";

import { createEmptySeoSnapshot, type CalculationOutput, type SeoSnapshot } from "../types/dsq";

interface SeoState {
  snapshot: SeoSnapshot;
}

export const useSeoStore = defineStore("seo", {
  state: (): SeoState => ({
    snapshot: createEmptySeoSnapshot(),
  }),
  actions: {
    setSnapshot(snapshot: SeoSnapshot | undefined) {
      this.snapshot = snapshot ? { ...snapshot } : createEmptySeoSnapshot();
    },
    syncFromCalculationResult(result: CalculationOutput | null | undefined) {
      this.setSnapshot(result?.seoSnapshot);
    },
  },
});
