// Scripts/data.recipe.js
// 从 data.js 拆分的配方核心查询与参数解析函数。

function i18nRecipeText(key, fallback, params) {
  if (window.DSQI18n && typeof window.DSQI18n.t === "function") {
    return window.DSQI18n.t(key, params, fallback);
  }
  return fallback;
}

function deepCloneRecipeValue(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepCloneRecipeValue);
  }
  var output = {};
  var keys = Object.keys(value);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    output[key] = deepCloneRecipeValue(value[key]);
  }
  return output;
}

function assignRecipeTarget(target, source) {
  if (!target || !source) return target;
  var keys = Object.keys(source);
  for (var i = 0; i < keys.length; i++) {
    target[keys[i]] = source[keys[i]];
  }
  return target;
}

function getGlobalSettingsSnapshot() {
  return global_settings && typeof global_settings === "object" ? global_settings : {};
}

function getDomainDictionaryRecipeSafe() {
  if (typeof window !== "undefined" && window.DSQDomainDictionary) {
    return window.DSQDomainDictionary;
  }
  if (typeof DSQDomainDictionary !== "undefined") {
    return DSQDomainDictionary;
  }
  return null;
}

var LEGACY_RECIPE_TYPE_ID_MAP = {
  research: "research",
  assembler: "assembler",
  smelter: "smelter",
  mining: "mining",
  energyExchanger: "energyExchanger",
  darkFogDrop: "darkFogDrop",
  oilExtractor: "oilExtractor",
  waterPump: "waterPump",
  oilRefinery: "oilRefinery",
  chemical: "chemical",
  collider: "collider",
  orbitalCollectorIce: "orbitalCollectorIce",
  orbitalCollectorGas: "orbitalCollectorGas",
  rayReceiver: "rayReceiver",
  fractionator: "fractionator",
  研究站: "research",
  制作台: "assembler",
  冶炼设备: "smelter",
  采矿机: "mining",
  能量枢纽: "energyExchanger",
  黑雾掉落: "darkFogDrop",
  原油萃取站: "oilExtractor",
  抽水机: "waterPump",
  原油精炼机: "oilRefinery",
  原油精炼厂: "oilRefinery",
  化工设备: "chemical",
  粒子对撞机: "collider",
  微型粒子对撞机: "collider",
  轨道采集器: "orbitalCollectorIce",
  轨道采集器2: "orbitalCollectorGas",
  射线接收塔: "rayReceiver",
  射线接收站: "rayReceiver",
  分馏塔: "fractionator",
};

var LEGACY_RECIPE_TYPE_GLOBAL_SETTING_KEY_MAP = {
  research: "research",
  assembler: "selmodein",
  smelter: "furnace",
  chemical: "chemical",
};

var LEGACY_MACHINE_ID_MAP = {
  matrixLab: "matrixLab",
  selfEvolutionLab: "selfEvolutionLab",
  assemblingMachineMk1: "assemblingMachineMk1",
  assemblingMachineMk2: "assemblingMachineMk2",
  assemblingMachineMk3: "assemblingMachineMk3",
  recomposingAssembler: "recomposingAssembler",
  arcSmelter: "arcSmelter",
  planeSmelter: "planeSmelter",
  negentropySmelter: "negentropySmelter",
  vein: "vein",
  miningMachine: "miningMachine",
  advancedMiningMachine: "advancedMiningMachine",
  oilExtractor: "oilExtractor",
  waterPump: "waterPump",
  oilRefinery: "oilRefinery",
  chemicalPlant: "chemicalPlant",
  quantumChemicalPlant: "quantumChemicalPlant",
  particleCollider: "particleCollider",
  orbitalCollectorIce: "orbitalCollectorIce",
  orbitalCollectorGas: "orbitalCollectorGas",
  rayReceiver: "rayReceiver",
  fractionator: "fractionator",
  energyExchanger: "energyExchanger",
  darkFogDrop: "darkFogDrop",
  矩阵研究站: "matrixLab",
  自演化研究站: "selfEvolutionLab",
  "制作台Mk.Ⅰ": "assemblingMachineMk1",
  "制作台Mk.Ⅱ": "assemblingMachineMk2",
  "制作台Mk.Ⅲ": "assemblingMachineMk3",
  重组式制造台: "recomposingAssembler",
  电弧熔炉: "arcSmelter",
  位面熔炉: "planeSmelter",
  负熵熔炉: "negentropySmelter",
  矿脉: "vein",
  采矿机: "miningMachine",
  大型采矿机: "advancedMiningMachine",
  原油萃取站: "oilExtractor",
  抽水机: "waterPump",
  原油精炼机: "oilRefinery",
  原油精炼厂: "oilRefinery",
  化工厂: "chemicalPlant",
  量子化工厂: "quantumChemicalPlant",
  粒子对撞机: "particleCollider",
  微型粒子对撞机: "particleCollider",
  "轨道采集器(巨冰)": "orbitalCollectorIce",
  "轨道采集器(气态)": "orbitalCollectorGas",
  射线接收塔: "rayReceiver",
  射线接收站: "rayReceiver",
  分馏塔: "fractionator",
  能量枢纽: "energyExchanger",
  黑雾掉落: "darkFogDrop",
};

var LEGACY_MACHINE_DISPLAY_NAME_MAP = {
  matrixLab: "矩阵研究站",
  selfEvolutionLab: "自演化研究站",
  assemblingMachineMk1: "制作台Mk.Ⅰ",
  assemblingMachineMk2: "制作台Mk.Ⅱ",
  assemblingMachineMk3: "制作台Mk.Ⅲ",
  recomposingAssembler: "重组式制造台",
  arcSmelter: "电弧熔炉",
  planeSmelter: "位面熔炉",
  negentropySmelter: "负熵熔炉",
  vein: "矿脉",
  miningMachine: "采矿机",
  advancedMiningMachine: "大型采矿机",
  oilExtractor: "原油萃取站",
  waterPump: "抽水机",
  oilRefinery: "原油精炼厂",
  chemicalPlant: "化工厂",
  quantumChemicalPlant: "量子化工厂",
  particleCollider: "微型粒子对撞机",
  orbitalCollectorIce: "轨道采集器(巨冰)",
  orbitalCollectorGas: "轨道采集器(气态)",
  rayReceiver: "射线接收站",
  fractionator: "分馏塔",
  energyExchanger: "能量枢纽",
  darkFogDrop: "黑雾掉落",
};

function normalizeItemLookupName(name) {
  var dictionary = getDomainDictionaryRecipeSafe();
  if (!dictionary || typeof dictionary.getItem !== "function") {
    return name;
  }
  var item = dictionary.getItem(name);
  return item ? item.displayNameZh : name;
}

function resolveRecipeTypeIdFromItem(item) {
  if (!item) return null;
  var dictionary = getDomainDictionaryRecipeSafe();
  var recipeType = item.machineTypeId || item.mName || item.m || null;
  if (dictionary && typeof dictionary.getRecipeTypeId === "function") {
    recipeType = dictionary.getRecipeTypeId(recipeType) || recipeType;
  }
  if (typeof recipeType !== "string") {
    return recipeType;
  }
  return LEGACY_RECIPE_TYPE_ID_MAP[recipeType] || recipeType;
}

function normalizeMachineSelection(value) {
  if (value == null) return null;
  var dictionary = getDomainDictionaryRecipeSafe();
  var normalizedValue = value;
  if (dictionary && typeof dictionary.getMachineId === "function") {
    normalizedValue = dictionary.getMachineId(value) || value;
  }
  if (typeof normalizedValue !== "string") {
    return normalizedValue;
  }
  return LEGACY_MACHINE_ID_MAP[normalizedValue] || normalizedValue;
}

function resolveMachineDisplayName(value) {
  if (value == null) return null;
  var dictionary = getDomainDictionaryRecipeSafe();
  if (dictionary && typeof dictionary.getDisplayName === "function") {
    var displayName = dictionary.getDisplayName(value);
    if (displayName) {
      return displayName;
    }
  }
  if (typeof value === "string" && LEGACY_MACHINE_DISPLAY_NAME_MAP[value]) {
    return LEGACY_MACHINE_DISPLAY_NAME_MAP[value];
  }
  var normalizedValue = normalizeMachineSelection(value);
  if (typeof normalizedValue === "string" && LEGACY_MACHINE_DISPLAY_NAME_MAP[normalizedValue]) {
    return LEGACY_MACHINE_DISPLAY_NAME_MAP[normalizedValue];
  }
  return value;
}

function resolveMachineOptionId(option) {
  if (!option || typeof option !== "object") return null;
  if (option.id != null) {
    return normalizeMachineSelection(option.id);
  }
  if (option.name != null) {
    return normalizeMachineSelection(option.name);
  }
  return null;
}

function resolveMachineOptionName(option) {
  if (!option || typeof option !== "object") {
    return resolveMachineDisplayName(option);
  }
  if (typeof option.name === "string" && option.name) {
    return option.name;
  }
  return resolveMachineDisplayName(resolveMachineOptionId(option));
}

function findMachineOptionById(item, machineId) {
  if (!item || !Array.isArray(item.m)) return null;
  for (var i = 0; i < item.m.length; i++) {
    var option = item.m[i];
    if (resolveMachineOptionId(option) == machineId) {
      return option;
    }
  }
  return null;
}

function getGlobalMachineDefault(item) {
  if (!item) return null;
  var recipeTypeId = resolveRecipeTypeIdFromItem(item);
  if (!recipeTypeId) return null;
  var defaults = getGlobalSettingsSnapshot();
  var dictionary = getDomainDictionaryRecipeSafe();
  var settingKey =
    dictionary && typeof dictionary.getRecipeTypeGlobalSettingKey === "function"
      ? dictionary.getRecipeTypeGlobalSettingKey(recipeTypeId)
      : null;
  settingKey = settingKey || LEGACY_RECIPE_TYPE_GLOBAL_SETTING_KEY_MAP[recipeTypeId] || null;
  if (!settingKey) return null;
  return normalizeMachineSelection(defaults[settingKey] || null);
}

function getGlobalAccTypeDefault() {
  var defaults = getGlobalSettingsSnapshot();
  return defaults.accType || defaultAccType || null;
}

function getGlobalAccValueDefault() {
  var defaults = getGlobalSettingsSnapshot();
  return defaults.accValue || defaultAccValue || null;
}

function getMachine(arg) {
  var item = typeof arg == "string" ? find(arg) : arg;
  if (!item) return null;
  var machine = normalizeMachineSelection((settings[item.id] || {}).m || null);
  if (machine != null) return machine;

  machine = getGlobalMachineDefault(item);
  if (machine != null) return machine;

  if (!Array.isArray(item.m) || item.m.length === 0) return null;
  return resolveMachineOptionId(item.m[0]);
}
// 获取配方默认的增产剂等级

function getAccType(arg) {
  var item = typeof arg == "string" ? find(arg) : arg;
  if (!item) return null;
  var accType = (settings[item.id] || {}).accType || null;
  if (accType != null) return accType;

  accType = getGlobalAccTypeDefault();
  if (accType != null) return accType;

  return null;
}
// 获取配方默认的增产剂效果

function getAccValue(arg) {
  var item = typeof arg == "string" ? find(arg) : arg;
  if (!item) return null;
  var accValue = (settings[item.id] || {}).accValue || null;
  if (accValue != null) return accValue;

  accValue = getGlobalAccValueDefault();
  if (accValue != null) return accValue;

  return null;
}
//获取时间  参数

function getValue(arg) {
  var item = typeof arg == "string" ? find(arg) : arg;
  if (!item) return null;
  var machineId = normalizeMachineSelection(getMachine(item));
  var accType = getAccType(item),
    accValue = getAccValue(item);
  var machineName = resolveMachineDisplayName(machineId);
  var speed = settings_time[machineId];
  if (!speed && machineName != null) {
    speed = settings_time[machineName];
  }

  if (speed) {
    return {
      name: machineName,
      machineName: machineName,
      machineId: machineId,
      t: item.t,
      speed: speed,
      time: item.t / speed,
      isChange: true,
      accType: accType,
      accValue: accValue,
    };
  }
  var m = findMachineOptionById(item, machineId);
  if (m) {
    var resolvedMachineId = resolveMachineOptionId(m) || machineId;
    var resolvedMachineName = resolveMachineOptionName(m);
    return {
      name: resolvedMachineName,
      machineName: resolvedMachineName,
      machineId: resolvedMachineId,
      t: item.t,
      speed: m.speed,
      time: item.t / m.speed,
      accType: accType,
      accValue: accValue,
    };
  }
  if (!Array.isArray(item.m) || item.m.length === 0) return null;
  m = item.m[0];
  var fallbackMachineId = resolveMachineOptionId(m) || machineId;
  var fallbackMachineName = resolveMachineOptionName(m);
  return {
    name: fallbackMachineName,
    machineName: fallbackMachineName,
    machineId: fallbackMachineId,
    t: item.t,
    speed: m.speed,
    time: item.t / m.speed,
    accType: accType,
    accValue: accValue,
  };
}

function getPfs(name) {
  var pfs = [];
  var lookupName = normalizeItemLookupName(name);
  var indices = recipeIndexByProduct[lookupName] || [];
  for (var i = 0; i < indices.length; i++) {
    var pf = deepCloneRecipeValue(data[indices[i]]);
    pfs.push(pf);
  }
  return pfs;
}
// 根据原料名查找配方 - 使用索引查找 O(n) → O(k)

function getPfsByQ(name) {
  var pfs = [];
  var lookupName = normalizeItemLookupName(name);
  var indices = recipeIndexByMaterial[lookupName] || [];
  for (var i = 0; i < indices.length; i++) {
    var pf = deepCloneRecipeValue(data[indices[i]]);
    pfs.push(pf);
  }
  return pfs;
}

function getAccSpeed(type, value) {
  if (window.DSQCalcCore && typeof window.DSQCalcCore.getAccSpeed === "function") {
    return window.DSQCalcCore.getAccSpeed(type, value);
  }
  return 1;
}

function find(name, normalize_recipe) {
  var lookupName = normalizeItemLookupName(name);
  function get(item) {
    var o = deepCloneRecipeValue(item);
    if (normalize_recipe) {
      // set undefined values to 1
      for (var i = 0; i < o.s.length; i++) {
        o.s[i].n = o.s[i].n || 1;
      }
      for (var i = 0; i < o.q.length; i++) {
        o.q[i].n = o.q[i].n || 1;
      }

      // try to cancel out same components
      for (var i = 0; i < o.s.length; i++) {
        var s_name = o.s[i].name;
        for (var j = 0; j < o.q.length; j++) {
          if (s_name == o.q[j].name) {
            // cancel out
            var to_cancel = Math.min(o.s[i].n, o.q[j].n);
            o.s[i].n -= to_cancel;
            o.q[j].n -= to_cancel;
          }
        }
      }

      // remove those canceled to be zero
      var o_s = o.s;
      o.s = [];
      for (var i = 0; i < o_s.length; i++) {
        if (o_s[i].n === 0) continue;
        o.s.push(o_s[i]);
      }
      var o_q = o.q;
      o.q = [];
      for (var i = 0; i < o_q.length; i++) {
        if (o_q[i].n === 0) continue;
        o.q.push(o_q[i]);
      }
    }

    for (var j = 0; j < o.s.length; j++) {
      if (o.s[j].name == lookupName) {
        assignRecipeTarget(o, o.s[j]);
        return o;
      }
    }

    cocoMessage.warning(i18nRecipeText("message.heavy_hydrogen_recipe_invalid", "重氢分馏塔无法用于生产氢气。"), 3000);
    throw new Error(i18nRecipeText("error.recipe_invalid_negative_output", "配方错误！可能是因为该配方净输出为负。"));
  }

  var pf = settings_pf[lookupName];
  if (pf) {
    return get(data[parseInt(pf)]);
  }

  // 使用索引查找，替代遍历 O(n) → O(1)
  var indices = recipeIndexByProduct[lookupName];
  if (indices && indices.length > 0) {
    return get(data[indices[0]]); // 返回第一个匹配的配方
  }
}
