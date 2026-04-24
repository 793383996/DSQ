import { defineStore } from "pinia";

import {
  cloneJsonValue,
  createEmptyCalculationOutput,
  type CalculationOutput,
  type RequirementEntry,
} from "../types/dsq";

interface CalculationState {
  requirements: RequirementEntry[];
  excludedNames: string[];
  currentResult: CalculationOutput | null;
}

export const useCalculationStore = defineStore("calculation", {
  state: (): CalculationState => ({
    requirements: [],
    excludedNames: [],
    currentResult: null,
  }),
  actions: {
    hydrateRequirements(requirements: RequirementEntry[] | undefined) {
      this.requirements = Array.isArray(requirements) ? cloneJsonValue(requirements, []) : [];
    },
    hydrateCalculationResult(result: CalculationOutput | null | undefined) {
      this.currentResult = result ? cloneJsonValue(result, createEmptyCalculationOutput()) : null;
    },
  },
});
