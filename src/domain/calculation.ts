import {
  cloneJsonValue,
  createEmptyCalculationOutput,
  type CalculationInput,
  type CalculationOutput,
} from "../types/dsq";

export function calculateProductionPlan(snapshot: CalculationInput): CalculationOutput {
  if (snapshot.currentResult) {
    return cloneJsonValue(snapshot.currentResult, createEmptyCalculationOutput());
  }

  const output = createEmptyCalculationOutput();
  if (Array.isArray(snapshot.requirements)) {
    output.requirements = cloneJsonValue(snapshot.requirements, []);
    output.seoSnapshot.requirementCount = output.requirements.length;
    output.seoSnapshot.primaryItemName = output.requirements[0]?.item?.name || "";
    output.seoSnapshot.primaryRatePerMinute =
      typeof output.requirements[0]?.number === "number" ? output.requirements[0].number : null;
  }
  return output;
}
