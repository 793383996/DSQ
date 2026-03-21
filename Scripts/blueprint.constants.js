(function (root) {
  //蓝图转JSON https://github.com/cying314/edit-dspblue-print
  const itemMap = {
    sand: { name: "sand", iconId: 1099, remark: "沙土" },
    water: { name: "water", iconId: 1000, remark: "水" },
    ironOre: { name: "ironOre", iconId: 1001, remark: "铁矿" },
    copperOre: { name: "copperOre", iconId: 1002, remark: "铜矿" },
    siliconOre: { name: "siliconOre", iconId: 1003, remark: "硅石" },
    titaniumOre: { name: "titaniumOre", iconId: 1004, remark: "钛石" },
    coal: { name: "coal", iconId: 1006, remark: "煤矿" },
    ironIngot: { name: "ironIngot", iconId: 1101, remark: "铁块" },
    titaniumIngot: { name: "titaniumIngot", iconId: 1106, remark: "钛块" },
    energeticGraphite: { name: "energeticGraphite", iconId: 1109, remark: "高级石墨" },
    diamond: { name: "diamond", iconId: 1112, remark: "金刚石" },
    proliferatorMk1: {
      name: "proliferatorMk1",
      iconId: 1141,
      extra_rate: 0.125,
      accelerate: 0.25,
      remark: "增产剂Mk.Ⅰ",
    },
    proliferatorMk2: { name: "proliferatorMk2", iconId: 1142, extra_rate: 0.2, accelerate: 0.5, remark: "增产剂Mk.Ⅱ" },
    proliferatorMk3: { name: "proliferatorMk3", iconId: 1143, extra_rate: 0.25, accelerate: 1, remark: "增产剂Mk.Ⅲ" },
    gear: { name: "gear", iconId: 1201, remark: "齿轮" },
    stone: { name: "stone", iconId: 1005, remark: "石矿" },
    oil: { name: "oil", iconId: 1007, remark: "原油" },
    refinedOil: { name: "refinedOil", iconId: 1114, remark: "精炼油" },
    sulfuricAcid: { name: "sulfuricAcid", iconId: 1116, remark: "硫酸" },
    hydrogen: { name: "hydrogen", iconId: 1120, remark: "氢" },
    hydrogenOutput: { name: "hydrogenOutput", iconId: 1120, remark: "氢" },
    fireIce: { name: "fireIce", iconId: 1011, remark: "可燃冰" },
    //wood: { name: 'wood', iconId: 1030, remark: '木材' },
    //plant_fuel: { name: 'plant_fuel', iconId: 1031, remark: '植物燃料' },
    kimberliteOre: { name: "kimberliteOre", iconId: 1012, remark: "金伯利矿石" },
    fractalSilicon: { name: "fractalSilicon", iconId: 1013, remark: "分形硅石" },
    opticalGratingCrystal: { name: "opticalGratingCrystal", iconId: 1014, remark: "光栅石" },
    spiniformStalagmiteCrystal: { name: "spiniformStalagmiteCrystal", iconId: 1015, remark: "刺笋结晶" },
    unipolarMagnet: { name: "unipolarMagnet", iconId: 1016, remark: "单极磁石" },
    copperIngot: { name: "copperIngot", iconId: 1104, remark: "铜块" },
    highPuritySilicon: { name: "highPuritySilicon", iconId: 1105, remark: "高纯硅块" },
    stoneBrick: { name: "stoneBrick", iconId: 1108, remark: "石材" },
    steel: { name: "steel", iconId: 1103, remark: "钢材" },
    titaniumAlloy: { name: "titaniumAlloy", iconId: 1107, remark: "钛合金" },
    glass: { name: "glass", iconId: 1110, remark: "玻璃" },
    titaniumGlass: { name: "titaniumGlass", iconId: 1119, remark: "钛化玻璃" },
    prism: { name: "prism", iconId: 1111, remark: "棱镜" },
    crystalSilicon: { name: "crystalSilicon", iconId: 1113, remark: "晶格硅" },
    magnet: { name: "magnet", iconId: 1102, remark: "磁铁" },
    magneticCoil: { name: "magneticCoil", iconId: 1202, remark: "磁线圈" },
    electricMotor: { name: "electricMotor", iconId: 1203, remark: "电动机" },
    electromagneticTurbine: { name: "electromagneticTurbine", iconId: 1204, remark: "电磁涡轮" },
    superMagneticRing: { name: "superMagneticRing", iconId: 1205, remark: "超级磁场环" },
    particleContainer: { name: "particleContainer", iconId: 1206, remark: "粒子容器" },
    strangeMatter: { name: "strangeMatter", iconId: 1127, remark: "奇异物质" },
    circuitBoard: { name: "circuitBoard", iconId: 1301, remark: "电路板" },
    processor: { name: "processor", iconId: 1303, remark: "处理器" },
    quantumChip: { name: "quantumChip", iconId: 1305, remark: "量子芯片" },
    microcrystallineComponent: { name: "microcrystallineComponent", iconId: 1302, remark: "微晶元件" },
    planeFilter: { name: "planeFilter", iconId: 1304, remark: "位面过滤器" },
    particleBroadband: { name: "particleBroadband", iconId: 1402, remark: "粒子带宽" },
    plasmaExciter: { name: "plasmaExciter", iconId: 1401, remark: "电浆激发器" },
    photonCombiner: { name: "photonCombiner", iconId: 1404, remark: "光子合并器" },
    solarSail: { name: "solarSail", iconId: 1501, remark: "太阳帆" },
    deuterium: { name: "deuterium", iconId: 1121, remark: "重氢" },
    antimatter: { name: "antimatter", iconId: 1122, remark: "反物质" },
    criticalPhoton: { name: "criticalPhoton", iconId: 1208, remark: "临界光子" },
    hydrogenFuelRod: { name: "hydrogenFuelRod", iconId: 1801, remark: "液氢燃料棒" },
    deuteriumFuelRod: { name: "deuteriumFuelRod", iconId: 1802, remark: "氘核燃料棒" },
    antimatterFuelRod: { name: "antimatterFuelRod", iconId: 1803, remark: "反物质燃烧棒" },
    plastic: { name: "plastic", iconId: 1115, remark: "塑料" },
    graphene: { name: "graphene", iconId: 1123, remark: "石墨烯" },
    carbonNanotube: { name: "carbonNanotube", iconId: 1124, remark: "碳纳米管" },
    organicCrystal: { name: "organicCrystal", iconId: 1117, remark: "有机晶体" },
    titaniumCrystal: { name: "titaniumCrystal", iconId: 1118, remark: "钛晶石" },
    casimirCrystal: { name: "casimirCrystal", iconId: 1126, remark: "卡西米尔晶片" },
    gravitonLens: { name: "gravitonLens", iconId: 1209, remark: "引力透镜" },
    spaceWarper: { name: "spaceWarper", iconId: 1210, remark: "空间翘曲器" },
    annihilationConstraintSphere: { name: "annihilationConstraintSphere", iconId: 1403, remark: "湮灭约束球" },
    thruster: { name: "thruster", iconId: 1405, remark: "推进器" },
    reinforcedThruster: { name: "reinforcedThruster", iconId: 1406, remark: "加力推进器" },
    logisticDrone: { name: "logisticDrone", iconId: 5001, remark: "物流运输机" },
    logisticVessel: { name: "logisticVessel", iconId: 5002, remark: "星际物流运输机" },
    frameMaterial: { name: "frameMaterial", iconId: 1125, remark: "框架材料" },
    dysonSphereComponent: { name: "dysonSphereComponent", iconId: 1502, remark: "戴森球组件" },
    smallCarrierRocket: { name: "smallCarrierRocket", iconId: 1503, remark: "小型运载火箭" },
    foundation: { name: "foundation", iconId: 1131, remark: "地基" },
    conveyorBeltMk1: { name: "conveyorBeltMk1", iconId: 2001, remark: "传送带" },
    conveyorBeltMk2: { name: "conveyorBeltMk2", iconId: 2002, remark: "高速传送带" },
    conveyorBeltMk3: { name: "conveyorBeltMk3", iconId: 2003, remark: "极速传送带" },
    sorterMk1: { name: "sorterMk1", iconId: 2011, remark: "分拣器" },
    sorterMk2: { name: "sorterMk2", iconId: 2012, remark: "高速分拣器" },
    sorterMk3: { name: "sorterMk3", iconId: 2013, remark: "极速分拣器" },
    sorterMk4: { name: "sorterMk4", iconId: 2014, remark: "集装分拣器" },
    splitter: { name: "splitter", iconId: 2020, remark: "四向分流器" },
    autoPiler: { name: "autoPiler", iconId: 2040, remark: "自动集装机" },
    trafficMonitor: { name: "trafficMonitor", iconId: 2030, remark: "流速监测器" },
    sprayCoater: { name: "sprayCoater", iconId: 2313, remark: "喷涂机" },
    storageMk1: { name: "storageMk1", iconId: 2101, remark: "小型储物仓" },
    storageMk2: { name: "storageMk2", iconId: 2102, remark: "大型储物仓" },
    storageTank: { name: "storageTank", iconId: 2106, remark: "储液灌" },
    assemblingMachineMk1: { name: "assemblingMachineMk1", iconId: 2303, remark: "制作台Mk.Ⅰ" },
    assemblingMachineMk2: { name: "assemblingMachineMk2", iconId: 2304, remark: "制作台Mk.Ⅱ" },
    assemblingMachineMk3: { name: "assemblingMachineMk3", iconId: 2305, remark: "制作台Mk.Ⅲ" },
    teslaTower: { name: "teslaTower", iconId: 2201, remark: "电力感应塔" },
    wirelessPowerTower: { name: "wirelessPowerTower", iconId: 2202, remark: "无线输电塔" },
    satelliteSubstation: { name: "satelliteSubstation", iconId: 2212, remark: "卫星配电站" },
    windTurbine: { name: "windTurbine", iconId: 2203, remark: "风力涡轮机" },
    thermalPowerPlant: { name: "thermalPowerPlant", iconId: 2204, remark: "火力发电机" },
    miniFusionPowerPlant: { name: "miniFusionPowerPlant", iconId: 2211, remark: "微型聚变发电站" },
    geothermalPowerStation: { name: "geothermalPowerStation", iconId: 2213, remark: "地热发电站" },
    miningMachine: { name: "miningMachine", iconId: 2301, remark: "采矿机" },
    advancedMiningMachine: { name: "advancedMiningMachine", iconId: 2316, remark: "大型采矿机" },
    waterPump: { name: "waterPump", iconId: 2306, remark: "抽水机" },
    arcSmelter: { name: "arcSmelter", iconId: 2302, remark: "电弧熔炉" },
    planeSmelter: { name: "planeSmelter", iconId: 2315, remark: "位面熔炉" },
    oilExtractor: { name: "oilExtractor", iconId: 2307, remark: "原油萃取站" },
    oilRefinery: { name: "oilRefinery", iconId: 2308, remark: "原油精炼厂" },
    chemicalPlant: { name: "chemicalPlant", iconId: 2309, remark: "化工厂" },
    fractionator: { name: "fractionator", iconId: 2314, remark: "分馏塔" },
    量子化工厂: { name: "量子化工厂", iconId: 2317, remark: "量子化工厂" },
    太阳能板: { name: "太阳能板", iconId: 2205, remark: "太阳能板" },
    蓄电池: { name: "蓄电池", iconId: 2206, remark: "蓄电池" },
    蓄电池满: { name: "蓄电池满", iconId: 2207, remark: "蓄电池满" },
    电磁轨道弹射器: { name: "电磁轨道弹射器", iconId: 2311, remark: "电磁轨道弹射器" },
    射线接收站: { name: "射线接收站", iconId: 2208, remark: "射线接收站" },
    垂直发射井: { name: "垂直发射井", iconId: 2312, remark: "垂直发射井" },
    energyExchanger: { name: "energyExchanger", iconId: 2209, remark: "能量枢纽" },
    微型粒子对撞机: { name: "微型粒子对撞机", iconId: 2310, remark: "微型粒子对撞机" },
    人造恒星: { name: "人造恒星", iconId: 2210, remark: "人造恒星" },
    物流配送器: { name: "物流配送器", iconId: 2107, remark: "物流配送器" },
    行星内物流运输站: { name: "行星内物流运输站", iconId: 2103, remark: "行星内物流运输站" },
    星际物流运输站: { name: "星际物流运输站", iconId: 2104, remark: "星际物流运输站" },
    轨道采集器: { name: "轨道采集器", iconId: 2105, remark: "轨道采集器" },
    lab: { name: "lab", iconId: 2901, remark: "矩阵研究站" },
    蓝矩阵: { name: "蓝矩阵", iconId: 6001, remark: "蓝矩阵" },
    红矩阵: { name: "红矩阵", iconId: 6002, remark: "红矩阵" },
    黄矩阵: { name: "黄矩阵", iconId: 6003, remark: "黄矩阵" },
    紫矩阵: { name: "紫矩阵", iconId: 6004, remark: "紫矩阵" },
    绿矩阵: { name: "绿矩阵", iconId: 6005, remark: "绿矩阵" },
    宇宙矩阵: { name: "宇宙矩阵", iconId: 6006, remark: "宇宙矩阵" },
    配送运输机: { name: "配送运输机", iconId: 5003, remark: "配送运输机" },
    燃烧单元: { name: "燃烧单元", iconId: 1128, remark: "燃烧单元" },
    爆破单元: { name: "爆破单元", iconId: 1129, remark: "爆破单元" },
    晶石爆破单元: { name: "晶石爆破单元", iconId: 1130, remark: "晶石爆破单元" },
    机枪弹箱: { name: "机枪弹箱", iconId: 1601, remark: "机枪弹箱" },
    钛化弹箱: { name: "钛化弹箱", iconId: 1602, remark: "钛化弹箱" },
    超合金弹箱: { name: "超合金弹箱", iconId: 1603, remark: "超合金弹箱" },
    导弹组: { name: "导弹组", iconId: 1609, remark: "导弹组" },
    超音速导弹组: { name: "超音速导弹组", iconId: 1610, remark: "超音速导弹组" },
    引力导弹组: { name: "引力导弹组", iconId: 1611, remark: "引力导弹组" },
    炮弹组: { name: "炮弹组", iconId: 1604, remark: "炮弹组" },
    高爆炮弹组: { name: "高爆炮弹组", iconId: 1605, remark: "高爆炮弹组" },
    晶石炮弹组: { name: "晶石炮弹组", iconId: 1606, remark: "晶石炮弹组" },
    原型机: { name: "原型机", iconId: 5101, remark: "原型机" },
    精准无人机: { name: "精准无人机", iconId: 5102, remark: "精准无人机" },
    攻击无人机: { name: "攻击无人机", iconId: 5103, remark: "攻击无人机" },
    护卫舰: { name: "护卫舰", iconId: 5111, remark: "护卫舰" },
    驱逐舰: { name: "驱逐舰", iconId: 5112, remark: "驱逐舰" },
    等离子胶囊: { name: "等离子胶囊", iconId: 1607, remark: "等离子胶囊" },
    反物质胶囊: { name: "反物质胶囊", iconId: 1608, remark: "反物质胶囊" },
    重组式制造台: { name: "重组式制造台", iconId: 2318, remark: "重组式制造台" },
    自演化研究站: { name: "自演化研究站", iconId: 2902, remark: "自演化研究站" },
    负熵熔炉: { name: "负熵熔炉", iconId: 2319, remark: "负熵熔炉" },
    高斯机枪塔: { name: "高斯机枪塔", iconId: 3001, remark: "高斯机枪塔" },
    导弹防御塔: { name: "导弹防御塔", iconId: 3005, remark: "导弹防御塔" },
    聚爆加农炮: { name: "聚爆加农炮", iconId: 3003, remark: "聚爆加农炮" },
    高频激光塔: { name: "高频激光塔", iconId: 3002, remark: "高频激光塔" },
    磁化电浆炮: { name: "磁化电浆炮", iconId: 3004, remark: "磁化电浆炮" },
    战场分析基站: { name: "战场分析基站", iconId: 3009, remark: "战场分析基站" },
    信号塔: { name: "信号塔", iconId: 3007, remark: "信号塔" },
    行星护盾发生器: { name: "行星护盾发生器", iconId: 3008, remark: "行星护盾发生器" },
    动力引擎: { name: "动力引擎", iconId: 1407, remark: "动力引擎" },
    奇异湮灭燃料棒: { name: "奇异湮灭燃料棒", iconId: 1804, remark: "奇异湮灭燃料棒" },
    黑雾矩阵: { name: "黑雾矩阵", iconId: 5201, remark: "黑雾矩阵" },
    硅基神经元: { name: "硅基神经元", iconId: 5202, remark: "硅基神经元" },
    物质重组器: { name: "物质重组器", iconId: 5203, remark: "物质重组器" },
    核心素: { name: "核心素", iconId: 5205, remark: "核心素" },
    负熵奇点: { name: "负熵奇点", iconId: 5204, remark: "负熵奇点" },
    能量碎片: { name: "能量碎片", iconId: 5206, remark: "能量碎片" },
    干扰胶囊: { name: "干扰胶囊", iconId: 1612, remark: "干扰胶囊" },
    压制胶囊: { name: "压制胶囊", iconId: 1613, remark: "压制胶囊" },
    近程电浆炮: { name: "近程电浆炮", iconId: 3010, remark: "近程电浆炮" },
    干扰塔: { name: "干扰塔", iconId: 3006, remark: "干扰塔" },
    全息信标: { name: "全息信标", iconId: 3011, remark: "全息信标" },
    templateItem: { name: "templateItem", iconId: 0, remark: "模板" },
    //itemId是在传送带中设置这个产物，然后转换成json来提取
  };
  const productionCategory = {
    smelter: 0,
    assembling: 1,
    plant: 2,
    refinery: 3,
    collider: 4,
    lab: 5,
  };
  const buildingType = {
    production: 0,
    sorter: 1,
    conveyor: 2,
  };
  const buildingMap = {
    arcSmelter: {
      remark: "电弧熔炉",
      name: "arcSmelter",
      itemId: 2302,
      modelIndex: 62,
      productionSpeed: 1,
      size: { x: 3, y: 3 },
      type: buildingType.production,
      category: productionCategory.smelter,
      slotMaxIndex: 7,
    },
    planeSmelter: {
      remark: "位面熔炉",
      name: "planeSmelter",
      itemId: 2315,
      modelIndex: 194,
      productionSpeed: 2,
      size: { x: 3, y: 3 },
      type: buildingType.production,
      category: productionCategory.smelter,
      slotMaxIndex: 7,
    },
    负熵熔炉: {
      remark: "负熵熔炉",
      name: "负熵熔炉",
      itemId: 2319,
      modelIndex: 457,
      productionSpeed: 3,
      size: { x: 3, y: 3 },
      type: buildingType.production,
      category: productionCategory.smelter,
      slotMaxIndex: 7,
    },
    assemblingMachineMk1: {
      remark: "制造台Mk.I",
      name: "assemblingMachineMk1",
      itemId: 2303,
      modelIndex: 65,
      productionSpeed: 0.75,
      size: { x: 3, y: 3 },
      type: buildingType.production,
      category: productionCategory.assembling,
      slotMaxIndex: 8,
    },
    assemblingMachineMk2: {
      remark: "制造台MkⅡ",
      name: "assemblingMachineMk2",
      itemId: 2304,
      modelIndex: 66,
      productionSpeed: 1,
      size: { x: 3, y: 3 },
      type: buildingType.production,
      category: productionCategory.assembling,
      slotMaxIndex: 8,
    },
    assemblingMachineMk3: {
      remark: "制造台Mk.III",
      name: "assemblingMachineMk3",
      itemId: 2305,
      modelIndex: 67,
      productionSpeed: 1.5,
      size: { x: 3, y: 3 },
      type: buildingType.production,
      category: productionCategory.assembling,
      slotMaxIndex: 8,
    },
    重组式制造台: {
      remark: "重组式制造台",
      name: "重组式制造台",
      itemId: 2318,
      modelIndex: 456,
      productionSpeed: 3,
      size: { x: 3, y: 3 },
      type: buildingType.production,
      category: productionCategory.assembling,
      slotMaxIndex: 8,
    },
    chemicalPlant: {
      remark: "化工厂",
      name: "chemicalPlant",
      itemId: 2309,
      modelIndex: 64,
      productionSpeed: 1,
      type: buildingType.production,
      category: productionCategory.plant,
      slotMaxIndex: 6,
    },
    量子化工厂: {
      remark: "量子化工厂",
      name: "量子化工厂",
      itemId: 2317,
      modelIndex: 376,
      productionSpeed: 2,
      type: buildingType.production,
      category: productionCategory.plant,
      slotMaxIndex: 6,
    },
    oilRefinery: {
      remark: "原油精炼厂",
      name: "oilRefinery",
      itemId: 2308,
      modelIndex: 63,
      productionSpeed: 1,
      type: buildingType.production,
      category: productionCategory.refinery,
      slotMaxIndex: 5,
    },
    微型粒子对撞机: {
      remark: "粒子对撞机",
      name: "微型粒子对撞机",
      itemId: 2310,
      modelIndex: 69,
      productionSpeed: 1,
      type: buildingType.production,
      category: productionCategory.collider,
      slotMaxIndex: 8,
    },
    lab: {
      remark: "矩阵研究站",
      name: "lab",
      itemId: 2901,
      modelIndex: 70,
      productionSpeed: 1,
      type: buildingType.production,
      category: productionCategory.lab,
      height: 3,
      slotMaxIndex: 11,
    },
    自演化研究站: {
      remark: "自演化研究站",
      name: "自演化研究站",
      itemId: 2902,
      modelIndex: 455,
      productionSpeed: 3,
      type: buildingType.production,
      category: productionCategory.lab,
      height: 3,
      slotMaxIndex: 11,
    },
    sorterMk1: {
      name: "sorterMk1",
      itemId: 2011,
      modelIndex: 41,
      sortingSpeed: 1.5,
      size: { x: 1, y: 1 },
      type: buildingType.sorter,
      remark: "分拣器MK.I",
    },
    // sorterMk2: { remark: '高速分拣器', name: 'sorterMk2', itemId: 2012, modelIndex: 42 },
    sorterMk3: {
      name: "sorterMk3",
      itemId: 2013,
      modelIndex: 43,
      sortingSpeed: 6,
      size: { x: 1, y: 1 },
      type: buildingType.sorter,
      remark: "分拣器MK.Ⅲ",
    },
    sorterMk4: {
      name: "sorterMk4",
      itemId: 2014,
      modelIndex: 483,
      sortingSpeed: 120,
      size: { x: 1, y: 1 },
      type: buildingType.sorter,
      remark: "分拣器MK.Ⅳ",
    },

    conveyorBeltMk1: {
      name: "conveyorBeltMk1",
      itemId: 2001,
      modelIndex: 35,
      transportSpeed: 6,
      size: { x: 1, y: 1 },
      type: buildingType.conveyor,
      remark: "传送带MK.I",
    },
    // conveyorBeltMK2: { remark: '高速传送带', name: 'conveyorBeltMK2', itemId: 2002, modelIndex: 36 },
    conveyorBeltMK3: {
      name: "conveyorBeltMK3",
      itemId: 2003,
      modelIndex: 37,
      transportSpeed: 30,
      size: { x: 1, y: 1 },
      type: buildingType.conveyor,
      remark: "传送带MK.Ⅲ",
    },
    sprayCoater: {
      remark: "喷涂机",
      name: "sprayCoater",
      itemId: 2313,
      modelIndex: 120,
    },
    teslaTower: {
      remark: "电力感应塔",
      name: "teslaTower",
      itemId: 2201,
      modelIndex: 44,
    },
    satelliteSubstation: {
      remark: "卫星配电站",
      name: "satelliteSubstation",
      itemId: 2212,
      modelIndex: 68,
      powerDistribution: 30,
      size: { x: 3, y: 3 },
    },
    // piler: { remark: '自动集装机', name: 'piler', itemId: 2040, modelIndex: 257 },
    // monitor: { remark: '流速监测器', name: 'monitor', itemId: 2030, modelIndex: 208 },

    templateBuilding: {
      name: "templateBuilding",
      itemId: 0,
      modelIndex: 0,
      size: { x: 1, y: 1 },
      remark: "模板",
    },
  };

  const recipeMap = {
    "refinedOil+stone+water=sulfuricAcid": 24, // 硫酸
    "oil=hydrogen+refinedOil": 16, // 氢 精炼油
    "oil=hydrogenOutput+refinedOil": 16, // 氢 精炼油
    "绿矩阵=spaceWarper": 79, // 空间翘曲器
    "gravitonLens=spaceWarper": 78, // 空间翘曲器
    "titaniumAlloy+deuterium+superMagneticRing=deuteriumFuelRod": 41, // 氘核燃料棒
    "diamond+strangeMatter=gravitonLens": 101, // 引力透镜
    "stone=siliconOre": 34, // 硅石
    "ironOre=ironIngot": 1, // 铁块
    "ironIngot=steel": 63, // 钢材
    "titaniumOre=titaniumIngot": 65, // 钛块
    "copperOre=copperIngot": 3, // 铜块
    "ironOre=magnet": 2, // 磁铁
    "magnet+copperIngot=magneticCoil": 6, // 磁线圈
    "ironIngot+copperIngot=circuitBoard": 50, // 电路板
    "ironIngot=gear": 5, // 齿轮
    "coal=energeticGraphite": 17, // 高级石墨
    "refinedOil+hydrogen+coal=refinedOil": 121, // 精炼油
    "fireIce=hydrogen+graphene": 32, // 氢 石墨烯
    "fireIce=hydrogenOutput+graphene": 32, // 氢 石墨烯
    "stone=glass": 57, // 玻璃
    "glass=prism": 11, // 棱镜
    "siliconOre=highPuritySilicon": 59, // 高纯硅块
    "highPuritySilicon+copperIngot=microcrystallineComponent": 53, // 微晶元件
    "circuitBoard+microcrystallineComponent=processor": 51, // 处理器
    "energeticGraphite=diamond": 60, // 金刚石
    "refinedOil+energeticGraphite=plastic": 23, // 塑料
    "plastic+refinedOil+water=organicCrystal": 25, // 有机晶体
    "organicCrystal+titaniumIngot=titaniumCrystal": 26, // 钛晶石
    "highPuritySilicon=crystalSilicon": 37, // 晶格硅
    "stone=stoneBrick": 4, // 石材
    "ironIngot+gear+magneticCoil=electricMotor": 97, // 电动机
    "electricMotor+magneticCoil=electromagneticTurbine": 98, // 电磁涡轮
    "sulfuricAcid+energeticGraphite=graphene": 31, // 石墨烯
    "graphene+titaniumIngot=carbonNanotube": 33, // 碳纳米管
    "spiniformStalagmiteCrystal=carbonNanotube": 35, // 碳纳米管
    "carbonNanotube+crystalSilicon+plastic=particleBroadband": 36, // 粒子带宽
    "glass+titaniumIngot+water=titaniumGlass": 30, // 钛化玻璃
    "titaniumCrystal+graphene+hydrogen=casimirCrystal": 28, // 卡西米尔晶片
    "casimirCrystal+titaniumGlass=planeFilter": 38, // 位面过滤器
    "processor+planeFilter=quantumChip": 52, // 量子芯片
    "electromagneticTurbine+copperIngot+graphene=particleContainer": 99, // 粒子容器
    "electromagneticTurbine+magnet+energeticGraphite=superMagneticRing": 103, // 超级磁场环
    "titaniumIngot+steel+sulfuricAcid=titaniumAlloy": 66, // 钛合金
    "magneticCoil+prism=plasmaExciter": 12, // 电浆激发器
    "carbonNanotube+titaniumAlloy+highPuritySilicon=frameMaterial": 80, // 框架材料
    "prism+circuitBoard=photonCombiner": 68, // 光子合并器
    "graphene+photonCombiner=solarSail": 70, // 太阳帆
    "frameMaterial+solarSail+processor=dysonSphereComponent": 81, // 戴森球组件
    "dysonSphereComponent+deuteriumFuelRod+quantumChip=smallCarrierRocket": 83, // 小型运载火箭
    "coal=proliferatorMk1": 106, // 增产剂Mk.Ⅰ
    "proliferatorMk1+diamond=proliferatorMk2": 107, // 增产剂Mk.Ⅱ
    "proliferatorMk2+carbonNanotube=proliferatorMk3": 108, // 增产剂Mk.Ⅲ
    "opticalGratingCrystal+graphene+hydrogen=casimirCrystal": 29, // 卡西米尔晶片
    "unipolarMagnet+copperIngot=particleContainer": 100, // 粒子容器
    "kimberliteOre=diamond": 61, // 金刚石
    "fractalSilicon=crystalSilicon": 62, // 晶格硅
    "stoneBrick+steel=foundation": 112, // 地基
    "titaniumIngot+hydrogen=hydrogenFuelRod": 19, // 液氢燃料棒
    "ironIngot+magneticCoil=teslaTower": 8, // 电力感应塔
    "teslaTower+plasmaExciter=wirelessPowerTower": 13, // 无线输电塔
    "wirelessPowerTower+superMagneticRing+frameMaterial=satelliteSubstation": 73, // 卫星配电站
    "ironIngot+gear+magneticCoil=windTurbine": 7, // 风力涡轮机
    "ironIngot+stoneBrick+gear+magneticCoil=thermalPowerPlant": 64, // 火力发电机
    "ironIngot+gear=conveyorBeltMk1": 84, // 传送带
    "conveyorBeltMk1+electromagneticTurbine=conveyorBeltMk2": 89, // 高速传送带
    "conveyorBeltMk2+superMagneticRing+graphene=conveyorBeltMk3": 92, // 极速传送带
    "ironIngot+stoneBrick=storageMk1": 86, // 小型储物仓
    "steel+stoneBrick=storageMk2": 91, // 大型储物仓
    "highPuritySilicon+copperIngot+circuitBoard=太阳能板": 67, // 太阳能板
    "ironIngot+superMagneticRing+crystalSilicon=蓄电池": 76, // 蓄电池
    "steel+highPuritySilicon+photonCombiner+processor+superMagneticRing=射线接收站": 72, // 射线接收站
    "titaniumAlloy+superMagneticRing+carbonNanotube+processor=miniFusionPowerPlant": 113, // 微型聚变发电站
    "steel+titaniumAlloy+processor+particleContainer=energyExchanger": 77, // 能量枢纽
    "ironIngot+stoneBrick+glass=storageTank": 114, // 储液灌
    "ironIngot+circuitBoard=sorterMk1": 85, // 分拣器
    "sorterMk1+electricMotor=sorterMk2": 88, // 高速分拣器
    "sorterMk2+electromagneticTurbine=sorterMk3": 90, // 极速分拣器
    "ironIngot+circuitBoard+magneticCoil+gear=miningMachine": 48, // 采矿机
    "ironIngot+stoneBrick+electricMotor+circuitBoard=waterPump": 49, // 抽水机
    "steel+stoneBrick+circuitBoard+plasmaExciter=oilExtractor": 14, // 原油萃取站
    "steel+stoneBrick+circuitBoard+plasmaExciter=oilRefinery": 15, // 原油精炼厂
    "titaniumAlloy+frameMaterial+gravitonLens+quantumChip=垂直发射井": 82, // 垂直发射井
    "ironIngot+gear+circuitBoard=splitter": 87, // 四向分流器
    "ironIngot+gear+glass+circuitBoard=trafficMonitor": 117, // 流速监测器
    "ironIngot+gear+circuitBoard=assemblingMachineMk1": 45, // 制作台Mk.Ⅰ
    "assemblingMachineMk1+graphene+processor=assemblingMachineMk2": 46, // 制作台Mk.Ⅱ
    "assemblingMachineMk2+particleBroadband+quantumChip=assemblingMachineMk3": 47, // 制作台Mk.Ⅲ
    "ironIngot+stoneBrick+circuitBoard+magneticCoil=arcSmelter": 56, // 电弧熔炉
    "arcSmelter+frameMaterial+planeFilter+unipolarMagnet=planeSmelter": 116, // 位面熔炉
    "steel+stoneBrick+glass+processor=fractionator": 110, // 分馏塔
    "steel+stoneBrick+glass+circuitBoard=chemicalPlant": 22, // 化工厂
    "chemicalPlant+titaniumGlass+strangeMatter+quantumChip=量子化工厂": 124, // 量子化工厂
    "ironIngot+glass+circuitBoard+magneticCoil=lab": 10, // 矩阵研究站
    "steel+gear+processor+superMagneticRing=电磁轨道弹射器": 71, // 电磁轨道弹射器
    "steel+titaniumIngot+processor+particleContainer=行星内物流运输站": 93, // 行星内物流运输站
    "ironIngot+plasmaExciter+processor=物流配送器": 122, // 物流配送器
    "titaniumAlloy+frameMaterial+superMagneticRing+graphene+processor=微型粒子对撞机": 39, // 微型粒子对撞机
    "行星内物流运输站+titaniumAlloy+particleContainer=星际物流运输站": 95, // 星际物流运输站
    "titaniumAlloy+electromagneticTurbine=reinforcedThruster": 21, // 加力推进器
    "星际物流运输站+superMagneticRing+reinforcedThruster+蓄电池满=轨道采集器": 111, // 轨道采集器
    "steel+copperIngot=thruster": 20, // 推进器
    "ironIngot+动力引擎+processor=配送运输机": 123, // 配送运输机
    "ironIngot+processor+thruster=logisticDrone": 94, // 物流运输机
    "titaniumAlloy+processor+reinforcedThruster=logisticVessel": 96, // 星际物流运输机
    "opticalGratingCrystal+circuitBoard=photonCombiner": 69, // 光子合并器
    "steel+copperIngot+photonCombiner+superMagneticRing=geothermalPowerStation": 118, // 地热发电站
    "steel+gear+superMagneticRing+processor=autoPiler": 120, // 自动集装机
    "steel+plasmaExciter+circuitBoard+microcrystallineComponent=sprayCoater": 109, // 喷涂机
    "hydrogen+refinedOil=hydrogen+energeticGraphite": 58, // 氢 高级石墨
    "hydrogen+refinedOil=hydrogenOutput+energeticGraphite": 58, // 氢 高级石墨
    "蓝矩阵+红矩阵+黄矩阵+紫矩阵+绿矩阵+antimatter=宇宙矩阵": 75, // 宇宙矩阵
    "蓄电池=蓄电池满": -1, // 蓄电池满
    "magneticCoil+circuitBoard=蓝矩阵": 9, // 蓝矩阵
    "energeticGraphite+hydrogen=红矩阵": 18, // 红矩阵
    "diamond+titaniumCrystal=黄矩阵": 27, // 黄矩阵
    "processor+particleBroadband=紫矩阵": 55, // 紫矩阵
    "quantumChip+gravitonLens=绿矩阵": 102, // 绿矩阵
    "hydrogen=deuterium": 40, // 重氢
    "particleContainer+ironIngot+deuterium=strangeMatter": 104, // 奇异物质
    "criticalPhoton=antimatter+hydrogen": 74, // 反物质 氢
    "criticalPhoton=antimatter+hydrogenOutput": 74, // 反物质 氢
    "particleContainer+processor=annihilationConstraintSphere": 42, // 湮灭约束球
    "antimatter+hydrogen+annihilationConstraintSphere+titaniumAlloy=antimatterFuelRod": 44, // 反物质燃烧棒
    "titaniumAlloy+frameMaterial+annihilationConstraintSphere+quantumChip=人造恒星": 43, // 人造恒星
    "titaniumAlloy+frameMaterial+superMagneticRing+quantumChip+opticalGratingCrystal=advancedMiningMachine": 119, // 大型采矿机
    "gravitonLens=criticalPhoton": 74, // 临界光子
    "hydrogen=deuterium+hydrogen": -1, // 重氢 氢
    "magneticCoil+copperIngot=动力引擎": 105, //动力引擎
    "coal=燃烧单元": 133, //燃烧单元
    "燃烧单元+plastic+sulfuricAcid=爆破单元": 134, //爆破单元
    "爆破单元+casimirCrystal+crystalSilicon=晶石爆破单元": 135, //晶石爆破单元
    "copperIngot=机枪弹箱": 136, //机枪弹箱
    "机枪弹箱+titaniumIngot=钛化弹箱": 137, //钛化弹箱
    "钛化弹箱+titaniumAlloy=超合金弹箱": 138, //超合金弹箱
    "copperIngot+circuitBoard+燃烧单元+动力引擎=导弹组": 144, //导弹组
    "导弹组+processor+爆破单元+thruster=超音速导弹组": 145, //超音速导弹组
    "超音速导弹组+晶石爆破单元+strangeMatter=引力导弹组": 146, //引力导弹组
    "copperIngot+燃烧单元=炮弹组": 139, //炮弹组
    "炮弹组+titaniumIngot+爆破单元=高爆炮弹组": 140, //高爆炮弹组
    "高爆炮弹组+titaniumAlloy+晶石爆破单元=晶石炮弹组": 141, //晶石炮弹组
    "ironIngot+动力引擎+circuitBoard+plasmaExciter=原型机": 147, //原型机
    "原型机+electromagneticTurbine+circuitBoard+photonCombiner=精准无人机": 148, //精准无人机
    "原型机+electromagneticTurbine+processor+particleContainer=攻击无人机": 149, //攻击无人机
    "titaniumAlloy+reinforcedThruster+processor+particleContainer=护卫舰": 150, //护卫舰
    "frameMaterial+reinforcedThruster+processor+strangeMatter=驱逐舰": 151, //驱逐舰
    "graphene+magnet+deuterium=等离子胶囊": 142, //等离子胶囊
    "等离子胶囊+particleContainer+hydrogen+antimatter=反物质胶囊": 143, //反物质胶囊
    "assemblingMachineMk3+物质重组器+能量碎片+quantumChip=重组式制造台": 154, //重组式制造台
    "lab+硅基神经元+黑雾矩阵+quantumChip=自演化研究站": 153, //自演化研究站
    "planeSmelter+负熵奇点+能量碎片+quantumChip=负熵熔炉": 155, //负熵熔炉
    "ironIngot+gear+circuitBoard+magneticCoil=高斯机枪塔": 125, //高斯机枪塔
    "steel+electricMotor+circuitBoard+动力引擎=导弹防御塔": 129, //导弹防御塔
    "steel+electricMotor+circuitBoard+superMagneticRing=聚爆加农炮": 127, //聚爆加农炮
    "steel+plasmaExciter+circuitBoard+photonCombiner=高频激光塔": 126, //高频激光塔
    "titaniumAlloy+titaniumGlass+superMagneticRing+plasmaExciter+processor=磁化电浆炮": 128, //磁化电浆炮
    "steel+circuitBoard+microcrystallineComponent+动力引擎=战场分析基站": 152, //战场分析基站
    "wirelessPowerTower+steel+crystalSilicon=信号塔": 131, //信号塔
    "steel+electromagneticTurbine+superMagneticRing+particleContainer=行星护盾发生器": 132, //行星护盾发生器
    "antimatterFuelRod+核心素+strangeMatter+frameMaterial=奇异湮灭燃料棒": 156, //奇异湮灭燃料棒
    "electromagneticTurbine+plasmaExciter+hydrogen=干扰胶囊": 158, //干扰胶囊
    "干扰胶囊+superMagneticRing+titaniumGlass=压制胶囊": 159, //压制胶囊
    "sorterMk3+superMagneticRing+processor=sorterMk4": 160, // 集装分拣器
    "steel+superMagneticRing+plasmaExciter+processor=近程电浆炮": 157, // 近程电浆炮
    "copperIngot+plasmaExciter+diamond+processor=干扰塔": 130, // 干扰塔
    "ironIngot+prism+plasmaExciter+circuitBoard=全息信标": 161, // 全息信标
    //recipeId是在制造台中设置输出这个产物，然后转换成json来提取
  };

  root.DSQBlueprintConstants = {
    itemMap,
    productionCategory,
    buildingType,
    buildingMap,
    recipeMap,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
