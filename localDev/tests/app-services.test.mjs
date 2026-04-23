import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

let services;

function createInput(value, attributes = {}) {
  return {
    nodeType: 1,
    value: value,
    dataset: {},
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name);
    },
    getAttribute(name) {
      return attributes[name];
    },
  };
}

beforeAll(() => {
  const sourceCode = readFileSync("Scripts/app.services.js", "utf8");
  const context = {
    console: {
      warn() {},
      error() {},
    },
  };
  context.globalThis = context;
  context.window = context;
  runInNewContext(sourceCode, context, { filename: "Scripts/app.services.js" });
  services = context.DSQServices;
});

describe("DSQ services", () => {
  it("normalizes invalid global settings to defaults", () => {
    const snapshot = services.globalSettings.createSnapshot({
      selmodein: "bad-machine",
      furnace: "位面熔炉",
      chemical: "bad-chemical",
      research: "自演化研究站",
      accType: "bad-acc",
      accValue: "增产",
    });

    expect(snapshot).toEqual({
      selmodein: "制作台Mk.Ⅰ",
      furnace: "位面熔炉",
      chemical: "化工厂",
      research: "自演化研究站",
      accType: "增产剂Mk.Ⅰ",
      accValue: "增产",
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
});
