// Scripts/data.recipe-ui.js
// 从 data.js 拆分的配方展示与需求添加辅助函数。

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
    title.push(
      "<img class='sicon' src='data:image/png;base64," +
        icons[name] +
        "' title='" +
        name +
        "' alt='" +
        name +
        "' loading='lazy' />"
    );
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
    title.push('<img class="to" src="./img/to.png" alt="to" loading="lazy" />');
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
