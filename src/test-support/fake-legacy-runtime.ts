export interface FakeLegacyElement {
  value?: string;
  checked?: boolean;
}

export type FakeLegacyRuntimeWindow = typeof globalThis & {
  data?: unknown[];
  energyData?: Record<string, number>;
  spaceData?: Record<string, number>;
  recipeIndexByProduct?: Record<string, number[]>;
  recipeIndexByMaterial?: Record<string, number[]>;
  icons?: Record<string, string>;
  game_data?: {
    icons1: Array<{ name: string; value: string }>;
    icons2: Array<{ name: string; value: string }>;
  };
  resolveBlueprintIconsByNames?: (names: string[]) => string[];
  find?: (name: string, normalizeRecipe?: boolean) => any;
  getPfs?: (name: string) => any[];
  getPfTitle?: (recipe: { id?: number | string; name?: string }, info?: { speed?: number } | null) => string;
  getValue?: (arg: { id?: number | string; name?: string; t?: number; m?: Array<{ id?: string; name?: string; speed?: number }> } | string) => {
    name: string;
    machineName: string;
    machineId: string;
    t: number;
    speed: number;
    time: number;
    accType: string;
    accValue: string;
  } | null;
  getAccType?: () => string;
  getAccValue?: () => string;
  defaultAccType?: string;
  defaultAccValue?: string;
};

export function installFakeLegacyCalculationRuntime(target: FakeLegacyRuntimeWindow): void {
  target.data = [
    {
      id: 0,
      name: "铁矿",
      itemId: "ironOre",
      machineTypeId: "vein",
      noExtra: null,
      n: 1,
      t: 1,
      s: [{ name: "铁矿", itemId: "ironOre", n: 1 }],
      q: [],
      m: [{ id: "vein", name: "矿脉", speed: 1 }],
    },
    {
      id: 1,
      name: "铜矿",
      itemId: "copperOre",
      machineTypeId: "vein",
      noExtra: null,
      n: 1,
      t: 1,
      s: [{ name: "铜矿", itemId: "copperOre", n: 1 }],
      q: [],
      m: [{ id: "vein", name: "矿脉", speed: 1 }],
    },
    {
      id: 2,
      name: "铁块",
      itemId: "ironIngot",
      machineTypeId: "smelter",
      noExtra: false,
      n: 1,
      t: 1,
      s: [{ name: "铁块", itemId: "ironIngot", n: 1 }],
      q: [{ name: "铁矿", itemId: "ironOre", n: 1 }],
      m: [{ id: "arcSmelter", name: "电弧熔炉", speed: 1 }],
    },
    {
      id: 3,
      name: "铜块",
      itemId: "copperIngot",
      machineTypeId: "smelter",
      noExtra: false,
      n: 1,
      t: 1,
      s: [{ name: "铜块", itemId: "copperIngot", n: 1 }],
      q: [{ name: "铜矿", itemId: "copperOre", n: 1 }],
      m: [{ id: "arcSmelter", name: "电弧熔炉", speed: 1 }],
    },
    {
      id: 4,
      name: "铁块",
      itemId: "ironIngot",
      machineTypeId: "smelter",
      noExtra: false,
      n: 1,
      t: 2,
      s: [{ name: "铁块", itemId: "ironIngot", n: 1 }],
      q: [{ name: "铜矿", itemId: "copperOre", n: 1 }],
      m: [{ id: "arcSmelter", name: "电弧熔炉", speed: 2 }],
    },
  ];
  target.energyData = {
    vein: 1,
    arcSmelter: 10,
  };
  target.spaceData = {
    vein: 1,
    arcSmelter: 2,
  };
  target.recipeIndexByProduct = {
    铁矿: [0],
    铜矿: [1],
    铁块: [2, 4],
    铜块: [3],
  };
  target.recipeIndexByMaterial = {
    铁矿: [2],
    铜矿: [3, 4],
  };
  target.icons = {};
  target.game_data = {
    icons1: [
      { name: "1-1-铁块", value: "iron-icon" },
      { name: "1-2-铜块", value: "copper-icon" },
    ],
    icons2: [
      { name: "1-1-电弧熔炉", value: "smelter-icon" },
      { name: "1-2-采矿机", value: "miner-icon" },
    ],
  };
  target.defaultAccType = "proliferatorMk1";
  target.defaultAccValue = "none";
  target.resolveBlueprintIconsByNames = (names: string[]) => names.map(name => `icon:${name}`);
  target.find = (name: string) => {
    const indices = target.recipeIndexByProduct?.[name] ?? [];
    const recipe = indices.length > 0 ? target.data?.[indices[0]] : undefined;
    return recipe ? JSON.parse(JSON.stringify(recipe)) : null;
  };
  target.getPfs = (name: string) => {
    const indices = target.recipeIndexByProduct?.[name] ?? [];
    return indices
      .map(index => target.data?.[index])
      .filter(Boolean)
      .map(recipe => JSON.parse(JSON.stringify(recipe)));
  };
  target.getPfTitle = (recipe, info) => `<span>${recipe.name || recipe.id}</span><sub>${info?.speed ?? ""}</sub>`;
  target.getValue = (arg) => {
    const recipe = typeof arg === "string" ? target.find?.(arg) : arg;
    const machine = recipe?.m?.[0];
    if (!recipe || !machine) {
      return null;
    }
    return {
      name: machine.name || machine.id || "",
      machineName: machine.name || machine.id || "",
      machineId: machine.id || "",
      t: recipe.t || 1,
      speed: machine.speed || 1,
      time: (recipe.t || 1) / (machine.speed || 1),
      accType: target.defaultAccType || "proliferatorMk1",
      accValue: target.defaultAccValue || "none",
    };
  };
  target.getAccType = () => target.defaultAccType || "proliferatorMk1";
  target.getAccValue = () => target.defaultAccValue || "none";
}

export function uninstallFakeLegacyCalculationRuntime(target: FakeLegacyRuntimeWindow): void {
  Reflect.deleteProperty(target, "data");
  Reflect.deleteProperty(target, "energyData");
  Reflect.deleteProperty(target, "spaceData");
  Reflect.deleteProperty(target, "recipeIndexByProduct");
  Reflect.deleteProperty(target, "recipeIndexByMaterial");
  Reflect.deleteProperty(target, "icons");
  Reflect.deleteProperty(target, "game_data");
  Reflect.deleteProperty(target, "resolveBlueprintIconsByNames");
  Reflect.deleteProperty(target, "find");
  Reflect.deleteProperty(target, "getPfs");
  Reflect.deleteProperty(target, "getPfTitle");
  Reflect.deleteProperty(target, "getValue");
  Reflect.deleteProperty(target, "getAccType");
  Reflect.deleteProperty(target, "getAccValue");
  Reflect.deleteProperty(target, "defaultAccType");
  Reflect.deleteProperty(target, "defaultAccValue");
}
