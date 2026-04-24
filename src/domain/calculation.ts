import {
  cloneJsonValue,
  createEmptyCalculationOutput,
  type CalculationOutput,
  type CalculationSnapshot,
} from "../types/dsq";

function buildFallbackCalculationOutput(snapshot: CalculationSnapshot): CalculationOutput {
  const output = createEmptyCalculationOutput();
  output.requirements = cloneJsonValue(snapshot.requirements, []);
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

function getLegacyCalculationBuilder():
  | (() => CalculationOutput)
  | null {
  if (typeof window === "undefined" || typeof window.buildCalculationResult !== "function") {
    return null;
  }
  return window.buildCalculationResult;
}

export function calculateProductionPlan(snapshot: CalculationSnapshot): CalculationOutput {
  const legacyBuilder = getLegacyCalculationBuilder();
  if (legacyBuilder) {
    return cloneJsonValue(legacyBuilder(), createEmptyCalculationOutput());
  }

  if (snapshot.currentResult) {
    return cloneJsonValue(snapshot.currentResult, createEmptyCalculationOutput());
  }

  return buildFallbackCalculationOutput(snapshot);
}
