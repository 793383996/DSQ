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

function normalizeItemLookupName(name) {
  var dictionary = getDomainDictionaryRecipeSafe();
  if (!dictionary || typeof dictionary.getItem !== "function") {
    return name;
  }
  var item = dictionary.getItem(name);
  return item ? item.displayNameZh : name;
}

function getGlobalMachineDefault(item) {
  if (!item || !item.machineTypeId) return null;
  var defaults = getGlobalSettingsSnapshot();
  if (item.machineTypeId == "assembler") {
    return defaults.selmodein || null;
  }
  if (item.machineTypeId == "smelter") {
    return defaults.furnace || null;
  }
  if (item.machineTypeId == "chemical") {
    return defaults.chemical || null;
  }
  if (item.machineTypeId == "research") {
    return defaults.research || null;
  }
  return null;
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
  var machine = (settings[item.id] || {}).m || null;
  if (machine != null) return machine;

  machine = getGlobalMachineDefault(item);
  if (machine != null) return machine;

  return item.m[0].id;
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
  var machineId = getMachine(item);
  var accType = getAccType(item),
    accValue = getAccValue(item);
  var speed = settings_time[machineId];

  if (speed) {
    var dictionary = getDomainDictionaryRecipeSafe();
    var machineName =
      dictionary && typeof dictionary.getDisplayName === "function" ? dictionary.getDisplayName(machineId) : machineId;
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
  for (var i = 0; i < item.m.length; i++) {
    var m = item.m[i];
    if (m.id == machineId) {
      return {
        name: m.name,
        machineName: m.name,
        machineId: m.id,
        t: item.t,
        speed: m.speed,
        time: item.t / m.speed,
        accType: accType,
        accValue: accValue,
      };
    }
  }
  m = item.m[0];
  return {
    name: m.name,
    machineName: m.name,
    machineId: m.id,
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
