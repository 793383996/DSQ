import rawDomainDictionary from "./domain-dictionary.data.json";

import type {
  AccValueRecord,
  DomainDictionaryApi,
  DomainLookupKind,
  GlobalSettings,
  ItemRecord,
  MachineOption,
  RecipeTypeRecord,
} from "../types/dsq";

interface DomainDictionaryData {
  items: ItemRecord[];
  machines: MachineOption[];
  recipeTypes: RecipeTypeRecord[];
  accValues: AccValueRecord[];
}

type DomainLookupEntry = ItemRecord | MachineOption | RecipeTypeRecord | AccValueRecord;

function freezeEntries<T extends object>(entries: readonly T[]): readonly Readonly<T>[] {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })) as Array<Readonly<T>>);
}

function normalizeKey(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function registerAliases<T extends { id: string; displayNameZh: string; aliasesZh: string[] }>(
  targetMap: Record<string, string>,
  entry: Readonly<T>,
  extraAliases: Array<string | null | undefined> = []
): void {
  const aliases = [entry.id, entry.displayNameZh, ...entry.aliasesZh, ...extraAliases];
  for (const alias of aliases) {
    const key = normalizeKey(alias);
    if (!key) {
      continue;
    }
    targetMap[key] = entry.id;
  }
}

function getEntryByValue<T extends DomainLookupEntry>(
  idMap: Record<string, Readonly<T>>,
  aliasMap: Record<string, string>,
  value: unknown
): Readonly<T> | null {
  const key = normalizeKey(value);
  if (!key) {
    return null;
  }
  const id = idMap[key] ? key : aliasMap[key];
  if (!id) {
    return null;
  }
  return idMap[id] || null;
}

const domainData = rawDomainDictionary as DomainDictionaryData;

export const itemDefinitions = freezeEntries(domainData.items);
export const machineDefinitions = freezeEntries(domainData.machines);
export const recipeTypeDefinitions = freezeEntries(domainData.recipeTypes);
export const accValueDefinitions = freezeEntries(domainData.accValues);

const itemById = Object.create(null) as Record<string, Readonly<ItemRecord>>;
const itemAliasMap = Object.create(null) as Record<string, string>;
const machineById = Object.create(null) as Record<string, Readonly<MachineOption>>;
const machineAliasMap = Object.create(null) as Record<string, string>;
const recipeTypeById = Object.create(null) as Record<string, Readonly<RecipeTypeRecord>>;
const recipeTypeAliasMap = Object.create(null) as Record<string, string>;
const accValueById = Object.create(null) as Record<string, Readonly<AccValueRecord>>;
const accValueAliasMap = Object.create(null) as Record<string, string>;

for (const entry of itemDefinitions) {
  itemById[entry.id] = entry;
  registerAliases(itemAliasMap, entry, [entry.blueprintEntityName]);
}

for (const entry of machineDefinitions) {
  machineById[entry.id] = entry;
  registerAliases(machineAliasMap, entry, [entry.blueprintEntityName]);
}

for (const entry of recipeTypeDefinitions) {
  recipeTypeById[entry.id] = entry;
  registerAliases(recipeTypeAliasMap, entry, [entry.defaultMachineId, entry.globalSettingKey]);
}

for (const entry of accValueDefinitions) {
  accValueById[entry.id] = entry;
  registerAliases(accValueAliasMap, entry);
}

export function getItem(value: unknown): Readonly<ItemRecord> | null {
  return getEntryByValue(itemById, itemAliasMap, value);
}

export function getMachine(value: unknown): Readonly<MachineOption> | null {
  return getEntryByValue(machineById, machineAliasMap, value);
}

export function getRecipeType(value: unknown): Readonly<RecipeTypeRecord> | null {
  return getEntryByValue(recipeTypeById, recipeTypeAliasMap, value);
}

export function getAccValue(value: unknown): Readonly<AccValueRecord> | null {
  return getEntryByValue(accValueById, accValueAliasMap, value);
}

export function getItemId(value: unknown): string | null {
  return getItem(value)?.id ?? null;
}

export function getMachineId(value: unknown): string | null {
  return getMachine(value)?.id ?? null;
}

export function getRecipeTypeId(value: unknown): string | null {
  return getRecipeType(value)?.id ?? null;
}

export function getAccValueId(value: unknown): string | null {
  return getAccValue(value)?.id ?? null;
}

export function getDisplayName(value: unknown): string {
  return (
    getMachine(value)?.displayNameZh ??
    getItem(value)?.displayNameZh ??
    getAccValue(value)?.displayNameZh ??
    getRecipeType(value)?.displayNameZh ??
    normalizeKey(value)
  );
}

export function getIconName(value: unknown): string {
  return getMachine(value)?.iconName ?? getItem(value)?.iconName ?? getDisplayName(value);
}

export function getBlueprintEntityName(value: unknown): string | null {
  return getMachine(value)?.blueprintEntityName ?? getItem(value)?.blueprintEntityName ?? null;
}

export function normalizeLegacyValue(kind: DomainLookupKind, value: unknown): string | null {
  switch (kind) {
    case "item":
      return getItemId(value);
    case "machine":
      return getMachineId(value);
    case "recipeType":
      return getRecipeTypeId(value);
    case "accValue":
      return getAccValueId(value);
    default:
      return null;
  }
}

export function getMachineI18nKey(value: unknown): string | null {
  return getMachine(value)?.i18nKey ?? null;
}

export function getRecipeTypeGlobalSettingKey(value: unknown): keyof GlobalSettings | null {
  return getRecipeType(value)?.globalSettingKey ?? null;
}

export function getDefaultMachineIdForRecipeType(value: unknown): string | null {
  return getRecipeType(value)?.defaultMachineId ?? null;
}

export function getMachineOptionsForRecipeType(value: unknown): string[] {
  const recipeTypeId = getRecipeTypeId(value);
  if (!recipeTypeId) {
    return [];
  }
  return machineDefinitions.filter((entry) => entry.recipeTypeId === recipeTypeId).map((entry) => entry.id);
}

export const domainDictionary: DomainDictionaryApi = Object.freeze({
  items: itemDefinitions,
  machines: machineDefinitions,
  recipeTypes: recipeTypeDefinitions,
  accValues: accValueDefinitions,
  getItem,
  getMachine,
  getRecipeType,
  getAccValue,
  getItemId,
  getMachineId,
  getRecipeTypeId,
  getAccValueId,
  getDisplayName,
  getIconName,
  getBlueprintEntityName,
  getMachineI18nKey,
  getRecipeTypeGlobalSettingKey,
  getDefaultMachineIdForRecipeType,
  getMachineOptionsForRecipeType,
  normalizeLegacyValue,
});

export default domainDictionary;
