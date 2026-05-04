// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function flushPromises() {
  return Promise.resolve()
    .then(() => Promise.resolve())
    .then(
      () =>
        new Promise(resolve => {
          setTimeout(resolve, 0);
        })
    )
    .then(() => Promise.resolve());
}

function createBlueprintSnapshot() {
  return {
    title: "齿轮蓝图",
    description: "说明文本   ",
    outputNames: ["齿轮"],
    iconIds: [1],
    subRecipes: [
      {
        buildingName: "制作台Mk.Ⅰ",
        buildingCount: 1,
        acceleratorMode: -1,
        output: [{ name: "齿轮", rate: 60 }],
        input: [{ name: "铁块", rate: 60 }],
        accType: null,
      },
    ],
  };
}

function createContext(options = {}) {
  const lifecycleEvents = [];
  const generateAsync = vi.fn(async (_title, _icons, _recipe, config) => {
    if (options.failWith) {
      throw options.failWith;
    }
    if (typeof options.onGenerate === "function") {
      options.onGenerate(config);
    }
    return "blueprint-code";
  });
  const writeText = vi.fn(async () => {});

  const context = {
    console,
    setTimeout,
    clearTimeout,
    AbortController,
    document,
    isSecureContext: true,
    location: {
      protocol: "https:",
      href: "https://example.com/",
    },
    navigator: {
      clipboard: {
        writeText,
      },
    },
    cocoMessage: {
      success() {},
      warning() {},
      error() {},
    },
    DSQI18n: {
      t(_key, _params, fallback) {
        return fallback || "";
      },
    },
    PerformanceTracker: null,
    pako: {},
    Blueprint: function Blueprint() {},
    BlueprintFacade: function BlueprintFacade() {},
    DSQCommandBridge: {
      has(commandName) {
        return [
          "getCurrentCalculationResult",
          "getCurrentBlueprintConfig",
          "startBlueprintGeneration",
          "finishBlueprintGeneration",
          "failBlueprintGeneration",
        ].includes(commandName);
      },
      invoke(commandName, payload) {
        if (commandName === "getCurrentCalculationResult") {
          return {
            blueprintSnapshot: createBlueprintSnapshot(),
          };
        }
        if (commandName === "getCurrentBlueprintConfig") {
          return {
            onlyConveyorBeltMk3: false,
            onlySorterMk3: false,
            useSorterMk4: true,
            conveyorBeltStackLayer: 3,
            maxLabLayers: 9,
            selfSpray: false,
            generateTeslaTower: false,
            teslaTowerLineInterval: 2,
            x_y_ratio: 1.5,
            stackLayers: 4,
            maxSorterNumOneBelt: 8,
            compactLayout: false,
            upgradeConveyorBelt: false,
            teslaTowerInterval: 10,
            onlyConveyorBeltMk3Downgrade: false,
          };
        }
        lifecycleEvents.push({ commandName, payload });
        return payload;
      },
    },
  };

  context.BlueprintFacade.generateAsync = generateAsync;
  context.globalThis = context;
  context.window = context;

  return {
    context,
    lifecycleEvents,
    generateAsync,
    writeText,
  };
}

describe("legacy blueprint lifecycle bridge", () => {
  it("reports generating and success states through the command bridge and honors store-owned config", async () => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";

    const sourceCode = readFileSync("Scripts/data.blueprint.js", "utf8");
    let receivedConfig = null;
    const env = createContext({
      onGenerate(config) {
        receivedConfig = config;
      },
    });

    runInNewContext(sourceCode, env.context, { filename: "Scripts/data.blueprint.js" });
    env.context.generateBlueprint();
    await flushPromises();

    expect(env.lifecycleEvents[0]).toEqual(
      expect.objectContaining({
        commandName: "startBlueprintGeneration",
      })
    );
    expect(env.lifecycleEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          commandName: "finishBlueprintGeneration",
          payload: expect.objectContaining({
            text: "blueprint-code",
          }),
        }),
      ])
    );
    expect(env.writeText).toHaveBeenCalledWith("blueprint-code");
    expect(receivedConfig).toEqual(
      expect.objectContaining({
        useSorterMk4: true,
        maxLabLayers: 9,
        x_y_ratio: 1.5,
        stackLayers: 4,
      })
    );
    expect(env.generateAsync).toHaveBeenCalled();
  });

  it("reports failures through the command bridge when blueprint generation rejects", async () => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";

    const sourceCode = readFileSync("Scripts/data.blueprint.js", "utf8");
    const env = createContext({
      failWith: new Error("blueprint_failed"),
    });

    runInNewContext(sourceCode, env.context, { filename: "Scripts/data.blueprint.js" });
    env.context.generateBlueprint();
    await flushPromises();

    expect(env.lifecycleEvents[0]).toEqual(
      expect.objectContaining({
        commandName: "startBlueprintGeneration",
      })
    );
    expect(env.lifecycleEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          commandName: "failBlueprintGeneration",
        }),
      ])
    );
    expect(env.lifecycleEvents.find(event => event.commandName === "finishBlueprintGeneration")).toBeUndefined();
  });
});
