import { defineStore } from "pinia";

import { calculateProductionPlan } from "../domain/calculation";
import {
  cloneJsonValue,
  createEmptyCalculationOutput,
  type CalculationOutput,
  type GlobalSettings,
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
  getters: {
    requirementCount: state => state.requirements.length,
    effectiveResult: state =>
      state.currentResult
        ? cloneJsonValue(state.currentResult, createEmptyCalculationOutput())
        : calculateProductionPlan({
            requirements: state.requirements,
            excludedNames: state.excludedNames,
          }),
  },
  actions: {
    hydrateRequirements(requirements: RequirementEntry[] | undefined) {
      this.requirements = Array.isArray(requirements) ? cloneJsonValue(requirements, []) : [];
    },
    hydrateExcludedNames(names: string[] | undefined) {
      this.excludedNames = Array.isArray(names)
        ? names.filter((entry): entry is string => typeof entry === "string").map((entry) => entry)
        : [];
    },
    hydrateCalculationResult(result: CalculationOutput | null | undefined) {
      this.currentResult = result ? cloneJsonValue(result, createEmptyCalculationOutput()) : null;
    },
    rebuildFallbackResult(settings?: GlobalSettings) {
      this.currentResult = calculateProductionPlan({
        requirements: this.requirements,
        excludedNames: this.excludedNames,
        settings,
      });
    },
    clearCalculationResult() {
      this.currentResult = null;
    },
  },
});
