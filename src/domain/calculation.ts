import type { CalculationOutput, CalculationSnapshot } from "../types/dsq";
import { buildFallbackCalculationOutput, calculateProductionPlanFromLegacyRuntime } from "./legacy-calculation-runtime";

export function calculateProductionPlan(snapshot: CalculationSnapshot): CalculationOutput {
  const result = calculateProductionPlanFromLegacyRuntime(snapshot);
  if (result) {
    return result;
  }
  return buildFallbackCalculationOutput(snapshot);
}
