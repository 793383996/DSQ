import { defineStore } from "pinia";

import { calculateProductionPlan } from "../domain/calculation";
import {
  cloneJsonValue,
  createDefaultCalculationRuntimeOptions,
  createEmptyCalculationOutput,
  createDefaultGlobalSettings,
  type CalculationOutput,
  type CalculationSnapshot,
  type GlobalSettings,
  type RequirementEntry,
  type SingleMakeEntry,
  normalizeRequirementEntries,
  normalizeSingleMakeEntries,
  normalizeStringList,
} from "../types/dsq";

interface CalculationState {
  requirements: RequirementEntry[];
  singleMake: SingleMakeEntry[];
  excludedNames: string[];
  currentResult: CalculationOutput | null;
  lastReason: string;
}

export const useCalculationStore = defineStore("calculation", {
  state: (): CalculationState => ({
    requirements: [],
    singleMake: [],
    excludedNames: [],
    currentResult: null,
    lastReason: "",
  }),
  getters: {
    requirementCount: state => state.requirements.length,
    snapshot: state =>
      ({
        requirements: cloneJsonValue(state.requirements, []),
        singleMake: cloneJsonValue(state.singleMake, []),
        excludedNames: cloneJsonValue(state.excludedNames, []),
        globalSettings: createDefaultGlobalSettings(),
        machineSettings: {},
        speedSettings: {},
        recipeSettings: {},
        runtimeOptions: createDefaultCalculationRuntimeOptions(),
        currentResult: state.currentResult ? cloneJsonValue(state.currentResult, createEmptyCalculationOutput()) : null,
      }) satisfies CalculationSnapshot,
    effectiveResult: state =>
      state.currentResult
        ? cloneJsonValue(state.currentResult, createEmptyCalculationOutput())
        : calculateProductionPlan({
            requirements: state.requirements,
            singleMake: state.singleMake,
            excludedNames: state.excludedNames,
            globalSettings: createDefaultGlobalSettings(),
            machineSettings: {},
            speedSettings: {},
            recipeSettings: {},
            runtimeOptions: createDefaultCalculationRuntimeOptions(),
          }),
  },
  actions: {
    hydrateRequirements(requirements: RequirementEntry[] | undefined) {
      this.requirements = normalizeRequirementEntries(requirements);
    },
    setRequirements(requirements: RequirementEntry[] | undefined) {
      this.hydrateRequirements(requirements);
    },
    addRequirement(requirement: RequirementEntry) {
      const normalizedRequirement = normalizeRequirementEntries([requirement])[0];
      if (!normalizedRequirement) {
        return;
      }
      this.requirements = [...this.requirements, normalizedRequirement];
    },
    updateRequirementNumber(index: number, nextNumber: number) {
      if (!Number.isInteger(index) || index < 0 || index >= this.requirements.length) {
        return;
      }
      this.requirements = this.requirements.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              number: Number.isFinite(nextNumber) ? nextNumber : entry.number,
            }
          : entry
      );
    },
    scaleRequirementNumbers(factor: number) {
      if (!Number.isFinite(factor) || factor <= 0) {
        return;
      }
      this.requirements = this.requirements.map(entry => ({
        ...entry,
        number: entry.number * factor,
      }));
    },
    removeRequirement(index: number) {
      if (!Number.isInteger(index) || index < 0 || index >= this.requirements.length) {
        return;
      }
      this.requirements = this.requirements.filter((_, entryIndex) => entryIndex !== index);
    },
    resetRequirements() {
      this.requirements = [];
    },
    hydrateExcludedNames(names: string[] | undefined) {
      this.excludedNames = normalizeStringList(names);
    },
    setExcludedNames(names: string[] | undefined) {
      this.hydrateExcludedNames(names);
    },
    addExcludedName(name: string) {
      if (typeof name !== "string" || !name || this.excludedNames.includes(name)) {
        return;
      }
      this.excludedNames = [...this.excludedNames, name];
    },
    removeExcludedName(name: string) {
      this.excludedNames = this.excludedNames.filter(entry => entry !== name);
    },
    clearExcludedNames() {
      this.excludedNames = [];
    },
    hydrateSingleMake(entries: SingleMakeEntry[] | undefined) {
      this.singleMake = normalizeSingleMakeEntries(entries);
    },
    setSingleMake(entries: SingleMakeEntry[] | undefined) {
      this.hydrateSingleMake(entries);
    },
    appendSingleMake(entry: SingleMakeEntry) {
      const normalizedEntry = normalizeSingleMakeEntries([entry])[0];
      if (!normalizedEntry) {
        return;
      }
      this.singleMake = [...this.singleMake, normalizedEntry];
    },
    clearSingleMake() {
      this.singleMake = [];
    },
    hydrateCalculationResult(result: CalculationOutput | null | undefined) {
      this.currentResult = result ? cloneJsonValue(result, createEmptyCalculationOutput()) : null;
    },
    rebuildFallbackResult(settings?: GlobalSettings) {
      this.currentResult = calculateProductionPlan({
        requirements: this.requirements,
        singleMake: this.singleMake,
        excludedNames: this.excludedNames,
        globalSettings: settings ? cloneJsonValue(settings, createDefaultGlobalSettings()) : createDefaultGlobalSettings(),
        machineSettings: {},
        speedSettings: {},
        recipeSettings: {},
        runtimeOptions: createDefaultCalculationRuntimeOptions(),
      });
    },
    recalculate(snapshot: CalculationSnapshot, reason: string = "") {
      this.currentResult = calculateProductionPlan(snapshot);
      this.lastReason = reason;
      return cloneJsonValue(this.currentResult, createEmptyCalculationOutput());
    },
    clearCalculationResult() {
      this.currentResult = null;
    },
  },
});
