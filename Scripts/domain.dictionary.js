(function (root) {
  function freezeList(list) {
    return Object.freeze(
      list.map(function (entry) {
        return Object.freeze(entry);
      })
    );
  }

  function normalizeKey(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  const ITEM_PAIRS = [
    ["矩阵研究站", "lab"],
    ["配送运输机", "配送运输机"],
    ["水", "water"],
    ["铁矿", "ironOre"],
    ["铜矿", "copperOre"],
    ["硅石", "siliconOre"],
    ["钛石", "titaniumOre"],
    ["煤矿", "coal"],
    ["铁块", "ironIngot"],
    ["钛块", "titaniumIngot"],
    ["高级石墨", "energeticGraphite"],
    ["金刚石", "diamond"],
    ["增产剂Mk.Ⅰ", "proliferatorMk1"],
    ["增产剂Mk.Ⅱ", "proliferatorMk2"],
    ["增产剂Mk.Ⅲ", "proliferatorMk3"],
    ["齿轮", "gear"],
    ["石矿", "stone"],
    ["原油", "oil"],
    ["精炼油", "refinedOil"],
    ["硫酸", "sulfuricAcid"],
    ["氢", "hydrogen"],
    ["可燃冰", "fireIce"],
    ["木材", "wood"],
    ["植物燃料", "plant_fuel"],
    ["金伯利矿石", "kimberliteOre"],
    ["分形硅石", "fractalSilicon"],
    ["光栅石", "opticalGratingCrystal"],
    ["刺笋结晶", "spiniformStalagmiteCrystal"],
    ["单极磁石", "unipolarMagnet"],
    ["铜块", "copperIngot"],
    ["高纯硅块", "highPuritySilicon"],
    ["石材", "stoneBrick"],
    ["钢材", "steel"],
    ["钛合金", "titaniumAlloy"],
    ["玻璃", "glass"],
    ["钛化玻璃", "titaniumGlass"],
    ["棱镜", "prism"],
    ["晶格硅", "crystalSilicon"],
    ["磁铁", "magnet"],
    ["磁线圈", "magneticCoil"],
    ["电动机", "electricMotor"],
    ["电磁涡轮", "electromagneticTurbine"],
    ["超级磁场环", "superMagneticRing"],
    ["粒子容器", "particleContainer"],
    ["奇异物质", "strangeMatter"],
    ["电路板", "circuitBoard"],
    ["处理器", "processor"],
    ["量子芯片", "quantumChip"],
    ["微晶元件", "microcrystallineComponent"],
    ["位面过滤器", "planeFilter"],
    ["粒子带宽", "particleBroadband"],
    ["电浆激发器", "plasmaExciter"],
    ["光子合并器", "photonCombiner"],
    ["太阳帆", "solarSail"],
    ["重氢", "deuterium"],
    ["反物质", "antimatter"],
    ["临界光子", "criticalPhoton"],
    ["液氢燃料棒", "hydrogenFuelRod"],
    ["氘核燃料棒", "deuteriumFuelRod"],
    ["反物质燃烧棒", "antimatterFuelRod"],
    ["塑料", "plastic"],
    ["石墨烯", "graphene"],
    ["碳纳米管", "carbonNanotube"],
    ["有机晶体", "organicCrystal"],
    ["钛晶石", "titaniumCrystal"],
    ["卡西米尔晶片", "casimirCrystal"],
    ["引力透镜", "gravitonLens"],
    ["空间翘曲器", "spaceWarper"],
    ["湮灭约束球", "annihilationConstraintSphere"],
    ["推进器", "thruster"],
    ["加力推进器", "reinforcedThruster"],
    ["物流运输机", "logisticDrone"],
    ["星际物流运输机", "logisticVessel"],
    ["框架材料", "frameMaterial"],
    ["戴森球组件", "dysonSphereComponent"],
    ["小型运载火箭", "smallCarrierRocket"],
    ["地基", "foundation"],
    ["传送带", "conveyorBeltMk1"],
    ["高速传送带", "conveyorBeltMk2"],
    ["极速传送带", "conveyorBeltMk3"],
    ["分拣器", "sorterMk1"],
    ["高速分拣器", "sorterMk2"],
    ["极速分拣器", "sorterMk3"],
    ["集装分拣器", "sorterMk4"],
    ["四向分流器", "splitter"],
    ["自动集装机", "autoPiler"],
    ["流速监测器", "trafficMonitor"],
    ["喷涂机", "sprayCoater"],
    ["小型储物仓", "storageMk1"],
    ["大型储物仓", "storageMk2"],
    ["储液灌", "storageTank"],
    ["制作台Mk.Ⅰ", "assemblingMachineMk1"],
    ["制作台Mk.Ⅱ", "assemblingMachineMk2"],
    ["制作台Mk.Ⅲ", "assemblingMachineMk3"],
    ["电力感应塔", "teslaTower"],
    ["无线输电塔", "wirelessPowerTower"],
    ["卫星配电站", "satelliteSubstation"],
    ["风力涡轮机", "windTurbine"],
    ["火力发电机", "thermalPowerPlant"],
    ["微型聚变发电站", "miniFusionPowerPlant"],
    ["地热发电站", "geothermalPowerStation"],
    ["采矿机", "miningMachine"],
    ["大型采矿机", "advancedMiningMachine"],
    ["抽水机", "waterPump"],
    ["电弧熔炉", "arcSmelter"],
    ["位面熔炉", "planeSmelter"],
    ["原油萃取站", "oilExtractor"],
    ["原油精炼厂", "oilRefinery"],
    ["化工厂", "chemicalPlant"],
    ["分馏塔", "fractionator"],
    ["量子化工厂", "量子化工厂"],
    ["太阳能板", "太阳能板"],
    ["蓄电池", "蓄电池"],
    ["蓄电池满", "蓄电池满"],
    ["电磁轨道弹射器", "电磁轨道弹射器"],
    ["射线接收站", "射线接收站"],
    ["垂直发射井", "垂直发射井"],
    ["能量枢纽", "energyExchanger"],
    ["微型粒子对撞机", "微型粒子对撞机"],
    ["人造恒星", "人造恒星"],
    ["物流配送器", "物流配送器"],
    ["行星内物流运输站", "行星内物流运输站"],
    ["星际物流运输站", "星际物流运输站"],
    ["轨道采集器", "轨道采集器"],
    ["蓝矩阵", "蓝矩阵"],
    ["红矩阵", "红矩阵"],
    ["黄矩阵", "黄矩阵"],
    ["紫矩阵", "紫矩阵"],
    ["绿矩阵", "绿矩阵"],
    ["宇宙矩阵", "宇宙矩阵"],
    ["燃烧单元", "燃烧单元"],
    ["爆破单元", "爆破单元"],
    ["晶石爆破单元", "晶石爆破单元"],
    ["机枪弹箱", "机枪弹箱"],
    ["钛化弹箱", "钛化弹箱"],
    ["超合金弹箱", "超合金弹箱"],
    ["导弹组", "导弹组"],
    ["超音速导弹组", "超音速导弹组"],
    ["引力导弹组", "引力导弹组"],
    ["炮弹组", "炮弹组"],
    ["高爆炮弹组", "高爆炮弹组"],
    ["晶石炮弹组", "晶石炮弹组"],
    ["原型机", "原型机"],
    ["精准无人机", "精准无人机"],
    ["攻击无人机", "攻击无人机"],
    ["护卫舰", "护卫舰"],
    ["驱逐舰", "驱逐舰"],
    ["等离子胶囊", "等离子胶囊"],
    ["反物质胶囊", "反物质胶囊"],
    ["重组式制造台", "重组式制造台"],
    ["自演化研究站", "自演化研究站"],
    ["负熵熔炉", "负熵熔炉"],
    ["高斯机枪塔", "高斯机枪塔"],
    ["导弹防御塔", "导弹防御塔"],
    ["聚爆加农炮", "聚爆加农炮"],
    ["高频激光塔", "高频激光塔"],
    ["磁化电浆炮", "磁化电浆炮"],
    ["战场分析基站", "战场分析基站"],
    ["信号塔", "信号塔"],
    ["行星护盾发生器", "行星护盾发生器"],
    ["动力引擎", "动力引擎"],
    ["奇异湮灭燃料棒", "奇异湮灭燃料棒"],
    ["负熵奇点", "负熵奇点"],
    ["能量碎片", "能量碎片"],
    ["硅基神经元", "硅基神经元"],
    ["核心素", "核心素"],
    ["黑雾矩阵", "黑雾矩阵"],
    ["物质重组器", "物质重组器"],
    ["矿脉", "矿脉"],
    ["干扰胶囊", "干扰胶囊"],
    ["压制胶囊", "压制胶囊"],
    ["近程电浆炮", "近程电浆炮"],
    ["干扰塔", "干扰塔"],
    ["全息信标", "全息信标"],
    ["None", "None"],
  ];

  const MACHINE_DEFINITIONS = freezeList([
    {
      id: "matrixLab",
      displayNameZh: "矩阵研究站",
      aliasesZh: ["研究站"],
      i18nKey: "option.research.matrix",
      iconName: "矩阵研究站",
      blueprintEntityName: "lab",
      recipeTypeId: "research",
    },
    {
      id: "selfEvolutionLab",
      displayNameZh: "自演化研究站",
      aliasesZh: [],
      i18nKey: "option.research.self_evolution",
      iconName: "自演化研究站",
      blueprintEntityName: "自演化研究站",
      recipeTypeId: "research",
    },
    {
      id: "assemblingMachineMk1",
      displayNameZh: "制作台Mk.Ⅰ",
      aliasesZh: [],
      i18nKey: "option.machine.mk1",
      iconName: "制作台Mk.Ⅰ",
      blueprintEntityName: "assemblingMachineMk1",
      recipeTypeId: "assembler",
    },
    {
      id: "assemblingMachineMk2",
      displayNameZh: "制作台Mk.Ⅱ",
      aliasesZh: [],
      i18nKey: "option.machine.mk2",
      iconName: "制作台Mk.Ⅱ",
      blueprintEntityName: "assemblingMachineMk2",
      recipeTypeId: "assembler",
    },
    {
      id: "assemblingMachineMk3",
      displayNameZh: "制作台Mk.Ⅲ",
      aliasesZh: [],
      i18nKey: "option.machine.mk3",
      iconName: "制作台Mk.Ⅲ",
      blueprintEntityName: "assemblingMachineMk3",
      recipeTypeId: "assembler",
    },
    {
      id: "recomposingAssembler",
      displayNameZh: "重组式制造台",
      aliasesZh: [],
      i18nKey: "option.machine.recomposing",
      iconName: "重组式制造台",
      blueprintEntityName: "重组式制造台",
      recipeTypeId: "assembler",
    },
    {
      id: "arcSmelter",
      displayNameZh: "电弧熔炉",
      aliasesZh: [],
      i18nKey: "option.furnace.arc",
      iconName: "电弧熔炉",
      blueprintEntityName: "arcSmelter",
      recipeTypeId: "smelter",
    },
    {
      id: "planeSmelter",
      displayNameZh: "位面熔炉",
      aliasesZh: [],
      i18nKey: "option.furnace.plane",
      iconName: "位面熔炉",
      blueprintEntityName: "planeSmelter",
      recipeTypeId: "smelter",
    },
    {
      id: "negentropySmelter",
      displayNameZh: "负熵熔炉",
      aliasesZh: [],
      i18nKey: "option.furnace.negentropy",
      iconName: "负熵熔炉",
      blueprintEntityName: "负熵熔炉",
      recipeTypeId: "smelter",
    },
    {
      id: "vein",
      displayNameZh: "矿脉",
      aliasesZh: [],
      i18nKey: "machine_name.ore_vein",
      iconName: "矿脉",
      blueprintEntityName: "矿脉",
      recipeTypeId: "mining",
    },
    {
      id: "miningMachine",
      displayNameZh: "采矿机",
      aliasesZh: [],
      i18nKey: "machine_name.miner",
      iconName: "采矿机",
      blueprintEntityName: "miningMachine",
      recipeTypeId: "mining",
    },
    {
      id: "advancedMiningMachine",
      displayNameZh: "大型采矿机",
      aliasesZh: [],
      i18nKey: "machine_name.advanced_miner",
      iconName: "大型采矿机",
      blueprintEntityName: "advancedMiningMachine",
      recipeTypeId: "mining",
    },
    {
      id: "oilExtractor",
      displayNameZh: "原油萃取站",
      aliasesZh: [],
      i18nKey: "machine_name.oil_extractor",
      iconName: "原油萃取站",
      blueprintEntityName: "oilExtractor",
      recipeTypeId: "oilExtractor",
    },
    {
      id: "waterPump",
      displayNameZh: "抽水机",
      aliasesZh: [],
      i18nKey: "machine_name.water_pump",
      iconName: "抽水机",
      blueprintEntityName: "waterPump",
      recipeTypeId: "waterPump",
    },
    {
      id: "oilRefinery",
      displayNameZh: "原油精炼厂",
      aliasesZh: ["原油精炼机"],
      i18nKey: "machine_name.oil_refinery",
      iconName: "原油精炼厂",
      blueprintEntityName: "oilRefinery",
      recipeTypeId: "oilRefinery",
    },
    {
      id: "chemicalPlant",
      displayNameZh: "化工厂",
      aliasesZh: [],
      i18nKey: "option.chemical.plant",
      iconName: "化工厂",
      blueprintEntityName: "chemicalPlant",
      recipeTypeId: "chemical",
    },
    {
      id: "quantumChemicalPlant",
      displayNameZh: "量子化工厂",
      aliasesZh: [],
      i18nKey: "option.chemical.quantum",
      iconName: "量子化工厂",
      blueprintEntityName: "量子化工厂",
      recipeTypeId: "chemical",
    },
    {
      id: "particleCollider",
      displayNameZh: "微型粒子对撞机",
      aliasesZh: ["粒子对撞机"],
      i18nKey: "machine_name.particle_collider",
      iconName: "微型粒子对撞机",
      blueprintEntityName: "微型粒子对撞机",
      recipeTypeId: "collider",
    },
    {
      id: "orbitalCollectorIce",
      displayNameZh: "轨道采集器(巨冰)",
      aliasesZh: [],
      i18nKey: "machine_name.orbital_collector_ice",
      iconName: "轨道采集器",
      blueprintEntityName: "轨道采集器",
      recipeTypeId: "orbitalCollectorIce",
    },
    {
      id: "orbitalCollectorGas",
      displayNameZh: "轨道采集器(气态)",
      aliasesZh: [],
      i18nKey: "machine_name.orbital_collector_gas",
      iconName: "轨道采集器",
      blueprintEntityName: "轨道采集器",
      recipeTypeId: "orbitalCollectorGas",
    },
    {
      id: "rayReceiver",
      displayNameZh: "射线接收站",
      aliasesZh: ["射线接收塔"],
      i18nKey: "machine_name.ray_receiver",
      iconName: "射线接收站",
      blueprintEntityName: "射线接收站",
      recipeTypeId: "rayReceiver",
    },
    {
      id: "fractionator",
      displayNameZh: "分馏塔",
      aliasesZh: [],
      i18nKey: "machine_name.fractionator",
      iconName: "分馏塔",
      blueprintEntityName: "fractionator",
      recipeTypeId: "fractionator",
    },
    {
      id: "energyExchanger",
      displayNameZh: "能量枢纽",
      aliasesZh: [],
      i18nKey: "machine_name.energy_exchanger",
      iconName: "能量枢纽",
      blueprintEntityName: "energyExchanger",
      recipeTypeId: "energyExchanger",
    },
    {
      id: "darkFogDrop",
      displayNameZh: "黑雾掉落",
      aliasesZh: [],
      i18nKey: "machine_name.dark_fog_drop",
      iconName: "黑雾掉落",
      blueprintEntityName: null,
      recipeTypeId: "darkFogDrop",
    },
  ]);

  const RECIPE_TYPE_DEFINITIONS = freezeList([
    {
      id: "research",
      displayNameZh: "研究站",
      aliasesZh: ["研究站"],
      globalSettingKey: "research",
      defaultMachineId: "matrixLab",
    },
    {
      id: "assembler",
      displayNameZh: "制作台",
      aliasesZh: ["制作台"],
      globalSettingKey: "selmodein",
      defaultMachineId: "assemblingMachineMk1",
    },
    {
      id: "smelter",
      displayNameZh: "冶炼设备",
      aliasesZh: ["冶炼设备"],
      globalSettingKey: "furnace",
      defaultMachineId: "arcSmelter",
    },
    {
      id: "mining",
      displayNameZh: "采矿机",
      aliasesZh: ["采矿机"],
      globalSettingKey: null,
      defaultMachineId: "miningMachine",
    },
    {
      id: "energyExchanger",
      displayNameZh: "能量枢纽",
      aliasesZh: ["能量枢纽"],
      globalSettingKey: null,
      defaultMachineId: "energyExchanger",
    },
    {
      id: "darkFogDrop",
      displayNameZh: "黑雾掉落",
      aliasesZh: ["黑雾掉落"],
      globalSettingKey: null,
      defaultMachineId: "darkFogDrop",
    },
    {
      id: "oilExtractor",
      displayNameZh: "原油萃取站",
      aliasesZh: ["原油萃取站"],
      globalSettingKey: null,
      defaultMachineId: "oilExtractor",
    },
    {
      id: "waterPump",
      displayNameZh: "抽水机",
      aliasesZh: ["抽水机"],
      globalSettingKey: null,
      defaultMachineId: "waterPump",
    },
    {
      id: "oilRefinery",
      displayNameZh: "原油精炼机",
      aliasesZh: ["原油精炼厂"],
      globalSettingKey: null,
      defaultMachineId: "oilRefinery",
    },
    {
      id: "chemical",
      displayNameZh: "化工设备",
      aliasesZh: ["化工设备"],
      globalSettingKey: "chemical",
      defaultMachineId: "chemicalPlant",
    },
    {
      id: "collider",
      displayNameZh: "粒子对撞机",
      aliasesZh: ["微型粒子对撞机"],
      globalSettingKey: null,
      defaultMachineId: "particleCollider",
    },
    {
      id: "orbitalCollectorIce",
      displayNameZh: "轨道采集器",
      aliasesZh: ["轨道采集器"],
      globalSettingKey: null,
      defaultMachineId: "orbitalCollectorIce",
    },
    {
      id: "orbitalCollectorGas",
      displayNameZh: "轨道采集器2",
      aliasesZh: ["轨道采集器2"],
      globalSettingKey: null,
      defaultMachineId: "orbitalCollectorGas",
    },
    {
      id: "rayReceiver",
      displayNameZh: "射线接收塔",
      aliasesZh: ["射线接收站"],
      globalSettingKey: null,
      defaultMachineId: "rayReceiver",
    },
    {
      id: "fractionator",
      displayNameZh: "分馏塔",
      aliasesZh: ["分馏塔"],
      globalSettingKey: null,
      defaultMachineId: "fractionator",
    },
  ]);

  const ACC_VALUE_DEFINITIONS = freezeList([
    { id: "none", displayNameZh: "无", aliasesZh: [] },
    { id: "speedup", displayNameZh: "加速", aliasesZh: [] },
    { id: "extra", displayNameZh: "增产", aliasesZh: [] },
  ]);

  const itemDefinitions = freezeList(
    ITEM_PAIRS.map(function (pair) {
      return {
        id: pair[1],
        displayNameZh: pair[0],
        aliasesZh: [],
        iconName: pair[0],
        blueprintEntityName: pair[1],
      };
    })
  );

  const itemById = Object.create(null);
  const itemAliasMap = Object.create(null);
  const machineById = Object.create(null);
  const machineAliasMap = Object.create(null);
  const recipeTypeById = Object.create(null);
  const recipeTypeAliasMap = Object.create(null);
  const accValueById = Object.create(null);
  const accValueAliasMap = Object.create(null);

  function registerAliases(targetMap, entry, extraAliases) {
    var aliases = [entry.id, entry.displayNameZh]
      .concat(Array.isArray(entry.aliasesZh) ? entry.aliasesZh : [])
      .concat(Array.isArray(extraAliases) ? extraAliases : []);
    for (var i = 0; i < aliases.length; i++) {
      var key = normalizeKey(aliases[i]);
      if (!key) continue;
      targetMap[key] = entry.id;
    }
  }

  itemDefinitions.forEach(function (entry) {
    itemById[entry.id] = entry;
    registerAliases(itemAliasMap, entry, [entry.blueprintEntityName]);
  });

  MACHINE_DEFINITIONS.forEach(function (entry) {
    machineById[entry.id] = entry;
    registerAliases(machineAliasMap, entry, [entry.blueprintEntityName]);
  });

  RECIPE_TYPE_DEFINITIONS.forEach(function (entry) {
    recipeTypeById[entry.id] = entry;
    registerAliases(recipeTypeAliasMap, entry, [entry.defaultMachineId, entry.globalSettingKey]);
  });

  ACC_VALUE_DEFINITIONS.forEach(function (entry) {
    accValueById[entry.id] = entry;
    registerAliases(accValueAliasMap, entry);
  });

  function getEntryByValue(idMap, aliasMap, value) {
    var key = normalizeKey(value);
    if (!key) return null;
    var id = idMap[key] ? key : aliasMap[key];
    if (!id) return null;
    return idMap[id] || null;
  }

  function getItem(value) {
    return getEntryByValue(itemById, itemAliasMap, value);
  }

  function getMachine(value) {
    return getEntryByValue(machineById, machineAliasMap, value);
  }

  function getRecipeType(value) {
    return getEntryByValue(recipeTypeById, recipeTypeAliasMap, value);
  }

  function getAccValue(value) {
    return getEntryByValue(accValueById, accValueAliasMap, value);
  }

  function getDisplayName(value) {
    var machine = getMachine(value);
    if (machine) return machine.displayNameZh;
    var item = getItem(value);
    if (item) return item.displayNameZh;
    var accValue = getAccValue(value);
    if (accValue) return accValue.displayNameZh;
    var recipeType = getRecipeType(value);
    if (recipeType) return recipeType.displayNameZh;
    return normalizeKey(value);
  }

  function getIconName(value) {
    var machine = getMachine(value);
    if (machine) return machine.iconName;
    var item = getItem(value);
    if (item) return item.iconName;
    return getDisplayName(value);
  }

  function getBlueprintEntityName(value) {
    var machine = getMachine(value);
    if (machine) return machine.blueprintEntityName || null;
    var item = getItem(value);
    if (item) return item.blueprintEntityName || null;
    return null;
  }

  function normalizeLegacyValue(kind, value) {
    switch (kind) {
      case "item":
        return getItemId(value);
      case "machine":
        return getMachineId(value);
      case "recipeType":
        return getRecipeTypeId(value);
      case "accValue":
        return getAccValueId(value);
      default:
        return null;
    }
  }

  function getItemId(value) {
    var entry = getItem(value);
    return entry ? entry.id : null;
  }

  function getMachineId(value) {
    var entry = getMachine(value);
    return entry ? entry.id : null;
  }

  function getRecipeTypeId(value) {
    var entry = getRecipeType(value);
    return entry ? entry.id : null;
  }

  function getAccValueId(value) {
    var entry = getAccValue(value);
    return entry ? entry.id : null;
  }

  function getMachineI18nKey(value) {
    var entry = getMachine(value);
    return entry ? entry.i18nKey || null : null;
  }

  function getRecipeTypeGlobalSettingKey(value) {
    var entry = getRecipeType(value);
    return entry ? entry.globalSettingKey || null : null;
  }

  function getDefaultMachineIdForRecipeType(value) {
    var entry = getRecipeType(value);
    return entry ? entry.defaultMachineId || null : null;
  }

  function getMachineOptionsForRecipeType(value) {
    var recipeTypeId = getRecipeTypeId(value);
    if (!recipeTypeId) return [];
    return MACHINE_DEFINITIONS.filter(function (entry) {
      return entry.recipeTypeId === recipeTypeId;
    }).map(function (entry) {
      return entry.id;
    });
  }

  const api = Object.freeze({
    items: itemDefinitions,
    machines: MACHINE_DEFINITIONS,
    recipeTypes: RECIPE_TYPE_DEFINITIONS,
    accValues: ACC_VALUE_DEFINITIONS,
    getItem: getItem,
    getMachine: getMachine,
    getRecipeType: getRecipeType,
    getAccValue: getAccValue,
    getItemId: getItemId,
    getMachineId: getMachineId,
    getRecipeTypeId: getRecipeTypeId,
    getAccValueId: getAccValueId,
    getDisplayName: getDisplayName,
    getIconName: getIconName,
    getBlueprintEntityName: getBlueprintEntityName,
    getMachineI18nKey: getMachineI18nKey,
    getRecipeTypeGlobalSettingKey: getRecipeTypeGlobalSettingKey,
    getDefaultMachineIdForRecipeType: getDefaultMachineIdForRecipeType,
    getMachineOptionsForRecipeType: getMachineOptionsForRecipeType,
    normalizeLegacyValue: normalizeLegacyValue,
  });

  root.DSQDomainDictionary = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
