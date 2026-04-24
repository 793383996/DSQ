import { defineStore } from "pinia";

import { createEmptySeoSnapshot, type SeoSnapshot } from "../types/dsq";

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
  },
});
