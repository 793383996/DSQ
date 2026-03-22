// Scripts/data.recipe.js
// 从 data.js 拆分的配方查询、设备/增产剂参数解析与需求添加辅助函数。

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

function getGroup() {
  var groups = [];
  $(data).each(function (i, item) {
    if (!item.group) return;

    if ($.inArray(item.group, groups) == -1) {
      groups.push(item.group);
    }
  });
  return groups;
}

function f_fillData() {
  var names = [];

  $(getGroup()).each(function (i, group) {
    var jgroup = $("<optgroup label='" + group + "'></optgroup>");
    $(data).each(function (i, item) {
      var name = item.name;
      if (item.group == group) {
        for (var j = 0; j < item.s.length; j++) {
          if ($.inArray(item.s[j].name, names) == -1) {
            names.push(item.s[j].name);
            jgroup.append("<option value='" + item.s[j].name + "'>" + item.s[j].name + "</option>");
          }
        }
      }
    });
    $("#seldata").append(jgroup);
  });
  //for (var i = 110; i < 1000; i = i + 10) {
  //    $("#selore").append("<option value='" + i / 100 + "'>" + i + "%</option>");
  //}
}
//找到这个物品的配方 - 使用索引查找 O(n) → O(k)
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
function getIconImg(name) {
  var title = [];
  if (name == "研究站") name = "矩阵研究站";
  if (name == "电弧熔炉") name = "电弧熔炉";
  if (name == "位面熔炉") name = "位面熔炉";
  if (name == "原油精炼机") name = "原油精炼厂";
  if (name == "粒子对撞机") name = "微型粒子对撞机";
  if (name == "射线接收塔") name = "射线接收站";
  if (name == "轨道采集器(气态)") name = "轨道采集器";
  if (name == "轨道采集器(巨冰)") name = "轨道采集器";

  if (icons[name]) {
    title.push("<img class='sicon' src='data:image/png;base64," + icons[name] + "' title='" + name + "' />");
  } else {
    title.push(name);
  }
  return title.join("");
}
function getIconShow(name, number) {
  var title = [];
  title.push(getIconImg(name));
  title.push("<sub>" + number + "</sub>");

  return title.join("");
}
// 获取加了加速剂后的实际速度
function getAccSpeed(type, value) {
  if (window.DSQCalcCore && typeof window.DSQCalcCore.getAccSpeed === "function") {
    return window.DSQCalcCore.getAccSpeed(type, value);
  }
  return 1;
}
function getPfTitle(item, info) {
  var title = [];
  var speed1_5 = parseFloat($("#speed1_5").val());
  var calcCore = window.DSQCalcCore;
  function calculateBaseNumber(t, item_array, item_index, info, csdsize, speed1_5) {
    return (csdsize / ((60 / (t || 1)) * info.speed * (item_array[item_index].n || 1))) * speed1_5;
  }

  for (var j = 0; j < item.q.length; j++) {
    title.push(getIconShow(item.q[j].name, item.q[j].n || 1));

    if (info && $("#showMaxOneBelt").get(0).checked) {
      var csd = $("#csd").val();
      var csdsize = calcCore ? calcCore.getBeltSpeed(csd) : 1800;
      if (!calcCore && csd == "传送带") {
        csdsize = 360;
      } else if (!calcCore && csd == "高速传送带") {
        csdsize = 720;
      }
      var number = calcCore
        ? calcCore.calculateMaxMachinesPerBelt({
            recipeTime: item.t,
            machineSpeed: info.speed,
            itemCount: item.q[j].n || 1,
            beltSpeed: csdsize,
            stackLayer: speed1_5,
            accType: info.accType,
            accValue: info.accValue,
            direction: "input",
          })
        : info.accValue === "增产"
          ? calculateBaseNumber(item.t, item.q, j, info, csdsize, speed1_5)
          : calculateBaseNumber(item.t, item.q, j, info, csdsize, speed1_5) / getAccSpeed(info.accType, info.accValue);
      // console.log(1+' '+speed1_5);
      // title.push("<sub class='maxOneBeltIn'>" + number.toFixed(pointLength));//输出为小数 跟随主设置
      title.push("<sub class='maxOneBeltIn'>" + number.toFixed(1)); //输出为小数 保留 0.1
      // title.push("<sub class='maxOneBeltIn'>" + Math.floor(number));//输出为整数
      title.push("</sub>");
    }
  }

  if (item.q.length) {
    title.push('<img class="to" src="./img/to.png" />');
  }
  for (var j = 0; j < item.s.length; j++) {
    title.push(getIconShow(item.s[j].name, item.s[j].n || 1));

    if (info && $("#showMaxOneBelt").get(0).checked) {
      var csd = $("#csd").val();
      var csdsize = calcCore ? calcCore.getBeltSpeed(csd) : 1800;
      if (!calcCore && csd == "传送带") {
        csdsize = 360;
      } else if (!calcCore && csd == "高速传送带") {
        csdsize = 720;
      }
      var number = calcCore
        ? calcCore.calculateMaxMachinesPerBelt({
            recipeTime: item.t,
            machineSpeed: info.speed,
            itemCount: item.s[j].n || 1,
            beltSpeed: csdsize,
            stackLayer: speed1_5,
            accType: info.accType,
            accValue: info.accValue,
            direction: "output",
          })
        : calculateBaseNumber(item.t, item.s, j, info, csdsize, speed1_5) / getAccSpeed(info.accType, info.accValue);
      // console.log(2+' '+speed1_5);
      // title.push("<sub class='maxOneBeltOut'>" + number.toFixed(pointLength));//输出为小数 跟随主设置
      title.push("<sub class='maxOneBeltOut'>" + number.toFixed(1)); //输出为小数 保留 0.1
      // title.push("<sub class='maxOneBeltOut'>" + Math.floor(number));//输出为整数
      title.push("</sub>");
    }
  }
  title.push("(" + (item.t || 1).toFixed(1) + "s)");

  return title.join(" ");
}

//找到这个物品的配方(同时赋值s[XX]里的 t 和 n )
// cancel out input and output when [normalize_recipe=true]
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

function f_add3(name) {
  currentItem = find(name);
  var number = parseInt($("#txtnumber").val());
  var v = $("#selmaince").val();
  if (v) {
    // 设备数量支持增产剂计算
    var accType = (settings[currentItem.id] || {}).accType || defaultAccType;
    var accValue = (settings[currentItem.id] || {}).accValue || defaultAccValue;
    if (accValue == "增产" && currentItem.noExtra) accValue = "无";
    if (currentItem.q.length == 0) accValue = "无";

    var info = getValue(currentItem);
    for (var i = 0; i < currentItem.s.length; i++) {
      if (currentItem.s[i].name == name) {
        number = ((parseInt(v) * 60) / (currentItem.t || 1)) * info.speed * (currentItem.s[i].n || 1);
      }
      number *= getAccSpeed(accType, accValue);
    }
  }

  addItem(currentItem, number);
}
function addItem(item, number) {
  xqs.push({
    item: item,
    number: number,
  });

  update_all();
}
// function removeItem(itemId) {
//     xqs = xqs.filter(function (one) { return one.item.id != itemId; });
//     update_all();
// }
