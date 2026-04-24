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

export interface MachineSettingRecord {
  m?: string;
  accType?: string;
  accValue?: string;
}

export type MachineSettingsSnapshot = Record<string, MachineSettingRecord>;

export type SpeedSettingsSnapshot = Record<string, number>;

export interface ProjectSnapshot {
  name: string;
  singleMake: unknown[];
  ig_names: string[];
  value: unknown[];
  settings: MachineSettingsSnapshot;
}

export interface GlobalSettings {
  selmodein: string;
  furnace: string;
  chemical: string;
  research: string;
  accType: string;
  accValue: string;
}

export interface ItemRecord {
  id: string;
  displayNameZh: string;
  aliasesZh: string[];
  iconName: string;
  blueprintEntityName: string | null;
}

export interface MachineOption {
  id: string;
  displayNameZh: string;
  aliasesZh: string[];
  i18nKey: string | null;
  iconName: string;
  blueprintEntityName: string | null;
  recipeTypeId: string;
}

export interface RecipeTypeRecord {
  id: string;
  displayNameZh: string;
  aliasesZh: string[];
  globalSettingKey: keyof GlobalSettings | null;
  defaultMachineId: string;
}

export interface AccValueRecord {
  id: string;
  displayNameZh: string;
  aliasesZh: string[];
}

export type DomainLookupKind = "item" | "machine" | "recipeType" | "accValue";

export interface DomainDictionaryApi {
  items: readonly Readonly<ItemRecord>[];
  machines: readonly Readonly<MachineOption>[];
  recipeTypes: readonly Readonly<RecipeTypeRecord>[];
  accValues: readonly Readonly<AccValueRecord>[];
  getItem(value: unknown): Readonly<ItemRecord> | null;
  getMachine(value: unknown): Readonly<MachineOption> | null;
  getRecipeType(value: unknown): Readonly<RecipeTypeRecord> | null;
  getAccValue(value: unknown): Readonly<AccValueRecord> | null;
  getItemId(value: unknown): string | null;
  getMachineId(value: unknown): string | null;
  getRecipeTypeId(value: unknown): string | null;
  getAccValueId(value: unknown): string | null;
  getDisplayName(value: unknown): string;
  getIconName(value: unknown): string;
  getBlueprintEntityName(value: unknown): string | null;
  getMachineI18nKey(value: unknown): string | null;
  getRecipeTypeGlobalSettingKey(value: unknown): keyof GlobalSettings | null;
  getDefaultMachineIdForRecipeType(value: unknown): string | null;
  getMachineOptionsForRecipeType(value: unknown): string[];
  normalizeLegacyValue(kind: DomainLookupKind, value: unknown): string | null;
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

export interface BasicStorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StorageAdapter {
  hasLocalStorage(): boolean;
  getItem(key: string): string | null;
  setItem(key: string, value: string): boolean;
  removeItem(key: string): boolean;
  clearByPrefixes(prefixes: readonly string[]): number;
}

export interface NumericInputLike {
  nodeType?: number;
  value: string;
  dataset?: Record<string, string | undefined>;
  hasAttribute?(name: string): boolean;
  getAttribute?(name: string): string | null | undefined;
}

export interface NumericNormalizationOptions {
  fieldLabel?: string;
  min?: number;
  max?: number;
  step?: number | string;
  integer?: boolean;
  maxFractionDigits?: number;
  requirePositive?: boolean;
  clamp?: boolean;
  warn?: boolean;
  warningDuration?: number;
  fallbackValue?: number;
  previousValue?: number;
  useInputAttributes?: boolean;
}

export type NumericNormalizationReason =
  | "invalid"
  | "not_integer"
  | "not_positive"
  | "below_min"
  | "above_max"
  | "adjusted"
  | "ok";

export interface NumericNormalizationResult {
  valid: boolean;
  adjusted: boolean;
  value: number;
  reason: NumericNormalizationReason;
  fieldLabel: string;
}

export interface LegacyRuntimeSnapshot {
  locale: LocaleCode;
  projects: ProjectSnapshot[];
  globalSettings: Partial<GlobalSettings>;
  machineSettings: MachineSettingsSnapshot;
  speedSettings: SpeedSettingsSnapshot;
  recipeSettings: Record<string, unknown>;
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
