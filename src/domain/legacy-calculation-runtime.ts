import { calculateMaxMachinesPerBelt, getAccSpeed as getAccSpeedFromCore, getBeltSpeed } from "./calc-core";
import { domainDictionary } from "./domain-dictionary";
import {
  cloneJsonValue,
  createEmptyCalculationOutput,
  normalizeCalculationRuntimeOptions,
  normalizeRequirementEntries,
  normalizeSingleMakeEntries,
  normalizeStringList,
  type BlueprintSnapshot,
  type CalculationOutput,
  type CalculationRuntimeOptions,
  type CalculationSnapshot,
  type GlobalSettings,
  type MachineSettingRecord,
  type MachineSettingsSnapshot,
  type RequirementEntry,
  type RequirementItemRef,
  type SingleMakeEntry,
} from "../types/dsq";

interface LegacyRecipeComponent {
  name: string;
  itemId?: string;
  n?: number;
  [key: string]: unknown;
}

interface LegacyMachineOption {
  id?: string;
  name?: string;
  iconName?: string;
  speed?: number;
  [key: string]: unknown;
}

interface LegacyRecipeRecord {
  id?: number;
  name?: string;
  itemId?: string;
  machineTypeId?: string;
  mName?: string;
  noExtra?: boolean | null;
  n?: number;
  t?: number;
  s: LegacyRecipeComponent[];
  q: LegacyRecipeComponent[];
  m: LegacyMachineOption[];
  [key: string]: unknown;
}

interface LegacyCalculationRuntimeWindow extends Window {
  data?: LegacyRecipeRecord[];
  energyData?: Record<string, number>;
  spaceData?: Record<string, number>;
  recipeIndexByProduct?: Record<string, number[]>;
  icons?: Record<string, string>;
  resolveBlueprintIconsByNames?: (names: string[]) => string[];
}

interface CalculationInfo {
  name: string;
  machineName: string;
  machineId: string;
  t: number;
  speed: number;
  time: number;
  isChange: boolean;
  accType: string | null;
  accValue: string | null;
}

interface WorkingRequirement {
  name: string;
  value: number;
  accTotal?: number;
  value2?: number;
}

interface WorkingOutput {
  name: string;
  value: number;
  value2?: number;
}

interface WorkingSingleLine {
  id: number | string;
  number: number;
  name: string;
  itemId: string;
  mId: string;
  mName: string;
  value: number;
}

interface BlueprintLine {
  blueprint: Record<string, unknown>;
}

const GLOBAL_SETTINGS_BY_RECIPE_TYPE: Partial<Record<string, keyof GlobalSettings>> = Object.freeze({
  assembler: "selmodein",
  smelter: "furnace",
  chemical: "chemical",
  research: "research",
});

const ACC_TYPE_METRICS: Record<string, { extraRate: number; sprayCount: number; energyFactor: number }> = Object.freeze(
  {
    proliferatorMk1: { extraRate: 1.125, sprayCount: 12, energyFactor: 1.3 },
    proliferatorMk2: { extraRate: 1.2, sprayCount: 24, energyFactor: 1.7 },
    proliferatorMk3: { extraRate: 1.25, sprayCount: 60, energyFactor: 2.5 },
  }
);

function getRuntimeWindow(): LegacyCalculationRuntimeWindow | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window as LegacyCalculationRuntimeWindow;
}

function i18nText(root: LegacyCalculationRuntimeWindow | null, key: string, fallback: string, params?: Record<string, unknown>) {
  const translator = root?.DSQI18n?.t;
  if (typeof translator === "function") {
    return translator(key, params ?? null, fallback);
  }
  return fallback;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function toPositiveNumber(value: unknown, fallback: number): number {
  const numericValue = toFiniteNumber(value, fallback);
  return numericValue > 0 ? numericValue : fallback;
}

function cloneRecipe<T>(value: T): T {
  return cloneJsonValue(value, value);
}

function normalizeRequirementItem(item: RequirementItemRef | undefined): RequirementItemRef {
  const displayName = domainDictionary.getDisplayName(item?.name ?? item?.itemId ?? "");
  const itemId = domainDictionary.getItemId(item?.itemId ?? item?.name ?? "") ?? "";
  return {
    ...(item ? cloneJsonValue(item, {}) : {}),
    name: displayName,
    itemId,
  };
}

function normalizeRequirements(snapshot: CalculationSnapshot): RequirementEntry[] {
  return normalizeRequirementEntries(snapshot.requirements).map(entry => ({
    ...entry,
    item: normalizeRequirementItem(entry.item),
  }));
}

function normalizeSingleMake(snapshot: CalculationSnapshot): SingleMakeEntry[] {
  return normalizeSingleMakeEntries(snapshot.singleMake);
}

function normalizeExcludedNames(snapshot: CalculationSnapshot): string[] {
  return normalizeStringList(snapshot.excludedNames).map(entry => domainDictionary.getDisplayName(entry));
}

function normalizeMachineId(value: unknown): string | null {
  return domainDictionary.getMachineId(value) ?? (typeof value === "string" && value ? value : null);
}

function normalizeItemId(value: unknown): string | null {
  return domainDictionary.getItemId(value) ?? (typeof value === "string" && value ? value : null);
}

function normalizeAccValueId(value: unknown): string | null {
  return domainDictionary.getAccValueId(value) ?? (typeof value === "string" && value ? value : null);
}

function getDisplayName(value: unknown): string {
  return domainDictionary.getDisplayName(value);
}

function getIconName(value: unknown): string {
  return domainDictionary.getIconName(value);
}

function isProliferatorItemId(value: string | null): boolean {
  return value === "proliferatorMk1" || value === "proliferatorMk2" || value === "proliferatorMk3";
}

function getAccTypeMetrics(accTypeId: string | null): { extraRate: number; sprayCount: number; energyFactor: number } {
  return (accTypeId && ACC_TYPE_METRICS[accTypeId]) || { extraRate: 1, sprayCount: 0, energyFactor: 1 };
}

function buildRecipeIndexByProduct(data: LegacyRecipeRecord[]): Record<string, number[]> {
  const index: Record<string, number[]> = {};
  data.forEach((recipe, recipeIndex) => {
    recipe.s.forEach(product => {
      const productName = getDisplayName(product.name);
      if (!index[productName]) {
        index[productName] = [];
      }
      index[productName].push(recipeIndex);
    });
  });
  return index;
}

function getRuntime(root: LegacyCalculationRuntimeWindow | null): {
  data: LegacyRecipeRecord[];
  energyData: Record<string, number>;
  spaceData: Record<string, number>;
  recipeIndexByProduct: Record<string, number[]>;
} | null {
  if (!root?.data || !Array.isArray(root.data) || root.data.length === 0) {
    return null;
  }
  return {
    data: root.data,
    energyData: root.energyData || {},
    spaceData: root.spaceData || {},
    recipeIndexByProduct:
      root.recipeIndexByProduct && Object.keys(root.recipeIndexByProduct).length > 0
        ? root.recipeIndexByProduct
        : buildRecipeIndexByProduct(root.data),
  };
}

function findMachineOptionById(item: LegacyRecipeRecord, machineId: string): LegacyMachineOption | null {
  for (const option of item.m || []) {
    const optionId = normalizeMachineId(option.id ?? option.name);
    if (optionId === machineId) {
      return option;
    }
  }
  return null;
}

function normalizeRecipe(recipe: LegacyRecipeRecord, targetName: string): LegacyRecipeRecord {
  const output = cloneRecipe(recipe);
  output.s = Array.isArray(output.s) ? output.s.map(entry => ({ ...entry, n: toFiniteNumber(entry.n, 1) || 1 })) : [];
  output.q = Array.isArray(output.q) ? output.q.map(entry => ({ ...entry, n: toFiniteNumber(entry.n, 1) || 1 })) : [];
  for (const source of output.s) {
    for (const material of output.q) {
      if (source.name !== material.name) {
        continue;
      }
      const cancelCount = Math.min(toFiniteNumber(source.n, 0), toFiniteNumber(material.n, 0));
      source.n = toFiniteNumber(source.n, 0) - cancelCount;
      material.n = toFiniteNumber(material.n, 0) - cancelCount;
    }
  }
  output.s = output.s.filter(entry => toFiniteNumber(entry.n, 0) !== 0);
  output.q = output.q.filter(entry => toFiniteNumber(entry.n, 0) !== 0);
  const selectedOutput = output.s.find(entry => getDisplayName(entry.name) === targetName);
  if (selectedOutput) {
    Object.assign(output, selectedOutput);
  }
  output.itemId = normalizeItemId(output.itemId ?? output.name) ?? "";
  output.name = getDisplayName(output.name ?? targetName);
  return output;
}

function getRecipeSelectionId(recipeSettings: Record<string, unknown>, itemName: string, itemId: string | null): number | null {
  const selected = recipeSettings[itemName] ?? (itemId ? recipeSettings[itemId] : undefined);
  const numericId = Number(selected);
  return Number.isInteger(numericId) && numericId >= 0 ? numericId : null;
}

function computeOrbitalCollectorPerMinute(
  primaryValue: number,
  secondaryValue: number,
  primaryPower: number,
  secondaryPower: number,
  oreMultiplier: number
): number {
  const grossPerMinute = 60 * primaryValue * 0.01 * oreMultiplier * 8;
  const powerShare = (primaryValue * primaryPower) / (primaryValue * primaryPower + secondaryValue * secondaryPower);
  return grossPerMinute - (60 * 30 * powerShare) / primaryPower;
}

function getCriticalPhotonSpeed(snapshot: CalculationSnapshot, accType: string | null, accValue: string | null): number {
  const runtimeOptions = normalizeCalculationRuntimeOptions(snapshot.runtimeOptions);
  if (runtimeOptions.manualGzSpeed) {
    return toPositiveNumber(runtimeOptions.gzSpeed, 12);
  }
  if (normalizeAccValueId(accValue) === "speedup") {
    switch (normalizeItemId(accType)) {
      case "proliferatorMk1":
        return 15;
      case "proliferatorMk2":
        return 18;
      case "proliferatorMk3":
        return 24;
      default:
        return 12;
    }
  }
  return 12;
}

function applyRuntimeRecipeAdjustments(
  recipe: LegacyRecipeRecord,
  snapshot: CalculationSnapshot,
  accType: string | null,
  accValue: string | null
): LegacyRecipeRecord {
  const adjusted = cloneRecipe(recipe);
  const runtimeOptions = normalizeCalculationRuntimeOptions(snapshot.runtimeOptions);
  const primaryOutputId = normalizeItemId(adjusted.s[0]?.itemId ?? adjusted.s[0]?.name);

  if (primaryOutputId === "criticalPhoton" && adjusted.machineTypeId === "rayReceiver") {
    const fixedGzSpeed = getCriticalPhotonSpeed(snapshot, accType, accValue);
    adjusted.q = adjusted.q.map(entry =>
      normalizeItemId(entry.itemId ?? entry.name) === "gravitonLens"
        ? { ...entry, n: Number((0.1 / fixedGzSpeed).toFixed(6)) }
        : entry
    );
    adjusted.t = adjusted.q.length > 0 ? 60 / fixedGzSpeed : 10;
    return adjusted;
  }

  const hasGasCollector = adjusted.m.some(option => normalizeMachineId(option.id ?? option.name) === "orbitalCollectorGas");
  if (hasGasCollector && (primaryOutputId === "hydrogen" || primaryOutputId === "deuterium")) {
    const perMinute =
      primaryOutputId === "hydrogen"
        ? computeOrbitalCollectorPerMinute(
            runtimeOptions.orbitalCollectorGasHydrogen,
            runtimeOptions.orbitalCollectorDeuterium,
            8,
            8,
            runtimeOptions.oreMultiplier
          )
        : computeOrbitalCollectorPerMinute(
            runtimeOptions.orbitalCollectorDeuterium,
            runtimeOptions.orbitalCollectorGasHydrogen,
            8,
            8,
            runtimeOptions.oreMultiplier
          );
    adjusted.t = perMinute > 0 ? 1 / (perMinute / 60) : adjusted.t;
    return adjusted;
  }

  const hasIceCollector = adjusted.m.some(option => normalizeMachineId(option.id ?? option.name) === "orbitalCollectorIce");
  if (hasIceCollector && (primaryOutputId === "hydrogen" || primaryOutputId === "fireIce")) {
    const perMinute =
      primaryOutputId === "hydrogen"
        ? computeOrbitalCollectorPerMinute(
            runtimeOptions.orbitalCollectorIceHydrogen,
            runtimeOptions.orbitalCollectorFireIce,
            8,
            4.8,
            runtimeOptions.oreMultiplier
          )
        : computeOrbitalCollectorPerMinute(
            runtimeOptions.orbitalCollectorFireIce,
            runtimeOptions.orbitalCollectorIceHydrogen,
            4.8,
            8,
            runtimeOptions.oreMultiplier
          );
    adjusted.t = perMinute > 0 ? 1 / (perMinute / 60) : adjusted.t;
  }

  return adjusted;
}

function getGlobalMachineDefault(recipe: LegacyRecipeRecord, globalSettings: GlobalSettings): string | null {
  const settingKey = GLOBAL_SETTINGS_BY_RECIPE_TYPE[recipe.machineTypeId || ""];
  if (!settingKey) {
    return null;
  }
  return normalizeMachineId(globalSettings[settingKey]);
}

function getMachineSettingsForRecipe(settings: MachineSettingsSnapshot, recipeId: number | string | undefined): MachineSettingRecord {
  if (recipeId == null) {
    return {};
  }
  return settings[String(recipeId)] || {};
}

function getAccTypeForRecipe(recipe: LegacyRecipeRecord, snapshot: CalculationSnapshot): string | null {
  const machineSettings = getMachineSettingsForRecipe(snapshot.machineSettings, recipe.id);
  return normalizeItemId(machineSettings.accType ?? snapshot.globalSettings.accType);
}

function getAccValueForRecipe(recipe: LegacyRecipeRecord, snapshot: CalculationSnapshot): string | null {
  const machineSettings = getMachineSettingsForRecipe(snapshot.machineSettings, recipe.id);
  return normalizeAccValueId(machineSettings.accValue ?? snapshot.globalSettings.accValue);
}

function resolveMachineIdForRecipe(recipe: LegacyRecipeRecord, snapshot: CalculationSnapshot): string | null {
  const machineSettings = getMachineSettingsForRecipe(snapshot.machineSettings, recipe.id);
  const explicitMachineId = normalizeMachineId(machineSettings.m);
  if (explicitMachineId) {
    return explicitMachineId;
  }
  const globalMachineId = getGlobalMachineDefault(recipe, snapshot.globalSettings);
  if (globalMachineId) {
    return globalMachineId;
  }
  return normalizeMachineId(recipe.m[0]?.id ?? recipe.m[0]?.name);
}

function getMachineBaseSpeed(machineId: string, runtimeOptions: CalculationRuntimeOptions): number {
  switch (machineId) {
    case "vein":
      return Math.min(0.5 * 1 * 0.01 * runtimeOptions.oreMultiplier, 30);
    case "miningMachine":
      return Math.min(0.5 * 6 * 0.01 * runtimeOptions.oreMultiplier, 30);
    case "advancedMiningMachine":
      return 1 * 20 * 0.01 * runtimeOptions.oreMultiplier * 0.01 * runtimeOptions.advancedMinerMultiplier;
    case "waterPump":
      return Math.min((50 * 0.01 * runtimeOptions.oreMultiplier) / 60, 30);
    case "fractionator":
      return runtimeOptions.fractionatorSpeed / (0.01 * 60);
    case "oilExtractor":
      return runtimeOptions.oilSpeed;
    default:
      return Number.NaN;
  }
}

function createInfoForRecipe(recipe: LegacyRecipeRecord, snapshot: CalculationSnapshot): CalculationInfo | null {
  const runtimeOptions = normalizeCalculationRuntimeOptions(snapshot.runtimeOptions);
  const machineId = resolveMachineIdForRecipe(recipe, snapshot);
  if (!machineId) {
    return null;
  }
  const accType = getAccTypeForRecipe(recipe, snapshot);
  const accValue = getAccValueForRecipe(recipe, snapshot);
  const adjustedRecipe = applyRuntimeRecipeAdjustments(recipe, snapshot, accType, accValue);
  const machineOption = findMachineOptionById(adjustedRecipe, machineId) ?? adjustedRecipe.m[0] ?? null;
  if (!machineOption) {
    return null;
  }
  const speedOverride = snapshot.speedSettings[machineId];
  const baseSpeed = getMachineBaseSpeed(machineId, runtimeOptions);
  const speed = toPositiveNumber(
    speedOverride ?? (Number.isFinite(baseSpeed) ? baseSpeed : machineOption.speed),
    toPositiveNumber(machineOption.speed, 1)
  );
  return {
    name: getDisplayName(machineOption.name ?? machineId),
    machineName: getDisplayName(machineOption.name ?? machineId),
    machineId,
    t: toPositiveNumber(adjustedRecipe.t, 1),
    speed,
    time: toPositiveNumber(adjustedRecipe.t, 1) / speed,
    isChange: Number.isFinite(Number(speedOverride)),
    accType,
    accValue,
  };
}

function findRecipe(
  itemName: string,
  snapshot: CalculationSnapshot,
  runtime: { data: LegacyRecipeRecord[]; recipeIndexByProduct: Record<string, number[]> },
  normalize = false
): LegacyRecipeRecord {
  const lookupName = getDisplayName(itemName);
  const lookupId = normalizeItemId(itemName);
  const selectedRecipeId = getRecipeSelectionId(snapshot.recipeSettings, lookupName, lookupId);
  const recipeIndex = selectedRecipeId ?? runtime.recipeIndexByProduct[lookupName]?.[0];
  if (!Number.isInteger(recipeIndex) || recipeIndex < 0 || recipeIndex >= runtime.data.length) {
    throw new Error(`recipe_not_found:${lookupName}`);
  }
  const recipe = runtime.data[recipeIndex];
  return normalize ? normalizeRecipe(recipe, lookupName) : cloneRecipe(recipe);
}

function getRecipesByProduct(
  itemName: string,
  runtime: { data: LegacyRecipeRecord[]; recipeIndexByProduct: Record<string, number[]> }
): LegacyRecipeRecord[] {
  const lookupName = getDisplayName(itemName);
  const indices = runtime.recipeIndexByProduct[lookupName] || [];
  return indices.map(index => cloneRecipe(runtime.data[index]));
}

function getIconImg(root: LegacyCalculationRuntimeWindow | null, name: string): string {
  const iconName = getIconName(name);
  const displayName = getDisplayName(name);
  if (root?.icons?.[iconName]) {
    return `<img class='sicon' src='data:image/png;base64,${root.icons[iconName]}' title='${displayName}' alt='${displayName}' loading='lazy' />`;
  }
  return displayName;
}

function getIconShow(root: LegacyCalculationRuntimeWindow | null, name: string, number: number): string {
  return `${getIconImg(root, name)}<sub>${number}</sub>`;
}

function translateMachineDisplayName(root: LegacyCalculationRuntimeWindow | null, machineId: string): string {
  const fallback = getDisplayName(machineId);
  const i18nKey = domainDictionary.getMachineI18nKey(machineId);
  return i18nKey ? i18nText(root, i18nKey, fallback) : fallback;
}

function translateAccTypeLabel(root: LegacyCalculationRuntimeWindow | null, itemId: string): string {
  return i18nText(root, `item.${itemId}`, getDisplayName(itemId));
}

function translateAccValueDisplayName(root: LegacyCalculationRuntimeWindow | null, value: string): string {
  return i18nText(root, `accValue.${value}`, getDisplayName(value));
}

function formatBlueprintRate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(6).replace(/\.?0+$/, "") : "0";
}

function cloneBlueprintRateList(list: LegacyRecipeComponent[], divisor: number): Array<{ name: string; itemId: string | null; rate: number }> {
  return list.map(item => ({
    name: getDisplayName(item.name),
    itemId: normalizeItemId(item.itemId ?? item.name),
    rate: Number((toFiniteNumber(item.n, 1) / divisor).toFixed(8)),
  }));
}

function buildBlueprintSnapshot(
  root: LegacyCalculationRuntimeWindow | null,
  requirements: RequirementEntry[],
  productionLines: BlueprintLine[]
): BlueprintSnapshot {
  const outputNames: string[] = [];
  const outputIds: string[] = [];
  const descriptionLines: string[] = [];
  let title = "";
  for (const requirement of requirements) {
    const itemName = requirement.item?.name ? getDisplayName(requirement.item.name) : "";
    if (!itemName) {
      continue;
    }
    const itemId = normalizeItemId(requirement.item?.itemId ?? itemName);
    const rateText = formatBlueprintRate(toFiniteNumber(requirement.number, 0));
    if (!title) {
      title = `${itemName}-${rateText}min`;
    }
    outputNames.push(itemName);
    if (itemId) {
      outputIds.push(itemId);
    }
    descriptionLines.push(`${itemName}-${rateText}min`);
  }
  return {
    title,
    description: descriptionLines.length > 0 ? `${descriptionLines.join("\n")}\n` : "",
    outputNames,
    outputIds,
    iconIds:
      typeof root?.resolveBlueprintIconsByNames === "function"
        ? root.resolveBlueprintIconsByNames(outputIds.length > 0 ? outputIds : outputNames)
        : [],
    subRecipes: productionLines.map(line => line.blueprint),
  };
}

function buildPfTitle(
  root: LegacyCalculationRuntimeWindow | null,
  recipe: LegacyRecipeRecord,
  snapshot: CalculationSnapshot,
  info: CalculationInfo | null
): string {
  const title: string[] = [];
  const adjustedRecipe = applyRuntimeRecipeAdjustments(recipe, snapshot, getAccTypeForRecipe(recipe, snapshot), getAccValueForRecipe(recipe, snapshot));
  const runtimeOptions = normalizeCalculationRuntimeOptions(snapshot.runtimeOptions);
  adjustedRecipe.q.forEach(component => {
    title.push(getIconShow(root, component.name, toFiniteNumber(component.n, 1)));
    if (info && runtimeOptions.showMaxOneBelt) {
      const machineCount = calculateMaxMachinesPerBelt({
        recipeTime: toPositiveNumber(adjustedRecipe.t, 1),
        machineSpeed: info.speed,
        itemCount: toFiniteNumber(component.n, 1),
        beltSpeed: getBeltSpeed(runtimeOptions.conveyorBeltType),
        stackLayer: runtimeOptions.stationStackLayer,
        accType: info.accType,
        accValue: info.accValue,
        direction: "input",
      });
      title.push(`<sub class='maxOneBeltIn'>${machineCount.toFixed(1)}</sub>`);
    }
  });
  if (adjustedRecipe.q.length > 0) {
    title.push('<img class="to" src="./img/to.png" alt="to" loading="lazy" />');
  }
  adjustedRecipe.s.forEach(component => {
    title.push(getIconShow(root, component.name, toFiniteNumber(component.n, 1)));
    if (info && runtimeOptions.showMaxOneBelt) {
      const machineCount = calculateMaxMachinesPerBelt({
        recipeTime: toPositiveNumber(adjustedRecipe.t, 1),
        machineSpeed: info.speed,
        itemCount: toFiniteNumber(component.n, 1),
        beltSpeed: getBeltSpeed(runtimeOptions.conveyorBeltType),
        stackLayer: runtimeOptions.stationStackLayer,
        accType: info.accType,
        accValue: info.accValue,
        direction: "output",
      });
      title.push(`<sub class='maxOneBeltOut'>${machineCount.toFixed(1)}</sub>`);
    }
  });
  title.push(`(${toPositiveNumber(adjustedRecipe.t, 1).toFixed(1)}s)`);
  return title.join(" ");
}

function createNumberOther(root: LegacyCalculationRuntimeWindow | null, itemId: string, outputPerMinute: number): string | undefined {
  if (itemId === "solarSail") {
    return (
      i18nText(root, "table.number_other.ejector_prefix", "(可供") +
      getIconShow(root, "electromagneticRailEjector", outputPerMinute / 20) +
      i18nText(root, "table.number_other.suffix", ")")
    );
  }
  if (itemId === "smallCarrierRocket") {
    return (
      i18nText(root, "table.number_other.ejector_prefix", "(可供") +
      getIconShow(root, "verticalLaunchingSilo", outputPerMinute / 5) +
      i18nText(root, "table.number_other.suffix", ")")
    );
  }
  return undefined;
}

export function calculateProductionPlanFromLegacyRuntime(snapshot: CalculationSnapshot): CalculationOutput | null {
  const root = getRuntimeWindow();
  const runtime = getRuntime(root);
  if (!runtime) {
    return null;
  }

  const normalizedSnapshot: CalculationSnapshot = {
    requirements: normalizeRequirements(snapshot),
    singleMake: normalizeSingleMake(snapshot),
    excludedNames: normalizeExcludedNames(snapshot),
    globalSettings: cloneJsonValue(snapshot.globalSettings, snapshot.globalSettings),
    machineSettings: cloneJsonValue(snapshot.machineSettings, {}),
    speedSettings: cloneJsonValue(snapshot.speedSettings, {}),
    recipeSettings: cloneJsonValue(snapshot.recipeSettings, {}),
    runtimeOptions: normalizeCalculationRuntimeOptions(snapshot.runtimeOptions),
    currentResult: null,
  };

  const xhList: WorkingRequirement[] = [];
  const outList: WorkingOutput[] = [];
  const singleList: WorkingSingleLine[] = [];
  const requirementsByName = new Set(
    normalizedSnapshot.requirements.map(entry => getDisplayName(entry.item?.name ?? entry.item?.itemId ?? ""))
  );
  const excludedNames = new Set(normalizedSnapshot.excludedNames);
  const pointLength = normalizedSnapshot.runtimeOptions.pointLength;

  const addRequirementDemand = (name: string, value: number) => {
    const existing = xhList.find(entry => entry.name === name);
    if (existing) {
      existing.value += value;
      return;
    }
    xhList.push({ name, value });
  };

  const addAccTotal = (name: string, value: number) => {
    const existing = xhList.find(entry => entry.name === name);
    if (existing) {
      existing.accTotal = (existing.accTotal || 0) + value;
    }
  };

  const addOutput = (name: string, value: number) => {
    const existing = outList.find(entry => entry.name === name);
    if (existing) {
      existing.value += value;
      return;
    }
    outList.push({ name, value });
  };

  const findOutput = (name: string): number | null => outList.find(entry => entry.name === name)?.value ?? null;

  const loadNumber = (itemName: string, quantity: number): void => {
    const normalizedName = getDisplayName(itemName);
    const normalizedItemId = normalizeItemId(itemName);
    if (excludedNames.has(normalizedName)) {
      return;
    }
    if (isProliferatorItemId(normalizedItemId) && quantity < 0.1) {
      return;
    }

    const recipe = findRecipe(normalizedName, normalizedSnapshot, runtime, true);
    const info = createInfoForRecipe(recipe, normalizedSnapshot);
    if (!info) {
      return;
    }

    addRequirementDemand(normalizedName, quantity);
    recipe.s.forEach(output => {
      if (normalizeItemId(output.itemId ?? output.name) === normalizedItemId || toFiniteNumber(output.n, 0) === 0) {
        return;
      }
      addOutput(getDisplayName(output.name), (-1 * quantity * toFiniteNumber(output.n, 1)) / toFiniteNumber(recipe.n, 1));
    });

    let accValue = info.accValue;
    if (accValue === "extra" && recipe.noExtra) {
      accValue = "none";
    }
    if (recipe.q.length === 0 || recipe.noExtra === null) {
      accValue = "none";
    }

    const metrics = getAccTypeMetrics(info.accType);
    let accTotal = 0;

    recipe.q.forEach(input => {
      const inputName = getDisplayName(input.name);
      if (excludedNames.has(inputName) || toFiniteNumber(input.n, 0) === 0) {
        return;
      }
      if (normalizeItemId(input.itemId ?? input.name) === normalizedItemId) {
        return;
      }

      let nextQuantity = (quantity * toFiniteNumber(input.n, 1)) / toFiniteNumber(recipe.n, 1);
      let sprayCount = metrics.sprayCount;
      if (normalizedSnapshot.runtimeOptions.selfAcc && sprayCount > 0) {
        sprayCount = sprayCount * metrics.extraRate - 1;
      }

      if (accValue === "speedup" && sprayCount > 0) {
        accTotal += nextQuantity / sprayCount;
        if (!normalizedSnapshot.runtimeOptions.isAddSelfAccP) {
          loadNumber(info.accType || "", nextQuantity / sprayCount);
        }
      } else if (accValue === "extra" && sprayCount > 0) {
        nextQuantity /= metrics.extraRate;
        accTotal += nextQuantity / sprayCount;
        if (!normalizedSnapshot.runtimeOptions.isAddSelfAccP) {
          loadNumber(info.accType || "", nextQuantity / sprayCount);
        }
      }

      loadNumber(inputName, nextQuantity);
    });

    addAccTotal(normalizedName, accTotal);
  };

  normalizedSnapshot.singleMake.forEach(entry => {
    const recipe = runtime.data[Number(entry.id)];
    if (!recipe) {
      return;
    }
    const recipeClone = cloneRecipe(recipe);
    const info = createInfoForRecipe(recipeClone, normalizedSnapshot);
    if (!info) {
      return;
    }
    const machineCount = toPositiveNumber(entry.number, 1);
    const times = Number(((60 * machineCount * info.speed) / toPositiveNumber(recipeClone.t, 1)).toFixed(6));
    recipeClone.s.forEach(output => {
      singleList.push({
        id: entry.id,
        number: machineCount,
        name: getDisplayName(output.name),
        itemId: normalizeItemId(output.itemId ?? output.name) ?? "",
        mId: info.machineId,
        mName: info.name,
        value: times * toFiniteNumber(output.n, 1),
      });
      loadNumber(output.name, -1 * times * toFiniteNumber(output.n, 1));
    });
    recipeClone.q.forEach(input => {
      loadNumber(input.name, times * toFiniteNumber(input.n, 1));
    });
  });

  normalizedSnapshot.requirements.forEach(entry => {
    const itemName = entry.item?.name;
    if (itemName) {
      loadNumber(itemName, toFiniteNumber(entry.number, 0));
    }
  });

  xhList.forEach(entry => {
    if (!entry.value) {
      return;
    }
    const recipe = findRecipe(entry.name, normalizedSnapshot, runtime, true);
    const info = createInfoForRecipe(recipe, normalizedSnapshot);
    if (!info || entry.value <= 0) {
      return;
    }
    entry.value2 = entry.value / (1 / info.time) / 60 / toFiniteNumber(recipe.n, 1);
    let accType = getAccTypeForRecipe(recipe, normalizedSnapshot);
    let accValue = getAccValueForRecipe(recipe, normalizedSnapshot);
    if (accValue === "extra" && recipe.noExtra) {
      accValue = "none";
    }
    if (recipe.q.length === 0) {
      accValue = "none";
    }
    if (recipe.itemId !== "criticalPhoton" || recipe.machineTypeId !== "rayReceiver") {
      let fixValue2Times = 1;
      recipe.q.forEach(input => {
        if (normalizeItemId(input.itemId ?? input.name) === recipe.itemId) {
          fixValue2Times = toFiniteNumber(recipe.n, 1) / (toFiniteNumber(recipe.n, 1) - toFiniteNumber(input.n, 0));
        }
      });
      entry.value2 = (entry.value2 / getAccSpeedFromCore(accType, accValue)) * fixValue2Times;
    }
  });

  xhList.forEach(entry => {
    if (!entry.value) {
      return;
    }
    const recipe = findRecipe(entry.name, normalizedSnapshot, runtime, true);
    const info = createInfoForRecipe(recipe, normalizedSnapshot);
    if (!info) {
      return;
    }
    if (entry.value < 0) {
      entry.value2 = 0;
    }
    const isOverflow = (machineCount: number) => {
      for (const output of recipe.s) {
        const outputValue = findOutput(getDisplayName(output.name));
        if (outputValue == null) {
          return false;
        }
        const perMinute = ((machineCount * 60) / toPositiveNumber(recipe.t, 1)) * info.speed * toFiniteNumber(output.n, 1);
        if (outputValue > -1 * perMinute) {
          return false;
        }
      }
      return true;
    };
    let step = (entry.value2 || 0) < 1 ? entry.value2 || 0 : 1;
    while (isOverflow(step) && (entry.value2 || 0) > 0) {
      if ((entry.value2 || 0) < 1) {
        step = entry.value2 || 0;
      }
      entry.value2 = (entry.value2 || 0) - step;
      recipe.s.forEach(output => {
        const perMinute = ((step * 60) / toPositiveNumber(recipe.t, 1)) * info.speed * toFiniteNumber(output.n, 1);
        addOutput(getDisplayName(output.name), perMinute);
      });
      if ((entry.value2 || 0) < 1) {
        step = entry.value2 || 0;
      }
    }
  });

  const independentLines: Array<Record<string, unknown>> = [];
  const productionLines: Array<Record<string, unknown>> = [];
  const excessOutputs: Array<Record<string, unknown>> = [];
  const blueprintLines: BlueprintLine[] = [];
  const totalMachines: Array<{ name: string; value: number; energy: number; space: number }> = [];
  let totalAcc = 0;

  const addTotal = (machineId: string, value: number, accType: string | null, accValue: string | null) => {
    let energy = runtime.energyData[machineId] || 0;
    let space = runtime.spaceData[machineId] || 0;
    if (accValue !== "none") {
      energy *= getAccTypeMetrics(accType).energyFactor;
    }
    const existing = totalMachines.find(entry => entry.name === machineId);
    if (existing) {
      existing.value += value;
      existing.energy += energy * value;
      existing.space += space * value;
      return;
    }
    totalMachines.push({ name: machineId, value, energy: energy * value, space: space * value });
  };

  singleList.forEach(line => {
    const recipe = runtime.data[Number(line.id)];
    if (!recipe) {
      return;
    }
    const info = createInfoForRecipe(recipe, normalizedSnapshot);
    if (!info) {
      return;
    }
    independentLines.push({
      name: line.name,
      number1: line.value,
      number2: line.number,
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      pfTitle: buildPfTitle(root, recipe, normalizedSnapshot, info),
      mName: translateMachineDisplayName(root, line.mId),
    });
  });

  xhList.forEach(entry => {
    if (!entry.value) {
      return;
    }
    const recipe = findRecipe(entry.name, normalizedSnapshot, runtime, true);
    const info = createInfoForRecipe(recipe, normalizedSnapshot);
    if (!info) {
      return;
    }

    let accType = getAccTypeForRecipe(recipe, normalizedSnapshot);
    let accValue = getAccValueForRecipe(recipe, normalizedSnapshot);
    if (accValue === "extra" && recipe.noExtra) {
      accValue = "none";
    }
    if (recipe.q.length === 0 || recipe.noExtra === null) {
      accValue = "none";
    }

    const machineCount = Number(entry.value2) || 0;
    const acceleratorMode = accValue === "speedup" ? 1 : accValue === "extra" ? 0 : -1;
    const isSourceRecipe = recipe.q.length === 0;
    blueprintLines.push({
      blueprint: {
        itemName: entry.name,
        itemId: recipe.itemId || normalizeItemId(entry.name),
        recipeId: recipe.id,
        buildingId: isSourceRecipe ? null : info.machineId,
        buildingName: isSourceRecipe ? null : info.name,
        buildingCount: isSourceRecipe ? 0 : machineCount,
        input: isSourceRecipe ? null : cloneBlueprintRateList(recipe.q, toPositiveNumber(recipe.t, 1)),
        output: isSourceRecipe
          ? [
              {
                name: entry.name,
                itemId: recipe.itemId || normalizeItemId(entry.name),
                rate: Number((entry.value / 60).toFixed(8)),
              },
            ]
          : cloneBlueprintRateList(recipe.s, toPositiveNumber(recipe.t, 1)),
        accType: acceleratorMode === -1 ? null : accType,
        accValue,
        acceleratorMode,
      },
    });

    if (normalizedSnapshot.runtimeOptions.hideSource && isSourceRecipe) {
      return;
    }

    const iconImg = getIconImg(root, info.machineId);
    const iconValue = iconImg.includes("<img") ? iconImg : `X${iconImg}`;
    const currentItemId = recipe.itemId || normalizeItemId(entry.name) || "";
    const isFlexibleByproduct = ["refinedOil", "hydrogen", "graphene", "deuterium"].includes(currentItemId);
    const number2 = machineCount > 0 ? machineCount.toFixed(pointLength) : isFlexibleByproduct ? (0).toFixed(pointLength) : "";
    const outItem: Record<string, unknown> = {
      id: recipe.id,
      name: entry.name,
      itemId: currentItemId,
      number1: entry.value.toFixed(pointLength),
      number2,
      number2full: number2 ? `${iconValue}${number2}` : "",
      number2img: iconValue,
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      speedClass: info.isChange ? "time time2" : "time",
      rowClass: requirementsByName.has(entry.name) ? "xqsrow" : "",
      machineId: info.machineId,
      machineName: info.name,
      m: [],
      pf: [],
      accType: [],
      accValue: [],
      accTotal: entry.accTotal || 0,
      accTotalLabel: i18nText(root, "table.acc_need_prefix", "需求："),
      blueprint: blueprintLines[blueprintLines.length - 1].blueprint,
    };

    const numberOther = createNumberOther(root, currentItemId, toFiniteNumber(outItem.number1, 0));
    if (numberOther) {
      outItem.numberOther = numberOther;
    }

    addTotal(info.machineId, Math.ceil(machineCount), accType, accValue);
    if (info.accValue !== "none") {
      totalAcc += entry.accTotal || 0;
    }

    getRecipesByProduct(entry.name, runtime).forEach(candidate => {
      const candidateInfo = candidate.id === recipe.id ? info : null;
      (outItem.pf as Array<Record<string, unknown>>).push({
        class: candidate.id === recipe.id ? "pf selected" : "pf",
        recipeId: candidate.id,
        title: buildPfTitle(root, candidate, normalizedSnapshot, candidateInfo),
      });
    });

    recipe.m.forEach(machine => {
      const machineId = normalizeMachineId(machine.id ?? machine.name) || "";
      (outItem.m as Array<Record<string, unknown>>).push({
        class: info.machineId === machineId ? "m selected" : "m",
        itemName: recipe.name,
        id: machineId,
        name: getDisplayName(machineId),
        iconName: machine.iconName || getIconName(machineId),
        title: `${i18nText(root, "tooltip.machine_speed_prefix", "设备速度:")}${toPositiveNumber(machine.speed, 1).toFixed(pointLength)}`,
        showName: translateMachineDisplayName(root, machineId),
      });
    });

    ["proliferatorMk1", "proliferatorMk2", "proliferatorMk3"].forEach(itemId => {
      (outItem.accType as Array<Record<string, unknown>>).push({
        class: itemId === accType ? "m selected" : "m",
        itemName: recipe.name,
        id: itemId,
        name: getDisplayName(itemId),
        iconName: getIconName(itemId),
        title: translateAccTypeLabel(root, itemId),
        showName: translateAccTypeLabel(root, itemId),
      });
    });

    ["none", "speedup", "extra"].forEach(accValueId => {
      if (accValueId !== "none" && (recipe.q.length === 0 || recipe.noExtra === null)) {
        return;
      }
      if (accValueId === "extra" && recipe.noExtra) {
        return;
      }
      (outItem.accValue as Array<Record<string, unknown>>).push({
        class: accValueId === accValue ? "m selected" : "m",
        itemName: recipe.name,
        id: accValueId,
        name: getDisplayName(accValueId),
        title: translateAccValueDisplayName(root, accValueId),
        showName: translateAccValueDisplayName(root, accValueId),
      });
    });

    productionLines.push(outItem);
  });

  outList.forEach(entry => {
    if (!entry.value) {
      return;
    }
    const recipe = findRecipe(entry.name, normalizedSnapshot, runtime, true);
    const info = createInfoForRecipe(recipe, normalizedSnapshot);
    if (!info) {
      return;
    }
    excessOutputs.push({
      name: entry.name,
      number1: entry.value.toFixed(pointLength),
      number2: entry.value2 ? entry.value2.toFixed(pointLength) : "",
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      speedClass: info.isChange ? "time time2" : "time",
      rowClass: "outrow",
      m: [],
      pf: [],
    });
  });

  const totalEnergy = totalMachines.reduce((sum, entry) => sum + (entry.energy || 0), 0);
  const totalSpace = totalMachines.reduce((sum, entry) => sum + (entry.space || 0), 0);
  const primaryRequirement = normalizedSnapshot.requirements[0];
  const primaryItemName = primaryRequirement?.item?.name || "";
  const primaryRatePerMinute = primaryRequirement ? toFiniteNumber(primaryRequirement.number, Number.NaN) : Number.NaN;

  return {
    requirements: normalizedSnapshot.requirements,
    independentLines,
    productionLines,
    excessOutputs,
    totals: {
      machines: totalMachines,
      totalAcc,
      totalEnergy,
      totalSpace,
    },
    seoSnapshot: {
      requirementCount: normalizedSnapshot.requirements.length,
      primaryItemName,
      primaryRatePerMinute: Number.isFinite(primaryRatePerMinute) ? primaryRatePerMinute : null,
      totalLineCount: productionLines.length,
      totalEnergy,
      totalSpace,
    },
    blueprintSnapshot: buildBlueprintSnapshot(root, normalizedSnapshot.requirements, blueprintLines),
  };
}

export function buildFallbackCalculationOutput(snapshot: CalculationSnapshot): CalculationOutput {
  const output = createEmptyCalculationOutput();
  output.requirements = cloneJsonValue(normalizeRequirementEntries(snapshot.requirements), []);
  output.seoSnapshot.requirementCount = output.requirements.length;
  output.seoSnapshot.primaryItemName = output.requirements[0]?.item?.name || "";
  output.seoSnapshot.primaryRatePerMinute =
    typeof output.requirements[0]?.number === "number" ? output.requirements[0].number : null;
  output.blueprintSnapshot = {
    title: output.seoSnapshot.primaryItemName
      ? `${output.seoSnapshot.primaryItemName}-${output.seoSnapshot.primaryRatePerMinute ?? ""}min`
      : "",
    description: "",
    outputNames: output.requirements
      .map(entry => entry.item?.name)
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0),
    outputIds: output.requirements
      .map(entry => entry.item?.itemId)
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0),
    iconIds: [],
    subRecipes: [],
  };
  return output;
}
