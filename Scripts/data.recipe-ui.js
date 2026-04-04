// Scripts/data.recipe-ui.js
// 从 data.js 拆分的配方展示与需求添加辅助函数。

function listContains(array, value) {
  return Array.isArray(array) && array.indexOf(value) !== -1;
}

function forEachLegacy(collection, callback) {
  if (!collection || typeof callback !== "function") return;
  for (var i = 0; i < collection.length; i++) {
    callback.call(collection[i], i, collection[i]);
  }
}

function byId(id) {
  return document.getElementById(id);
}

function readInputValue(id) {
  var element = byId(id);
  return element ? element.value : "";
}

function isChecked(id) {
  var element = byId(id);
  return !!(element && element.checked);
}

function getGroup() {
  var groups = [];
  forEachLegacy(data, function (_, item) {
    if (!item.group) return;
    if (!listContains(groups, item.group)) {
      groups.push(item.group);
    }
  });
  return groups;
}

function f_fillData() {
  var names = [];
  var select = byId("seldata");
  if (!select) return;

  var groups = getGroup();
  forEachLegacy(groups, function (_, group) {
    var optGroup = document.createElement("optgroup");
    optGroup.label = group;

    forEachLegacy(data, function (_, item) {
      if (item.group !== group) return;
      for (var j = 0; j < item.s.length; j++) {
        var productName = item.s[j].name;
        if (listContains(names, productName)) continue;
        names.push(productName);

        var option = document.createElement("option");
        option.value = productName;
        option.textContent = productName;
        optGroup.appendChild(option);
      }
    });

    select.appendChild(optGroup);
  });
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
  var speed1_5 = parseFloat(readInputValue("speed1_5"));
  var calcCore = window.DSQCalcCore;

  function calculateBaseNumber(t, itemArray, itemIndex, infoNode, beltSpeed, stackLayer) {
    return (beltSpeed / ((60 / (t || 1)) * infoNode.speed * (itemArray[itemIndex].n || 1))) * stackLayer;
  }

  for (var j = 0; j < item.q.length; j++) {
    title.push(getIconShow(item.q[j].name, item.q[j].n || 1));

    if (info && isChecked("showMaxOneBelt")) {
      var csd = readInputValue("csd");
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
      title.push("<sub class='maxOneBeltIn'>" + number.toFixed(1));
      title.push("</sub>");
    }
  }

  if (item.q.length) {
    title.push('<img class="to" src="./img/to.png" alt="to" loading="lazy" />');
  }
  for (var k = 0; k < item.s.length; k++) {
    title.push(getIconShow(item.s[k].name, item.s[k].n || 1));

    if (info && isChecked("showMaxOneBelt")) {
      var beltType = readInputValue("csd");
      var beltSpeed = calcCore ? calcCore.getBeltSpeed(beltType) : 1800;
      if (!calcCore && beltType == "传送带") {
        beltSpeed = 360;
      } else if (!calcCore && beltType == "高速传送带") {
        beltSpeed = 720;
      }
      var outputNumber = calcCore
        ? calcCore.calculateMaxMachinesPerBelt({
            recipeTime: item.t,
            machineSpeed: info.speed,
            itemCount: item.s[k].n || 1,
            beltSpeed: beltSpeed,
            stackLayer: speed1_5,
            accType: info.accType,
            accValue: info.accValue,
            direction: "output",
          })
        : calculateBaseNumber(item.t, item.s, k, info, beltSpeed, speed1_5) / getAccSpeed(info.accType, info.accValue);
      title.push("<sub class='maxOneBeltOut'>" + outputNumber.toFixed(1));
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
  var number = parseInt(readInputValue("txtnumber"));
  var v = readInputValue("selmaince");
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

  if (typeof scheduleUpdateAll === "function") {
    scheduleUpdateAll("add-requirement");
    return;
  }
  update_all();
}
