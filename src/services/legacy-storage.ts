import { domainDictionary } from "../domain/domain-dictionary";
import {
  type DomainDictionaryApi,
  type GlobalSettings,
  type MachineSettingRecord,
  type MachineSettingsSnapshot,
  type ProjectSnapshot,
  type SpeedSettingsSnapshot,
  type StorageAdapter,
} from "../types/dsq";
import { createDsqServices, safeParseJSON } from "./app-services";

export const LEGACY_STORAGE_KEY_PREFIXES = [
  "machine_settings",
  "global_settings",
  "machine_settings_time",
  "machine_settings_pf",
  "settings_projects",
] as const;

interface LegacyDocumentLike {
  cookie: string;
  getElementById?(id: string): { checked?: boolean } | null;
}

interface LegacyStorageServiceOptions {
  storage?: StorageAdapter;
  document?: LegacyDocumentLike;
  domainDictionary?: DomainDictionaryApi;
  globalSettingsService?: {
    createSnapshot(source: unknown): GlobalSettings;
  };
  projectService?: {
    createSnapshot(project: unknown): ProjectSnapshot;
  };
}

type JsonObjectLike = Record<string, unknown> | unknown[];

function getDefaultDocument(): LegacyDocumentLike | undefined {
  return typeof document !== "undefined" ? (document as unknown as LegacyDocumentLike) : undefined;
}

export function readCookieValue(key: string, documentRef: LegacyDocumentLike | undefined = getDefaultDocument()): string | null {
  if (!key || !documentRef) {
    return null;
  }
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = documentRef.cookie.match(new RegExp(`(?:^|; )${escapedKey}=([^;]*)`));
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function removeCookie(key: string, documentRef: LegacyDocumentLike | undefined = getDefaultDocument()): void {
  if (!key || !documentRef) {
    return;
  }
  documentRef.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function markTransportDefaults(documentRef: LegacyDocumentLike | undefined): void {
  const beltNode = documentRef?.getElementById?.("onlyConveyorBeltMk3");
  const sorterNode = documentRef?.getElementById?.("onlySorterMk3");
  if (beltNode) {
    beltNode.checked = true;
  }
  if (sorterNode) {
    sorterNode.checked = true;
  }
}

export function normalizeMachineSettingRecord(
  source: unknown,
  dictionary: DomainDictionaryApi = domainDictionary
): MachineSettingRecord {
  const input = source && typeof source === "object" ? (source as Record<string, unknown>) : {};
  const output: MachineSettingRecord = {};
  if (input.m != null) {
    const machineId = dictionary.getMachineId(input.m) || (typeof input.m === "string" ? input.m : null);
    if (machineId) {
      output.m = machineId;
    }
  }
  if (input.accType != null) {
    const accTypeId = dictionary.getItemId(input.accType) || (typeof input.accType === "string" ? input.accType : null);
    if (accTypeId) {
      output.accType = accTypeId;
    }
  }
  if (input.accValue != null) {
    const accValueId =
      dictionary.getAccValueId(input.accValue) || (typeof input.accValue === "string" ? input.accValue : null);
    if (accValueId) {
      output.accValue = accValueId;
    }
  }
  return output;
}

export function normalizeMachineSettingsForStorage(
  source: unknown,
  dictionary: DomainDictionaryApi = domainDictionary
): MachineSettingsSnapshot {
  const input = source && typeof source === "object" && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
  const output: MachineSettingsSnapshot = {};
  for (const key of Object.keys(input)) {
    output[key] = normalizeMachineSettingRecord(input[key], dictionary);
  }
  return output;
}

export function normalizeSpeedSettingsForStorage(
  source: unknown,
  dictionary: DomainDictionaryApi = domainDictionary
): SpeedSettingsSnapshot {
  const input = source && typeof source === "object" && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
  const output: SpeedSettingsSnapshot = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const machineId = dictionary.getMachineId(rawKey) || rawKey;
    const numericValue = Number(rawValue);
    if (!machineId || !Number.isFinite(numericValue) || numericValue <= 0) {
      continue;
    }
    output[machineId] = numericValue;
  }
  return output;
}

export function normalizeGlobalSettingsForStorage(
  source: unknown,
  globalSettingsService: LegacyStorageServiceOptions["globalSettingsService"] = createDsqServices().globalSettings
): GlobalSettings {
  return globalSettingsService.createSnapshot(source);
}

export function normalizeProjectForStorage(
  project: unknown,
  options: Pick<LegacyStorageServiceOptions, "projectService" | "domainDictionary"> = {}
): ProjectSnapshot {
  const projectService = options.projectService ?? createDsqServices().project;
  const dictionary = options.domainDictionary ?? domainDictionary;
  const snapshot = projectService.createSnapshot(project);
  const normalizedSpeedSettings = snapshot.speedSettings
    ? normalizeSpeedSettingsForStorage(snapshot.speedSettings, dictionary)
    : undefined;
  return {
    ...snapshot,
    settings: normalizeMachineSettingsForStorage(snapshot.settings, dictionary),
    globalSettings: snapshot.globalSettings,
    speedSettings: normalizedSpeedSettings,
    recipeSettings:
      snapshot.recipeSettings && typeof snapshot.recipeSettings === "object" && !Array.isArray(snapshot.recipeSettings)
        ? (snapshot.recipeSettings as Record<string, unknown>)
        : undefined,
    runtimeOptions: snapshot.runtimeOptions,
  };
}

export function normalizeProjectsForStorage(
  source: unknown,
  options: Pick<LegacyStorageServiceOptions, "projectService" | "domainDictionary"> = {}
): ProjectSnapshot[] {
  if (!Array.isArray(source)) {
    return [];
  }
  return source.map((project) => normalizeProjectForStorage(project, options));
}

export function createLegacyStorageService(options: LegacyStorageServiceOptions = {}) {
  const dsqServices = createDsqServices();
  const storage = options.storage ?? dsqServices.storage;
  const documentRef = options.document ?? getDefaultDocument();
  const dictionary = options.domainDictionary ?? domainDictionary;
  const globalSettingsService = options.globalSettingsService ?? dsqServices.globalSettings;
  const projectService = options.projectService ?? dsqServices.project;
  const migratedLegacyCookieKeys = new Set<string>();

  function migrateCookieToLocalStorage(key: string): string | null {
    if (!storage.hasLocalStorage()) {
      return null;
    }
    if (migratedLegacyCookieKeys.has(key)) {
      return storage.getItem(key);
    }
    const cookieValue = readCookieValue(key, documentRef);
    if (cookieValue == null) {
      migratedLegacyCookieKeys.add(key);
      return storage.getItem(key);
    }
    storage.setItem(key, cookieValue);
    removeCookie(key, documentRef);
    migratedLegacyCookieKeys.add(key);
    return cookieValue;
  }

  function getData(key: string): string | null {
    if (!storage.hasLocalStorage()) {
      return readCookieValue(key, documentRef);
    }
    const localValue = storage.getItem(key);
    if (localValue != null) {
      return localValue;
    }
    return migrateCookieToLocalStorage(key);
  }

  function saveData(key: string, value: string): void {
    storage.setItem(key, value);
  }

  function loadStoredObject<T extends JsonObjectLike>(key: string, fallbackValue: T): T {
    const parsed = safeParseJSON(getData(key), fallbackValue);
    return parsed && typeof parsed === "object" ? parsed : fallbackValue;
  }

  function saveMachineSettings(version: string, source: unknown): MachineSettingsSnapshot {
    const normalized = normalizeMachineSettingsForStorage(source, dictionary);
    saveData(`machine_settings${version}`, JSON.stringify(normalized));
    return normalized;
  }

  function loadMachineSettings(version: string): MachineSettingsSnapshot {
    const normalized = normalizeMachineSettingsForStorage(loadStoredObject(`machine_settings${version}`, {}), dictionary);
    markTransportDefaults(documentRef);
    return normalized;
  }

  function saveGlobalSettings(version: string, source: unknown): GlobalSettings {
    const normalized = normalizeGlobalSettingsForStorage(source, globalSettingsService);
    saveData(`global_settings${version}`, JSON.stringify(normalized));
    return normalized;
  }

  function loadGlobalSettings(version: string): GlobalSettings {
    return normalizeGlobalSettingsForStorage(loadStoredObject(`global_settings${version}`, {}), globalSettingsService);
  }

  function saveSpeedSettings(version: string, source: unknown): SpeedSettingsSnapshot {
    const normalized = normalizeSpeedSettingsForStorage(source, dictionary);
    saveData(`machine_settings_time${version}`, JSON.stringify(normalized));
    return normalized;
  }

  function loadSpeedSettings(version: string): SpeedSettingsSnapshot {
    return normalizeSpeedSettingsForStorage(loadStoredObject(`machine_settings_time${version}`, {}), dictionary);
  }

  function saveRecipeSettings(version: string, source: unknown): Record<string, unknown> {
    const normalized =
      source && typeof source === "object" && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
    saveData(`machine_settings_pf${version}`, JSON.stringify(normalized));
    return normalized;
  }

  function loadRecipeSettings(version: string): Record<string, unknown> {
    const parsed = loadStoredObject(`machine_settings_pf${version}`, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  }

  function saveProjects(version: string, source: unknown): ProjectSnapshot[] {
    const normalized = normalizeProjectsForStorage(source, { projectService, domainDictionary: dictionary });
    saveData(`settings_projects${version}`, JSON.stringify(normalized));
    return normalized;
  }

  function loadProjects(version: string): ProjectSnapshot[] {
    return normalizeProjectsForStorage(loadStoredObject(`settings_projects${version}`, []), {
      projectService,
      domainDictionary: dictionary,
    });
  }

  return {
    saveData,
    getData,
    loadStoredObject,
    saveMachineSettings,
    loadMachineSettings,
    saveGlobalSettings,
    loadGlobalSettings,
    saveSpeedSettings,
    loadSpeedSettings,
    saveRecipeSettings,
    loadRecipeSettings,
    saveProjects,
    loadProjects,
  };
}
