export interface FakeLegacyElement {
  value?: string;
  checked?: boolean;
}

export type FakeLegacyRuntimeWindow = typeof globalThis & {
  data?: unknown[];
  energyData?: Record<string, number>;
  spaceData?: Record<string, number>;
  recipeIndexByProduct?: Record<string, number[]>;
  icons?: Record<string, string>;
  resolveBlueprintIconsByNames?: (names: string[]) => string[];
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
    铁块: [2],
    铜块: [3],
  };
  target.icons = {};
  target.resolveBlueprintIconsByNames = (names: string[]) => names.map(name => `icon:${name}`);
}

export function uninstallFakeLegacyCalculationRuntime(target: FakeLegacyRuntimeWindow): void {
  Reflect.deleteProperty(target, "data");
  Reflect.deleteProperty(target, "energyData");
  Reflect.deleteProperty(target, "spaceData");
  Reflect.deleteProperty(target, "recipeIndexByProduct");
  Reflect.deleteProperty(target, "icons");
  Reflect.deleteProperty(target, "resolveBlueprintIconsByNames");
}
