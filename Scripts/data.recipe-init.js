// Scripts/data.recipe-init.js
// 从 data.js 拆分的配方初始化与默认配置能力（索引、能耗、占地、默认增产剂）。

var manualGzSpeed = false; //是否采用手动输入的临界光子每分钟产量

var energyData = {};
energyData["研究站"] = 0.48;
energyData["制作台Mk.Ⅰ"] = 0.27;
energyData["制作台Mk.Ⅱ"] = 0.54;
energyData["制作台Mk.Ⅲ"] = 1.08;
energyData["重组式制造台"] = 2.7;
energyData["电弧熔炉"] = 0.36;
energyData["位面熔炉"] = 1.44;
energyData["负熵熔炉"] = 2.88;
energyData["矿脉"] = 0.42 / 6;
energyData["采矿机"] = 0.42;
energyData["大型采矿机"] = 2.94;
energyData["原油萃取站"] = 0.84;
energyData["抽水机"] = 0.3;
energyData["原油精炼机"] = 0.96;
energyData["化工厂"] = 0.72;
energyData["量子化工厂"] = 2.16;
energyData["粒子对撞机"] = 12;
energyData["轨道采集器"] = 0;
energyData["射线接收塔"] = 0;
energyData["能量枢纽"] = 0;
energyData["分馏塔"] = 0.72;

var spaceData = {}; //占用格子
spaceData["研究站"] = 36 / 15; // 可叠加
spaceData["制作台Mk.Ⅰ"] = spaceData["制作台Mk.Ⅱ"] = spaceData["制作台Mk.Ⅲ"] = spaceData["重组式制造台"] = 16;
spaceData["电弧熔炉"] = spaceData["位面熔炉"] = spaceData["负熵熔炉"] = 16;
spaceData["原油精炼机"] = 28;
spaceData["化工厂"] = 35;
spaceData["量子化工厂"] = 35;
spaceData["射线接收塔"] = 24;
spaceData["能量枢纽"] = 64;
spaceData["分馏塔"] = 16;
spaceData["粒子对撞机"] = 45;

var defaultAccType = "增产剂Mk.Ⅰ";
var defaultAccValue = "无";

// 配方查找索引 - 优化查找性能从 O(n) 到 O(1)
var recipeIndexByProduct = {}; // 产物名 → [配方索引数组]
var recipeIndexByMaterial = {}; // 原料名 → [配方索引数组]

function f_initData() {
  // 清空索引，准备重建
  recipeIndexByProduct = {};
  recipeIndexByMaterial = {};

  $(data).each(function (i, item) {
    item.id = i; //配方的id，用index设置，data改变时应该重置配方

    // 构建产物索引
    for (var j = 0; j < item.s.length; j++) {
      var productName = item.s[j].name;
      if (!recipeIndexByProduct[productName]) {
        recipeIndexByProduct[productName] = [];
      }
      recipeIndexByProduct[productName].push(i);
    }

    // 构建原料索引
    if (item.q) {
      for (var j = 0; j < item.q.length; j++) {
        var materialName = item.q[j].name;
        if (!recipeIndexByMaterial[materialName]) {
          recipeIndexByMaterial[materialName] = [];
        }
        recipeIndexByMaterial[materialName].push(i);
      }
    }

    var ms = [];
    if (item.m == "研究站") {
      ms = [
        { name: "矩阵研究站", speed: 1 },
        { name: "自演化研究站", speed: 3 },
      ];
    }
    if (item.m == "制作台") {
      ms = [
        { name: "制作台Mk.Ⅰ", speed: 0.75 },
        { name: "制作台Mk.Ⅱ", speed: 1 },
        { name: "制作台Mk.Ⅲ", speed: 1.5 },
        { name: "重组式制造台", speed: 3 },
      ];
    }

    if (item.m == "冶炼设备") {
      ms = [
        { name: "电弧熔炉", speed: 1 },
        { name: "位面熔炉", speed: 2 },
        { name: "负熵熔炉", speed: 3 },
      ];
    }
    if (item.m == "采矿机") {
      ms = [
        { name: "采矿机", speed: 0.5 * 6 },
        { name: "大型采矿机", speed: 1 * 20 },
        { name: "矿脉", speed: 0.5 * 1 },
      ];
    }
    if (item.m == "能量枢纽") {
      ms = [{ name: "能量枢纽", speed: 1 }];
    }

    if (item.m == "黑雾掉落") {
      ms = [{ name: "黑雾掉落", speed: 1 }];
    }

    if (item.m == "原油萃取站") {
      ms = [{ name: "原油萃取站", speed: 4 }];
    }
    if (item.m == "抽水机") {
      ms = [{ name: "抽水机", speed: 50 / 60 }];
    }

    if (item.m == "原油精炼机") {
      ms = [{ name: "原油精炼机", speed: 1 }];
    }
    if (item.m == "化工设备") {
      ms = [
        { name: "化工厂", speed: 1 },
        { name: "量子化工厂", speed: 2 },
      ];
    }
    if (item.m == "粒子对撞机") {
      ms = [{ name: "粒子对撞机", speed: 1 }];
    }
    if (item.m == "轨道采集器") {
      ms = [{ name: "轨道采集器(巨冰)", speed: 1 }];
    }
    if (item.m == "轨道采集器2") {
      ms = [{ name: "轨道采集器(气态)", speed: 1 }];
    }

    if (item.m == "射线接收塔") {
      ms = [{ name: "射线接收塔", speed: 1 }];
    }

    if (item.m == "分馏塔") {
      ms = [{ name: "分馏塔", speed: 30 }];
    }

    item.mName = item.m;
    item.m = ms;
  });
  // console.log(data);
}
