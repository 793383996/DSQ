// Scripts/data.recipe-init.js
// 从 data.js 拆分的配方初始化与默认配置能力（索引、能耗、占地、默认增产剂）。

var manualGzSpeed = false; //是否采用手动输入的临界光子每分钟产量

var energyData = {};

var spaceData = {}; //占用格子
var defaultAccType = "proliferatorMk1";
var defaultAccValue = "none";

// 配方查找索引 - 优化查找性能从 O(n) 到 O(1)
var recipeIndexByProduct = {}; // 产物名 → [配方索引数组]
var recipeIndexByMaterial = {}; // 原料名 → [配方索引数组]

function forEachLegacy(collection, callback) {
  if (!collection || typeof callback !== "function") return;
  for (var i = 0; i < collection.length; i++) {
    callback.call(collection[i], i, collection[i]);
  }
}

function getDomainDictionarySafe() {
  if (typeof window !== "undefined" && window.DSQDomainDictionary) {
    return window.DSQDomainDictionary;
  }
  if (typeof DSQDomainDictionary !== "undefined") {
    return DSQDomainDictionary;
  }
  return null;
}

function resolveMachineId(value) {
  var dictionary = getDomainDictionarySafe();
  if (!dictionary || typeof dictionary.getMachineId !== "function") {
    return value;
  }
  return dictionary.getMachineId(value) || value;
}

function resolveRecipeTypeId(value) {
  var dictionary = getDomainDictionarySafe();
  if (!dictionary || typeof dictionary.getRecipeTypeId !== "function") {
    return value;
  }
  return dictionary.getRecipeTypeId(value) || value;
}

function resolveItemId(value) {
  var dictionary = getDomainDictionarySafe();
  if (!dictionary || typeof dictionary.getItemId !== "function") {
    return value;
  }
  return dictionary.getItemId(value) || value;
}

function resolveDisplayName(value) {
  var dictionary = getDomainDictionarySafe();
  if (!dictionary || typeof dictionary.getDisplayName !== "function") {
    return value;
  }
  return dictionary.getDisplayName(value) || value;
}

function resolveIconName(value) {
  var dictionary = getDomainDictionarySafe();
  if (!dictionary || typeof dictionary.getIconName !== "function") {
    return resolveDisplayName(value);
  }
  return dictionary.getIconName(value) || resolveDisplayName(value);
}

function assignMachineMetric(target, machineKey, value) {
  var machineId = resolveMachineId(machineKey);
  var displayName = resolveDisplayName(machineKey);
  target[machineId] = value;
  target[displayName] = value;
  if (machineKey !== displayName) {
    target[machineKey] = value;
  }
}

function createMachineOption(machineKey, speed) {
  var machineId = resolveMachineId(machineKey);
  return {
    id: machineId,
    name: resolveDisplayName(machineKey),
    iconName: resolveIconName(machineKey),
    speed: speed,
  };
}

assignMachineMetric(energyData, "matrixLab", 0.48);
assignMachineMetric(energyData, "selfEvolutionLab", 0.48);
assignMachineMetric(energyData, "assemblingMachineMk1", 0.27);
assignMachineMetric(energyData, "assemblingMachineMk2", 0.54);
assignMachineMetric(energyData, "assemblingMachineMk3", 1.08);
assignMachineMetric(energyData, "recomposingAssembler", 2.7);
assignMachineMetric(energyData, "arcSmelter", 0.36);
assignMachineMetric(energyData, "planeSmelter", 1.44);
assignMachineMetric(energyData, "negentropySmelter", 2.88);
assignMachineMetric(energyData, "vein", 0.42 / 6);
assignMachineMetric(energyData, "miningMachine", 0.42);
assignMachineMetric(energyData, "advancedMiningMachine", 2.94);
assignMachineMetric(energyData, "oilExtractor", 0.84);
assignMachineMetric(energyData, "waterPump", 0.3);
assignMachineMetric(energyData, "oilRefinery", 0.96);
assignMachineMetric(energyData, "chemicalPlant", 0.72);
assignMachineMetric(energyData, "quantumChemicalPlant", 2.16);
assignMachineMetric(energyData, "particleCollider", 12);
assignMachineMetric(energyData, "orbitalCollectorIce", 0);
assignMachineMetric(energyData, "orbitalCollectorGas", 0);
assignMachineMetric(energyData, "rayReceiver", 0);
assignMachineMetric(energyData, "energyExchanger", 0);
assignMachineMetric(energyData, "fractionator", 0.72);

assignMachineMetric(spaceData, "matrixLab", 36 / 15);
assignMachineMetric(spaceData, "selfEvolutionLab", 36 / 15);
assignMachineMetric(spaceData, "assemblingMachineMk1", 16);
assignMachineMetric(spaceData, "assemblingMachineMk2", 16);
assignMachineMetric(spaceData, "assemblingMachineMk3", 16);
assignMachineMetric(spaceData, "recomposingAssembler", 16);
assignMachineMetric(spaceData, "arcSmelter", 16);
assignMachineMetric(spaceData, "planeSmelter", 16);
assignMachineMetric(spaceData, "negentropySmelter", 16);
assignMachineMetric(spaceData, "oilRefinery", 28);
assignMachineMetric(spaceData, "chemicalPlant", 35);
assignMachineMetric(spaceData, "quantumChemicalPlant", 35);
assignMachineMetric(spaceData, "rayReceiver", 24);
assignMachineMetric(spaceData, "energyExchanger", 64);
assignMachineMetric(spaceData, "fractionator", 16);
assignMachineMetric(spaceData, "particleCollider", 45);

function f_initData() {
  // 清空索引，准备重建
  recipeIndexByProduct = {};
  recipeIndexByMaterial = {};

  forEachLegacy(data, function (i, item) {
    item.id = i; //配方的id，用index设置，data改变时应该重置配方

    // 构建产物索引
    for (var j = 0; j < item.s.length; j++) {
      var productName = item.s[j].name;
      item.s[j].itemId = resolveItemId(productName);
      if (!recipeIndexByProduct[productName]) {
        recipeIndexByProduct[productName] = [];
      }
      recipeIndexByProduct[productName].push(i);
    }

    // 构建原料索引
    if (item.q) {
      for (var j = 0; j < item.q.length; j++) {
        var materialName = item.q[j].name;
        item.q[j].itemId = resolveItemId(materialName);
        if (!recipeIndexByMaterial[materialName]) {
          recipeIndexByMaterial[materialName] = [];
        }
        recipeIndexByMaterial[materialName].push(i);
      }
    }

    var machineTypeId = resolveRecipeTypeId(item.m);
    var ms = [];
    if (machineTypeId == "research") {
      ms = [createMachineOption("matrixLab", 1), createMachineOption("selfEvolutionLab", 3)];
    }
    if (machineTypeId == "assembler") {
      ms = [
        createMachineOption("assemblingMachineMk1", 0.75),
        createMachineOption("assemblingMachineMk2", 1),
        createMachineOption("assemblingMachineMk3", 1.5),
        createMachineOption("recomposingAssembler", 3),
      ];
    }

    if (machineTypeId == "smelter") {
      ms = [
        createMachineOption("arcSmelter", 1),
        createMachineOption("planeSmelter", 2),
        createMachineOption("negentropySmelter", 3),
      ];
    }
    if (machineTypeId == "mining") {
      ms = [
        createMachineOption("miningMachine", 0.5 * 6),
        createMachineOption("advancedMiningMachine", 1 * 20),
        createMachineOption("vein", 0.5 * 1),
      ];
    }
    if (machineTypeId == "energyExchanger") {
      ms = [createMachineOption("energyExchanger", 1)];
    }

    if (machineTypeId == "darkFogDrop") {
      ms = [createMachineOption("darkFogDrop", 1)];
    }

    if (machineTypeId == "oilExtractor") {
      ms = [createMachineOption("oilExtractor", 4)];
    }
    if (machineTypeId == "waterPump") {
      ms = [createMachineOption("waterPump", 50 / 60)];
    }

    if (machineTypeId == "oilRefinery") {
      ms = [createMachineOption("oilRefinery", 1)];
    }
    if (machineTypeId == "chemical") {
      ms = [createMachineOption("chemicalPlant", 1), createMachineOption("quantumChemicalPlant", 2)];
    }
    if (machineTypeId == "collider") {
      ms = [createMachineOption("particleCollider", 1)];
    }
    if (machineTypeId == "orbitalCollectorIce") {
      ms = [createMachineOption("orbitalCollectorIce", 1)];
    }
    if (machineTypeId == "orbitalCollectorGas") {
      ms = [createMachineOption("orbitalCollectorGas", 1)];
    }

    if (machineTypeId == "rayReceiver") {
      ms = [createMachineOption("rayReceiver", 1)];
    }

    if (machineTypeId == "fractionator") {
      ms = [createMachineOption("fractionator", 30)];
    }

    item.machineTypeId = machineTypeId;
    item.mName = item.m;
    item.m = ms;
  });
  // console.log(data);
}
