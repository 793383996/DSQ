import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

let dictionary;

beforeAll(() => {
  const context = {
    console: {
      warn() {},
      error() {},
    },
  };
  context.globalThis = context;
  context.window = context;
  runInNewContext(readFileSync("Scripts/domain.dictionary.js", "utf8"), context, {
    filename: "Scripts/domain.dictionary.js",
  });
  dictionary = context.DSQDomainDictionary;
});

describe("domain dictionary", () => {
  it("normalizes legacy machine aliases into stable ids", () => {
    expect(dictionary.getMachineId("原油精炼机")).toBe("oilRefinery");
    expect(dictionary.getMachineId("粒子对撞机")).toBe("particleCollider");
    expect(dictionary.getMachineId("射线接收塔")).toBe("rayReceiver");
    expect(dictionary.getMachineId("轨道采集器(气态)")).toBe("orbitalCollectorGas");
  });

  it("normalizes proliferator items and acc values", () => {
    expect(dictionary.getItemId("增产剂Mk.Ⅰ")).toBe("proliferatorMk1");
    expect(dictionary.getAccValueId("加速")).toBe("speedup");
    expect(dictionary.getAccValueId("增产")).toBe("extra");
  });

  it("resolves display, icon and blueprint entity metadata", () => {
    expect(dictionary.getDisplayName("oilRefinery")).toBe("原油精炼厂");
    expect(dictionary.getIconName("rayReceiver")).toBe("射线接收站");
    expect(dictionary.getBlueprintEntityName("particleCollider")).toBe("微型粒子对撞机");
  });
});
