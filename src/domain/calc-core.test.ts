import { describe, expect, it } from "vitest";

import {
  calculateBaseMachineCount,
  calculateMaxMachinesPerBelt,
  getAccSpeed,
  getBeltSpeed,
} from "./calc-core";

describe("calc-core TypeScript module", () => {
  it("returns 1 for unsupported accelerator mode", () => {
    expect(getAccSpeed("增产剂Mk.Ⅲ", "无")).toBe(1);
  });

  it("calculates accelerator multipliers by level and mode", () => {
    expect(getAccSpeed("增产剂Mk.Ⅱ", "加速")).toBe(1.5);
    expect(getAccSpeed("增产剂Mk.Ⅲ", "增产")).toBe(1.25);
    expect(getAccSpeed("unknown", "加速")).toBe(1.25);
  });

  it("maps belt speed by belt name", () => {
    expect(getBeltSpeed("传送带")).toBe(360);
    expect(getBeltSpeed("高速传送带")).toBe(720);
    expect(getBeltSpeed("极速传送带")).toBe(1800);
    expect(getBeltSpeed("unknown")).toBe(1800);
  });

  it("calculates base machine count per belt", () => {
    expect(
      calculateBaseMachineCount({
        recipeTime: 2,
        machineSpeed: 1,
        itemCount: 1,
        beltSpeed: 1800,
        stackLayer: 4,
      })
    ).toBe(240);
  });

  it("keeps input max count unchanged for proliferator增产 mode", () => {
    expect(
      calculateMaxMachinesPerBelt({
        recipeTime: 2,
        machineSpeed: 1,
        itemCount: 1,
        beltSpeed: 1800,
        stackLayer: 4,
        accType: "增产剂Mk.Ⅱ",
        accValue: "增产",
        direction: "input",
      })
    ).toBe(240);
  });

  it("reduces output max count with accelerator multiplier", () => {
    expect(
      calculateMaxMachinesPerBelt({
        recipeTime: 2,
        machineSpeed: 1,
        itemCount: 1,
        beltSpeed: 1800,
        stackLayer: 4,
        accType: "增产剂Mk.Ⅱ",
        accValue: "增产",
        direction: "output",
      })
    ).toBeCloseTo(200, 5);
  });
});
