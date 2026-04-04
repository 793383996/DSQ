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
  if (!remarkMap) {
    return [];
  }
  const iconIds = [];
  itemNames.forEach(name => {
    const entry = remarkMap[name];
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

function getRecipe() {
  function i18nBlueprintText(key, fallback, params) {
    if (window.DSQI18n && typeof window.DSQI18n.t === "function") {
      return window.DSQI18n.t(key, params, fallback);
    }
    return fallback;
  }

  let recipeList = [];
  const itemNameList = [
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
  let outputHasHydrogen = false;
  let inputHasHydrogen = false;
  let proliferator = null;
  let blueprintTitle = "";
  let blueprintDesc = "";
  let blueprintIconIdx = [];
  let blueprintOutputNames = [];
  for (let tr of document.getElementsByTagName("tbody")[0].childNodes) {
    if (tr.className === "header") {
      continue;
    }
    if (tr.className === "total") {
      break;
    }
    if (tr.childNodes.length === 0) {
      continue;
    }
    let nodeList = [];
    for (let node of tr.childNodes) {
      if (!node.tagName) {
        continue;
      }
      nodeList.push(node);
    }

    let buildingName = nodeList[3].getElementsByTagName("img")[0];
    //console.log(buildingName);
    if (!buildingName) {
      cocoMessage.warning(
        i18nBlueprintText("message.empty_machine_recipe", "存在生产设施为空的配方，请检查配方列表"),
        4000
      );
      throw `unsupported recipe combination`;
    } else {
      buildingName = buildingName.getAttribute("title");
    }
    let building = {
      name: buildingName,
      // num: Math.ceil(parseFloat(nodeList[3].getElementsByTagName('span')[0].innerText))
      num: parseFloat(nodeList[3].getElementsByTagName("span")[0].innerText),
    };
    let success = false;
    for (let item of itemNameList) {
      if (item[0] !== building.name) {
        continue;
      }
      building.name = item[1];
      success = true;
      break;
    }
    if (!success) {
      const msg = i18nBlueprintText("error.blueprint_item_map_failed", "蓝图映射失败：{name}", {
        name: building.name,
      });
      cocoMessage.error(msg, 4000);
      throw new Error(msg);
    }

    const recipeHtml = nodeList[4].getElementsByTagName("div")[0].getElementsByClassName("pf selected")[0];
    let input = [];
    let output = [];
    let recipeId = 0;
    let isInput = true;
    const t = parseFloat(recipeHtml.innerText.split("(")[1].split("s")[0]);
    for (let node of recipeHtml.childNodes) {
      if (!node.tagName) {
        continue;
      }
      if (node.tagName === "IMG") {
        if (node.className === "to") {
          isInput = false;
          continue;
        }
        let cnTitle = node.getAttribute("title");
        let title = "";
        let mapped = false;
        for (let item of itemNameList) {
          if (item[0] !== cnTitle) {
            continue;
          }
          title = item[1];
          mapped = true;
          break;
        }
        if (!mapped) {
          const msg = i18nBlueprintText("error.blueprint_item_map_failed", "蓝图映射失败：{name}", {
            name: cnTitle,
          });
          cocoMessage.error(msg, 4000);
          throw new Error(msg);
        }
        if (isInput) {
          input.push({ name: title });
        } else {
          output.push({ name: title });
          if (title === "hydrogen") {
            outputHasHydrogen = true;
          }
        }
      } else if (node.tagName === "SUB") {
        if (isInput) {
          input[input.length - 1].rate = parseFloat(node.innerText) / t;
        } else {
          output[output.length - 1].rate = parseFloat(node.innerText) / t;
        }
      }
    }
    const acceleratorModeName = nodeList[6].getElementsByClassName("m selected")[0].getAttribute("data-modein");
    let acceleratorMode = -1; // 不使用增产剂
    if (acceleratorModeName === "加速") {
      acceleratorMode = 1;
    } else if (acceleratorModeName === "增产") {
      acceleratorMode = 0;
    }
    if (acceleratorMode !== -1) {
      let recipeProliferator = nodeList[5]
        .getElementsByTagName("div")[0]
        .getElementsByClassName("m selected")[0]
        .getAttribute("data-modein");
      if (proliferator) {
        if (proliferator !== recipeProliferator) {
          cocoMessage.warning(
            i18nBlueprintText(
              "message.mixed_proliferator_not_supported",
              "检测到不同等级的增产剂选择，生成蓝图时所有配方必须采用同类型增产剂，请重新设置"
            ),
            4000
          );
          throw `unsupported proliferator config`;
        }
      } else {
        proliferator = recipeProliferator;
      }
    }

    if (isInput) {
      // 还是input就说明这个是原矿，蓝图不需要考虑原矿的生产建筑，且原矿的rate（每秒需求量）需重新计算
      output = input;
      output[0].rate = parseFloat(nodeList[2].getElementsByTagName("span")[0].innerText) / 60;
      building = null;
      input = null;
      if (output[0].name === "hydrogen") {
        inputHasHydrogen = true;
      }
    }

    if (!blueprintTitle) {
      // blueprint name and icon id
      let outputItemName = nodeList[1].getAttribute("data-name");
      let outputRateText = nodeList[2].getElementsByTagName("span")[0].innerText;
      // 移除小数点后的0：5.000 -> 5, 5.100 -> 5.1
      let outputRate = parseFloat(outputRateText).toString();
      blueprintTitle = outputItemName + "-" + outputRate + "min";
      let resultList = document.querySelectorAll("#result > div:nth-child(1) > span");
      let outputItemNameList = [];
      for (let i = 0; i < resultList.length - 1; i++) {
        let result = resultList[i];
        let outputItemName = result.querySelector("img").title;
        let outputRateText = result.querySelector("span > span").textContent;
        // 移除小数点后的0：5.000 -> 5, 5.100 -> 5.1
        let outputRate = parseFloat(outputRateText).toString();
        blueprintDesc += outputItemName + "-" + outputRate + "min\n";
        outputItemNameList.push(outputItemName);
      }
      blueprintOutputNames = outputItemNameList.slice();

      blueprintIconIdx = resolveBlueprintIconsByNames(outputItemNameList);
    }

    const recipe = {
      building: building,
      output: output,
      input: input,
      acceleratorMode: acceleratorMode,
      recipeID: recipeId,
    };

    recipeList.push(recipe);
  }
  switch (proliferator) {
    case "增产剂Mk.Ⅲ":
      proliferator = "proliferatorMk3";
      break;
    case "增产剂Mk.Ⅱ":
      proliferator = "proliferatorMk2";
      break;
    case "增产剂Mk.Ⅰ":
      proliferator = "proliferatorMk1";
      break;
    case null:
      proliferator = null;
      break;
    default:
      cocoMessage.error(i18nBlueprintText("error.unknown_proliferator_type", "未知的增产剂类型"), 4000);
      throw `unknown proliferator`;
  }

  if (inputHasHydrogen && outputHasHydrogen) {
    // 输入和输出同时有氢时，把输出氢映射为新产物单独处理
    for (let recipe of recipeList) {
      if (!recipe.input) {
        // 略过原矿
        continue;
      }
      for (let item of recipe.output) {
        if (item.name === "hydrogen") {
          item.name = "hydrogenOutput";
        }
      }
    }
  }
  // console.log(recipeList)
  return {
    recipeList: recipeList,
    proliferator: proliferator,
    blueprintIcon: blueprintIconIdx,
    blueprintOutputNames: blueprintOutputNames,
    blueprintTitle: blueprintTitle,
    blueprintDesc: blueprintDesc,
  };
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
          <div style="font-size:12px;color:#888;margin-top:8px;">${i18nBlueprintText("loading.blueprint_generating_hint", "请稍候，正在计算最优布局")}</div>
        </div>
      </div>
    `;
    document.body.appendChild(_loadingOverlay);
  } else {
    _loadingOverlay.style.display = "block";
  }
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
    conveyorBeltStackLayer: parseInt(document.getElementById("conveyorBeltStackLayer").value), // 传送带物品最大堆叠层数
    x_y_ratio: parseFloat(document.getElementById("x_y_ratio").value), // 长宽比
    // compactLayout: document.getElementById('compactLayout').checked,  // 是否采用紧凑布局（紧凑布局的蓝图中炼油厂、化工厂和对撞机在布局上会更紧凑，适合摆放在赤道带，在高纬度可能会出现碰撞问题）
    compactLayout: false,
    upgradeConveyorBelt: false, // 360/min的运力时使用3级传送带（无带流情况下，原料的需求和供应都是集中处理，1级传送带满运力情况下可能会有运送不及时问题导致产量低于预期
    onlyConveyorBeltMk3: document.getElementById("onlyConveyorBeltMk3").checked, // 是否只使用三级传送带
    onlySorterMk3: document.getElementById("onlySorterMk3").checked, // 是否只使用三级分拣器
    useSorterMk4: document.getElementById("useSorterMk4").checked, // 是否使用四级集装分拣器
    maxLabLayers: parseInt(document.getElementById("maxLabLayers").value),
    selfSpray: document.getElementById("selfAcc").checked, // 是否自喷涂增产剂
    generateTeslaTower: document.getElementById("generateTeslaTower").checked, // 是否自动插电线杆
    teslaTowerInterval: 10, // 同一排内电线杆距离
    teslaTowerLineInterval: parseInt(document.getElementById("teslaTowerLineInterval").value), // 电线杆间隔几排
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
        config
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
