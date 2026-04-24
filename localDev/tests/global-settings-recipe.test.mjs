import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it } from "vitest";

let context;

function loadRecipeRuntime() {
  const sourceCode = readFileSync("Scripts/data.recipe.js", "utf8");
  context = {
    console,
    settings: {},
    settingsLocal: {},
    global_settings: {
      selmodein: "制作台Mk.Ⅲ",
      furnace: "位面熔炉",
      chemical: "量子化工厂",
      research: "自演化研究站",
      accType: "增产剂Mk.Ⅱ",
      accValue: "加速",
    },
    settings_time: {},
    settings_pf: {},
    defaultAccType: "增产剂Mk.Ⅰ",
    defaultAccValue: "无",
    data: [],
    recipeIndexByProduct: {},
    recipeIndexByMaterial: {},
    cocoMessage: {
      warning() {},
    },
  };
  context.globalThis = context;
  context.window = context;
  runInNewContext(sourceCode, context, { filename: "Scripts/data.recipe.js" });
}

beforeEach(() => {
  loadRecipeRuntime();
});

describe("recipe defaults with global settings", () => {
  it("uses row-level machine settings before global settings and recipe defaults", () => {
    const item = {
      id: 1,
      t: 1,
      mName: "制作台",
      m: [
        { name: "制作台Mk.Ⅰ", speed: 0.75 },
        { name: "制作台Mk.Ⅲ", speed: 1.5 },
      ],
    };

    expect(context.getMachine(item)).toBe("assemblingMachineMk3");
    context.settings_time = { "制作台Mk.Ⅲ": 2 };
    expect(context.getValue(item)).toMatchObject({
      machineId: "assemblingMachineMk3",
      machineName: "制作台Mk.Ⅲ",
      speed: 2,
      isChange: true,
    });

    context.settings[item.id] = { m: "制作台Mk.Ⅰ" };
    expect(context.getMachine(item)).toBe("assemblingMachineMk1");

    context.global_settings = {};
    context.settings = {};
    context.settings_time = {};
    expect(context.getMachine(item)).toBe("assemblingMachineMk1");
    expect(context.getValue(item)).toMatchObject({
      machineId: "assemblingMachineMk1",
      machineName: "制作台Mk.Ⅰ",
      speed: 0.75,
    });
  });

  it("keeps normalized runtime machine settings on english ids", () => {
    context.global_settings = {
      selmodein: "assemblingMachineMk3",
      furnace: "planeSmelter",
      chemical: "quantumChemicalPlant",
      research: "selfEvolutionLab",
      accType: "增产剂Mk.Ⅱ",
      accValue: "加速",
    };
    const item = {
      id: 3,
      t: 2,
      machineTypeId: "assembler",
      m: [
        { id: "assemblingMachineMk1", name: "制作台Mk.Ⅰ", speed: 0.75 },
        { id: "assemblingMachineMk3", name: "制作台Mk.Ⅲ", speed: 1.5 },
      ],
    };

    expect(context.getMachine(item)).toBe("assemblingMachineMk3");
    expect(context.getValue(item)).toMatchObject({
      machineId: "assemblingMachineMk3",
      machineName: "制作台Mk.Ⅲ",
      speed: 1.5,
    });

    context.settings[item.id] = { m: "assemblingMachineMk1" };
    expect(context.getMachine(item)).toBe("assemblingMachineMk1");
  });

  it("uses row-level proliferator settings before global settings and recipe defaults", () => {
    const item = {
      id: 2,
      mName: "制作台",
      m: [{ name: "制作台Mk.Ⅰ", speed: 0.75 }],
    };

    expect(context.getAccType(item)).toBe("增产剂Mk.Ⅱ");
    expect(context.getAccValue(item)).toBe("加速");

    context.settings[item.id] = {
      accType: "增产剂Mk.Ⅲ",
      accValue: "增产",
    };
    expect(context.getAccType(item)).toBe("增产剂Mk.Ⅲ");
    expect(context.getAccValue(item)).toBe("增产");

    context.global_settings = {};
    context.settings = {};
    expect(context.getAccType(item)).toBe("增产剂Mk.Ⅰ");
    expect(context.getAccValue(item)).toBe("无");
  });
});
