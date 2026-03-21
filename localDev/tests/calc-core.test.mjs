import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

let core;

beforeAll(() => {
  const sourceCode = readFileSync("Scripts/calc-core.js", "utf8");
  const context = {};
  context.globalThis = context;
  context.window = context;
  runInNewContext(sourceCode, context, { filename: "Scripts/calc-core.js" });
  core = context.DSQCalcCore;
});

describe("DSQ calc core", () => {
  it("returns 1 for unsupported accelerator mode", () => {
    expect(core.getAccSpeed("增产剂Mk.Ⅲ", "无")).toBe(1);
  });

  it("calculates accelerator multipliers by level and mode", () => {
    expect(core.getAccSpeed("增产剂Mk.Ⅱ", "加速")).toBe(1.5);
    expect(core.getAccSpeed("增产剂Mk.Ⅲ", "增产")).toBe(1.25);
    expect(core.getAccSpeed("unknown", "加速")).toBe(1.25);
  });

  it("maps belt speed by belt name", () => {
    expect(core.getBeltSpeed("传送带")).toBe(360);
    expect(core.getBeltSpeed("高速传送带")).toBe(720);
    expect(core.getBeltSpeed("极速传送带")).toBe(1800);
    expect(core.getBeltSpeed("unknown")).toBe(1800);
  });

  it("calculates base machine count per belt", () => {
    const value = core.calculateBaseMachineCount({
      recipeTime: 2,
      machineSpeed: 1,
      itemCount: 1,
      beltSpeed: 1800,
      stackLayer: 4,
    });
    expect(value).toBe(240);
  });

  it("keeps input max count unchanged for proliferator增产 mode", () => {
    const value = core.calculateMaxMachinesPerBelt({
      recipeTime: 2,
      machineSpeed: 1,
      itemCount: 1,
      beltSpeed: 1800,
      stackLayer: 4,
      accType: "增产剂Mk.Ⅱ",
      accValue: "增产",
      direction: "input",
    });
    expect(value).toBe(240);
  });

  it("reduces output max count with accelerator multiplier", () => {
    const value = core.calculateMaxMachinesPerBelt({
      recipeTime: 2,
      machineSpeed: 1,
      itemCount: 1,
      beltSpeed: 1800,
      stackLayer: 4,
      accType: "增产剂Mk.Ⅱ",
      accValue: "增产",
      direction: "output",
    });
    expect(value).toBeCloseTo(200, 5);
  });
});
