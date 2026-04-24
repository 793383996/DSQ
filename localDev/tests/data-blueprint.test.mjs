import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

let context;

beforeAll(() => {
  context = {
    console: {
      warn() {},
      error() {},
      log() {},
    },
    cocoMessage: {
      error() {},
      warning() {},
      success() {},
    },
  };
  context.globalThis = context;
  context.window = context;
  runInNewContext(readFileSync("Scripts/domain.dictionary.js", "utf8"), context, {
    filename: "Scripts/domain.dictionary.js",
  });
  runInNewContext(readFileSync("Scripts/blueprint.constants.js", "utf8"), context, {
    filename: "Scripts/blueprint.constants.js",
  });
  runInNewContext(readFileSync("Scripts/data.blueprint.js", "utf8"), context, {
    filename: "Scripts/data.blueprint.js",
  });
});

describe("data blueprint name normalization", () => {
  it("maps legacy refinery building names into blueprint runtime ids", () => {
    const payload = context.createBlueprintRecipePayloadFromSnapshot({
      title: "精炼油-60min",
      description: "精炼油-60min\n",
      outputNames: ["精炼油"],
      iconIds: [],
      subRecipes: [
        {
          itemName: "精炼油",
          buildingName: "原油精炼机",
          buildingCount: 1,
          input: [{ name: "原油", rate: 0.5 }],
          output: [{ name: "精炼油", rate: 0.25 }],
          accType: null,
          accValue: "无",
          acceleratorMode: -1,
        },
      ],
    });

    expect(payload.recipeList).toHaveLength(1);
    expect(payload.recipeList[0].building).toEqual({
      name: "oilRefinery",
      num: 1,
    });
  });

  it("prefers english building and item ids from blueprint snapshots", () => {
    const payload = context.createBlueprintRecipePayloadFromSnapshot({
      title: "精炼油-60min",
      description: "精炼油-60min\n",
      outputNames: ["精炼油"],
      outputIds: ["refinedOil"],
      iconIds: [],
      subRecipes: [
        {
          itemName: "精炼油",
          itemId: "refinedOil",
          buildingId: "oilRefinery",
          buildingCount: 1,
          input: [{ name: "原油", itemId: "oil", rate: 0.5 }],
          output: [{ name: "精炼油", itemId: "refinedOil", rate: 0.25 }],
          accType: null,
          accValue: "none",
          acceleratorMode: -1,
        },
      ],
    });

    expect(payload.recipeList[0].building).toEqual({
      name: "oilRefinery",
      num: 1,
    });
    expect(payload.recipeList[0].input).toEqual([{ name: "oil", rate: 0.5 }]);
    expect(payload.recipeList[0].output).toEqual([{ name: "refinedOil", rate: 0.25 }]);
  });

  it("supports other legacy machine aliases used by recipe data", () => {
    expect(context.mapBlueprintName("粒子对撞机")).toBe("微型粒子对撞机");
    expect(context.mapBlueprintName("射线接收塔")).toBe("射线接收站");
    expect(context.mapBlueprintName("轨道采集器(气态)")).toBe("轨道采集器");
    expect(context.mapBlueprintName("轨道采集器(巨冰)")).toBe("轨道采集器");
  });
});
