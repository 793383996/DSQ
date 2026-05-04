function getBlueprintItemMapSafe() {
  if (typeof window !== "undefined") {
    const constants = window.DSQBlueprintConstants;
    if (constants && constants.itemMap && typeof constants.itemMap === "object") {
      return constants.itemMap;
    }
  }
  if (typeof itemMap !== "undefined" && itemMap && typeof itemMap === "object") {
    return itemMap;
  }
  return null;
}

function getDomainDictionaryBlueprintSafe() {
  if (typeof window !== "undefined" && window.DSQDomainDictionary) {
    return window.DSQDomainDictionary;
  }
  if (typeof DSQDomainDictionary !== "undefined") {
    return DSQDomainDictionary;
  }
  return null;
}

function buildBlueprintRemarkMap() {
  const rawMap = getBlueprintItemMapSafe();
  if (!rawMap) {
    return null;
  }
  const remarkMap = {};
  Object.keys(rawMap).forEach(key => {
    const entry = rawMap[key];
    if (!entry || typeof entry !== "object") {
      return;
    }
    const remark = entry.remark || key;
    remarkMap[remark] = entry;
  });
  return remarkMap;
}

function resolveBlueprintIconsByNames(itemNames) {
  if (!Array.isArray(itemNames) || itemNames.length === 0) {
    return [];
  }
  const remarkMap = buildBlueprintRemarkMap();
  const dictionary = getDomainDictionaryBlueprintSafe();
  if (!remarkMap) {
    return [];
  }
  const iconIds = [];
  itemNames.forEach(value => {
    const displayName =
      dictionary && typeof dictionary.getDisplayName === "function" ? dictionary.getDisplayName(value) : value;
    const blueprintName =
      dictionary && typeof dictionary.getBlueprintEntityName === "function"
        ? dictionary.getBlueprintEntityName(value)
        : null;
    const rawMap = getBlueprintItemMapSafe();
    const entry = (blueprintName && rawMap && rawMap[blueprintName]) || remarkMap[displayName];
    if (!entry) {
      return;
    }
    const iconId = Number(entry.iconId);
    if (Number.isFinite(iconId)) {
      iconIds.push(iconId);
    }
  });
  return iconIds;
}

function getBlueprintFacadeSafe() {
  if (typeof window !== "undefined" && typeof window.BlueprintFacade === "function") {
    return window.BlueprintFacade;
  }
  if (typeof BlueprintFacade === "function") {
    return BlueprintFacade;
  }
  return null;
}

function hasBlueprintConstructor() {
  if (typeof window !== "undefined" && typeof window.Blueprint === "function") {
    return true;
  }
  if (typeof Blueprint === "function") {
    return true;
  }
  return false;
}

function readBlueprintNumeric(target, options) {
  const services = typeof window !== "undefined" ? window.DSQServices || {} : {};
  const numeric = services.numeric || null;
  if (numeric && typeof numeric.readInput === "function") {
    return numeric.readInput(target, options || {});
  }
  const element = typeof target === "string" ? document.getElementById(target) : target;
  const rawValue = element && element.value !== undefined ? element.value : target;
  let value = Number(rawValue);
  const fallback = options && Number.isFinite(options.fallbackValue) ? options.fallbackValue : 0;
  if (!Number.isFinite(value) || (options && options.requirePositive && value <= 0)) {
    value = fallback;
  }
  if (options && Number.isFinite(options.min) && value < options.min) value = options.min;
  if (options && Number.isFinite(options.max) && value > options.max) value = options.max;
  if (options && options.integer) value = Math.round(value);
  if (element && element.value !== undefined) {
    element.value = String(value);
  }
  return value;
}

function i18nBlueprintText(key, fallback, params) {
  if (window.DSQI18n && typeof window.DSQI18n.t === "function") {
    return window.DSQI18n.t(key, params, fallback);
  }
  return fallback;
}

const BLUEPRINT_NAME_PAIRS = [
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

const BLUEPRINT_NAME_MAP = BLUEPRINT_NAME_PAIRS.reduce((accumulator, pair) => {
  accumulator[pair[0]] = pair[1];
  return accumulator;
}, {});

const BLUEPRINT_NAME_ALIASES = {
  原油精炼机: "原油精炼厂",
  粒子对撞机: "微型粒子对撞机",
  射线接收塔: "射线接收站",
  "轨道采集器(气态)": "轨道采集器",
  "轨道采集器(巨冰)": "轨道采集器",
};

function normalizeBlueprintSourceName(name) {
  if (typeof name !== "string") {
    return null;
  }
  const normalizedName = name.trim();
  if (!normalizedName) {
    return null;
  }
  return BLUEPRINT_NAME_ALIASES[normalizedName] || normalizedName;
}

function mapBlueprintName(name) {
  const dictionary = getDomainDictionaryBlueprintSafe();
  if (dictionary && typeof dictionary.getBlueprintEntityName === "function") {
    const blueprintName = dictionary.getBlueprintEntityName(name);
    if (blueprintName) {
      return blueprintName;
    }
  }
  const normalizedName = normalizeBlueprintSourceName(name);
  if (!normalizedName) {
    return null;
  }
  return BLUEPRINT_NAME_MAP[normalizedName] || null;
}

function normalizeBlueprintProliferator(accType) {
  const dictionary = getDomainDictionaryBlueprintSafe();
  if (dictionary && typeof dictionary.getBlueprintEntityName === "function") {
    const blueprintName = dictionary.getBlueprintEntityName(accType);
    if (blueprintName) {
      return blueprintName;
    }
  }
  switch (accType) {
    case "proliferatorMk3":
    case "增产剂Mk.Ⅲ":
      return "proliferatorMk3";
    case "proliferatorMk2":
    case "增产剂Mk.Ⅱ":
      return "proliferatorMk2";
    case "proliferatorMk1":
    case "增产剂Mk.Ⅰ":
      return "proliferatorMk1";
    case null:
    case undefined:
    case "":
      return null;
    default:
      cocoMessage.error(i18nBlueprintText("error.unknown_proliferator_type", "未知的增产剂类型"), 4000);
      throw new Error("unknown proliferator");
  }
}

function mapBlueprintRateList(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }
  return entries.map(entry => {
    const mappedName = mapBlueprintName(entry.itemId || entry.name);
    if (!mappedName) {
      const msg = i18nBlueprintText("error.blueprint_item_map_failed", "蓝图映射失败：{name}", {
        name: entry.name || entry.itemId,
      });
      cocoMessage.error(msg, 4000);
      throw new Error(msg);
    }
    return {
      name: mappedName,
      rate: Number(entry.rate) || 0,
    };
  });
}

function createBlueprintRecipePayloadFromSnapshot(snapshot) {
  const safeSnapshot = snapshot && typeof snapshot === "object" ? snapshot : null;
  if (!safeSnapshot || !Array.isArray(safeSnapshot.subRecipes) || safeSnapshot.subRecipes.length === 0) {
    throw new Error("recipe_parse_failed");
  }

  let proliferator = null;
  let outputHasHydrogen = false;
  let inputHasHydrogen = false;
  const recipeList = [];

  safeSnapshot.subRecipes.forEach(recipeSnapshot => {
    const acceleratorMode = Number.isFinite(Number(recipeSnapshot.acceleratorMode))
      ? Number(recipeSnapshot.acceleratorMode)
      : -1;
    let building = null;

    if (recipeSnapshot.buildingId || recipeSnapshot.buildingName) {
      const mappedBuildingName = mapBlueprintName(recipeSnapshot.buildingId || recipeSnapshot.buildingName);
      if (!mappedBuildingName) {
        const msg = i18nBlueprintText("error.blueprint_item_map_failed", "蓝图映射失败：{name}", {
          name: recipeSnapshot.buildingName || recipeSnapshot.buildingId,
        });
        cocoMessage.error(msg, 4000);
        throw new Error(msg);
      }
      building = {
        name: mappedBuildingName,
        num: Number(recipeSnapshot.buildingCount) || 0,
      };
    }

    const output = mapBlueprintRateList(recipeSnapshot.output);
    const input = Array.isArray(recipeSnapshot.input) ? mapBlueprintRateList(recipeSnapshot.input) : null;

    if (acceleratorMode !== -1) {
      const recipeProliferator = recipeSnapshot.accType || null;
      if (proliferator && proliferator !== recipeProliferator) {
        cocoMessage.warning(
          i18nBlueprintText(
            "message.mixed_proliferator_not_supported",
            "检测到不同等级的增产剂选择，生成蓝图时所有配方必须采用同类型增产剂，请重新设置"
          ),
          4000
        );
        throw new Error("unsupported proliferator config");
      }
      proliferator = recipeProliferator;
    }

    if (!input) {
      if (output.some(item => item.name === "hydrogen")) {
        inputHasHydrogen = true;
      }
    } else if (output.some(item => item.name === "hydrogen")) {
      outputHasHydrogen = true;
    }

    recipeList.push({
      building: building,
      output: output,
      input: input,
      acceleratorMode: acceleratorMode,
      recipeID: 0,
    });
  });

  const normalizedProliferator = normalizeBlueprintProliferator(proliferator);
  if (inputHasHydrogen && outputHasHydrogen) {
    recipeList.forEach(recipe => {
      if (!recipe.input) {
        return;
      }
      recipe.output.forEach(item => {
        if (item.name === "hydrogen") {
          item.name = "hydrogenOutput";
        }
      });
    });
  }

  return {
    recipeList: recipeList,
    proliferator: normalizedProliferator,
    blueprintIcon: Array.isArray(safeSnapshot.iconIds) ? safeSnapshot.iconIds.slice() : [],
    blueprintOutputNames:
      Array.isArray(safeSnapshot.outputIds) && safeSnapshot.outputIds.length
        ? safeSnapshot.outputIds.slice()
        : Array.isArray(safeSnapshot.outputNames)
          ? safeSnapshot.outputNames.slice()
          : [],
    blueprintTitle: typeof safeSnapshot.title === "string" ? safeSnapshot.title : "",
    blueprintDesc: typeof safeSnapshot.description === "string" ? safeSnapshot.description : "",
  };
}

function getBlueprintCommandBridge() {
  if (typeof window === "undefined") {
    return null;
  }
  const bridge = window.DSQCommandBridge;
  if (!bridge || typeof bridge.has !== "function" || typeof bridge.invoke !== "function") {
    return null;
  }
  return bridge;
}

function getRecipe() {
  const bridge = getBlueprintCommandBridge();
  const bridgedResult =
    bridge && bridge.has("getCurrentCalculationResult") ? bridge.invoke("getCurrentCalculationResult") : null;
  const result =
    bridgedResult && typeof bridgedResult === "object"
      ? bridgedResult
      : typeof window !== "undefined" &&
          window.currentCalculationResult &&
          typeof window.currentCalculationResult === "object"
        ? window.currentCalculationResult
        : null;
  const snapshot = result && result.blueprintSnapshot ? result.blueprintSnapshot : null;
  return createBlueprintRecipePayloadFromSnapshot(snapshot);
}

let _loadingOverlay = null;
let _isBlueprintGenerating = false;
let _blueprintRuntimeLoadPromise = null;

const BLUEPRINT_RUNTIME_SCRIPTS = [
  "./Scripts/pako.js",
  "./Scripts/blueprint.constants.js",
  "./Scripts/blueprint.serializer.js",
  "./Scripts/blueprint.model.js",
  "./Scripts/blueprint.layout.js",
  "./Scripts/blueprint.js",
  "./Scripts/blueprint.facade.js",
];

function resolveAbsoluteScriptUrl(src) {
  if (typeof window === "undefined") {
    return src;
  }
  try {
    return new URL(src, window.location.href).href;
  } catch (_error) {
    return src;
  }
}

function isScriptTagLoadedBySrc(src) {
  if (typeof document === "undefined") return false;
  const target = resolveAbsoluteScriptUrl(src);
  const scripts = document.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    if (!script.src) continue;
    if (resolveAbsoluteScriptUrl(script.src) !== target) continue;
    return true;
  }
  return false;
}

function loadBlueprintScriptOnce(src) {
  if (isScriptTagLoadedBySrc(src)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error(`load_script_failed:${src}`));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.defer = false;
    script.setAttribute("data-blueprint-runtime", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`load_script_failed:${src}`));
    document.head.appendChild(script);
  });
}

function validateBlueprintRuntime() {
  const hasFacade = !!getBlueprintFacadeSafe();
  const hasBlueprintCore = hasBlueprintConstructor();
  const hasPako = typeof window !== "undefined" && typeof window.pako !== "undefined";
  return hasFacade && hasBlueprintCore && hasPako;
}

function ensureBlueprintRuntimeLoaded() {
  if (validateBlueprintRuntime()) {
    return Promise.resolve();
  }
  if (_blueprintRuntimeLoadPromise) {
    return _blueprintRuntimeLoadPromise;
  }

  _blueprintRuntimeLoadPromise = (async () => {
    for (const src of BLUEPRINT_RUNTIME_SCRIPTS) {
      await loadBlueprintScriptOnce(src);
    }
    if (!validateBlueprintRuntime()) {
      const error = new Error("BLUEPRINT_RUNTIME_NOT_READY");
      error.code = "ERR_BLUEPRINT_RUNTIME_NOT_READY";
      throw error;
    }
  })().catch(error => {
    _blueprintRuntimeLoadPromise = null;
    throw error;
  });

  return _blueprintRuntimeLoadPromise;
}

function showLoadingDialog() {
  function i18nBlueprintText(key, fallback, params) {
    if (window.DSQI18n && typeof window.DSQI18n.t === "function") {
      return window.DSQI18n.t(key, params, fallback);
    }
    return fallback;
  }

  if (!_loadingOverlay) {
    _loadingOverlay = document.createElement("div");
    _loadingOverlay.id = "blueprint-loading-overlay";
    _loadingOverlay.innerHTML = `
      <style>
        @keyframes bp-loading-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .bp-loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e0e0e0;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: bp-loading-spin 1s linear infinite;
          margin: 0 auto 15px auto;
        }
      </style>
      <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:9999;">
        <div style="background:#fff;padding:30px 50px;border-radius:12px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
          <div class="bp-loading-spinner"></div>
          <div style="font-size:16px;color:#333;font-weight:500;">${i18nBlueprintText("loading.blueprint_generating", "蓝图生成中...")}</div>
          <div id="blueprint-loading-progress" style="font-size:12px;color:#888;margin-top:8px;">${i18nBlueprintText("loading.blueprint_generating_hint", "请稍候，正在计算最优布局")}</div>
        </div>
      </div>
    `;
    document.body.appendChild(_loadingOverlay);
  } else {
    _loadingOverlay.style.display = "block";
  }
}

function updateLoadingProgress(stage) {
  if (!_loadingOverlay) return;
  const progressNode = document.getElementById("blueprint-loading-progress");
  if (!progressNode) return;
  const labels = {
    init: i18nBlueprintText("loading.blueprint_stage_init", "初始化蓝图数据"),
    buildings: i18nBlueprintText("loading.blueprint_stage_buildings", "生成建筑布局"),
    belts: i18nBlueprintText("loading.blueprint_stage_belts", "规划传送带"),
    spray: i18nBlueprintText("loading.blueprint_stage_spray", "规划喷涂机"),
    stack: i18nBlueprintText("loading.blueprint_stage_stack", "生成堆叠层"),
    serialize: i18nBlueprintText("loading.blueprint_stage_serialize", "序列化蓝图"),
  };
  progressNode.textContent =
    labels[stage] || i18nBlueprintText("loading.blueprint_generating_hint", "请稍候，正在计算最优布局");
}

function hideLoadingDialog() {
  if (_loadingOverlay) {
    _loadingOverlay.style.display = "none";
  }
}

function generateBlueprint() {
  function i18nBlueprintText(key, fallback, params) {
    if (window.DSQI18n && typeof window.DSQI18n.t === "function") {
      return window.DSQI18n.t(key, params, fallback);
    }
    return fallback;
  }

  const tracker = typeof window !== "undefined" ? window.PerformanceTracker : null;
  function trackBlueprintBusinessEvent(eventName, attributes = {}) {
    if (!tracker || typeof tracker.trackBusinessEvent !== "function") {
      return;
    }
    tracker.trackBusinessEvent(eventName, attributes, "blueprint_funnel");
  }

  if (_isBlueprintGenerating) {
    trackBlueprintBusinessEvent("blueprint_generate_blocked_already_running", {
      protocol: location.protocol,
    });
    return;
  }

  // 生成前置校验：先判断当前环境是否具备剪贴板写入能力，避免生成完成后才提示失败
  const hasSecureContext = typeof window !== "undefined" && window.isSecureContext === true;
  const hasClipboardWrite =
    typeof navigator !== "undefined" && !!navigator.clipboard && typeof navigator.clipboard.writeText === "function";
  if (!hasSecureContext || !hasClipboardWrite) {
    trackBlueprintBusinessEvent("blueprint_generate_blocked_clipboard_unavailable", {
      protocol: location.protocol,
      isSecureContext: hasSecureContext,
      hasClipboardWrite,
    });
    cocoMessage.warning(
      i18nBlueprintText(
        "message.require_https_for_clipboard",
        "当前环境不支持复制到剪贴板，请使用安全上下文（HTTPS 或 localhost）访问"
      )
    );
    return;
  }
  _isBlueprintGenerating = true;
  let recipe = null;
  try {
    recipe = getRecipe();
  } catch (err) {
    _isBlueprintGenerating = false;
    const normalizedError = err && err.message ? err.message : "recipe_parse_failed";
    trackBlueprintBusinessEvent("blueprint_generate_failed_recipe_parse", {
      error: normalizedError,
    });
    return;
  }
  const outputRecipe = {
    proliferator: recipe.proliferator,
    subRecipes: recipe.recipeList,
  };
  if (!outputRecipe.subRecipes) {
    _isBlueprintGenerating = false;
    return;
  }
  let config = {
    maxSorterNumOneBelt: 8, // 一个传送带节点连接的最大分拣器数量
    conveyorBeltStackLayer: readBlueprintNumeric("conveyorBeltStackLayer", {
      fieldLabel: i18nBlueprintText("settings.blueprint.belt_stack", "传送带物品堆叠层数"),
      fallbackValue: 4,
      min: 1,
      max: 4,
      integer: true,
      clamp: true,
    }), // 传送带物品最大堆叠层数
    x_y_ratio: readBlueprintNumeric("x_y_ratio", {
      fieldLabel: i18nBlueprintText("settings.blueprint.xy_ratio", "蓝图长宽比"),
      fallbackValue: 2,
      min: 1,
      maxFractionDigits: 3,
      requirePositive: true,
    }), // 长宽比
    // compactLayout: document.getElementById('compactLayout').checked,  // 是否采用紧凑布局（紧凑布局的蓝图中炼油厂、化工厂和对撞机在布局上会更紧凑，适合摆放在赤道带，在高纬度可能会出现碰撞问题）
    compactLayout: false,
    upgradeConveyorBelt: false, // 360/min的运力时使用3级传送带（无带流情况下，原料的需求和供应都是集中处理，1级传送带满运力情况下可能会有运送不及时问题导致产量低于预期
    onlyConveyorBeltMk3: document.getElementById("onlyConveyorBeltMk3").checked, // 是否只使用三级传送带
    onlySorterMk3: document.getElementById("onlySorterMk3").checked, // 是否只使用三级分拣器
    useSorterMk4: document.getElementById("useSorterMk4").checked, // 是否使用四级集装分拣器
    maxLabLayers: readBlueprintNumeric("maxLabLayers", {
      fieldLabel: i18nBlueprintText("settings.blueprint.lab_layers", "研究站层数"),
      fallbackValue: 15,
      min: 1,
      max: 15,
      integer: true,
      clamp: true,
    }),
    selfSpray: document.getElementById("selfAcc").checked, // 是否自喷涂增产剂
    generateTeslaTower: document.getElementById("generateTeslaTower").checked, // 是否自动插电线杆
    teslaTowerInterval: 10, // 同一排内电线杆距离
    teslaTowerLineInterval: readBlueprintNumeric("teslaTowerLineInterval", {
      fieldLabel: i18nBlueprintText("settings.blueprint.tesla_interval", "电力感应塔间隔排数"),
      fallbackValue: 1,
      min: 1,
      max: 2,
      integer: true,
      clamp: true,
    }), // 电线杆间隔几排
    // onlyConveyorBeltMk3Downgrade: document.getElementById('onlyConveyorBeltMk3Downgrade').checked  // 三级传送带运力降级
    onlyConveyorBeltMk3Downgrade: false, // 三级传送带运力降级
    stackLayers: document.getElementById("stackLayers").checked ? 4 : 1, // 建筑堆叠层数（开关开启=4层堆叠，关闭=1层普通模式）
    blueprintDesc: recipe.blueprintDesc.trimEnd(),
    blueprintIconLength: recipe.blueprintIcon.length,
  };

  // 现代状态管理：显示全局 Loading 状态，防范重入互调
  showLoadingDialog();
  const metricName = tracker ? `blueprint_generation_${Date.now()}` : null;
  let metricCommitted = false;
  trackBlueprintBusinessEvent("blueprint_generate_attempt", {
    recipeCount: outputRecipe.subRecipes.length,
    stackLayers: config.stackLayers,
  });
  if (tracker && metricName) {
    tracker.startMeasure(metricName);
  }
  function commitBlueprintMetric(success, errorMessage = null) {
    if (!tracker || !metricName || metricCommitted) {
      return 0;
    }
    metricCommitted = true;
    const duration = tracker.endMeasure(metricName);
    const normalizedDuration = typeof duration === "number" ? duration : 0;
    tracker.trackBlueprintGeneration(success, normalizedDuration, errorMessage);
    return normalizedDuration;
  }

  ensureBlueprintRuntimeLoaded()
    .then(() => {
      if ((!recipe.blueprintIcon || recipe.blueprintIcon.length === 0) && Array.isArray(recipe.blueprintOutputNames)) {
        recipe.blueprintIcon = resolveBlueprintIconsByNames(recipe.blueprintOutputNames);
      }
      const blueprintFacade = getBlueprintFacadeSafe();
      if (!blueprintFacade || typeof blueprintFacade.generateAsync !== "function") {
        const runtimeError = new Error("ERR_BLUEPRINT_RUNTIME_NOT_READY");
        runtimeError.code = "ERR_BLUEPRINT_RUNTIME_NOT_READY";
        throw runtimeError;
      }
      return blueprintFacade.generateAsync(
        recipe.blueprintTitle,
        recipe.blueprintIcon.concat(Array(5).fill(0)).slice(0, 5),
        outputRecipe,
        config,
        {
          timeoutMs: 60000,
          onProgress: stage => {
            updateLoadingProgress(stage);
          },
        }
      );
    })
    .then(async bpStr => {
      await navigator.clipboard.writeText(bpStr);
      cocoMessage.success(i18nBlueprintText("message.blueprint_copied", "已复制到粘贴板"), 1000);
      const durationMs = commitBlueprintMetric(true);
      trackBlueprintBusinessEvent("blueprint_generate_success", {
        recipeCount: outputRecipe.subRecipes.length,
        durationMs,
        blueprintLength: bpStr.length,
      });
    })
    .catch(err => {
      const normalizedError = err && err.message ? err.message : "unknown_error";
      const durationMs = commitBlueprintMetric(false, normalizedError);
      trackBlueprintBusinessEvent("blueprint_generate_failed", {
        recipeCount: outputRecipe.subRecipes.length,
        durationMs,
        error: normalizedError,
      });
      // 兼容降级：静默吞掉连点拦截的 Error，避免在 UI 弹出报错气泡扰乱用户
      if (err.message === "ERR_ALREADY_RUNNING") {
        console.warn("[拦截] 蓝图生成任务正在进行中，已忽略重复点击");
        return;
      }
      if (
        err.code === "ERR_BLUEPRINT_RUNTIME_NOT_READY" ||
        (typeof normalizedError === "string" && normalizedError.indexOf("load_script_failed:") === 0)
      ) {
        if (typeof window !== "undefined" && window.cocoMessage) {
          cocoMessage.error(
            i18nBlueprintText("error.blueprint_runtime_load_failed", "蓝图运行时加载失败，请刷新页面后重试。"),
            5000
          );
        }
        return;
      }
      if (err.code === "ERR_BLUEPRINT_TIMEOUT") {
        trackBlueprintBusinessEvent("blueprint_generate_timeout", {
          recipeCount: outputRecipe.subRecipes.length,
          timeoutMs: 60000,
        });
        if (typeof window !== "undefined" && window.cocoMessage) {
          cocoMessage.error(
            i18nBlueprintText("error.blueprint_generate_timeout", "蓝图生成超时，请缩小方案规模后重试。"),
            5000
          );
        }
        return;
      }
      if (typeof window !== "undefined" && window.cocoMessage) {
        cocoMessage.error(
          i18nBlueprintText("error.blueprint_generate_failed", "蓝图生成失败: {error}", { error: err.message }),
          5000
        );
      }
    })
    .finally(() => {
      // 零资源残留保障：哪怕 Promise 被 Reject，UI 锁也必须强行恢复
      hideLoadingDialog();
      _isBlueprintGenerating = false;
    });
}
