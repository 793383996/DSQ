import { describe, expect, it } from "vitest";

import {
  domainDictionary,
  getBlueprintEntityName,
  getDefaultMachineIdForRecipeType,
  getDisplayName,
  getIconName,
  getMachineId,
  getMachineOptionsForRecipeType,
  getAccValueId,
  getItemId,
} from "./domain-dictionary";

describe("domain-dictionary TypeScript module", () => {
  it("normalizes legacy machine aliases into stable ids", () => {
    expect(getMachineId("原油精炼机")).toBe("oilRefinery");
    expect(getMachineId("粒子对撞机")).toBe("particleCollider");
    expect(getMachineId("射线接收塔")).toBe("rayReceiver");
    expect(getMachineId("轨道采集器(气态)")).toBe("orbitalCollectorGas");
  });

  it("normalizes proliferator items and acc values", () => {
    expect(getItemId("增产剂Mk.Ⅰ")).toBe("proliferatorMk1");
    expect(getAccValueId("加速")).toBe("speedup");
    expect(getAccValueId("增产")).toBe("extra");
  });

  it("resolves display, icon and blueprint entity metadata", () => {
    expect(getDisplayName("oilRefinery")).toBe("原油精炼厂");
    expect(getIconName("rayReceiver")).toBe("射线接收站");
    expect(getBlueprintEntityName("particleCollider")).toBe("微型粒子对撞机");
  });

  it("preserves recipe type defaults and available machine options", () => {
    expect(getDefaultMachineIdForRecipeType("chemical")).toBe("chemicalPlant");
    expect(getMachineOptionsForRecipeType("research")).toEqual(["matrixLab", "selfEvolutionLab"]);
  });

  it("exposes immutable dictionary collections", () => {
    expect(domainDictionary.machines.length).toBeGreaterThan(0);
    expect(Object.isFrozen(domainDictionary)).toBe(true);
  });
});
