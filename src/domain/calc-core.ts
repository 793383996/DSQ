export interface BaseMachineCountParams {
  recipeTime?: number;
  machineSpeed?: number;
  itemCount?: number;
  beltSpeed?: number;
  stackLayer?: number;
}

export interface MaxMachinesPerBeltParams extends BaseMachineCountParams {
  accType?: string | null;
  accValue?: string | null;
  direction?: "input" | "output" | string;
}

const ACC_SPEED = {
  extra: [1.125, 1.2, 1.25],
  speedup: [1.25, 1.5, 2],
} as const;

const BELT_SPEED_MAP: Record<string, number> = {
  conveyorBeltMk1: 360,
  conveyorBeltMk2: 720,
  conveyorBeltMk3: 1800,
  传送带: 360,
  高速传送带: 720,
  极速传送带: 1800,
};

const ACC_TYPE_INDEX_MAP: Record<string, number> = {
  proliferatorMk1: 0,
  proliferatorMk2: 1,
  proliferatorMk3: 2,
  "增产剂Mk.Ⅰ": 0,
  "增产剂Mk.Ⅱ": 1,
  "增产剂Mk.Ⅲ": 2,
};

const ACC_VALUE_MAP: Record<string, "extra" | "speedup"> = {
  extra: "extra",
  speedup: "speedup",
  增产: "extra",
  加速: "speedup",
};

export function normalizeAccTypeIndex(type: unknown): number {
  return typeof type === "string" && ACC_TYPE_INDEX_MAP[type] >= 0 ? ACC_TYPE_INDEX_MAP[type] : 0;
}

export function normalizeAccValue(value: unknown): string {
  return typeof value === "string" && ACC_VALUE_MAP[value] ? ACC_VALUE_MAP[value] : String(value ?? "");
}

export function getAccSpeed(type: unknown, value: unknown): number {
  const normalizedValue = normalizeAccValue(value);
  if (normalizedValue !== "extra" && normalizedValue !== "speedup") {
    return 1;
  }
  const typeIndex = normalizeAccTypeIndex(type);
  return normalizedValue === "extra" ? ACC_SPEED.extra[typeIndex] : ACC_SPEED.speedup[typeIndex];
}

export function getBeltSpeed(beltName: unknown): number {
  return typeof beltName === "string" && BELT_SPEED_MAP[beltName]
    ? BELT_SPEED_MAP[beltName]
    : BELT_SPEED_MAP.conveyorBeltMk3;
}

export function calculateBaseMachineCount(params: BaseMachineCountParams): number {
  const recipeTime = params.recipeTime || 1;
  const machineSpeed = params.machineSpeed || 1;
  const itemCount = params.itemCount || 1;
  const beltSpeed = params.beltSpeed || 1800;
  const stackLayer = params.stackLayer || 1;

  return (beltSpeed / ((60 / recipeTime) * machineSpeed * itemCount)) * stackLayer;
}

export function calculateMaxMachinesPerBelt(params: MaxMachinesPerBeltParams): number {
  const baseCount = calculateBaseMachineCount(params);
  const effectSpeed = getAccSpeed(params.accType, params.accValue);
  const direction = params.direction || "input";
  const accValue = normalizeAccValue(params.accValue);

  if (direction === "input" && accValue === "extra") {
    return baseCount;
  }
  return baseCount / effectSpeed;
}
