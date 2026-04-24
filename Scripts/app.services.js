(function (root) {
  function isObject(value) {
    return value !== null && typeof value === "object";
  }

  function deepClone(value) {
    if (!isObject(value)) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(deepClone);
    }
    var output = {};
    var keys = Object.keys(value);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      output[key] = deepClone(value[key]);
    }
    return output;
  }

  function safeParseJSON(raw, fallbackValue) {
    if (typeof raw !== "string" || raw.length === 0) {
      return fallbackValue;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return fallbackValue;
    }
  }

  function safeStringify(value, fallbackValue) {
    try {
      return JSON.stringify(value);
    } catch {
      return fallbackValue;
    }
  }

  function hasLocalStorage() {
    try {
      return !!root.localStorage;
    } catch {
      return false;
    }
  }

  function getLocalStorageItem(key) {
    if (!hasLocalStorage()) return null;
    try {
      return root.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function setLocalStorageItem(key, value) {
    if (!hasLocalStorage()) return false;
    try {
      root.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function removeLocalStorageItem(key) {
    if (!hasLocalStorage()) return false;
    try {
      root.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function clearByPrefixes(prefixes) {
    if (!hasLocalStorage() || !Array.isArray(prefixes) || prefixes.length === 0) {
      return 0;
    }
    var keysToRemove = [];
    for (var i = 0; i < root.localStorage.length; i++) {
      var key = root.localStorage.key(i);
      if (!key) continue;
      for (var j = 0; j < prefixes.length; j++) {
        var prefix = prefixes[j];
        if (typeof prefix !== "string" || prefix.length === 0) continue;
        if (key.indexOf(prefix) === 0) {
          keysToRemove.push(key);
          break;
        }
      }
    }
    for (var m = 0; m < keysToRemove.length; m++) {
      removeLocalStorageItem(keysToRemove[m]);
    }
    return keysToRemove.length;
  }

  function createProjectSnapshot(project) {
    var source = project && isObject(project) ? project : {};
    return {
      name: typeof source.name === "string" ? source.name : "",
      singleMake: Array.isArray(source.singleMake) ? deepClone(source.singleMake) : [],
      ig_names: Array.isArray(source.ig_names) ? deepClone(source.ig_names) : [],
      value: Array.isArray(source.value) ? deepClone(source.value) : [],
      settings: isObject(source.settings) ? deepClone(source.settings) : {},
    };
  }

  function hydrateProjectForRuntime(project) {
    return createProjectSnapshot(project);
  }

  var domainDictionary = root.DSQDomainDictionary || null;

  var GLOBAL_SETTINGS_DEFAULTS = Object.freeze({
    selmodein: "assemblingMachineMk1",
    furnace: "arcSmelter",
    chemical: "chemicalPlant",
    research: "matrixLab",
    accType: "proliferatorMk1",
    accValue: "none",
  });

  var GLOBAL_SETTINGS_OPTIONS = Object.freeze({
    selmodein: ["assemblingMachineMk1", "assemblingMachineMk2", "assemblingMachineMk3", "recomposingAssembler"],
    furnace: ["arcSmelter", "planeSmelter", "negentropySmelter"],
    chemical: ["chemicalPlant", "quantumChemicalPlant"],
    research: ["matrixLab", "selfEvolutionLab"],
    accType: ["proliferatorMk1", "proliferatorMk2", "proliferatorMk3"],
    accValue: ["none", "speedup", "extra"],
  });

  function normalizeEnumValue(value, allowedValues, fallbackValue) {
    if (typeof value === "string" && allowedValues.indexOf(value) !== -1) {
      return value;
    }
    return fallbackValue;
  }

  function normalizeMachineValue(value, allowedValues, fallbackValue) {
    var normalizedValue = value;
    if (domainDictionary && typeof domainDictionary.getMachineId === "function") {
      normalizedValue = domainDictionary.getMachineId(value) || value;
    }
    return normalizeEnumValue(normalizedValue, allowedValues, fallbackValue);
  }

  function normalizeItemValue(value, allowedValues, fallbackValue) {
    var normalizedValue = value;
    if (domainDictionary && typeof domainDictionary.getItemId === "function") {
      normalizedValue = domainDictionary.getItemId(value) || value;
    }
    return normalizeEnumValue(normalizedValue, allowedValues, fallbackValue);
  }

  function normalizeAccValue(value, allowedValues, fallbackValue) {
    var normalizedValue = value;
    if (domainDictionary && typeof domainDictionary.getAccValueId === "function") {
      normalizedValue = domainDictionary.getAccValueId(value) || value;
    }
    return normalizeEnumValue(normalizedValue, allowedValues, fallbackValue);
  }

  function createGlobalSettingsSnapshot(source) {
    var output = {};
    var input = source && isObject(source) ? source : {};
    output.selmodein = normalizeMachineValue(
      input.selmodein,
      GLOBAL_SETTINGS_OPTIONS.selmodein,
      GLOBAL_SETTINGS_DEFAULTS.selmodein
    );
    output.furnace = normalizeMachineValue(
      input.furnace,
      GLOBAL_SETTINGS_OPTIONS.furnace,
      GLOBAL_SETTINGS_DEFAULTS.furnace
    );
    output.chemical = normalizeMachineValue(
      input.chemical,
      GLOBAL_SETTINGS_OPTIONS.chemical,
      GLOBAL_SETTINGS_DEFAULTS.chemical
    );
    output.research = normalizeMachineValue(
      input.research,
      GLOBAL_SETTINGS_OPTIONS.research,
      GLOBAL_SETTINGS_DEFAULTS.research
    );
    output.accType = normalizeItemValue(
      input.accType,
      GLOBAL_SETTINGS_OPTIONS.accType,
      GLOBAL_SETTINGS_DEFAULTS.accType
    );
    output.accValue = normalizeAccValue(
      input.accValue,
      GLOBAL_SETTINGS_OPTIONS.accValue,
      GLOBAL_SETTINGS_DEFAULTS.accValue
    );
    return output;
  }

  function resolveFieldLabel(options) {
    if (options && typeof options.fieldLabel === "string" && options.fieldLabel.trim()) {
      return options.fieldLabel.trim();
    }
    return "";
  }

  function t(key, params, fallback) {
    if (root.DSQI18n && typeof root.DSQI18n.t === "function") {
      return root.DSQI18n.t(key, params || null, fallback || "");
    }
    if (!fallback) {
      return key;
    }
    return fallback.replace(/\{([a-zA-Z0-9_]+)\}/g, function (match, token) {
      if (!params || !Object.prototype.hasOwnProperty.call(params, token)) {
        return match;
      }
      return params[token] == null ? "" : String(params[token]);
    });
  }

  function notifyWarning(message, duration) {
    if (!message) return;
    if (root.cocoMessage && typeof root.cocoMessage.warning === "function") {
      root.cocoMessage.warning(message, duration || 3000);
      return;
    }
    if (root.console && typeof root.console.warn === "function") {
      root.console.warn(message);
    }
  }

  function getFractionDigitsFromStep(stepValue) {
    if (typeof stepValue !== "string" && typeof stepValue !== "number") {
      return null;
    }
    var raw = String(stepValue).trim();
    if (!raw || raw === "any") {
      return null;
    }
    if (!/^[+-]?\d+(\.\d+)?$/.test(raw)) {
      return null;
    }
    var dotIndex = raw.indexOf(".");
    if (dotIndex === -1) {
      return 0;
    }
    return raw.length - dotIndex - 1;
  }

  function toFiniteNumber(rawValue) {
    if (typeof rawValue === "number") {
      return Number.isFinite(rawValue) ? rawValue : NaN;
    }
    if (typeof rawValue !== "string") {
      return NaN;
    }
    var trimmed = rawValue.trim();
    if (!trimmed) {
      return NaN;
    }
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
      return NaN;
    }
    var numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : NaN;
  }

  function roundToFractionDigits(value, digits) {
    if (!Number.isFinite(value) || typeof digits !== "number" || digits < 0) {
      return value;
    }
    return Number(value.toFixed(Math.min(digits, 12)));
  }

  function formatNumericValue(value, options) {
    if (!Number.isFinite(value)) {
      return "";
    }
    var digits = options && typeof options.maxFractionDigits === "number" ? options.maxFractionDigits : null;
    if (digits === null || digits === undefined) {
      return String(value);
    }
    return String(roundToFractionDigits(value, digits));
  }

  function normalizeNumericValue(rawValue, options) {
    var normalizedOptions = options && isObject(options) ? options : {};
    var result = {
      valid: false,
      adjusted: false,
      value: NaN,
      reason: "invalid",
      fieldLabel: resolveFieldLabel(normalizedOptions),
    };
    var numeric = toFiniteNumber(rawValue);
    if (!Number.isFinite(numeric)) {
      return result;
    }

    if (normalizedOptions.integer === true) {
      if (Math.floor(numeric) !== numeric) {
        if (normalizedOptions.clamp === true) {
          numeric = Math.round(numeric);
          result.adjusted = true;
        } else {
          result.reason = "not_integer";
          return result;
        }
      }
    }

    if (typeof normalizedOptions.maxFractionDigits === "number") {
      var rounded = roundToFractionDigits(numeric, normalizedOptions.maxFractionDigits);
      if (rounded !== numeric) {
        numeric = rounded;
        result.adjusted = true;
      }
    }

    if (normalizedOptions.requirePositive === true && !(numeric > 0)) {
      result.reason = "not_positive";
      return result;
    }

    if (typeof normalizedOptions.min === "number" && numeric < normalizedOptions.min) {
      if (normalizedOptions.clamp === true) {
        numeric = normalizedOptions.min;
        result.adjusted = true;
      } else {
        result.reason = "below_min";
        return result;
      }
    }

    if (typeof normalizedOptions.max === "number" && numeric > normalizedOptions.max) {
      if (normalizedOptions.clamp === true) {
        numeric = normalizedOptions.max;
        result.adjusted = true;
      } else {
        result.reason = "above_max";
        return result;
      }
    }

    result.valid = true;
    result.value = numeric;
    result.reason = result.adjusted ? "adjusted" : "ok";
    return result;
  }

  function resolveNumericBoundsFromElement(element, options) {
    var normalizedOptions = options && isObject(options) ? options : {};
    var min = normalizedOptions.min;
    var max = normalizedOptions.max;
    var step = normalizedOptions.step;

    if (element && normalizedOptions.useInputAttributes !== false) {
      if (min === undefined && element.hasAttribute("min")) {
        var attrMin = toFiniteNumber(element.getAttribute("min"));
        if (Number.isFinite(attrMin)) {
          min = attrMin;
        }
      }
      if (max === undefined && element.hasAttribute("max")) {
        var attrMax = toFiniteNumber(element.getAttribute("max"));
        if (Number.isFinite(attrMax)) {
          max = attrMax;
        }
      }
      if (step === undefined && element.hasAttribute("step")) {
        step = element.getAttribute("step");
      }
    }

    var maxFractionDigits = normalizedOptions.maxFractionDigits;
    if (maxFractionDigits === undefined) {
      maxFractionDigits = getFractionDigitsFromStep(step);
    }

    var integer = normalizedOptions.integer;
    if (integer === undefined && maxFractionDigits === 0) {
      integer = true;
    }

    return {
      min: Number.isFinite(min) ? min : undefined,
      max: Number.isFinite(max) ? max : undefined,
      integer: integer === true,
      maxFractionDigits: typeof maxFractionDigits === "number" ? maxFractionDigits : undefined,
    };
  }

  function resolveNumericTarget(target) {
    if (!target) return null;
    if (typeof target === "string" && typeof document !== "undefined") {
      return document.getElementById(target);
    }
    if (typeof target === "object" && target.nodeType === 1) {
      return target;
    }
    return null;
  }

  function getPreviousNumericValue(element, options) {
    var normalizedOptions = options && isObject(options) ? options : {};
    var previousValue = normalizedOptions.previousValue;
    if (!Number.isFinite(previousValue) && element && element.dataset && element.dataset.lastValid) {
      previousValue = toFiniteNumber(element.dataset.lastValid);
    }
    if (!Number.isFinite(previousValue) && Number.isFinite(normalizedOptions.fallbackValue)) {
      previousValue = normalizedOptions.fallbackValue;
    }
    return Number.isFinite(previousValue) ? previousValue : NaN;
  }

  function warnNumericIssue(result, nextValue, options) {
    var normalizedOptions = options && isObject(options) ? options : {};
    if (normalizedOptions.warn === false) {
      return;
    }
    var params = {
      field: result.fieldLabel || t("message.numeric_field_generic", null, "输入值"),
      value: formatNumericValue(nextValue, normalizedOptions),
    };
    notifyWarning(
      t("message.numeric_input_reverted", params, "{field}无效，已恢复为 {value}"),
      normalizedOptions.warningDuration || 3000
    );
  }

  function updateNumericElementState(element, nextValue, options) {
    if (!element) return;
    var displayValue = formatNumericValue(nextValue, options);
    if (displayValue !== "") {
      element.value = displayValue;
      if (element.dataset) {
        element.dataset.lastValid = displayValue;
      }
    }
  }

  function readNumericInput(target, options) {
    var element = resolveNumericTarget(target);
    var normalizedOptions = options && isObject(options) ? options : {};
    var rawValue = element ? element.value : target;
    var previousValue = getPreviousNumericValue(element, normalizedOptions);
    var bounds = resolveNumericBoundsFromElement(element, normalizedOptions);
    var result = normalizeNumericValue(rawValue, {
      fieldLabel: normalizedOptions.fieldLabel,
      min: bounds.min,
      max: bounds.max,
      integer: bounds.integer,
      maxFractionDigits: bounds.maxFractionDigits,
      requirePositive: normalizedOptions.requirePositive === true,
      clamp: normalizedOptions.clamp === true,
    });

    if (result.valid) {
      updateNumericElementState(element, result.value, bounds);
      return result.value;
    }

    var fallbackValue = previousValue;
    if (!Number.isFinite(fallbackValue)) {
      fallbackValue = Number.isFinite(normalizedOptions.fallbackValue) ? normalizedOptions.fallbackValue : NaN;
    }
    if (!Number.isFinite(fallbackValue)) {
      fallbackValue = Number.isFinite(bounds.min) ? bounds.min : 0;
    }
    updateNumericElementState(element, fallbackValue, bounds);
    warnNumericIssue(
      result,
      fallbackValue,
      Object.assign({}, normalizedOptions, {
        min: bounds.min,
        max: bounds.max,
        integer: bounds.integer,
        maxFractionDigits: bounds.maxFractionDigits,
      })
    );
    return fallbackValue;
  }

  function rememberNumericInput(target, options) {
    return readNumericInput(target, {
      warn: false,
      fallbackValue: options && options.fallbackValue,
      previousValue: options && options.previousValue,
      min: options && options.min,
      max: options && options.max,
      step: options && options.step,
      integer: options && options.integer,
      maxFractionDigits: options && options.maxFractionDigits,
      requirePositive: options && options.requirePositive,
      clamp: options && options.clamp,
      useInputAttributes: options && options.useInputAttributes,
      fieldLabel: options && options.fieldLabel,
    });
  }

  function normalizeProjectName(rawValue, options) {
    var normalizedOptions = options && isObject(options) ? options : {};
    var maxLength = Number.isFinite(normalizedOptions.maxLength) ? normalizedOptions.maxLength : 80;
    var value = typeof rawValue === "string" ? rawValue.replace(/\s+/g, " ").trim() : "";
    if (!value) {
      return {
        valid: false,
        value: "",
        maxLength: maxLength,
        message: t("message.project_name_required", null, "方案名不能为空"),
      };
    }
    if (value.length > maxLength) {
      return {
        valid: false,
        value: value.slice(0, maxLength),
        maxLength: maxLength,
        message: t("message.project_name_too_long", { max: maxLength }, "方案名不能超过 {max} 个字符"),
      };
    }
    return {
      valid: true,
      value: value,
      maxLength: maxLength,
      message: "",
    };
  }

  root.DSQServices = {
    deepClone: deepClone,
    safeParseJSON: safeParseJSON,
    safeStringify: safeStringify,
    storage: {
      hasLocalStorage: hasLocalStorage,
      getItem: getLocalStorageItem,
      setItem: setLocalStorageItem,
      removeItem: removeLocalStorageItem,
      clearByPrefixes: clearByPrefixes,
    },
    project: {
      createSnapshot: createProjectSnapshot,
      hydrateForRuntime: hydrateProjectForRuntime,
      normalizeName: normalizeProjectName,
    },
    domain: domainDictionary,
    globalSettings: {
      defaults: GLOBAL_SETTINGS_DEFAULTS,
      options: GLOBAL_SETTINGS_OPTIONS,
      createSnapshot: createGlobalSettingsSnapshot,
    },
    numeric: {
      normalizeValue: normalizeNumericValue,
      readInput: readNumericInput,
      rememberInput: rememberNumericInput,
      formatValue: formatNumericValue,
    },
    notify: {
      warning: notifyWarning,
    },
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
