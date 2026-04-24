import { domainDictionary } from "../domain/domain-dictionary";
import {
  DEFAULT_GLOBAL_SETTINGS,
  type BasicStorageLike,
  type DomainDictionaryApi,
  type GlobalSettings,
  type MachineSettingsSnapshot,
  type NumericInputLike,
  type NumericNormalizationOptions,
  type NumericNormalizationResult,
  type ProjectSnapshot,
  type StorageAdapter,
  normalizeRequirementEntries,
  normalizeSingleMakeEntries,
} from "../types/dsq";

export interface TranslationFn {
  (key: string, params?: Record<string, unknown> | null, fallback?: string): string;
}

export interface WarningNotifier {
  warning(message: string, duration?: number): void;
}

interface ServiceRootLike {
  localStorage?: BasicStorageLike;
  cocoMessage?: WarningNotifier;
  console?: Pick<Console, "warn">;
  document?: Pick<Document, "getElementById">;
  DSQI18n?: {
    t?: TranslationFn;
  };
}

export interface DsqServicesOptions {
  root?: ServiceRootLike;
  domain?: DomainDictionaryApi;
  translator?: TranslationFn;
  notifier?: WarningNotifier;
}

type NumericTarget = string | NumericInputLike | number | null | undefined;

function getDefaultRoot(): ServiceRootLike | undefined {
  return typeof window !== "undefined" ? (window as ServiceRootLike) : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function deepClone<T>(value: T): T {
  if (!isObject(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => deepClone(entry)) as T;
  }
  const output: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    output[key] = deepClone(entryValue);
  }
  return output as T;
}

export function safeParseJSON<T>(raw: unknown, fallbackValue: T): T {
  if (typeof raw !== "string" || raw.length === 0) {
    return fallbackValue;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallbackValue;
  }
}

export function safeStringify(value: unknown, fallbackValue: string): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallbackValue;
  }
}

export function createBrowserStorageAdapter(root: ServiceRootLike | undefined = getDefaultRoot()): StorageAdapter {
  function hasLocalStorage(): boolean {
    try {
      return !!root?.localStorage;
    } catch {
      return false;
    }
  }

  function getLocalStorageItem(key: string): string | null {
    if (!hasLocalStorage()) {
      return null;
    }
    try {
      return root?.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  function setLocalStorageItem(key: string, value: string): boolean {
    if (!hasLocalStorage()) {
      return false;
    }
    try {
      root?.localStorage?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function removeLocalStorageItem(key: string): boolean {
    if (!hasLocalStorage()) {
      return false;
    }
    try {
      root?.localStorage?.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function clearByPrefixes(prefixes: readonly string[]): number {
    if (!hasLocalStorage() || prefixes.length === 0) {
      return 0;
    }
    const keysToRemove: string[] = [];
    const storage = root?.localStorage;
    if (!storage) {
      return 0;
    }
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) {
        continue;
      }
      for (const prefix of prefixes) {
        if (typeof prefix === "string" && prefix.length > 0 && key.startsWith(prefix)) {
          keysToRemove.push(key);
          break;
        }
      }
    }
    for (const key of keysToRemove) {
      removeLocalStorageItem(key);
    }
    return keysToRemove.length;
  }

  return {
    hasLocalStorage,
    getItem: getLocalStorageItem,
    setItem: setLocalStorageItem,
    removeItem: removeLocalStorageItem,
    clearByPrefixes,
  };
}

export function createProjectSnapshot(project: unknown): ProjectSnapshot {
  const source = isObject(project) ? project : {};
  return {
    name: typeof source.name === "string" ? source.name : "",
    singleMake: normalizeSingleMakeEntries(source.singleMake),
    ig_names: Array.isArray(source.ig_names)
      ? source.ig_names.filter((entry): entry is string => typeof entry === "string").map((entry) => entry)
      : [],
    value: normalizeRequirementEntries(source.value),
    settings: isObject(source.settings) ? (deepClone(source.settings) as MachineSettingsSnapshot) : {},
  };
}

export function hydrateProjectForRuntime(project: unknown): ProjectSnapshot {
  return createProjectSnapshot(project);
}

export const GLOBAL_SETTINGS_OPTIONS: Readonly<Record<keyof GlobalSettings, readonly string[]>> = Object.freeze({
  selmodein: ["assemblingMachineMk1", "assemblingMachineMk2", "assemblingMachineMk3", "recomposingAssembler"],
  furnace: ["arcSmelter", "planeSmelter", "negentropySmelter"],
  chemical: ["chemicalPlant", "quantumChemicalPlant"],
  research: ["matrixLab", "selfEvolutionLab"],
  accType: ["proliferatorMk1", "proliferatorMk2", "proliferatorMk3"],
  accValue: ["none", "speedup", "extra"],
});

function normalizeEnumValue(value: unknown, allowedValues: readonly string[], fallbackValue: string): string {
  return typeof value === "string" && allowedValues.includes(value) ? value : fallbackValue;
}

function normalizeMachineValue(
  value: unknown,
  allowedValues: readonly string[],
  fallbackValue: string,
  dictionary: DomainDictionaryApi
): string {
  const normalizedValue = dictionary.getMachineId(value) || value;
  return normalizeEnumValue(normalizedValue, allowedValues, fallbackValue);
}

function normalizeItemValue(
  value: unknown,
  allowedValues: readonly string[],
  fallbackValue: string,
  dictionary: DomainDictionaryApi
): string {
  const normalizedValue = dictionary.getItemId(value) || value;
  return normalizeEnumValue(normalizedValue, allowedValues, fallbackValue);
}

function normalizeAccValue(
  value: unknown,
  allowedValues: readonly string[],
  fallbackValue: string,
  dictionary: DomainDictionaryApi
): string {
  const normalizedValue = dictionary.getAccValueId(value) || value;
  return normalizeEnumValue(normalizedValue, allowedValues, fallbackValue);
}

export function createGlobalSettingsSnapshot(
  source: unknown,
  dictionary: DomainDictionaryApi = domainDictionary
): GlobalSettings {
  const input = isObject(source) ? source : {};
  return {
    selmodein: normalizeMachineValue(
      input.selmodein,
      GLOBAL_SETTINGS_OPTIONS.selmodein,
      DEFAULT_GLOBAL_SETTINGS.selmodein,
      dictionary
    ),
    furnace: normalizeMachineValue(
      input.furnace,
      GLOBAL_SETTINGS_OPTIONS.furnace,
      DEFAULT_GLOBAL_SETTINGS.furnace,
      dictionary
    ),
    chemical: normalizeMachineValue(
      input.chemical,
      GLOBAL_SETTINGS_OPTIONS.chemical,
      DEFAULT_GLOBAL_SETTINGS.chemical,
      dictionary
    ),
    research: normalizeMachineValue(
      input.research,
      GLOBAL_SETTINGS_OPTIONS.research,
      DEFAULT_GLOBAL_SETTINGS.research,
      dictionary
    ),
    accType: normalizeItemValue(
      input.accType,
      GLOBAL_SETTINGS_OPTIONS.accType,
      DEFAULT_GLOBAL_SETTINGS.accType,
      dictionary
    ),
    accValue: normalizeAccValue(
      input.accValue,
      GLOBAL_SETTINGS_OPTIONS.accValue,
      DEFAULT_GLOBAL_SETTINGS.accValue,
      dictionary
    ),
  };
}

function resolveFieldLabel(options?: NumericNormalizationOptions): string {
  return typeof options?.fieldLabel === "string" ? options.fieldLabel.trim() : "";
}

function translate(
  key: string,
  params: Record<string, unknown> | null | undefined,
  fallback: string | undefined,
  options: DsqServicesOptions
): string {
  const translator = options.translator ?? options.root?.DSQI18n?.t;
  if (translator) {
    return translator(key, params ?? null, fallback ?? "");
  }
  if (!fallback) {
    return key;
  }
  return fallback.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token) => {
    if (!params || !Object.prototype.hasOwnProperty.call(params, token)) {
      return match;
    }
    return params[token] == null ? "" : String(params[token]);
  });
}

export function notifyWarning(
  message: string,
  duration: number | undefined,
  options: DsqServicesOptions = {}
): void {
  if (!message) {
    return;
  }
  const notifier = options.notifier ?? options.root?.cocoMessage;
  if (notifier?.warning) {
    notifier.warning(message, duration || 3000);
    return;
  }
  options.root?.console?.warn?.(message);
}

function getFractionDigitsFromStep(stepValue: number | string | undefined): number | null {
  if (typeof stepValue !== "string" && typeof stepValue !== "number") {
    return null;
  }
  const rawValue = String(stepValue).trim();
  if (!rawValue || rawValue === "any") {
    return null;
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(rawValue)) {
    return null;
  }
  const dotIndex = rawValue.indexOf(".");
  return dotIndex === -1 ? 0 : rawValue.length - dotIndex - 1;
}

function toFiniteNumber(rawValue: unknown): number {
  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) ? rawValue : Number.NaN;
  }
  if (typeof rawValue !== "string") {
    return Number.NaN;
  }
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return Number.NaN;
  }
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    return Number.NaN;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function roundToFractionDigits(value: number, digits: number | undefined): number {
  if (!Number.isFinite(value) || typeof digits !== "number" || digits < 0) {
    return value;
  }
  return Number(value.toFixed(Math.min(digits, 12)));
}

export function formatNumericValue(value: number, options?: Pick<NumericNormalizationOptions, "maxFractionDigits">): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (typeof options?.maxFractionDigits !== "number") {
    return String(value);
  }
  return String(roundToFractionDigits(value, options.maxFractionDigits));
}

export function normalizeNumericValue(
  rawValue: unknown,
  options: NumericNormalizationOptions = {}
): NumericNormalizationResult {
  const result: NumericNormalizationResult = {
    valid: false,
    adjusted: false,
    value: Number.NaN,
    reason: "invalid",
    fieldLabel: resolveFieldLabel(options),
  };
  let numeric = toFiniteNumber(rawValue);
  if (!Number.isFinite(numeric)) {
    return result;
  }

  if (options.integer === true && Math.floor(numeric) !== numeric) {
    if (options.clamp === true) {
      numeric = Math.round(numeric);
      result.adjusted = true;
    } else {
      result.reason = "not_integer";
      return result;
    }
  }

  if (typeof options.maxFractionDigits === "number") {
    const rounded = roundToFractionDigits(numeric, options.maxFractionDigits);
    if (rounded !== numeric) {
      numeric = rounded;
      result.adjusted = true;
    }
  }

  if (options.requirePositive === true && !(numeric > 0)) {
    result.reason = "not_positive";
    return result;
  }

  if (typeof options.min === "number" && numeric < options.min) {
    if (options.clamp === true) {
      numeric = options.min;
      result.adjusted = true;
    } else {
      result.reason = "below_min";
      return result;
    }
  }

  if (typeof options.max === "number" && numeric > options.max) {
    if (options.clamp === true) {
      numeric = options.max;
      result.adjusted = true;
    } else {
      result.reason = "above_max";
      return result;
    }
  }

  result.valid = true;
  result.value = numeric;
  result.reason = result.adjusted ? "adjusted" : "ok";
  return result;
}

function resolveNumericBoundsFromElement(
  element: NumericInputLike | null,
  options: NumericNormalizationOptions = {}
): Required<Pick<NumericNormalizationOptions, "integer">> &
  Pick<NumericNormalizationOptions, "min" | "max" | "maxFractionDigits"> {
  let min = options.min;
  let max = options.max;
  let step = options.step;

  if (element && options.useInputAttributes !== false) {
    if (min === undefined && element.hasAttribute?.("min")) {
      const attrMin = toFiniteNumber(element.getAttribute?.("min"));
      if (Number.isFinite(attrMin)) {
        min = attrMin;
      }
    }
    if (max === undefined && element.hasAttribute?.("max")) {
      const attrMax = toFiniteNumber(element.getAttribute?.("max"));
      if (Number.isFinite(attrMax)) {
        max = attrMax;
      }
    }
    if (step === undefined && element.hasAttribute?.("step")) {
      step = element.getAttribute?.("step") ?? undefined;
    }
  }

  let maxFractionDigits = options.maxFractionDigits;
  if (maxFractionDigits === undefined) {
    maxFractionDigits = getFractionDigitsFromStep(step) ?? undefined;
  }

  let integer = options.integer;
  if (integer === undefined && maxFractionDigits === 0) {
    integer = true;
  }

  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
    integer: integer === true,
    maxFractionDigits,
  };
}

function resolveNumericTarget(target: NumericTarget, root: ServiceRootLike | undefined): NumericInputLike | null {
  if (!target) {
    return null;
  }
  if (typeof target === "string") {
    const element = root?.document?.getElementById?.(target);
    return element && "value" in element ? (element as unknown as NumericInputLike) : null;
  }
  if (typeof target === "object" && target.nodeType === 1 && "value" in target) {
    return target;
  }
  return null;
}

function getPreviousNumericValue(element: NumericInputLike | null, options: NumericNormalizationOptions): number {
  let previousValue = options.previousValue;
  if (!Number.isFinite(previousValue) && element?.dataset?.lastValid) {
    previousValue = toFiniteNumber(element.dataset.lastValid);
  }
  if (!Number.isFinite(previousValue) && Number.isFinite(options.fallbackValue)) {
    previousValue = options.fallbackValue;
  }
  return typeof previousValue === "number" && Number.isFinite(previousValue) ? previousValue : Number.NaN;
}

function warnNumericIssue(
  result: NumericNormalizationResult,
  nextValue: number,
  options: NumericNormalizationOptions,
  serviceOptions: DsqServicesOptions
): void {
  if (options.warn === false) {
    return;
  }
  const params = {
    field: result.fieldLabel || translate("message.numeric_field_generic", null, "输入值", serviceOptions),
    value: formatNumericValue(nextValue, options),
  };
  notifyWarning(
    translate("message.numeric_input_reverted", params, "{field}无效，已恢复为 {value}", serviceOptions),
    options.warningDuration || 3000,
    serviceOptions
  );
}

function updateNumericElementState(
  element: NumericInputLike | null,
  nextValue: number,
  options: Pick<NumericNormalizationOptions, "maxFractionDigits">
): void {
  if (!element) {
    return;
  }
  const displayValue = formatNumericValue(nextValue, options);
  if (displayValue === "") {
    return;
  }
  element.value = displayValue;
  if (element.dataset) {
    element.dataset.lastValid = displayValue;
  }
}

export function readNumericInput(
  target: NumericTarget,
  options: NumericNormalizationOptions = {},
  serviceOptions: DsqServicesOptions = {}
): number {
  const element = resolveNumericTarget(target, serviceOptions.root);
  const rawValue = element ? element.value : target;
  const previousValue = getPreviousNumericValue(element, options);
  const bounds = resolveNumericBoundsFromElement(element, options);
  const result = normalizeNumericValue(rawValue, {
    fieldLabel: options.fieldLabel,
    min: bounds.min,
    max: bounds.max,
    integer: bounds.integer,
    maxFractionDigits: bounds.maxFractionDigits,
    requirePositive: options.requirePositive === true,
    clamp: options.clamp === true,
  });

  if (result.valid) {
    updateNumericElementState(element, result.value, bounds);
    return result.value;
  }

  let fallbackValue = previousValue;
  if (!Number.isFinite(fallbackValue)) {
    fallbackValue =
      typeof options.fallbackValue === "number" && Number.isFinite(options.fallbackValue)
        ? options.fallbackValue
        : Number.NaN;
  }
  if (!Number.isFinite(fallbackValue)) {
    fallbackValue = typeof bounds.min === "number" && Number.isFinite(bounds.min) ? bounds.min : 0;
  }

  updateNumericElementState(element, fallbackValue, bounds);
  warnNumericIssue(
    result,
    fallbackValue,
    {
      ...options,
      min: bounds.min,
      max: bounds.max,
      integer: bounds.integer,
      maxFractionDigits: bounds.maxFractionDigits,
    },
    serviceOptions
  );
  return fallbackValue;
}

export function rememberNumericInput(
  target: NumericTarget,
  options: NumericNormalizationOptions = {},
  serviceOptions: DsqServicesOptions = {}
): number {
  return readNumericInput(
    target,
    {
      warn: false,
      fallbackValue: options.fallbackValue,
      previousValue: options.previousValue,
      min: options.min,
      max: options.max,
      step: options.step,
      integer: options.integer,
      maxFractionDigits: options.maxFractionDigits,
      requirePositive: options.requirePositive,
      clamp: options.clamp,
      useInputAttributes: options.useInputAttributes,
      fieldLabel: options.fieldLabel,
    },
    serviceOptions
  );
}

export function normalizeProjectName(
  rawValue: unknown,
  options: { maxLength?: number } = {},
  serviceOptions: DsqServicesOptions = {}
): {
  valid: boolean;
  value: string;
  maxLength: number;
  message: string;
} {
  const maxLength = Number.isFinite(options.maxLength) ? (options.maxLength as number) : 80;
  const value = typeof rawValue === "string" ? rawValue.replace(/\s+/g, " ").trim() : "";
  if (!value) {
    return {
      valid: false,
      value: "",
      maxLength,
      message: translate("message.project_name_required", null, "方案名不能为空", serviceOptions),
    };
  }
  if (value.length > maxLength) {
    return {
      valid: false,
      value: value.slice(0, maxLength),
      maxLength,
      message: translate(
        "message.project_name_too_long",
        { max: maxLength },
        "方案名不能超过 {max} 个字符",
        serviceOptions
      ),
    };
  }
  return {
    valid: true,
    value,
    maxLength,
    message: "",
  };
}

export function createDsqServices(options: DsqServicesOptions = {}) {
  const normalizedOptions: DsqServicesOptions = {
    root: options.root ?? getDefaultRoot(),
    domain: options.domain ?? domainDictionary,
    translator: options.translator,
    notifier: options.notifier,
  };
  const storage = createBrowserStorageAdapter(normalizedOptions.root);

  return {
    deepClone,
    safeParseJSON,
    safeStringify,
    storage,
    project: {
      createSnapshot: createProjectSnapshot,
      hydrateForRuntime: hydrateProjectForRuntime,
      normalizeName: (rawValue: unknown, nameOptions?: { maxLength?: number }) =>
        normalizeProjectName(rawValue, nameOptions, normalizedOptions),
    },
    domain: normalizedOptions.domain,
    globalSettings: {
      defaults: DEFAULT_GLOBAL_SETTINGS,
      options: GLOBAL_SETTINGS_OPTIONS,
      createSnapshot: (source: unknown) => createGlobalSettingsSnapshot(source, normalizedOptions.domain),
    },
    numeric: {
      normalizeValue: normalizeNumericValue,
      readInput: (target: NumericTarget, numericOptions?: NumericNormalizationOptions) =>
        readNumericInput(target, numericOptions, normalizedOptions),
      rememberInput: (target: NumericTarget, numericOptions?: NumericNormalizationOptions) =>
        rememberNumericInput(target, numericOptions, normalizedOptions),
      formatValue: formatNumericValue,
    },
    notify: {
      warning: (message: string, duration?: number) => notifyWarning(message, duration, normalizedOptions),
    },
  };
}

export type DsqServices = ReturnType<typeof createDsqServices>;

export const dsqServices = createDsqServices();
