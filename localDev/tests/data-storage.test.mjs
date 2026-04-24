import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

let context;

function createLocalStorage() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    key(index) {
      return Array.from(store.keys())[index] || null;
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

beforeAll(() => {
  context = {
    console: {
      warn() {},
      error() {},
      log() {},
    },
    localStorage: createLocalStorage(),
    document: {
      cookie: "",
      getElementById(id) {
        if (id === "onlyConveyorBeltMk3" || id === "onlySorterMk3") {
          return { checked: false };
        }
        return null;
      },
    },
  };
  context.globalThis = context;
  context.window = context;
  runInNewContext(readFileSync("Scripts/data.state.js", "utf8"), context, {
    filename: "Scripts/data.state.js",
  });
  runInNewContext(readFileSync("Scripts/domain.dictionary.js", "utf8"), context, {
    filename: "Scripts/domain.dictionary.js",
  });
  runInNewContext(readFileSync("Scripts/app.services.js", "utf8"), context, {
    filename: "Scripts/app.services.js",
  });
  runInNewContext(readFileSync("Scripts/data.storage.js", "utf8"), context, {
    filename: "Scripts/data.storage.js",
  });
});

describe("data storage normalization", () => {
  it("loads legacy machine settings as english ids", () => {
    context.localStorage.setItem(
      "machine_settings" + context.version,
      JSON.stringify({
        1: { m: "原油精炼机", accType: "增产剂Mk.Ⅱ", accValue: "增产" },
      })
    );
    context.loadSetting();
    expect(context.settings).toEqual({
      1: { m: "oilRefinery", accType: "proliferatorMk2", accValue: "extra" },
    });
  });

  it("loads legacy machine speed settings as english ids", () => {
    context.localStorage.setItem(
      "machine_settings_time" + context.version,
      JSON.stringify({
        原油精炼机: 2,
        射线接收塔: 3,
      })
    );
    context.loadSettingTime();
    expect(context.settings_time).toEqual({
      oilRefinery: 2,
      rayReceiver: 3,
    });
  });

  it("loads legacy project settings as english ids", () => {
    context.localStorage.setItem(
      "settings_projects" + context.version,
      JSON.stringify([
        {
          name: "Legacy",
          singleMake: [],
          ig_names: [],
          value: [],
          settings: {
            1: { m: "射线接收塔", accType: "增产剂Mk.Ⅰ", accValue: "加速" },
          },
        },
      ])
    );
    context.loadSettingProjects();
    expect(context.projects).toEqual([
      {
        name: "Legacy",
        singleMake: [],
        ig_names: [],
        value: [],
        settings: {
          1: { m: "rayReceiver", accType: "proliferatorMk1", accValue: "speedup" },
        },
      },
    ]);
  });
});
