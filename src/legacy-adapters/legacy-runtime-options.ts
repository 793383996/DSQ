import {
  createDefaultCalculationRuntimeOptions,
  normalizeCalculationRuntimeOptions,
  type CalculationRuntimeOptions,
} from "../types/dsq";

interface LegacyRuntimeDocumentLike {
  getElementById(id: string): Element | null;
}

interface LegacyRuntimeRootLike {
  document?: LegacyRuntimeDocumentLike;
  pointLength?: number;
}

function resolveRoot(root?: LegacyRuntimeRootLike): LegacyRuntimeRootLike | undefined {
  if (root) {
    return root;
  }
  if (typeof window === "undefined") {
    return undefined;
  }
  return window as unknown as LegacyRuntimeRootLike;
}

function readElementValue(root: LegacyRuntimeRootLike | undefined, id: string): string | null {
  const element = root?.document?.getElementById(id);
  if (!element || !("value" in element)) {
    return null;
  }
  const value = (element as HTMLInputElement | HTMLSelectElement).value;
  return typeof value === "string" ? value : null;
}

function readCheckboxValue(root: LegacyRuntimeRootLike | undefined, id: string): boolean | null {
  const element = root?.document?.getElementById(id);
  if (!element || !("checked" in element)) {
    return null;
  }
  return (element as HTMLInputElement).checked === true;
}

function readNumericValue(root: LegacyRuntimeRootLike | undefined, id: string, fallback: number): number {
  const rawValue = readElementValue(root, id);
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function writeElementValue(root: LegacyRuntimeRootLike | undefined, id: string, value: string): void {
  const element = root?.document?.getElementById(id);
  if (!element || !("value" in element)) {
    return;
  }
  (element as HTMLInputElement | HTMLSelectElement).value = value;
}

function writeCheckboxValue(root: LegacyRuntimeRootLike | undefined, id: string, value: boolean): void {
  const element = root?.document?.getElementById(id);
  if (!element || !("checked" in element)) {
    return;
  }
  (element as HTMLInputElement).checked = value;
}

export function readLegacyRuntimeOptions(root?: LegacyRuntimeRootLike): CalculationRuntimeOptions {
  const resolvedRoot = resolveRoot(root);
  const defaults = createDefaultCalculationRuntimeOptions();
  return normalizeCalculationRuntimeOptions({
    pointLength:
      typeof resolvedRoot?.pointLength === "number"
        ? resolvedRoot.pointLength
        : readNumericValue(resolvedRoot, "pointLength", defaults.pointLength),
    hideSource: readCheckboxValue(resolvedRoot, "hideSource") ?? defaults.hideSource,
    showMaxOneBelt: readCheckboxValue(resolvedRoot, "showMaxOneBelt") ?? defaults.showMaxOneBelt,
    isMerge: readCheckboxValue(resolvedRoot, "isMerge") ?? defaults.isMerge,
    isAddSelfAccP: readCheckboxValue(resolvedRoot, "isAddSelfAccP") ?? defaults.isAddSelfAccP,
    selfAcc: readCheckboxValue(resolvedRoot, "selfAcc") ?? defaults.selfAcc,
    conveyorBeltType: readElementValue(resolvedRoot, "csd") ?? defaults.conveyorBeltType,
    stationStackLayer: readNumericValue(resolvedRoot, "speed1_5", defaults.stationStackLayer),
    oreMultiplier: readNumericValue(resolvedRoot, "selore", defaults.oreMultiplier),
    advancedMinerMultiplier: readNumericValue(resolvedRoot, "speed1_6", defaults.advancedMinerMultiplier),
    orbitalCollectorGasHydrogen: readNumericValue(
      resolvedRoot,
      "speed1_1",
      defaults.orbitalCollectorGasHydrogen
    ),
    orbitalCollectorDeuterium: readNumericValue(
      resolvedRoot,
      "speed1_2",
      defaults.orbitalCollectorDeuterium
    ),
    orbitalCollectorFireIce: readNumericValue(resolvedRoot, "speed1_3", defaults.orbitalCollectorFireIce),
    orbitalCollectorIceHydrogen: readNumericValue(
      resolvedRoot,
      "speed1_4",
      defaults.orbitalCollectorIceHydrogen
    ),
    fractionatorSpeed: readNumericValue(resolvedRoot, "fractionatorSpeed", defaults.fractionatorSpeed),
    oilSpeed: readNumericValue(resolvedRoot, "oilSpeed", defaults.oilSpeed),
    gzSpeed: readNumericValue(resolvedRoot, "gzSpeed", defaults.gzSpeed),
    onlyConveyorBeltMk3: readCheckboxValue(resolvedRoot, "onlyConveyorBeltMk3") ?? defaults.onlyConveyorBeltMk3,
    onlySorterMk3: readCheckboxValue(resolvedRoot, "onlySorterMk3") ?? defaults.onlySorterMk3,
    useSorterMk4: readCheckboxValue(resolvedRoot, "useSorterMk4") ?? defaults.useSorterMk4,
    conveyorBeltStackLayer: readNumericValue(
      resolvedRoot,
      "conveyorBeltStackLayer",
      defaults.conveyorBeltStackLayer
    ),
    generateTeslaTower: readCheckboxValue(resolvedRoot, "generateTeslaTower") ?? defaults.generateTeslaTower,
    teslaTowerLineInterval: readNumericValue(
      resolvedRoot,
      "teslaTowerLineInterval",
      defaults.teslaTowerLineInterval
    ),
    maxLabLayers: readNumericValue(resolvedRoot, "maxLabLayers", defaults.maxLabLayers),
    stackLayers: readCheckboxValue(resolvedRoot, "stackLayers") ?? defaults.stackLayers,
    xToYRatio: readNumericValue(resolvedRoot, "x_y_ratio", defaults.xToYRatio),
  });
}

export function applyLegacyRuntimeOptions(
  runtimeOptions: Partial<CalculationRuntimeOptions> | null | undefined,
  root?: LegacyRuntimeRootLike
): CalculationRuntimeOptions {
  const resolvedRoot = resolveRoot(root);
  const normalizedRuntimeOptions = normalizeCalculationRuntimeOptions(runtimeOptions);

  if (resolvedRoot) {
    resolvedRoot.pointLength = normalizedRuntimeOptions.pointLength;
  }

  writeElementValue(resolvedRoot, "pointLength", String(normalizedRuntimeOptions.pointLength));
  writeCheckboxValue(resolvedRoot, "hideSource", normalizedRuntimeOptions.hideSource);
  writeCheckboxValue(resolvedRoot, "showMaxOneBelt", normalizedRuntimeOptions.showMaxOneBelt);
  writeCheckboxValue(resolvedRoot, "isMerge", normalizedRuntimeOptions.isMerge);
  writeCheckboxValue(resolvedRoot, "isAddSelfAccP", normalizedRuntimeOptions.isAddSelfAccP);
  writeCheckboxValue(resolvedRoot, "selfAcc", normalizedRuntimeOptions.selfAcc);
  writeElementValue(resolvedRoot, "csd", normalizedRuntimeOptions.conveyorBeltType);
  writeElementValue(resolvedRoot, "speed1_5", String(normalizedRuntimeOptions.stationStackLayer));
  writeElementValue(resolvedRoot, "selore", String(normalizedRuntimeOptions.oreMultiplier));
  writeElementValue(resolvedRoot, "speed1_6", String(normalizedRuntimeOptions.advancedMinerMultiplier));
  writeElementValue(resolvedRoot, "speed1_1", String(normalizedRuntimeOptions.orbitalCollectorGasHydrogen));
  writeElementValue(resolvedRoot, "speed1_2", String(normalizedRuntimeOptions.orbitalCollectorDeuterium));
  writeElementValue(resolvedRoot, "speed1_3", String(normalizedRuntimeOptions.orbitalCollectorFireIce));
  writeElementValue(resolvedRoot, "speed1_4", String(normalizedRuntimeOptions.orbitalCollectorIceHydrogen));
  writeElementValue(resolvedRoot, "fractionatorSpeed", String(normalizedRuntimeOptions.fractionatorSpeed));
  writeElementValue(resolvedRoot, "oilSpeed", String(normalizedRuntimeOptions.oilSpeed));
  writeElementValue(resolvedRoot, "gzSpeed", String(normalizedRuntimeOptions.gzSpeed));
  writeCheckboxValue(resolvedRoot, "onlyConveyorBeltMk3", normalizedRuntimeOptions.onlyConveyorBeltMk3);
  writeCheckboxValue(resolvedRoot, "onlySorterMk3", normalizedRuntimeOptions.onlySorterMk3);
  writeCheckboxValue(resolvedRoot, "useSorterMk4", normalizedRuntimeOptions.useSorterMk4);
  writeElementValue(resolvedRoot, "conveyorBeltStackLayer", String(normalizedRuntimeOptions.conveyorBeltStackLayer));
  writeCheckboxValue(resolvedRoot, "generateTeslaTower", normalizedRuntimeOptions.generateTeslaTower);
  writeElementValue(resolvedRoot, "teslaTowerLineInterval", String(normalizedRuntimeOptions.teslaTowerLineInterval));
  writeElementValue(resolvedRoot, "maxLabLayers", String(normalizedRuntimeOptions.maxLabLayers));
  writeCheckboxValue(resolvedRoot, "stackLayers", normalizedRuntimeOptions.stackLayers);
  writeElementValue(resolvedRoot, "x_y_ratio", String(normalizedRuntimeOptions.xToYRatio));

  return normalizedRuntimeOptions;
}
