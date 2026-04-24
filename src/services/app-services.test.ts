import { describe, expect, it } from "vitest";

import { createDsqServices } from "./app-services";

function createInput(value: string, attributes: Record<string, string> = {}) {
  return {
    nodeType: 1,
    value,
    dataset: {} as Record<string, string | undefined>,
    hasAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(attributes, name);
    },
    getAttribute(name: string) {
      return attributes[name];
    },
  };
}

describe("app-services TypeScript module", () => {
  const warnings: Array<{ message: string; duration?: number }> = [];
  const services = createDsqServices({
    root: {
      console: {
        warn() {},
      },
    },
    notifier: {
      warning(message: string, duration?: number) {
        warnings.push({ message, duration });
      },
    },
  });

  it("normalizes invalid global settings to defaults", () => {
    expect(
      services.globalSettings.createSnapshot({
        selmodein: "bad-machine",
        furnace: "位面熔炉",
        chemical: "bad-chemical",
        research: "自演化研究站",
        accType: "增产剂Mk.Ⅲ",
        accValue: "增产",
      })
    ).toEqual({
      selmodein: "assemblingMachineMk1",
      furnace: "planeSmelter",
      chemical: "chemicalPlant",
      research: "selfEvolutionLab",
      accType: "proliferatorMk3",
      accValue: "extra",
    });
  });

  it("normalizes and validates project names", () => {
    expect(services.project.normalizeName("   Alpha   Plan   ")).toMatchObject({
      valid: true,
      value: "Alpha Plan",
    });

    expect(services.project.normalizeName("   ")).toMatchObject({
      valid: false,
      value: "",
    });

    expect(services.project.normalizeName("x".repeat(81))).toMatchObject({
      valid: false,
    });
  });

  it("restores previous numeric value for invalid inputs", () => {
    const input = createInput("NaN");
    input.dataset.lastValid = "12.5";

    const value = services.numeric.readInput(input, {
      fieldLabel: "每分钟产量",
      fallbackValue: 60,
      requirePositive: true,
      maxFractionDigits: 6,
    });

    expect(value).toBe(12.5);
    expect(input.value).toBe("12.5");
    expect(input.dataset.lastValid).toBe("12.5");
  });

  it("rejects negative, Infinity and illegal numeric strings", () => {
    const negativeInput = createInput("-10");
    negativeInput.dataset.lastValid = "8";
    expect(
      services.numeric.readInput(negativeInput, {
        fieldLabel: "设备数量",
        requirePositive: true,
      })
    ).toBe(8);

    const infinityInput = createInput("Infinity");
    infinityInput.dataset.lastValid = "4";
    expect(
      services.numeric.readInput(infinityInput, {
        fieldLabel: "设备数量",
        requirePositive: true,
      })
    ).toBe(4);

    const textInput = createInput("1e999");
    textInput.dataset.lastValid = "3";
    expect(
      services.numeric.readInput(textInput, {
        fieldLabel: "设备数量",
        requirePositive: true,
      })
    ).toBe(3);
  });

  it("rounds excessive precision and clamps bounded integer inputs", () => {
    const preciseInput = createInput("1.123456789");
    const preciseValue = services.numeric.readInput(preciseInput, {
      fieldLabel: "每分钟产量",
      requirePositive: true,
      fallbackValue: 1,
      maxFractionDigits: 6,
    });
    expect(preciseValue).toBe(1.123457);
    expect(preciseInput.value).toBe("1.123457");

    const pointLengthInput = createInput("9", { min: "0", max: "6", step: "1" });
    pointLengthInput.dataset.lastValid = "3";
    const pointLength = services.numeric.readInput(pointLengthInput, {
      fieldLabel: "小数点后保留",
      clamp: true,
    });
    expect(pointLength).toBe(6);
    expect(pointLengthInput.value).toBe("6");
  });

  it("preserves warn=false for initialization-time numeric recovery", () => {
    warnings.length = 0;
    const machineCountInput = createInput("", { min: "1", max: "1000", step: "1" });

    const machineCount = services.numeric.readInput(machineCountInput, {
      fieldLabel: "生产设备数",
      fallbackValue: 1,
      requirePositive: true,
      warn: false,
    });

    expect(machineCount).toBe(1);
    expect(machineCountInput.value).toBe("1");
    expect(warnings).toEqual([]);
  });
});
