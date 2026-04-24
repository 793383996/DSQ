export type LocaleCode = "zh-CN" | "en-US";

export type AppBootPhase = "idle" | "mounting" | "legacy-loading" | "legacy-ready" | "ready" | "error";

export interface RequirementEntry {
  item?: {
    name?: string;
    [key: string]: unknown;
  };
  number: number;
  [key: string]: unknown;
}

export interface ProjectSnapshot {
  name: string;
  singleMake: unknown[];
  ig_names: string[];
  value: unknown[];
  settings: Record<string, unknown>;
}

export interface GlobalSettings {
  selmodein: string;
  furnace: string;
  chemical: string;
  research: string;
  accType: string;
  accValue: string;
}

export interface CalculationTotals {
  machines: unknown[];
  totalAcc: number;
  totalEnergy: number;
  totalSpace: number;
}

export interface SeoSnapshot {
  requirementCount: number;
  primaryItemName: string;
  primaryRatePerMinute: number | null;
  totalLineCount: number;
  totalEnergy: number;
  totalSpace: number;
}

export interface BlueprintSnapshot {
  [key: string]: unknown;
}

export interface CalculationOutput {
  requirements: RequirementEntry[];
  independentLines: unknown[];
  productionLines: unknown[];
  excessOutputs: unknown[];
  totals: CalculationTotals;
  seoSnapshot: SeoSnapshot;
  blueprintSnapshot: BlueprintSnapshot | null;
}

export interface CalculationInput {
  requirements?: RequirementEntry[];
  excludedNames?: string[];
  settings?: GlobalSettings;
  currentResult?: CalculationOutput | null;
}

export interface BlueprintConfig {
  [key: string]: unknown;
}

export interface BlueprintResult {
  text: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

export interface LegacyRuntimeSnapshot {
  locale: LocaleCode;
  projects: ProjectSnapshot[];
  globalSettings: Partial<GlobalSettings>;
  currentCalculationResult: CalculationOutput | null;
  requirements: RequirementEntry[];
  isDataLoaded: boolean;
  currentItemName: string | null;
}

export interface PersistedAppState {
  locale: LocaleCode;
  legacyStorage: Record<string, string | null>;
  updatedAt: string;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = Object.freeze({
  selmodein: "assemblingMachineMk1",
  furnace: "arcSmelter",
  chemical: "chemicalPlant",
  research: "matrixLab",
  accType: "proliferatorMk1",
  accValue: "none",
});

export function isLocaleCode(value: unknown): value is LocaleCode {
  return value === "zh-CN" || value === "en-US";
}

export function normalizeLocale(value: unknown, fallback: LocaleCode = "zh-CN"): LocaleCode {
  return isLocaleCode(value) ? value : fallback;
}

export function createDefaultGlobalSettings(): GlobalSettings {
  return { ...DEFAULT_GLOBAL_SETTINGS };
}

export function createEmptySeoSnapshot(): SeoSnapshot {
  return {
    requirementCount: 0,
    primaryItemName: "",
    primaryRatePerMinute: null,
    totalLineCount: 0,
    totalEnergy: 0,
    totalSpace: 0,
  };
}

export function createEmptyCalculationOutput(): CalculationOutput {
  return {
    requirements: [],
    independentLines: [],
    productionLines: [],
    excessOutputs: [],
    totals: {
      machines: [],
      totalAcc: 0,
      totalEnergy: 0,
      totalSpace: 0,
    },
    seoSnapshot: createEmptySeoSnapshot(),
    blueprintSnapshot: null,
  };
}

export function cloneJsonValue<T>(value: T, fallback: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return fallback;
  }
}
