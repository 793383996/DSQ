// Scripts/data.recipe.js
// 从 data.js 拆分的配方核心查询与参数解析函数。

function getMachine(arg) {
  var item = typeof arg == "string" ? find(arg) : arg;
  if (!item) return null;
  var machine = (settings[item.id] || {}).m || null;
  if (machine != null) return machine;

  machine = (settingsLocal[item.id] || {}).m || null;
  if (machine != null) return machine;

  return item.m[0].name;
}
// 获取配方默认的增产剂等级

function getAccType(arg) {
  var item = typeof arg == "string" ? find(arg) : arg;
  if (!item) return null;
  var accType = (settings[item.id] || {}).accType || null;
  if (accType != null) return accType;

  accType = (settingsLocal[item.id] || {}).accType || null;
  if (accType != null) return accType;

  return null;
}
// 获取配方默认的增产剂效果

function getAccValue(arg) {
  var item = typeof arg == "string" ? find(arg) : arg;
  if (!item) return null;
  var accValue = (settings[item.id] || {}).accValue || null;
  if (accValue != null) return accValue;

  accValue = (settingsLocal[item.id] || {}).accValue || null;
  if (accValue != null) return accValue;

  return null;
}
//获取时间  参数

function getValue(arg) {
  var item = typeof arg == "string" ? find(arg) : arg;
  if (!item) return null;
  var machine = getMachine(item);
  var accType = getAccType(item),
    accValue = getAccValue(item);
  var speed = settings_time[machine];

  if (speed) {
    return {
      name: machine,
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
    if (m.name == machine) {
      return {
        name: m.name,
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
    t: item.t,
    speed: m.speed,
    time: item.t / m.speed,
    accType: accType,
    accValue: accValue,
  };
}

function getPfs(name) {
  var pfs = [];
  var indices = recipeIndexByProduct[name] || [];
  for (var i = 0; i < indices.length; i++) {
    var pf = $.extend(true, {}, data[indices[i]]);
    pfs.push(pf);
  }
  return pfs;
}
// 根据原料名查找配方 - 使用索引查找 O(n) → O(k)

function getPfsByQ(name) {
  var pfs = [];
  var indices = recipeIndexByMaterial[name] || [];
  for (var i = 0; i < indices.length; i++) {
    var pf = $.extend(true, {}, data[indices[i]]);
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
  function get(item) {
    var o = $.extend(true, {}, item);
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
      if (o.s[j].name == name) {
        $.extend(o, o.s[j]);
        return o;
      }
    }

    cocoMessage.warning("重氢分馏塔无法用于生产氢气。", 3000);
    throw new Error("配方错误！可能是因为该配方净输出为负。");
  }

  var pf = settings_pf[name];
  if (pf) {
    return get(data[parseInt(pf)]);
  }

  // 使用索引查找，替代遍历 O(n) → O(1)
  var indices = recipeIndexByProduct[name];
  if (indices && indices.length > 0) {
    return get(data[indices[0]]); // 返回第一个匹配的配方
  }
}
