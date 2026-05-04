// Scripts/data.ui-bindings.js
// 从 data.js 抽离的 UI 初始化、事件绑定与页面交互逻辑。

var app = null;
var dom = window.DSQDom;

if (typeof dom !== "function") {
  throw new Error("DSQDom runtime is required before data.ui-bindings.js");
}

function i18nText(key, fallback, params) {
  if (window.DSQI18n && typeof window.DSQI18n.t === "function") {
    return window.DSQI18n.t(key, params, fallback);
  }
  return fallback;
}

var dsqServices = window.DSQServices || {};
var storageService = dsqServices.storage || null;
var projectService = dsqServices.project || null;
var numericService = dsqServices.numeric || null;
var globalSettingsService = dsqServices.globalSettings || null;
var notifyService = dsqServices.notify || null;
var domainDictionary = window.DSQDomainDictionary || null;

var GLOBAL_SETTING_CONTROL_IDS = ["selmodein", "furnace", "chemical", "research", "accType", "accValue"];
var GLOBAL_SETTINGS_BY_MACHINE_NAME = {
  assembler: "selmodein",
  smelter: "furnace",
  chemical: "chemical",
  research: "research",
};

function getDomainItemId(value) {
  if (!domainDictionary || typeof domainDictionary.getItemId !== "function") {
    return value;
  }
  return domainDictionary.getItemId(value) || value;
}

function getDomainMachineId(value) {
  if (!domainDictionary || typeof domainDictionary.getMachineId !== "function") {
    return value;
  }
  return domainDictionary.getMachineId(value) || value;
}

function getDomainRecipeTypeId(value) {
  if (!domainDictionary || typeof domainDictionary.getRecipeTypeId !== "function") {
    return value;
  }
  return domainDictionary.getRecipeTypeId(value) || value;
}

function getDomainAccValueId(value) {
  if (!domainDictionary || typeof domainDictionary.getAccValueId !== "function") {
    return value;
  }
  return domainDictionary.getAccValueId(value) || value;
}

function getDomainDisplayName(value) {
  if (!domainDictionary || typeof domainDictionary.getDisplayName !== "function") {
    return value;
  }
  return domainDictionary.getDisplayName(value) || value;
}

function getDomainIconName(value) {
  if (!domainDictionary || typeof domainDictionary.getIconName !== "function") {
    return getDomainDisplayName(value);
  }
  return domainDictionary.getIconName(value) || getDomainDisplayName(value);
}

function getMachineI18nKey(value) {
  if (!domainDictionary || typeof domainDictionary.getMachineI18nKey !== "function") {
    return null;
  }
  return domainDictionary.getMachineI18nKey(value);
}

function isProliferatorItemId(value) {
  return value === "proliferatorMk1" || value === "proliferatorMk2" || value === "proliferatorMk3";
}

function getAccTypeMetrics(accTypeId) {
  switch (accTypeId) {
    case "proliferatorMk1":
      return { extraRate: 1.125, sprayCount: 12, energyFactor: 1.3 };
    case "proliferatorMk2":
      return { extraRate: 1.2, sprayCount: 24, energyFactor: 1.7 };
    case "proliferatorMk3":
      return { extraRate: 1.25, sprayCount: 60, energyFactor: 2.5 };
    default:
      return { extraRate: 1, sprayCount: 0, energyFactor: 1 };
  }
}

function createQuoteIncludeState() {
  var state =
    window.__DSQQuoteIncludeState && typeof window.__DSQQuoteIncludeState === "object"
      ? window.__DSQQuoteIncludeState
      : {};
  return {
    updata: typeof state.updata === "string" ? state.updata : "",
    explanation: typeof state.explanation === "string" ? state.explanation : "",
  };
}

function deepCloneValue(value) {
  if (dsqServices && typeof dsqServices.deepClone === "function") {
    return dsqServices.deepClone(value);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepCloneValue);
  }
  var output = {};
  var keys = Object.keys(value);
  for (var i = 0; i < keys.length; i++) {
    output[keys[i]] = deepCloneValue(value[keys[i]]);
  }
  return output;
}

function createProjectSnapshotForStorage(project) {
  project = project && typeof project === "object" ? project : {};
  if (projectService && typeof projectService.createSnapshot === "function") {
    return projectService.createSnapshot(project);
  }
  return {
    name: typeof project.name === "string" ? project.name : "",
    singleMake: Array.isArray(project.singleMake) ? deepCloneValue(project.singleMake) : [],
    ig_names: Array.isArray(project.ig_names) ? deepCloneValue(project.ig_names) : [],
    value: Array.isArray(project.value) ? deepCloneValue(project.value) : [],
    settings: project.settings && typeof project.settings === "object" ? deepCloneValue(project.settings) : {},
  };
}

function hydrateProjectForRuntime(project) {
  if (projectService && typeof projectService.hydrateForRuntime === "function") {
    return projectService.hydrateForRuntime(project);
  }
  return createProjectSnapshotForStorage(project || {});
}

function warnUser(message, duration) {
  if (!message) return;
  if (notifyService && typeof notifyService.warning === "function") {
    notifyService.warning(message, duration || 3000);
    return;
  }
  if (window.cocoMessage && typeof window.cocoMessage.warning === "function") {
    cocoMessage.warning(message, duration || 3000);
  }
}

function readNumeric(target, options) {
  var readOptions = options && typeof options === "object" ? options : {};
  if (numericService && typeof numericService.readInput === "function") {
    return numericService.readInput(target, readOptions);
  }
  var element = typeof target === "string" ? document.getElementById(target) : target;
  var rawValue = element && element.value !== undefined ? element.value : target;
  var value = Number(rawValue);
  var fallback = Number.isFinite(readOptions.previousValue)
    ? readOptions.previousValue
    : Number.isFinite(readOptions.fallbackValue)
      ? readOptions.fallbackValue
      : 0;
  if (!Number.isFinite(value) || (readOptions.requirePositive && value <= 0)) {
    if (element && element.value !== undefined) {
      element.value = String(fallback);
    }
    return fallback;
  }
  if (Number.isFinite(readOptions.min) && value < readOptions.min) value = readOptions.min;
  if (Number.isFinite(readOptions.max) && value > readOptions.max) value = readOptions.max;
  if (readOptions.integer) value = Math.round(value);
  if (element && element.value !== undefined) {
    element.value = String(value);
  }
  return value;
}

function rememberNumeric(target, options) {
  var readOptions = options && typeof options === "object" ? options : {};
  readOptions.warn = false;
  return readNumeric(target, readOptions);
}

function getNumericFieldLabel(key, fallback) {
  return i18nText(key, fallback);
}

function normalizeProjectName(name) {
  if (projectService && typeof projectService.normalizeName === "function") {
    return projectService.normalizeName(name, { maxLength: 80 });
  }
  var value = typeof name === "string" ? name.replace(/\s+/g, " ").trim() : "";
  if (!value) {
    return { valid: false, value: "", message: i18nText("message.project_name_required", "方案名不能为空") };
  }
  if (value.length > 80) {
    return {
      valid: false,
      value: value.slice(0, 80),
      message: i18nText("message.project_name_too_long", "方案名不能超过 {max} 个字符", { max: 80 }),
    };
  }
  return { valid: true, value: value, message: "" };
}

function createGlobalSettingsSnapshot(source) {
  if (globalSettingsService && typeof globalSettingsService.createSnapshot === "function") {
    return globalSettingsService.createSnapshot(source);
  }
  var defaults = {
    selmodein: "assemblingMachineMk1",
    furnace: "arcSmelter",
    chemical: "chemicalPlant",
    research: "matrixLab",
    accType: "proliferatorMk1",
    accValue: "none",
  };
  var input = source && typeof source === "object" ? source : {};
  return {
    selmodein: getDomainMachineId(input.selmodein) || defaults.selmodein,
    furnace: getDomainMachineId(input.furnace) || defaults.furnace,
    chemical: getDomainMachineId(input.chemical) || defaults.chemical,
    research: getDomainMachineId(input.research) || defaults.research,
    accType: getDomainItemId(input.accType) || defaults.accType,
    accValue: getDomainAccValueId(input.accValue) || defaults.accValue,
  };
}

function getGlobalSettingsDefaults() {
  if (globalSettingsService && globalSettingsService.defaults) {
    return globalSettingsService.defaults;
  }
  return createGlobalSettingsSnapshot({});
}

function selectControlValue(id, value) {
  var node = document.getElementById(id);
  if (!node) return;
  var hasOption = false;
  for (var i = 0; i < node.options.length; i++) {
    if (node.options[i].value === value) {
      hasOption = true;
      break;
    }
  }
  if (hasOption) {
    node.value = value;
  }
}

function applyGlobalSettingsToControls() {
  global_settings = createGlobalSettingsSnapshot(global_settings);
  for (var i = 0; i < GLOBAL_SETTING_CONTROL_IDS.length; i++) {
    var id = GLOBAL_SETTING_CONTROL_IDS[i];
    selectControlValue(id, global_settings[id]);
  }
  defaultAccType = global_settings.accType;
  defaultAccValue = global_settings.accValue;
  settingsLocal = {};
}

function readGlobalSettingsFromControls() {
  var next = {};
  for (var i = 0; i < GLOBAL_SETTING_CONTROL_IDS.length; i++) {
    var id = GLOBAL_SETTING_CONTROL_IDS[i];
    var node = document.getElementById(id);
    if (node) {
      next[id] = node.value;
    }
  }
  global_settings = createGlobalSettingsSnapshot(next);
  defaultAccType = global_settings.accType;
  defaultAccValue = global_settings.accValue;
  settingsLocal = {};
  return global_settings;
}

function persistGlobalSettingsFromControls() {
  readGlobalSettingsFromControls();
  if (typeof saveGlobalSettings === "function") {
    saveGlobalSettings();
  }
}

function getEffectiveAccType(item) {
  var resolved = typeof getAccType === "function" ? getAccType(item) : null;
  return resolved || (global_settings && global_settings.accType) || defaultAccType;
}

function getEffectiveAccValue(item) {
  var resolved = typeof getAccValue === "function" ? getAccValue(item) : null;
  return resolved || (global_settings && global_settings.accValue) || defaultAccValue;
}

function initTrackedNumericInputs() {
  rememberNumeric("txtnumber", {
    fieldLabel: getNumericFieldLabel("control.rate_per_min", "每分钟产量"),
    fallbackValue: 60,
    requirePositive: true,
    min: 0.000001,
    maxFractionDigits: 6,
  });
  var machineCountInput = document.getElementById("selmaince");
  if (machineCountInput && machineCountInput.value !== "") {
    rememberNumeric("selmaince", {
      fieldLabel: getNumericFieldLabel("control.device_count", "生产设备数"),
      fallbackValue: 1,
      requirePositive: true,
      min: 1,
      max: 1000,
      integer: true,
    });
  }
  rememberNumeric("pointLength", {
    fieldLabel: getNumericFieldLabel("settings.speed.decimal_places", "小数点后保留"),
    fallbackValue: pointLength,
    min: 0,
    max: 6,
    integer: true,
    clamp: true,
  });
}

function clearProjectScopedStorage() {
  if (storageService && typeof storageService.clearByPrefixes === "function") {
    storageService.clearByPrefixes([
      "global_settings",
      "machine_settings_time",
      "machine_settings_pf",
      "machine_settings",
      "settings_projects",
      "dsq_",
    ]);
    return;
  }

  if (typeof localStorage === "undefined" || !localStorage) {
    return;
  }
  var keys = [
    "machine_settings" + window.version,
    "global_settings" + window.version,
    "machine_settings_time" + window.version,
    "machine_settings_pf" + window.version,
    "settings_projects" + window.version,
    "dsq_locale",
    "dsq_monitor_config",
    "dsq_monitor_endpoint",
    "dsq_release",
    "dsq_error_logs",
    "dsq_blueprint_metric_history",
    "dsq_blueprint_stats",
  ];
  for (var i = 0; i < keys.length; i++) {
    localStorage.removeItem(keys[i]);
  }
}

var accTypeI18nKeys = {
  proliferatorMk1: "option.acc_type.mk1",
  proliferatorMk2: "option.acc_type.mk2",
  proliferatorMk3: "option.acc_type.mk3",
};

var accValueI18nKeys = {
  none: "option.acc_value.none",
  speedup: "option.acc_value.speedup",
  extra: "option.acc_value.production",
};

function translateMachineDisplayName(name) {
  var displayName = getDomainDisplayName(name);
  var key = getMachineI18nKey(name);
  if (!key) return displayName;
  return i18nText(key, displayName);
}

function translateAccTypeLabel(name) {
  var displayName = getDomainDisplayName(name);
  var key = accTypeI18nKeys[name];
  if (!key) return displayName;
  return i18nText(key, displayName);
}

function translateAccTypeDisplayName(name) {
  return translateAccTypeLabel(name)
    .replace(/^增产剂/, "")
    .replace(/^Proliferator\s*/i, "");
}

function translateAccValueDisplayName(name) {
  var key = accValueI18nKeys[name];
  var displayName = getDomainDisplayName(name);
  if (!key) return displayName;
  return i18nText(key, displayName);
}

function refreshI18nDom() {
  if (window.DSQI18n && typeof window.DSQI18n.refresh === "function") {
    window.DSQI18n.refresh();
  }
}

function getCompatCommandBridge() {
  var bridge = window.DSQCommandBridge;
  if (!bridge || typeof bridge.invoke !== "function" || typeof bridge.has !== "function") {
    return null;
  }
  return bridge;
}

function invokeCompatCommand(commandName) {
  var bridge = getCompatCommandBridge();
  if (!bridge || !bridge.has(commandName)) {
    return undefined;
  }
  var args = Array.prototype.slice.call(arguments, 1);
  return bridge.invoke.apply(bridge, [commandName].concat(args));
}

function updateRuntimeOptionsThroughBridge(patch, reason) {
  var bridge = getCompatCommandBridge();
  if (!bridge || !bridge.has("updateRuntimeOptions")) {
    return false;
  }
  bridge.invoke("updateRuntimeOptions", patch || {}, reason || "");
  return true;
}

function updateGlobalSettingThroughBridge(key, value, reason) {
  var bridge = getCompatCommandBridge();
  if (!bridge || !bridge.has("updateGlobalSetting")) {
    return false;
  }
  bridge.invoke("updateGlobalSetting", key, value, reason || "");
  return true;
}

function syncLocalizedLabels() {
  if (!app) return;
  app.accTotalLabel = i18nText("table.acc_need_prefix", "需求：");
  app.totalAccLabel = i18nText("table.total_acc_prefix", "总喷涂增产剂数量：");
  app.totalSpaceLabel = i18nText("table.total_space_prefix", "占地格子数：");
  app.totalEnergyLabel = i18nText("table.total_energy_prefix", "耗能估算：");
}

var updateAllDispatch = {
  pending: false,
  handle: null,
  reason: "",
};

function requestNextFrame(callback) {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(callback, 0);
}

function cancelNextFrame(handle) {
  if (handle === null || handle === undefined) return;
  if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(handle);
    return;
  }
  clearTimeout(handle);
}

function scheduleUpdateAll(reason) {
  if (getCompatCommandBridge()) {
    invokeCompatCommand("scheduleRecalculate", reason || "");
    return;
  }
  if (typeof reason === "string" && reason) {
    updateAllDispatch.reason = reason;
  }
  if (updateAllDispatch.pending) {
    return;
  }
  updateAllDispatch.pending = true;
  updateAllDispatch.handle = requestNextFrame(function () {
    updateAllDispatch.pending = false;
    updateAllDispatch.handle = null;
    update_all();
  });
}

function flushScheduledUpdateAll(reason) {
  if (getCompatCommandBridge()) {
    invokeCompatCommand("flushRecalculate", reason || "");
    return;
  }
  if (typeof reason === "string" && reason) {
    updateAllDispatch.reason = reason;
  }
  if (updateAllDispatch.pending) {
    cancelNextFrame(updateAllDispatch.handle);
    updateAllDispatch.pending = false;
    updateAllDispatch.handle = null;
  }
  update_all();
}

var activeInfoTooltip = null;
var activeInfoTooltipTimer = null;

function removeInfoTooltip() {
  if (activeInfoTooltipTimer) {
    clearTimeout(activeInfoTooltipTimer);
    activeInfoTooltipTimer = null;
  }
  if (activeInfoTooltip && activeInfoTooltip.parentNode) {
    activeInfoTooltip.parentNode.removeChild(activeInfoTooltip);
  }
  activeInfoTooltip = null;
}

function showInfoTooltip(target, messageHtml) {
  removeInfoTooltip();
  if (!target || !messageHtml) return;

  var tooltip = document.createElement("div");
  tooltip.className = "dsq-inline-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.innerHTML = messageHtml;
  tooltip.style.position = "absolute";
  tooltip.style.zIndex = "10176523";
  tooltip.style.maxWidth = "420px";
  tooltip.style.padding = "8px 10px";
  tooltip.style.borderRadius = "8px";
  tooltip.style.background = "#4A5C72";
  tooltip.style.color = "#FFFFFF";
  tooltip.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)";
  tooltip.style.fontSize = "12px";
  tooltip.style.lineHeight = "1.4";
  tooltip.style.cursor = "pointer";

  document.body.appendChild(tooltip);
  var rect = target.getBoundingClientRect();
  var x = rect.left + window.scrollX - 10;
  var y = rect.bottom + window.scrollY + 8;
  tooltip.style.left = Math.max(8, x) + "px";
  tooltip.style.top = Math.max(8, y) + "px";

  tooltip.addEventListener("click", removeInfoTooltip);
  tooltip.addEventListener("mouseenter", function () {
    if (activeInfoTooltipTimer) {
      clearTimeout(activeInfoTooltipTimer);
      activeInfoTooltipTimer = null;
    }
  });
  tooltip.addEventListener("mouseleave", function () {
    activeInfoTooltipTimer = setTimeout(removeInfoTooltip, 1500);
  });

  activeInfoTooltip = tooltip;
  activeInfoTooltipTimer = setTimeout(removeInfoTooltip, 2000);
}

function getPanelController() {
  if (window.DSQPanelController && typeof window.DSQPanelController.register === "function") {
    return window.DSQPanelController;
  }
  return null;
}

function initPanelController() {
  var panelController = getPanelController();
  if (!panelController) return;
  panelController.register("uiSelector", {
    element: "#UIselector",
    triggerSelector: "#btnAddRequirement",
    openClass: "is-open",
    animated: true,
    closeOnOutsideClick: true,
    closeOnEscape: true,
    trapFocus: true,
    restoreFocus: true,
    isDialog: true,
  });
  panelController.register("split", {
    element: "#Split",
    openClass: "is-open",
    animated: true,
    closeOnOutsideClick: true,
    closeOnEscape: true,
    trapFocus: true,
    restoreFocus: true,
    isDialog: true,
  });
  panelController.register("moreSetting", {
    element: "#MoreSetting",
    triggerSelector: "#btnSetting",
    openClass: "is-open",
    animated: true,
    closeOnOutsideClick: false,
    closeOnEscape: false,
    trapFocus: false,
    restoreFocus: false,
    isDialog: false,
  });
}

function runLegacyNextTick(callback) {
  if (typeof callback !== "function") {
    return;
  }
  if (typeof window !== "undefined" && window.app && typeof window.app.$nextTick === "function") {
    window.app.$nextTick(callback);
    return;
  }
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }
  setTimeout(callback, 0);
}

function createLegacyAppState() {
  var existingApp = window.app && typeof window.app === "object" ? window.app : {};
  var quoteIncludes =
    existingApp.quoteIncludes && typeof existingApp.quoteIncludes === "object"
      ? existingApp.quoteIncludes
      : createQuoteIncludeState();
  window.__DSQQuoteIncludeState = quoteIncludes;
  return {
    quoteIncludes: quoteIncludes,
    accTotalLabel: typeof existingApp.accTotalLabel === "string" ? existingApp.accTotalLabel : "需求：",
    totalAccLabel: typeof existingApp.totalAccLabel === "string" ? existingApp.totalAccLabel : "总喷涂增产剂数量：",
    totalSpaceLabel: typeof existingApp.totalSpaceLabel === "string" ? existingApp.totalSpaceLabel : "占地格子数：",
    totalEnergyLabel: typeof existingApp.totalEnergyLabel === "string" ? existingApp.totalEnergyLabel : "耗能估算：",
    xps_editor_index: typeof existingApp.xps_editor_index === "number" ? existingApp.xps_editor_index : -1,
    items_editor_index: typeof existingApp.items_editor_index === "number" ? existingApp.items_editor_index : -1,
    $nextTick:
      typeof existingApp.$nextTick === "function"
        ? existingApp.$nextTick
        : function (callback) {
            if (typeof callback !== "function") {
              return;
            }
            if (typeof queueMicrotask === "function") {
              queueMicrotask(callback);
              return;
            }
            setTimeout(callback, 0);
          },
  };
}

function dispatchLegacyRuntimeReady() {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof CustomEvent !== "function"
  ) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent("dsq:legacy-runtime-ready", {
      detail: {
        isDataLoaded: window.isDataLoaded === true,
        hasApp: !!window.app,
        hasResult: !!window.currentCalculationResult,
      },
    })
  );
}

// 这里加入了一些用法和一些变量，用于处理“设备数量”处的输入框
function f_init() {
  app = createLegacyAppState();
  window.app = app;
  f_initData();
  f_fillData();
  if (typeof loadGlobalSettings === "function") {
    loadGlobalSettings();
  } else {
    global_settings = createGlobalSettingsSnapshot(global_settings || getGlobalSettingsDefaults());
  }
  applyGlobalSettingsToControls();
  loadSetting();
  loadSettingTime();
  loadSettingPf();
  loadSettingProjects();
  initTrackedNumericInputs();
  syncLocalizedLabels();
  initPanelController();
  doSpeed1();
  update_all();

  projectsUpdate();
  dispatchLegacyRuntimeReady();
  window.addEventListener("dsq:locale-changed", function () {
    syncLocalizedLabels();
    projectsUpdate();
    scheduleUpdateAll("locale-changed");
  });

  dom("#speed1_6").change(function () {
    var oreValue = readNumeric("selore", {
      fieldLabel: getNumericFieldLabel("settings.speed.mining_speed", "采矿作业速度"),
      fallbackValue: 100,
      requirePositive: true,
      maxFractionDigits: 3,
    });
    var advancedMinerValue = readNumeric("speed1_6", {
      fieldLabel: getNumericFieldLabel("settings.speed.advanced_miner", "大型采矿机"),
      fallbackValue: 100,
      requirePositive: true,
      maxFractionDigits: 3,
    });
    dom(data).each(function () {
      if (this.m) {
        for (var i = 0; i < this.m.length; i++) {
          if (this.m[i].id == "advancedMiningMachine") {
            this.m[i].speed = 1 * 20 * 0.01 * oreValue * 0.01 * advancedMinerValue;
          }
        }
      }
    });
    var runtimeSpeedOptions = doSpeed1();
    if (
      updateRuntimeOptionsThroughBridge(
        {
          oreMultiplier: oreValue,
          advancedMinerMultiplier: advancedMinerValue,
          orbitalCollectorGasHydrogen: runtimeSpeedOptions.orbitalCollectorGasHydrogen,
          orbitalCollectorDeuterium: runtimeSpeedOptions.orbitalCollectorDeuterium,
          orbitalCollectorFireIce: runtimeSpeedOptions.orbitalCollectorFireIce,
          orbitalCollectorIceHydrogen: runtimeSpeedOptions.orbitalCollectorIceHydrogen,
        },
        "ore-speed-multiplier-change"
      )
    ) {
      return;
    }
    scheduleUpdateAll("ore-speed-multiplier-change");
  });
  dom("#selore").change(function () {
    var oreValue = readNumeric("selore", {
      fieldLabel: getNumericFieldLabel("settings.speed.mining_speed", "采矿作业速度"),
      fallbackValue: 100,
      requirePositive: true,
      maxFractionDigits: 3,
    });
    var advancedMinerValue = readNumeric("speed1_6", {
      fieldLabel: getNumericFieldLabel("settings.speed.advanced_miner", "大型采矿机"),
      fallbackValue: 100,
      requirePositive: true,
      maxFractionDigits: 3,
    });
    dom(data).each(function () {
      if (this.m) {
        for (var i = 0; i < this.m.length; i++) {
          if (this.m[i].id == "vein") {
            this.m[i].speed = Math.min(0.5 * 1 * 0.01 * oreValue, 30);
          }
          if (this.m[i].id == "miningMachine") {
            this.m[i].speed = Math.min(0.5 * 6 * 0.01 * oreValue, 30);
          }
          if (this.m[i].id == "advancedMiningMachine") {
            this.m[i].speed = 1 * 20 * 0.01 * oreValue * 0.01 * advancedMinerValue;
          }
          if (this.m[i].id == "waterPump") {
            this.m[i].speed = Math.min((50 * 0.01 * oreValue) / 60, 30);
          }
        }
      }
    });
    var runtimeSpeedOptions = doSpeed1();
    if (
      updateRuntimeOptionsThroughBridge(
        {
          oreMultiplier: oreValue,
          advancedMinerMultiplier: advancedMinerValue,
          orbitalCollectorGasHydrogen: runtimeSpeedOptions.orbitalCollectorGasHydrogen,
          orbitalCollectorDeuterium: runtimeSpeedOptions.orbitalCollectorDeuterium,
          orbitalCollectorFireIce: runtimeSpeedOptions.orbitalCollectorFireIce,
          orbitalCollectorIceHydrogen: runtimeSpeedOptions.orbitalCollectorIceHydrogen,
        },
        "ore-base-speed-change"
      )
    ) {
      return;
    }
    scheduleUpdateAll("ore-base-speed-change");
  });
  dom("#btnSetting").click(function (event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    var panelController = getPanelController();
    if (panelController && typeof panelController.toggle === "function") {
      panelController.toggle("moreSetting", { triggerElement: this });
      return;
    }
    var $moreSetting = dom("#MoreSetting");
    if ($moreSetting.prop("hidden")) {
      $moreSetting.prop("hidden", false).attr("aria-hidden", "false").addClass("is-open");
      dom("#btnSetting").attr("aria-expanded", "true");
    } else {
      $moreSetting.removeClass("is-open").attr("aria-hidden", "true").prop("hidden", true);
      dom("#btnSetting").attr("aria-expanded", "false");
    }
  });
  dom("#showMaxOneBelt").change(function () {
    if (updateRuntimeOptionsThroughBridge({ showMaxOneBelt: this.checked === true }, "toggle-show-max-one-belt")) {
      return;
    }
    scheduleUpdateAll("toggle-show-max-one-belt");
  });
  dom("#pointLength").change(function () {
    pointLength = readNumeric(this, {
      fieldLabel: getNumericFieldLabel("settings.speed.decimal_places", "小数点后保留"),
      previousValue: pointLength,
      fallbackValue: pointLength,
      min: 0,
      max: 6,
      integer: true,
      clamp: true,
    });
    if (updateRuntimeOptionsThroughBridge({ pointLength: pointLength }, "decimal-point-length-change")) {
      return;
    }
    scheduleUpdateAll("decimal-point-length-change");
  });
  dom("#isAddSelfAccP").change(function () {
    if (updateRuntimeOptionsThroughBridge({ isAddSelfAccP: this.checked === true }, "toggle-external-acc-input")) {
      return;
    }
    scheduleUpdateAll("toggle-external-acc-input");
  });
  dom("#fractionatorSpeed").change(function () {
    var fractionatorSpeed = readNumeric("fractionatorSpeed", {
      fieldLabel: getNumericFieldLabel("settings.speed.fractionator_speed", "分馏塔每分钟产量"),
      fallbackValue: 18,
      requirePositive: true,
      maxFractionDigits: 6,
    });
    dom(data).each(function () {
      if (this.m) {
        for (var i = 0; i < this.m.length; i++) {
          if (this.m[i].id == "fractionator") {
            this.m[i].speed = fractionatorSpeed / (0.01 * 60);
          }
        }
      }
    });
    if (updateRuntimeOptionsThroughBridge({ fractionatorSpeed: fractionatorSpeed }, "fractionator-speed-change")) {
      return;
    }
    scheduleUpdateAll("fractionator-speed-change");
  });
  dom("#oilSpeed").change(function () {
    var oilSpeed = readNumeric("oilSpeed", {
      fieldLabel: getNumericFieldLabel("settings.speed.oil_speed", "原油速度"),
      fallbackValue: 4,
      requirePositive: true,
      maxFractionDigits: 6,
    });
    dom(data).each(function () {
      if (this.m) {
        for (var i = 0; i < this.m.length; i++) {
          if (this.m[i].id == "oilExtractor") {
            this.m[i].speed = oilSpeed;
          }
        }
      }
    });
    if (updateRuntimeOptionsThroughBridge({ oilSpeed: oilSpeed }, "oil-speed-change")) {
      return;
    }
    scheduleUpdateAll("oil-speed-change");
  });
  dom("#gzSpeed").change(function () {
    var gzSpeed = readNumeric("gzSpeed", {
      fieldLabel: getNumericFieldLabel("settings.speed.critical_photon", "临界光子每分钟产量"),
      fallbackValue: 5,
      requirePositive: true,
      maxFractionDigits: 6,
    });
    if (updateRuntimeOptionsThroughBridge({ gzSpeed: gzSpeed, manualGzSpeed: true }, "critical-photon-speed-change")) {
      return;
    }
    manualGzSpeed = true;
    update_all();
    manualGzSpeed = false;
  });

  /*产量：可燃冰 0.65/s 氢0.25/s
每分钟采集物=60*产量*采矿作业速度*8（这是大佬量化表的现状）
可燃冰 60*0.65*110%*8=343.2
氢气 60*0.25*110%*8=132
供电消耗是按产出物的总能量占比计算的
供电占比=产量*能量/总能量
可燃冰占比=0.65*4.8/（0.65*4.8+0.25*8）=60.9%
氢气占比=0.25*8/（0.65*4.8+0.25*8）=39.1%
每分钟供电消耗=60*采集器功率*供电占比/采集物能量
可燃冰供电消耗=60*30*60.9%/4.8=228.5
氢气供电消耗=60*30*39.1%/8=87.9
实际产出=每分钟采集-供电消耗
可燃冰=343.2-228.5=114.7
氢气=132-87.9=44.1*/

  function doSpeed1() {
    var speed1_1 = readNumeric("speed1_1", {
      fieldLabel: getNumericFieldLabel("settings.speed.orbital_hydrogen_gas", "轨道采集-氢(气态)"),
      fallbackValue: 1,
      requirePositive: true,
      maxFractionDigits: 6,
    });
    var speed1_2 = readNumeric("speed1_2", {
      fieldLabel: getNumericFieldLabel("settings.speed.orbital_deuterium", "轨道采集-重氢"),
      fallbackValue: 0.02,
      requirePositive: true,
      maxFractionDigits: 6,
    });
    var speed1_3 = readNumeric("speed1_3", {
      fieldLabel: getNumericFieldLabel("settings.speed.orbital_fire_ice", "轨道采集-可燃冰"),
      fallbackValue: 0.5,
      requirePositive: true,
      maxFractionDigits: 6,
    });
    var speed1_4 = readNumeric("speed1_4", {
      fieldLabel: getNumericFieldLabel("settings.speed.orbital_hydrogen_ice", "轨道采集-氢(巨冰)"),
      fallbackValue: 0.5,
      requirePositive: true,
      maxFractionDigits: 6,
    });
    var ore = readNumeric("selore", {
      fieldLabel: getNumericFieldLabel("settings.speed.mining_speed", "采矿作业速度"),
      fallbackValue: 100,
      requirePositive: true,
      maxFractionDigits: 3,
    });

    function getSum(value1, value2, p1, p2) {
      var sum = 0;

      sum = 60 * value1 * 0.01 * ore * 8;
      var per = (value1 * p1) / (value1 * p1 + value2 * p2);
      sum -= (60 * 30 * per) / p1;

      return sum;
    }
    dom(data).each(function () {
      if (
        this.s &&
        (this.s[0].itemId == "hydrogen" || this.s[0].itemId == "deuterium" || this.s[0].itemId == "fireIce")
      ) {
        if (this.m) {
          for (var i = 0; i < this.m.length; i++) {
            if (this.m[i].id == "orbitalCollectorGas") {
              if (this.s[0].itemId == "hydrogen") {
                this.t = 1 / (getSum(speed1_1, speed1_2, 8, 8) / 60);
                // console.log("T1:" + this.t);
              } else if (this.s[0].itemId == "deuterium") {
                this.t = 1 / (getSum(speed1_2, speed1_1, 8, 8) / 60);
                // console.log("T2:" + this.t);
              }
            }
            if (this.m[i].id == "orbitalCollectorIce") {
              if (this.s[0].itemId == "hydrogen") {
                this.t = 1 / (getSum(speed1_4, speed1_3, 8, 4.8) / 60);
                // console.log("T3:" + this.t);
              } else if (this.s[0].itemId == "fireIce") {
                this.t = 1 / (getSum(speed1_3, speed1_4, 4.8, 8) / 60);
                // console.log("T4:" + this.t);
              }
            }
          }
        }
      }
    });
    return {
      orbitalCollectorGasHydrogen: speed1_1,
      orbitalCollectorDeuterium: speed1_2,
      orbitalCollectorFireIce: speed1_3,
      orbitalCollectorIceHydrogen: speed1_4,
      oreMultiplier: ore,
    };
  }

  dom(".speed1").change(function () {
    var runtimeSpeedOptions = doSpeed1();
    if (updateRuntimeOptionsThroughBridge(runtimeSpeedOptions, "orbital-collector-speed-change")) {
      return;
    }
    scheduleUpdateAll("orbital-collector-speed-change");
  });

  dom("#btnReset1").click(function () {
    if (confirm(i18nText("dialog.confirm_reset_all", "该操作将清除配方并刷新页面！"))) {
      //重置设备
      settings = {};
      saveSetting();
      global_settings = createGlobalSettingsSnapshot(getGlobalSettingsDefaults());
      if (typeof saveGlobalSettings === "function") {
        saveGlobalSettings();
      }
      //重置速度
      settings_time = {};
      saveSettingTime();
      //重置配方
      settings_pf = {};
      saveSettingPf();
      //刷新数据
      update_all();
      // 清理 DSQ 命名空间缓存，避免误删同源其他应用数据
      clearProjectScopedStorage();
      //刷新页面
      location.reload();
      return true;
    }
    return false;
  });

  dom("#btnReset2").click(function () {
    if (getCompatCommandBridge()) {
      invokeCompatCommand("resetMachineSettings");
      return;
    }
    settings = {};
    saveSetting();
    scheduleUpdateAll("reset-machine-settings");
  });

  dom("#btnReset3").click(function () {
    if (getCompatCommandBridge()) {
      invokeCompatCommand("resetSpeedSettings");
      return;
    }
    settings_time = {};
    saveSettingTime();
    scheduleUpdateAll("reset-speed-settings");
  });

  dom("#btnReset4").click(function () {
    if (getCompatCommandBridge()) {
      invokeCompatCommand("resetRecipeSettings");
      return;
    }
    settings_pf = {};
    saveSettingPf();
    scheduleUpdateAll("reset-recipe-settings");
  });
  dom("#btnReset5").click(function () {
    if (getCompatCommandBridge()) {
      invokeCompatCommand("clearProjects");
      projectsUpdate();
      return;
    }
    projects = [];
    saveSettingProjects();
    projectsUpdate();
  });
  dom("#btnLoadProject").click(function () {
    var value = dom("#selprojects").val();
    if (!value) return;
    if (getCompatCommandBridge()) {
      invokeCompatCommand("loadProject", value);
      return;
    }
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].name == value) {
        var loadedProject = hydrateProjectForRuntime(projects[i]);
        xqs = Array.isArray(loadedProject.value) ? loadedProject.value : [];
        singleMake = Array.isArray(loadedProject.singleMake) ? loadedProject.singleMake : [];
        ig_names = Array.isArray(loadedProject.ig_names) ? loadedProject.ig_names : [];
        settings = loadedProject.settings && typeof loadedProject.settings === "object" ? loadedProject.settings : {};
        scheduleUpdateAll("load-project");
        return;
      }
    }
  });
  dom("#selmodein").change(function () {
    if (updateGlobalSettingThroughBridge("selmodein", this.value, "global-assembler-change")) {
      return;
    }
    persistGlobalSettingsFromControls();
    scheduleUpdateAll("global-assembler-change");
  });
  dom("#furnace").change(function () {
    if (updateGlobalSettingThroughBridge("furnace", this.value, "global-furnace-change")) {
      return;
    }
    persistGlobalSettingsFromControls();
    scheduleUpdateAll("global-furnace-change");
  });
  dom("#chemical").change(function () {
    if (updateGlobalSettingThroughBridge("chemical", this.value, "global-chemical-change")) {
      return;
    }
    persistGlobalSettingsFromControls();
    scheduleUpdateAll("global-chemical-change");
  });
  dom("#research").change(function () {
    if (updateGlobalSettingThroughBridge("research", this.value, "global-research-change")) {
      return;
    }
    persistGlobalSettingsFromControls();
    scheduleUpdateAll("global-research-change");
  });
  dom("#accType").change(function () {
    if (updateGlobalSettingThroughBridge("accType", this.value, "global-acc-type-change")) {
      return;
    }
    persistGlobalSettingsFromControls();
    // 不知道为啥要写这个for
    for (var i in settings) {
      delete settings[i].accType;
    }
    saveSetting();
    scheduleUpdateAll("global-acc-type-change");
  });
  dom("#accValue").change(function () {
    if (updateGlobalSettingThroughBridge("accValue", this.value, "global-acc-value-change")) {
      return;
    }
    persistGlobalSettingsFromControls();
    for (var i in settings) {
      delete settings[i].accValue;
    }
    saveSetting();
    scheduleUpdateAll("global-acc-value-change");
  });
  dom("#isMerge").change(function () {
    if (updateRuntimeOptionsThroughBridge({ isMerge: this.checked === true }, "toggle-merge")) {
      return;
    }
    scheduleUpdateAll("toggle-merge");
  });
  dom("#hideSource").change(function () {
    if (updateRuntimeOptionsThroughBridge({ hideSource: this.checked === true }, "toggle-hide-source")) {
      return;
    }
    scheduleUpdateAll("toggle-hide-source");
  });
  dom("#selfAcc").change(function () {
    if (updateRuntimeOptionsThroughBridge({ selfAcc: this.checked === true }, "toggle-self-acc")) {
      return;
    }
    scheduleUpdateAll("toggle-self-acc");
  });
  dom(document).click(function (e) {
    var cellNameNode = e.target.closest(".cell-name");
    if (cellNameNode) {
      var msgs = [];
      var name = cellNameNode.getAttribute("data-name");
      msgs.push("<p>" + name + "</p>");
      msgs.push("<p>" + i18nText("tooltip.produced_by", "生产于：") + "</p>");
      var pfs = getPfs(name);
      for (var i = 0; i < pfs.length; i++) {
        var title = getPfTitle(pfs[i]);
        msgs.push("<p><a class='pf pf2'>" + title + "</a></p>");
      }
      pfs = getPfsByQ(name);
      if (pfs && pfs.length) {
        msgs.push("<p>" + i18nText("tooltip.can_produce_as_material", "作为原料可生产：") + "</p>");

        for (var i = 0; i < pfs.length; i++) {
          var title = getPfTitle(pfs[i]);
          msgs.push("<p><a class='pf pf2'>" + title + "</a></p>");
        }
      }

      showInfoTooltip(cellNameNode, msgs.join(""));
    }
  });
}

var single_list = []; //独立生产
var xh_list = [];
var out_list = [];

function addXH(name, value) {
  for (var i = 0; i < xh_list.length; i++) {
    var item = xh_list[i];
    if (item.name == name) {
      item.value += value; //需求
      return;
    }
  }
  xh_list.push({ name: name, value: value });
}
function addAccTotal(name, value) {
  for (var i = 0; i < xh_list.length; i++) {
    var item = xh_list[i];
    if (item.name == name) {
      item.accTotal = (item.accTotal || 0) + value; //需求
      return;
    }
  }
}
function addOut(name, value) {
  for (var i = 0; i < out_list.length; i++) {
    var item = out_list[i];
    if (item.name == name) {
      item.value += value; //需求
      return;
    }
  }
  out_list.push({ name: name, value: value });
}
function findOut(name) {
  for (var i = 0; i < out_list.length; i++) {
    var item = out_list[i];
    if (item.name == name) {
      return item.value;
    }
  }
  return null;
}
var ig_names = []; //排除的物品
//加载需求
function loadNumber(itemName, n) {
  try {
    var normalizedItemName = getDomainDisplayName(itemName);
    var normalizedItemId = getDomainItemId(itemName);
    if (dom.inArray(normalizedItemName, ig_names) != -1) {
      return;
    }
    if (isProliferatorItemId(normalizedItemId) && n < 0.1) {
      return;
    }
    var item = find(normalizedItemName, true); // [normalize_recipe=true]
    var info = getValue(normalizedItemName);

    addXH(normalizedItemName, n);
    for (var i = 0; i < item.s.length; i++) {
      if (item.s[i].itemId != normalizedItemId) {
        if (item.s[i].n === 0) continue;
        addOut(item.s[i].name, (-1 * n * (item.s[i].n || 1)) / (item.n || 1));
      }
    }
    var accType = getEffectiveAccType(item);
    var accValue = getEffectiveAccValue(item);
    var accTotal = 0;
    for (var i = 0; item.q && i < item.q.length; i++) {
      var q = item.q[i];
      if (dom.inArray(q.name, ig_names) != -1) {
        continue;
      }
      if (q.n === 0) continue;
      //如果配方产物和原料有相同的
      if (q.itemId == normalizedItemId) {
        //addXH(itemName, -1 * n * (q.n || 1) / (item.n || 1));
      } else {
        var r = (n * (q.n || 1)) / (item.n || 1);
        var accMetrics = getAccTypeMetrics(accType);
        var v = accMetrics.extraRate;
        var tm = accMetrics.sprayCount;
        // 自喷涂
        if (dom("#selfAcc")[0].checked) tm = tm * v - 1;
        if (accValue == "extra" && item.noExtra) accValue = "none";
        if (item.q.length == 0 || item.noExtra === null) accValue = "none";

        // if (accValue == "加速") {
        // accTotal += r / tm;
        // loadNumber(accType, r / tm);
        // } else if (accValue == "增产") {
        // r /= v;
        // accTotal += r / tm;
        // loadNumber(accType, r / tm);
        // }

        if (accValue == "speedup") {
          accTotal += r / tm;
          if (!dom("#isAddSelfAccP").get(0).checked) {
            loadNumber(accType, r / tm);
          }
        } else if (accValue == "extra") {
          r /= v;
          accTotal += r / tm;
          if (!dom("#isAddSelfAccP").get(0).checked) {
            loadNumber(accType, r / tm);
          }
        }

        loadNumber(q.name, r);
      }
    }
    addAccTotal(normalizedItemName, accTotal);
  } catch (e) {
    // console.log(itemName);
    throw e;
  }
}
//处理多产出
function getXhs(itemId) {
  var xhs = [];
  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i];
    if (!xh.value) continue;
    var itemName = xh.name;
    var item = find(itemName);
    if (item.id == itemId) xhs.push(xh);
  }
  return xhs;
}
function doMergeMul(xhs) {
  var maxValue2Index = -1;
  var max = 0;
  for (var i = 0; i < xhs.length; i++) {
    if (xhs[i].value2 > max) maxValue2Index = i;
  }

  for (var i = 0; i < xhs.length; i++) {
    if (i != maxValue2Index && xhs[i].value2 > 0) {
      var number = xhs[i].value;
      xhs[i].value2 = 0;
      var item = find(xhs[i].name);
      for (var j = 0; j < item.s.length; j++) {
        addOut(item.s[j].name, (number * (item.s[j].n || 1)) / (item.n || 1));
      }
    }
  }
}
function mergeMul() {
  var gs = [];
  var ids = [];
  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i];
    if (!xh.value) continue;
    var itemName = xh.name;
    var item = find(itemName);
    if (dom.inArray(item.id, ids) != -1) continue;
    var xhs = getXhs(item.id);

    if (xhs.length > 1) {
      gs.push(xhs);
      ids.push(item.id);
    }
  }
  // console.log(gs); //gs:分组
  for (var i = 0; i < gs.length; i++) {
    doMergeMul(gs[i]);
  }
}

function checkResult() {
  //当前设备数量是否会 出现几个产出都多余，比如氢-120 精炼油-120，那么应该把设备调整到合适数量
  function isOverflow(item, info, nn) {
    for (var j = 0; j < item.s.length; j++) {
      var x = findOut(item.s[j].name);
      if (x == null) return false;
      var mn = ((nn * 60) / item.t) * info.speed * (item.s[j].n || 1); //1分钟1个设备产量
      if (x > -1 * mn) return false;
    }
    return true;
  }

  for (var i = 0; i < xh_list.length; i++) {
    var number = xh_list[i].value;
    var item = find(xh_list[i].name);
    var info = getValue(item);
    var nn = 1;
    if (xh_list[i].value2 < 1) {
      nn = xh_list[i].value2;
    }

    while (isOverflow(item, info, nn) && xh_list[i].value2 > 0) {
      //直到满足条件

      if (xh_list[i].value2 < 1) {
        nn = xh_list[i].value2;
      }
      xh_list[i].value2 = xh_list[i].value2 - nn; //调整数量
      for (var j = 0; j < item.s.length; j++) {
        var mn = ((nn * 60) / item.t) * info.speed * (item.s[j].n || 1); //1分钟1个设备产量
        addOut(item.s[j].name, mn);
      }
      if (xh_list[i].value2 < 1) {
        nn = xh_list[i].value2;
      }
      //console.log(JSON.stringify(out_list));
    }
  }
}

//每分钟需求: 引力透镜=0.1*接收塔=0.1*光子需求量/光子产量, 光子产量: 12(透镜×200%)/15(增产Ⅰ×250%)/18(增产Ⅱ×300%)/24(增产Ⅲ×400%)
function fixGzSpeed() {
  let fixedGzSpeed;
  dom(data).each(function () {
    if (this.s && this.s[0].itemId == "criticalPhoton") {
      if (this.m) {
        for (var i = 0; i < this.m.length; i++) {
          if (this.m[i].id == "rayReceiver") {
            for (var j = 0; j < this.q.length; j++) {
              if (this.q[j].itemId == "gravitonLens") {
                if (manualGzSpeed) {
                  fixedGzSpeed = readNumeric("gzSpeed", {
                    fieldLabel: getNumericFieldLabel("settings.speed.critical_photon", "临界光子每分钟产量"),
                    fallbackValue: 5,
                    requirePositive: true,
                    maxFractionDigits: 6,
                  });
                } else {
                  var item = find(getDomainDisplayName("criticalPhoton"), true);
                  var accType = getEffectiveAccType(item);
                  var accValue = getEffectiveAccValue(item);
                  if (accValue === "speedup") {
                    switch (accType) {
                      case "proliferatorMk1":
                        fixedGzSpeed = 15;
                        break;
                      case "proliferatorMk2":
                        fixedGzSpeed = 18;
                        break;
                      case "proliferatorMk3":
                        fixedGzSpeed = 24;
                        break;
                    }
                  } else {
                    fixedGzSpeed = 12;
                  }
                }
                this.q[j].n = (0.1 / fixedGzSpeed).toFixed(6);
              }
            }
            this.t = this.q && this.q.length ? 60 / fixedGzSpeed : 10;
          }
        }
      }
    }
  });
}

function formatBlueprintRate(value) {
  var numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toFixed(6).replace(/\.?0+$/, "");
}

function cloneBlueprintRateList(list, divisor) {
  if (!Array.isArray(list)) {
    return [];
  }
  var output = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    output.push({
      name: item.name,
      itemId: item.itemId || getDomainItemId(item.name),
      rate: Number(((item.n || 1) / divisor).toFixed(8)),
    });
  }
  return output;
}

function buildBlueprintSnapshot(requirements, productionLines) {
  var requirementList = Array.isArray(requirements) ? requirements : [];
  var outputNames = [];
  var outputIds = [];
  var descriptionLines = [];
  var title = "";

  for (var i = 0; i < requirementList.length; i++) {
    var requirement = requirementList[i];
    if (!requirement || !requirement.item) continue;
    var itemName = requirement.item.name;
    var itemId = getDomainItemId(itemName);
    var rateText = formatBlueprintRate(requirement.number);
    if (!title) {
      title = itemName + "-" + rateText + "min";
    }
    outputNames.push(itemName);
    if (itemId) {
      outputIds.push(itemId);
    }
    descriptionLines.push(itemName + "-" + rateText + "min");
  }

  var subRecipes = [];
  for (var j = 0; j < productionLines.length; j++) {
    var line = productionLines[j];
    if (!line || !line.blueprint) continue;
    subRecipes.push(line.blueprint);
  }

  return {
    title: title,
    description: descriptionLines.length ? descriptionLines.join("\n") + "\n" : "",
    outputNames: outputNames,
    outputIds: outputIds,
    iconIds:
      typeof resolveBlueprintIconsByNames === "function"
        ? resolveBlueprintIconsByNames(outputIds.length ? outputIds : outputNames)
        : [],
    subRecipes: subRecipes,
  };
}

function buildCalculationResult() {
  var outResult = [];
  xh_list = [];
  out_list = [];
  single_list = [];

  fixGzSpeed();
  for (var m = 0; m < singleMake.length; m++) {
    var item = data[singleMake[m].id]; //配方
    var info = getValue(item);
    var singleMakeNumber = readNumeric(singleMake[m].number, {
      fieldLabel: getNumericFieldLabel("split.device_count", "设备数量"),
      previousValue: 1,
      fallbackValue: 1,
      requirePositive: true,
      maxFractionDigits: 6,
    });
    singleMake[m].number = singleMakeNumber;
    var times = Number(((60 * singleMakeNumber * info.speed) / (item.t || 1)).toFixed(6));
    // (60 * parseInt(singleMake[m].number) * info.speed) / (item.t || 1);

    for (var i = 0; i < item.s.length; i++) {
      single_list.push({
        id: singleMake[m].id,
        number: singleMake[m].number,
        name: item.s[i].name,
        itemId: item.s[i].itemId,
        mId: info.machineId,
        mName: info.name,
        value: times * (item.s[i].n || 1),
      });
      loadNumber(item.s[i].name, -1 * times * (item.s[i].n || 1));
    }
    for (var j = 0; item.q && j < item.q.length; j++) {
      loadNumber(item.q[j].name, times * (item.q[j].n || 1));
    }
  }
  for (var m = 0; m < xqs.length; m++) {
    var currentItem = xqs[m].item;
    loadNumber(currentItem.name, xqs[m].number);
  }

  function isXqs(name) {
    for (var m = 0; m < xqs.length; m++) {
      if (xqs[m].item.name == name) return true;
    }
    return false;
  }
  var items0 = [];
  var items = [];
  var items2 = [];
  var blueprintLines = [];

  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i];
    if (!xh.value) continue;
    var itemName = xh.name;
    var item = find(itemName);
    var info = getValue(itemName);
    if (xh.value > 0) {
      xh.value2 = xh.value / (1 / info.time) / 60 / (item.n || 1);
      var accType = getEffectiveAccType(item);
      var accValue = getEffectiveAccValue(item);
      if (accValue == "extra" && item.noExtra) accValue = "none";
      if (item.q.length == 0) accValue = "none";

      if (item.itemId !== "criticalPhoton" || item.machineTypeId !== "rayReceiver") {
        // 修正产物与需求物相同时，生产设备计算偏少
        let fixValue2Times = 1;
        for (let j = 0; j < item.q.length; j++) {
          if (item.q[j].itemId === item.itemId) {
            fixValue2Times = item.n / (item.n - item.q[j].n);
          }
        }
        xh.value2 = (xh.value2 / getAccSpeed(accType, accValue)) * fixValue2Times;
      }
    }
  }
  //mergeMul();//处理合并 多个产出使用了同一个配方 ,暂时弃用，checkResult会处理这种情况
  checkResult(); //优化当前结果，遍历配方，如果 出现几个产出都多余，比如氢-120 精炼油-120，那么应该把设备调整到合适数量

  for (var i = 0; i < single_list.length; i++) {
    if (!single_list[i].value) continue;
    var item = data[single_list[i].id];
    var info = getValue(single_list[i].name);
    var outitem = {
      name: single_list[i].name,
      number1: single_list[i].value,
      number2: single_list[i].number,
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      pfTitle: getPfTitle(item, info),
      mName: translateMachineDisplayName(single_list[i].mName),
    };
    items0.push(outitem);
  }

  //for (var i = 0; i < out_list.length; i++) {
  //    addXH(out_list[i].name, out_list[i].value);
  //    out_list[i].value = 0;
  //}
  for (var i = 0; i < xh_list.length; i++) {
    var xh = xh_list[i];
    if (!xh.value) continue;
    var itemName = xh.name;
    var item = find(itemName);
    var info = getValue(itemName);
    if (xh.value < 0) {
      xh.value2 = 0;
    }
  }
  var total = [];
  var totalAcc = 0;
  function addTotal(name, value, s) {
    var energy = energyData[name] || 0;
    var space = spaceData[name] || 0;

    var accType = (s || {}).accType || defaultAccType;
    var accValue = (s || {}).accValue || defaultAccValue;
    if (accValue != "none") {
      energy *= getAccTypeMetrics(accType).energyFactor;
    }

    for (var i = 0; i < total.length; i++) {
      var item = total[i];

      if (!item.energy) item.energy = 0;
      if (!item.space) item.space = 0;
      if (item.name == name) {
        item.value += value;
        item.energy += energy * (value || 0);
        item.space += space * (value || 0);
        return;
      }
    }

    total.push({
      name: name,
      value: value,
      energy: energy * (value || 0),
      space: space * (value || 0),
    });
  }

  for (var i = 0; i < xh_list.length; i++) {
    if (!xh_list[i].value) continue;

    var item = find(xh_list[i].name);
    var info = getValue(xh_list[i].name);
    var accType = getEffectiveAccType(item);
    var accValue = getEffectiveAccValue(item);
    if (accValue == "extra" && item.noExtra) accValue = "none";
    if (item.q.length == 0 || item.noExtra === null) accValue = "none";
    var acceleratorMode = -1;
    if (accValue === "speedup") {
      acceleratorMode = 1;
    } else if (accValue === "extra") {
      acceleratorMode = 0;
    }
    var isSourceRecipe = !item.q || item.q.length === 0;
    blueprintLines.push({
      blueprint: {
        itemName: xh_list[i].name,
        itemId: item.itemId || getDomainItemId(xh_list[i].name),
        recipeId: item.id,
        buildingId: isSourceRecipe ? null : info.machineId,
        buildingName: isSourceRecipe ? null : info.name,
        buildingCount: isSourceRecipe ? 0 : Number(xh_list[i].value2) || 0,
        input: isSourceRecipe ? null : cloneBlueprintRateList(item.q, item.t || 1),
        output: isSourceRecipe
          ? [
              {
                name: xh_list[i].name,
                itemId: item.itemId || getDomainItemId(xh_list[i].name),
                rate: Number((xh_list[i].value / 60).toFixed(8)),
              },
            ]
          : cloneBlueprintRateList(item.s, item.t || 1),
        accType: acceleratorMode === -1 ? null : accType,
        accValue: accValue,
        acceleratorMode: acceleratorMode,
      },
    });
    if (dom("#hideSource").get(0).checked) {
      if (!item.q || !item.q.length) {
        continue;
      }
    }
    var img = getIconImg(info.machineId);
    if (img.indexOf("<img") == -1) {
      img = "X" + img;
    }
    var currentItemId = item.itemId || getDomainItemId(xh_list[i].name);
    var isFlexibleByproduct = ["refinedOil", "hydrogen", "graphene", "deuterium"].indexOf(currentItemId) !== -1;
    // 当生产精炼油/氢/石墨烯/重氢的生产设施为空时，显示0生产设施以跳过“存在生产设施为空的配方”检验
    var outitem = {
      id: item.id,
      name: xh_list[i].name,
      itemId: currentItemId,
      number1: xh_list[i].value.toFixed(pointLength),
      number2: xh_list[i].value2
        ? xh_list[i].value2.toFixed(pointLength)
        : isFlexibleByproduct
          ? (0.0).toFixed(pointLength)
          : "",
      number2full:
        img +
        (xh_list[i].value2
          ? xh_list[i].value2.toFixed(pointLength)
          : isFlexibleByproduct
            ? (0.0).toFixed(pointLength)
            : ""),
      number2img: img,
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      speedClass: info.isChange ? "time time2" : "time",
      rowClass: isXqs(xh_list[i].name) ? "xqsrow" : "",
      machineId: info.machineId,
      machineName: info.name,
      m: [],
      pf: [],
      accType: [],
      accValue: [],
      accTotal: xh_list[i].accTotal || 0,
      accTotalLabel: i18nText("table.acc_need_prefix", "需求："),
      blueprint: blueprintLines[blueprintLines.length - 1].blueprint,
    };
    if (!outitem.number2) outitem.number2full = "";
    if (currentItemId == "solarSail") {
      outitem.numberOther =
        i18nText("table.number_other.ejector_prefix", "(可供") +
        getIconShow("电磁轨道弹射器", outitem.number1 / 20) +
        i18nText("table.number_other.suffix", ")");
    }
    if (currentItemId == "smallCarrierRocket") {
      outitem.numberOther =
        i18nText("table.number_other.ejector_prefix", "(可供") +
        getIconShow("垂直发射井", outitem.number1 / 5) +
        i18nText("table.number_other.suffix", ")");
    }
    addTotal(info.machineId, Math.ceil(outitem.number2), { accType: accType, accValue: accValue });
    // 增产剂总和
    if (info.accValue != "none") {
      // TODO: 这里调用Math.ceil未必合理，增产剂一般放在总线起始处，所以应该在最终算出的总和处调用Math.ceil
      totalAcc += xh_list[i].accTotal || 0;
    }
    var pfds = getPfs(xh_list[i].name);

    for (var j = 0; j < pfds.length; j++) {
      var pf = {
        class: item.id == pfds[j].id ? "pf selected" : "pf",
        recipeId: pfds[j].id,
        title: getPfTitle(pfds[j], item.id == pfds[j].id ? info : null),
      };
      outitem.pf.push(pf);
    }
    for (var j = 0; j < item.m.length; j++) {
      var m = {
        class: info.machineId == item.m[j].id ? "m selected" : "m",
        itemName: item.name,
        id: item.m[j].id,
        name: item.m[j].name,
        iconName: item.m[j].iconName || getDomainIconName(item.m[j].id),
        title: i18nText("tooltip.machine_speed_prefix", "设备速度:") + item.m[j].speed.toFixed(pointLength),
        showName: translateMachineDisplayName(item.m[j].id),
      };
      if (m.id == "miningMachine") {
        m.title += i18nText("tooltip.machine_miner_note", " 采矿机按6个矿脉计算(因所限传送带速度最高30)");
      }
      if (m.id == "advancedMiningMachine") {
        m.title += i18nText("tooltip.machine_advanced_miner_note", " 大型采矿机按20个矿脉计算");
      }
      if (m.id == "vein") {
        m.title += i18nText("tooltip.machine_ore_note", " (速度最高30)");
      }
      outitem.m.push(m);
    }
    ["proliferatorMk1", "proliferatorMk2", "proliferatorMk3"].forEach(function (one) {
      outitem.accType.push({
        class: one == accType ? "m selected" : "m",
        itemName: item.name,
        id: one,
        name: getDomainDisplayName(one),
        iconName: getDomainIconName(one),
        title: translateAccTypeLabel(one),
        showName: translateAccTypeDisplayName(one),
      });
    });

    ["none", "speedup", "extra"].forEach(function (one) {
      if (one != "none" && (item.q.length == 0 || item.noExtra === null)) return;
      if (one == "extra" && item.noExtra) return;
      outitem.accValue.push({
        class: one == accValue ? "m selected" : "m",
        itemName: item.name,
        id: one,
        name: getDomainDisplayName(one),
        title: translateAccValueDisplayName(one),
        showName: translateAccValueDisplayName(one),
      });
    });

    items.push(outitem);
  }

  for (var i = 0; i < out_list.length; i++) {
    if (!out_list[i].value) continue;
    var item = find(out_list[i].name);
    var info = getValue(out_list[i].name);
    var outitem = {
      name: out_list[i].name,
      number1: out_list[i].value.toFixed(pointLength),
      number2: out_list[i].value2 ? out_list[i].value2.toFixed(pointLength) : "",
      time: info.time.toFixed(pointLength),
      t: info.t.toFixed(pointLength),
      speed: info.speed.toFixed(pointLength),
      speedClass: info.isChange ? "time time2" : "time",
      rowClass: "outrow",
      m: [],
      pf: [],
    };
    items2.push(outitem);
  }
  var energy = 0;
  for (var i = 0; i < total.length; i++) {
    energy += total[i].energy || 0;
  }
  var space = 0;
  for (var i = 0; i < total.length; ++i) {
    space += total[i].space || 0;
  }
  var primaryRequirement = xqs && xqs.length ? xqs[0] : null;
  var primaryItemName = primaryRequirement && primaryRequirement.item ? primaryRequirement.item.name : "";
  var primaryRatePerMinute = primaryRequirement ? Number(primaryRequirement.number) : NaN;
  var seoSnapshot = {
    requirementCount: xqs.length,
    primaryItemName: primaryItemName,
    primaryRatePerMinute: Number.isFinite(primaryRatePerMinute) ? primaryRatePerMinute : null,
    totalLineCount: items.length,
    totalEnergy: Number(energy) || 0,
    totalSpace: Number(space) || 0,
  };

  return {
    requirements: xqs,
    independentLines: items0,
    productionLines: items,
    excessOutputs: items2,
    totals: {
      machines: total,
      totalAcc: totalAcc,
      totalEnergy: energy,
      totalSpace: space,
    },
    seoSnapshot: seoSnapshot,
    blueprintSnapshot: buildBlueprintSnapshot(xqs, blueprintLines),
  };
}

function update_all() {
  if (getCompatCommandBridge()) {
    invokeCompatCommand("syncFromLegacyAndRecalculate", "compat-update-all");
    return;
  }
  var result = buildCalculationResult();
  window.currentCalculationResult = result;
  syncLocalizedLabels();
  runLegacyNextTick(function () {
    refreshI18nDom();
  });

  if (window.DSQI18n && typeof window.DSQI18n.updateSeoState === "function") {
    window.DSQI18n.updateSeoState(result.seoSnapshot);
  }
}
function selectM(id, m) {
  if (getCompatCommandBridge()) {
    invokeCompatCommand("updateMachineSelection", id, m);
    return;
  }
  settings[id] = settings[id] || {};
  settings[id].m = m;
  saveSetting();
  scheduleUpdateAll("row-machine-change");
}
function selectAccType(id, accType) {
  if (getCompatCommandBridge()) {
    invokeCompatCommand("updateAccType", id, accType);
    return;
  }
  settings[id] = settings[id] || {};
  settings[id].accType = accType;
  saveSetting();
  scheduleUpdateAll("row-acc-type-change");
}
function selectAccValue(id, accValue) {
  if (getCompatCommandBridge()) {
    invokeCompatCommand("updateAccValue", id, accValue);
    return;
  }
  settings[id] = settings[id] || {};
  settings[id].accValue = accValue;
  saveSetting();
  scheduleUpdateAll("row-acc-value-change");
}
function selectPf(name, value) {
  if (getCompatCommandBridge()) {
    invokeCompatCommand("updateRecipeSelection", name, value);
    return;
  }
  let old_settings_pf = dom.extend(true, {}, settings_pf);
  try {
    settings_pf[name] = readNumeric(value, {
      fieldLabel: getNumericFieldLabel("table.header.recipe", "配方"),
      previousValue: Number(settings_pf[name]) || 0,
      fallbackValue: 0,
      min: 0,
      integer: true,
      clamp: true,
    });
    scheduleUpdateAll("row-recipe-change");
  } catch (e) {
    settings_pf = old_settings_pf;
    scheduleUpdateAll("row-recipe-change-rollback");
    if (e.name == "RangeError") {
      cocoMessage.warning(
        i18nText(
          "message.recipe_switch_invalid",
          "无法切换到X射线裂解(制氢)/重整精炼(制精炼油)公式？请尝试先将对应的另一条(分别为制精炼油/制氢)默认公式切换为其他公式。"
        ),
        6000
      );
    }
    throw e;
  }
  saveSettingPf();
}
function f_tag(obj) {
  var jrow = dom(obj).parents("tr:first");
  if (jrow.hasClass("row-tag")) {
    jrow.removeClass("row-tag");
  } else {
    jrow.addClass("row-tag");
  }
}
function f_ig(obj) {
  var name = dom(obj).attr("data-name");
  if (getCompatCommandBridge()) {
    invokeCompatCommand("addExcludedName", name);
    return;
  }
  ig_names.push(name);

  scheduleUpdateAll("exclude-item");
}
function f_ig_acc() {
  if (getCompatCommandBridge()) {
    invokeCompatCommand("excludeAllAcc", [
      getDomainDisplayName("proliferatorMk1"),
      getDomainDisplayName("proliferatorMk2"),
      getDomainDisplayName("proliferatorMk3"),
    ]);
    return;
  }
  ["proliferatorMk1", "proliferatorMk2", "proliferatorMk3"].forEach(function (one) {
    var displayName = getDomainDisplayName(one);
    if (ig_names.indexOf(displayName) < 0) ig_names.push(displayName);
  });
  scheduleUpdateAll("exclude-all-acc");
}
function f_reset() {
  if (getCompatCommandBridge()) {
    invokeCompatCommand("resetRequirements");
    if (app) {
      app.xps_editor_index = -1;
      app.items_editor_index = -1;
    }
    return;
  }
  xqs = [];
  singleMake = [];
  app.xps_editor_index = -1;
  app.items_editor_index = -1;

  scheduleUpdateAll("reset-requirements");
}
function f_reset_ig() {
  if (getCompatCommandBridge()) {
    invokeCompatCommand("clearExcludedNames");
    return;
  }
  ig_names = [];

  scheduleUpdateAll("reset-excluded-items");
}
function f_remove_ig(name) {
  if (getCompatCommandBridge()) {
    invokeCompatCommand("removeExcludedName", name);
    return;
  }
  ig_names = ig_names.filter(function (one) {
    return one != name;
  });
  scheduleUpdateAll("remove-excluded-item");
}
function projectsUpdate() {
  var selectNode = document.getElementById("selprojects");
  if (selectNode) {
    selectNode.textContent = "";
    dom(projects).each(function () {
      var option = document.createElement("option");
      option.value = this.name;
      option.textContent = this.name;
      selectNode.appendChild(option);
    });
  }
  if (projects.length) {
    dom("#projectdiv").show();
  } else {
    dom("#projectdiv").hide();
  }
}
function f_save() {
  let index = 0;
  let product_settings = {};
  var rawName = prompt(i18nText("dialog.prompt_project_name", "输入方案名"));
  var normalizedName = normalizeProjectName(rawName);
  if (!normalizedName.valid) {
    warnUser(normalizedName.message, 3000);
    return;
  }
  var name = normalizedName.value;
  if (getCompatCommandBridge()) {
    invokeCompatCommand("saveProject", name);
    projectsUpdate();
    return;
  }
  for (index = 0; index < projects.length; index++) {
    // 存在相同名称的方案
    if (projects[index].name == name) {
      // 用户取消保存
      if (
        !confirm(
          i18nText("dialog.confirm_project_overwrite", `已存在名为${name}的方案，继续保存将覆盖原方案`, { name })
        )
      ) {
        return;
      }
      break;
    }
  }
  // TODO: 优化处理方案
  var runtimeItems =
    window.currentCalculationResult && Array.isArray(window.currentCalculationResult.productionLines)
      ? window.currentCalculationResult.productionLines
      : [];
  for (let item of runtimeItems) {
    let product_setting = {};
    for (let accType of item.accType) {
      if (accType.class === "m selected") {
        product_setting.accType = accType.id;
      }
    }
    for (let accValue of item.accValue) {
      if (accValue.class === "m selected") {
        product_setting.accValue = accValue.id;
      }
    }
    for (let m of item.m) {
      if (m.class === "m selected") {
        product_setting.m = m.id;
      }
    }
    product_settings[find(item.name).id] = product_setting;
  }
  var projectPayload = {
    name: name,
    singleMake: singleMake,
    ig_names: ig_names || [],
    value: xqs,
    // 增产剂和工厂类型设置
    settings: product_settings,
  };
  projects[index] = createProjectSnapshotForStorage(projectPayload);
  saveSettingProjects();
  projectsUpdate();
}
function f_add() {
  if (!isDataLoaded) {
    alert(i18nText("alert.data_not_ready", "游戏资源尚未加载完毕"));
    return;
  }
  if (!ensureUISelectorInitialized()) {
    alert(i18nText("alert.data_load_failed", "游戏资源加载失败，图标将无法显示正常，请刷新再试"));
    return;
  }
  var panelController = getPanelController();
  if (panelController && typeof panelController.toggle === "function") {
    panelController.toggle("uiSelector", {
      triggerElement: document.getElementById("btnAddRequirement"),
    });
    return;
  }
  var $uiSelector = dom("#UIselector");
  if ($uiSelector.is(":visible")) {
    closeUISelector();
  } else {
    openUISelector();
  }
}
function openUISelector(triggerElement) {
  if (!ensureUISelectorInitialized()) {
    return;
  }
  var panelController = getPanelController();
  if (panelController && typeof panelController.open === "function") {
    panelController.open("uiSelector", {
      triggerElement: triggerElement || document.getElementById("btnAddRequirement"),
    });
    return;
  }
  var $uiSelector = dom("#UIselector");
  $uiSelector.prop("hidden", false).attr("aria-hidden", "false").show().addClass("is-open");
}
function closeUISelector() {
  var panelController = getPanelController();
  if (panelController && typeof panelController.close === "function") {
    panelController.close("uiSelector");
    return;
  }
  var $uiSelector = dom("#UIselector");
  $uiSelector.removeClass("is-open show").attr("aria-hidden", "true").prop("hidden", true).hide();
}
function actions(that) {
  // console.log(that.value)
  if (!that.value) {
    return false;
  } else {
    window.open(that.value);
  }
}
function f_split(obj) {
  var panelController = getPanelController();
  var name = dom(obj).attr("data-name");

  dom("#Split").html(`<p>${i18nText("split.select_recipe", "选择配方：")}</p>`);
  var pfs = getPfs(name);
  if (pfs.length == 1) {
    alert(i18nText("alert.no_multiple_recipe", "不存在多配方"));
    return;
  }
  var selected = null;
  for (var i = 0; i < pfs.length; i++) {
    (function (i) {
      var jlink = dom("<div class='split-pf'></div>");
      jlink.html(getPfTitle(pfs[i]));
      jlink.appendTo(dom("#Split")).click(function () {
        selected = pfs[i];
        dom("#Split .split-pf").removeClass("split-pf-selected");
        jlink.addClass("split-pf-selected");
      });
    })(i);
  }
  dom("#Split").append(`<p>${i18nText("split.device_count", "设备数量：")}</p>`);
  dom("#Split").append("<div><input type='text' value='1' class='split-number' /></div>");
  dom("#Split").append(`<div><button>${i18nText("action.confirm", "确定")}</button> </div>`);
  dom("#Split")
    .find("button")
    .click(function () {
      if (!selected) {
        alert(i18nText("alert.recipe_not_selected", "未选择配方"));
        return;
      }
      var splitEntry = {
        id: selected.id,
        number: readNumeric(dom("#Split").find(":text").get(0), {
          fieldLabel: getNumericFieldLabel("split.device_count", "设备数量"),
          previousValue: 1,
          fallbackValue: 1,
          requirePositive: true,
          maxFractionDigits: 6,
        }),
      };
      if (getCompatCommandBridge()) {
        invokeCompatCommand("appendSingleMake", splitEntry);
      } else {
        singleMake.push(splitEntry);
        scheduleUpdateAll("split-recipe-confirm");
      }
      if (panelController && typeof panelController.close === "function") {
        panelController.close("split");
      } else {
        dom("#Split").removeClass("is-open").attr("aria-hidden", "true").prop("hidden", true).hide();
      }
    });

  if (panelController && typeof panelController.open === "function") {
    panelController.open("split", {
      triggerElement: obj,
      initialFocusSelector: ".split-number",
    });
  } else {
    dom("#Split").prop("hidden", false).attr("aria-hidden", "false").show().addClass("is-open");
  }
}
var icons_define = {
  氢: [-1, 3, 7, "氢"],
  可燃冰: [-1, 2, 7, "可燃冰"],
};
var icons = {};
var areIconsMapped = false;
var isUISelectorInitialized = false;

function mapIconToStore(icon, reg) {
  if (!icon) return;
  if (reg.test(icon.name)) {
    var x = icon.name.match(reg);
    icons[x[3]] = icon.value;
    return;
  }
  icons[icon.name] = icon.value;
}

function ensureIconMapInitialized() {
  if (areIconsMapped) return true;
  if (!window.game_data || !game_data.icons1 || !game_data.icons2) return false;

  var reg = /^(\d)-(\d{1,2})-(.*)+/;
  for (var i = 0; i < game_data.icons1.length; i++) {
    mapIconToStore(game_data.icons1[i], reg);
  }
  for (var j = 0; j < game_data.icons2.length; j++) {
    mapIconToStore(game_data.icons2[j], reg);
  }

  areIconsMapped = true;
  Object.freeze(icons);
  if (app) {
    app.icons = icons;
  }
  return true;
}

function ensureUISelectorInitialized() {
  if (isUISelectorInitialized) return true;
  if (!ensureIconMapInitialized()) return false;

  var w = 900;
  dom("#UIselector").html('<div id="selector" class="selector"><div id="tabs"></div></div>');
  dom("#selector").css({ width: w + "px", height: "auto" });

  var jimg1 = dom("<div class='tab selected'><img src='./img/component-icon.png' alt='components'/></div>").appendTo(
    "#tabs"
  );
  var jimg2 = dom("<div class='tab'><img src='./img/factory-icon.png' alt='factories'/></div>").appendTo("#tabs");

  var jicons = dom('<div class="icons icons-selected"></div>').appendTo("#selector");
  addIcons(jicons, game_data.icons1);
  var jicons2 = dom('<div class="icons"></div>').appendTo("#selector");
  addIcons(jicons2, game_data.icons2);

  jimg1.click(function () {
    jicons2.removeClass("icons-selected");
    jicons.addClass("icons-selected");
    jimg2.removeClass("selected");
    jimg1.addClass("selected");
  });
  jimg2.click(function () {
    jicons.removeClass("icons-selected");
    jicons2.addClass("icons-selected");
    jimg1.removeClass("selected");
    jimg2.addClass("selected");
  });

  isUISelectorInitialized = true;
  return true;
}

function addIcons(jicons, iconList) {
  var w = 900;
  jicons.width(w - 80).css("height", "auto");

  for (var i = 0; i < 9; i++) {
    var jrow = dom("<div class='iconrow'></div>").appendTo(jicons);
    for (var j = 0; j < 14; j++) {
      var jicon = dom("<div class='icon'><div class='s'></div></div>").appendTo(jrow);
      jicon.click(function () {
        var name = dom(this).attr("data-name");
        if (!name) return;
        f_add3(name);
        closeUISelector();
      });
    }
  }

  for (var index = 0; index < iconList.length; index++) {
    var icon = iconList[index];
    var reg = /^(\d)-(\d{1,2})-(.*)+/;
    var x = null;
    if (reg.test(icon.name)) {
      x = icon.name.match(reg);
    } else if (icons_define[icon.name]) {
      x = icons_define[icon.name];
    }
    if (!x) continue;

    jicons
      .find(">.iconrow:eq(" + (parseInt(x[1]) - 1) + ")")
      .find(">.icon:eq(" + (parseInt(x[2]) - 1) + ")")
      .html("")
      .append("<img src='data:image/png;base64," + icon.value + "' alt='" + x[3] + "' loading='lazy' />")
      .attr("data-name", x[3])
      .attr("title", x[3]);
  }
}

function f_initIcons(options) {
  var opts = options || {};
  if (!ensureIconMapInitialized()) return false;
  if (opts.mapOnly) return true;
  return ensureUISelectorInitialized();
}
