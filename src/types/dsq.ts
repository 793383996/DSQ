export type LocaleCode = "zh-CN" | "en-US";

export type AppBootPhase = "idle" | "mounting" | "legacy-loading" | "legacy-ready" | "ready" | "error";

export interface RequirementItemRef {
  name?: string;
  itemId?: string;
  [key: string]: unknown;
}

export interface RequirementEntry {
  item?: RequirementItemRef;
  number: number;
  [key: string]: unknown;
}

export interface SingleMakeEntry {
  id: number | string;
  number: number;
}

export interface RequirementDraftSnapshot {
  ratePerMinute: number;
  machineCount: number | null;
}

export interface QuoteIncludeMap {
  updata: string;
  explanation: string;
}

export type RequirementSelectorTabId = "components" | "buildings";

export interface RequirementSelectorItem {
  name: string;
  iconValue: string;
  row: number;
  column: number;
}

export interface RequirementSelectorSection {
  id: RequirementSelectorTabId;
  items: RequirementSelectorItem[];
}

export interface RequirementSelectorCatalog {
  sections: RequirementSelectorSection[];
}

export interface SplitRecipeOption {
  id: number | string;
  titleHtml: string;
}

export interface SplitDialogPayload {
  itemName: string;
  recipes: SplitRecipeOption[];
  defaultNumber: number;
}

export interface SplitDialogState extends SplitDialogPayload {}

export interface MachineSettingRecord {
  m?: string;
  accType?: string;
  accValue?: string;
}

export type MachineSettingsSnapshot = Record<string, MachineSettingRecord>;

export type SpeedSettingsSnapshot = Record<string, number>;

export interface CalculationRuntimeOptions {
  pointLength: number;
  hideSource: boolean;
  showMaxOneBelt: boolean;
  isMerge: boolean;
  isAddSelfAccP: boolean;
  selfAcc: boolean;
  manualGzSpeed: boolean;
  conveyorBeltType: string;
  stationStackLayer: number;
  oreMultiplier: number;
  advancedMinerMultiplier: number;
  orbitalCollectorGasHydrogen: number;
  orbitalCollectorDeuterium: number;
  orbitalCollectorFireIce: number;
  orbitalCollectorIceHydrogen: number;
  fractionatorSpeed: number;
  oilSpeed: number;
  gzSpeed: number;
  onlyConveyorBeltMk3: boolean;
  onlySorterMk3: boolean;
  useSorterMk4: boolean;
  conveyorBeltStackLayer: number;
  generateTeslaTower: boolean;
  teslaTowerLineInterval: number;
  maxLabLayers: number;
  stackLayers: boolean;
  xToYRatio: number;
}

export interface BlueprintConfigSnapshot {
  onlyConveyorBeltMk3: boolean;
  onlySorterMk3: boolean;
  useSorterMk4: boolean;
  conveyorBeltStackLayer: number;
  generateTeslaTower: boolean;
  teslaTowerLineInterval: number;
  maxLabLayers: number;
  stackLayers: boolean;
  xToYRatio: number;
  selfSpray: boolean;
}

export interface BlueprintGenerationConfig {
  maxSorterNumOneBelt: number;
  conveyorBeltStackLayer: number;
  x_y_ratio: number;
  compactLayout: boolean;
  upgradeConveyorBelt: boolean;
  onlyConveyorBeltMk3: boolean;
  onlySorterMk3: boolean;
  useSorterMk4: boolean;
  maxLabLayers: number;
  selfSpray: boolean;
  generateTeslaTower: boolean;
  teslaTowerInterval: number;
  teslaTowerLineInterval: number;
  onlyConveyorBeltMk3Downgrade: boolean;
  stackLayers: number;
}

export interface ProjectSnapshot {
  name: string;
  singleMake: SingleMakeEntry[];
  ig_names: string[];
  value: RequirementEntry[];
  settings: MachineSettingsSnapshot;
  globalSettings?: GlobalSettings;
  speedSettings?: SpeedSettingsSnapshot;
  recipeSettings?: Record<string, unknown>;
  runtimeOptions?: CalculationRuntimeOptions;
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
  title?: string;
  description?: string;
  outputNames?: string[];
  outputIds?: string[];
  iconIds?: string[];
  subRecipes?: unknown[];
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

export interface CalculationSnapshot {
  requirements: RequirementEntry[];
  singleMake: SingleMakeEntry[];
  excludedNames: string[];
  globalSettings: GlobalSettings;
  machineSettings: MachineSettingsSnapshot;
  speedSettings: SpeedSettingsSnapshot;
  recipeSettings: Record<string, unknown>;
  runtimeOptions: CalculationRuntimeOptions;
  currentResult?: CalculationOutput | null;
}

export type CalculationInput = CalculationSnapshot;

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
  runtimeOptions: CalculationRuntimeOptions;
  currentCalculationResult: CalculationOutput | null;
  requirements: RequirementEntry[];
  singleMake: SingleMakeEntry[];
  excludedNames: string[];
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

export const DEFAULT_CALCULATION_RUNTIME_OPTIONS: CalculationRuntimeOptions = Object.freeze({
  pointLength: 3,
  hideSource: false,
  showMaxOneBelt: false,
  isMerge: false,
  isAddSelfAccP: false,
  selfAcc: true,
  manualGzSpeed: false,
  conveyorBeltType: "conveyorBeltMk3",
  stationStackLayer: 1,
  oreMultiplier: 100,
  advancedMinerMultiplier: 100,
  orbitalCollectorGasHydrogen: 1,
  orbitalCollectorDeuterium: 0.02,
  orbitalCollectorFireIce: 0.5,
  orbitalCollectorIceHydrogen: 0.5,
  fractionatorSpeed: 18,
  oilSpeed: 4,
  gzSpeed: 5,
  onlyConveyorBeltMk3: true,
  onlySorterMk3: true,
  useSorterMk4: false,
  conveyorBeltStackLayer: 4,
  generateTeslaTower: true,
  teslaTowerLineInterval: 1,
  maxLabLayers: 15,
  stackLayers: false,
  xToYRatio: 2,
});

export const DEFAULT_REQUIREMENT_DRAFT: RequirementDraftSnapshot = Object.freeze({
  ratePerMinute: 60,
  machineCount: null,
});

export const DEFAULT_QUOTE_INCLUDES: QuoteIncludeMap = Object.freeze({
  updata: "",
  explanation: "",
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

function toFiniteNumber(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function normalizeRequirementEntry(entry: unknown): RequirementEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const source = entry as Record<string, unknown>;
  const item =
    source.item && typeof source.item === "object" && !Array.isArray(source.item)
      ? cloneJsonValue(source.item as RequirementItemRef, {} as RequirementItemRef)
      : undefined;
  return {
    ...source,
    item,
    number: toFiniteNumber(source.number, 0),
  };
}

export function normalizeRequirementEntries(entries: unknown): RequirementEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  const output: RequirementEntry[] = [];
  for (const entry of entries) {
    const normalizedEntry = normalizeRequirementEntry(entry);
    if (normalizedEntry) {
      output.push(normalizedEntry);
    }
  }
  return output;
}

export function normalizeSingleMakeEntry(entry: unknown): SingleMakeEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const source = entry as Record<string, unknown>;
  const rawId = source.id;
  if (typeof rawId !== "string" && typeof rawId !== "number") {
    return null;
  }
  return {
    id: rawId,
    number: toFiniteNumber(source.number, 0),
  };
}

export function normalizeSingleMakeEntries(entries: unknown): SingleMakeEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  const output: SingleMakeEntry[] = [];
  for (const entry of entries) {
    const normalizedEntry = normalizeSingleMakeEntry(entry);
    if (normalizedEntry) {
      output.push(normalizedEntry);
    }
  }
  return output;
}

export function normalizeStringList(entries: unknown): string[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.filter((entry): entry is string => typeof entry === "string").map(entry => entry);
}

export function createDefaultCalculationRuntimeOptions(): CalculationRuntimeOptions {
  return { ...DEFAULT_CALCULATION_RUNTIME_OPTIONS };
}

export function normalizeCalculationRuntimeOptions(
  source: Partial<CalculationRuntimeOptions> | null | undefined
): CalculationRuntimeOptions {
  const input = source && typeof source === "object" ? source : {};
  return {
    pointLength: toFiniteNumber(input.pointLength, DEFAULT_CALCULATION_RUNTIME_OPTIONS.pointLength),
    hideSource: input.hideSource === true,
    showMaxOneBelt: input.showMaxOneBelt === true,
    isMerge: input.isMerge === true,
    isAddSelfAccP: input.isAddSelfAccP === true,
    selfAcc: input.selfAcc !== false,
    manualGzSpeed: input.manualGzSpeed === true,
    conveyorBeltType:
      typeof input.conveyorBeltType === "string" && input.conveyorBeltType
        ? input.conveyorBeltType
        : DEFAULT_CALCULATION_RUNTIME_OPTIONS.conveyorBeltType,
    stationStackLayer: toFiniteNumber(
      input.stationStackLayer,
      DEFAULT_CALCULATION_RUNTIME_OPTIONS.stationStackLayer
    ),
    oreMultiplier: toFiniteNumber(input.oreMultiplier, DEFAULT_CALCULATION_RUNTIME_OPTIONS.oreMultiplier),
    advancedMinerMultiplier: toFiniteNumber(
      input.advancedMinerMultiplier,
      DEFAULT_CALCULATION_RUNTIME_OPTIONS.advancedMinerMultiplier
    ),
    orbitalCollectorGasHydrogen: toFiniteNumber(
      input.orbitalCollectorGasHydrogen,
      DEFAULT_CALCULATION_RUNTIME_OPTIONS.orbitalCollectorGasHydrogen
    ),
    orbitalCollectorDeuterium: toFiniteNumber(
      input.orbitalCollectorDeuterium,
      DEFAULT_CALCULATION_RUNTIME_OPTIONS.orbitalCollectorDeuterium
    ),
    orbitalCollectorFireIce: toFiniteNumber(
      input.orbitalCollectorFireIce,
      DEFAULT_CALCULATION_RUNTIME_OPTIONS.orbitalCollectorFireIce
    ),
    orbitalCollectorIceHydrogen: toFiniteNumber(
      input.orbitalCollectorIceHydrogen,
      DEFAULT_CALCULATION_RUNTIME_OPTIONS.orbitalCollectorIceHydrogen
    ),
    fractionatorSpeed: toFiniteNumber(
      input.fractionatorSpeed,
      DEFAULT_CALCULATION_RUNTIME_OPTIONS.fractionatorSpeed
    ),
    oilSpeed: toFiniteNumber(input.oilSpeed, DEFAULT_CALCULATION_RUNTIME_OPTIONS.oilSpeed),
    gzSpeed: toFiniteNumber(input.gzSpeed, DEFAULT_CALCULATION_RUNTIME_OPTIONS.gzSpeed),
    onlyConveyorBeltMk3: input.onlyConveyorBeltMk3 !== false,
    onlySorterMk3: input.onlySorterMk3 !== false,
    useSorterMk4: input.useSorterMk4 === true,
    conveyorBeltStackLayer: toFiniteNumber(
      input.conveyorBeltStackLayer,
      DEFAULT_CALCULATION_RUNTIME_OPTIONS.conveyorBeltStackLayer
    ),
    generateTeslaTower: input.generateTeslaTower !== false,
    teslaTowerLineInterval: toFiniteNumber(
      input.teslaTowerLineInterval,
      DEFAULT_CALCULATION_RUNTIME_OPTIONS.teslaTowerLineInterval
    ),
    maxLabLayers: toFiniteNumber(input.maxLabLayers, DEFAULT_CALCULATION_RUNTIME_OPTIONS.maxLabLayers),
    stackLayers: input.stackLayers === true,
    xToYRatio: toFiniteNumber(input.xToYRatio, DEFAULT_CALCULATION_RUNTIME_OPTIONS.xToYRatio),
  };
}

export function normalizeRequirementDraft(
  source: Partial<RequirementDraftSnapshot> | null | undefined
): RequirementDraftSnapshot {
  const input = source && typeof source === "object" ? source : {};
  const ratePerMinute = toFiniteNumber(input.ratePerMinute, DEFAULT_REQUIREMENT_DRAFT.ratePerMinute);
  const rawMachineCount = Number(input.machineCount);
  return {
    ratePerMinute,
    machineCount: Number.isFinite(rawMachineCount) && rawMachineCount > 0 ? rawMachineCount : null,
  };
}

export function createEmptyQuoteIncludes(): QuoteIncludeMap {
  return { ...DEFAULT_QUOTE_INCLUDES };
}

export function normalizeQuoteIncludes(source: Partial<QuoteIncludeMap> | null | undefined): QuoteIncludeMap {
  const input = source && typeof source === "object" ? source : {};
  return {
    updata: typeof input.updata === "string" ? input.updata : DEFAULT_QUOTE_INCLUDES.updata,
    explanation: typeof input.explanation === "string" ? input.explanation : DEFAULT_QUOTE_INCLUDES.explanation,
  };
}

export function createBlueprintConfigSnapshotFromRuntimeOptions(
  runtimeOptions: Partial<CalculationRuntimeOptions> | null | undefined
): BlueprintConfigSnapshot {
  const normalizedRuntimeOptions = normalizeCalculationRuntimeOptions(runtimeOptions);
  return {
    onlyConveyorBeltMk3: normalizedRuntimeOptions.onlyConveyorBeltMk3,
    onlySorterMk3: normalizedRuntimeOptions.onlySorterMk3,
    useSorterMk4: normalizedRuntimeOptions.useSorterMk4,
    conveyorBeltStackLayer: normalizedRuntimeOptions.conveyorBeltStackLayer,
    generateTeslaTower: normalizedRuntimeOptions.generateTeslaTower,
    teslaTowerLineInterval: normalizedRuntimeOptions.teslaTowerLineInterval,
    maxLabLayers: normalizedRuntimeOptions.maxLabLayers,
    stackLayers: normalizedRuntimeOptions.stackLayers,
    xToYRatio: normalizedRuntimeOptions.xToYRatio,
    selfSpray: normalizedRuntimeOptions.selfAcc,
  };
}

export function normalizeBlueprintConfigSnapshot(
  source: Partial<BlueprintConfigSnapshot> | null | undefined
): BlueprintConfigSnapshot {
  const input = source && typeof source === "object" ? source : {};
  return createBlueprintConfigSnapshotFromRuntimeOptions({
    ...createDefaultCalculationRuntimeOptions(),
    onlyConveyorBeltMk3: input.onlyConveyorBeltMk3,
    onlySorterMk3: input.onlySorterMk3,
    useSorterMk4: input.useSorterMk4,
    conveyorBeltStackLayer: input.conveyorBeltStackLayer,
    generateTeslaTower: input.generateTeslaTower,
    teslaTowerLineInterval: input.teslaTowerLineInterval,
    maxLabLayers: input.maxLabLayers,
    stackLayers: input.stackLayers,
    xToYRatio: input.xToYRatio,
    selfAcc: input.selfSpray,
  });
}

export function createBlueprintGenerationConfig(
  source: Partial<BlueprintConfigSnapshot> | null | undefined
): BlueprintGenerationConfig {
  const snapshot = normalizeBlueprintConfigSnapshot(source);
  return {
    maxSorterNumOneBelt: 8,
    conveyorBeltStackLayer: snapshot.conveyorBeltStackLayer,
    x_y_ratio: snapshot.xToYRatio,
    compactLayout: false,
    upgradeConveyorBelt: false,
    onlyConveyorBeltMk3: snapshot.onlyConveyorBeltMk3,
    onlySorterMk3: snapshot.onlySorterMk3,
    useSorterMk4: snapshot.useSorterMk4,
    maxLabLayers: snapshot.maxLabLayers,
    selfSpray: snapshot.selfSpray,
    generateTeslaTower: snapshot.generateTeslaTower,
    teslaTowerInterval: 10,
    teslaTowerLineInterval: snapshot.teslaTowerLineInterval,
    onlyConveyorBeltMk3Downgrade: false,
    stackLayers: snapshot.stackLayers ? 4 : 1,
  };
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
