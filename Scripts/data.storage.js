var migratedLegacyCookieKeys = {};
var storageServices = window.DSQServices || null;
var storageAdapter = storageServices && storageServices.storage ? storageServices.storage : null;
var globalSettingsService = storageServices && storageServices.globalSettings ? storageServices.globalSettings : null;
var projectService = storageServices && storageServices.project ? storageServices.project : null;
var domainDictionary = window.DSQDomainDictionary || null;

function readCookieValue(key) {
  if (!key || typeof document === "undefined") return null;
  var escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var match = document.cookie.match(new RegExp("(?:^|; )" + escapedKey + "=([^;]*)"));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function removeCookie(key) {
  if (!key || typeof document === "undefined") return;
  document.cookie = key + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

function hasLocalStorage() {
  if (storageAdapter && typeof storageAdapter.hasLocalStorage === "function") {
    return storageAdapter.hasLocalStorage();
  }
  try {
    return !!window.localStorage;
  } catch {
    return false;
  }
}

function getLocalStorageItem(key) {
  if (!hasLocalStorage()) return null;
  if (storageAdapter && typeof storageAdapter.getItem === "function") {
    return storageAdapter.getItem(key);
  }
  return localStorage.getItem(key);
}

function setLocalStorageItem(key, value) {
  if (!hasLocalStorage()) return;
  if (storageAdapter && typeof storageAdapter.setItem === "function") {
    storageAdapter.setItem(key, value);
    return;
  }
  localStorage.setItem(key, value);
}

function migrateCookieToLocalStorage(key) {
  if (!hasLocalStorage()) return null;
  if (migratedLegacyCookieKeys[key]) {
    return getLocalStorageItem(key);
  }
  var cookieValue = readCookieValue(key);
  if (cookieValue == null) {
    migratedLegacyCookieKeys[key] = true;
    return getLocalStorageItem(key);
  }
  setLocalStorageItem(key, cookieValue);
  removeCookie(key);
  migratedLegacyCookieKeys[key] = true;
  return cookieValue;
}

function parseStoredJSON(raw, fallbackValue) {
  if (!raw) return fallbackValue;
  if (storageServices && typeof storageServices.safeParseJSON === "function") {
    return storageServices.safeParseJSON(raw, fallbackValue);
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function loadStoredObject(key, fallbackValue) {
  var raw = getData(key);
  var parsed = parseStoredJSON(raw, fallbackValue);
  return parsed && typeof parsed === "object" ? parsed : fallbackValue;
}

function normalizeGlobalSettingsForStorage(source) {
  if (globalSettingsService && typeof globalSettingsService.createSnapshot === "function") {
    return globalSettingsService.createSnapshot(source);
  }
  return source && typeof source === "object" ? source : {};
}

function normalizeMachineSettingRecord(source) {
  var input = source && typeof source === "object" ? source : {};
  var output = {};
  if (input.m != null) {
    var machineId =
      domainDictionary && typeof domainDictionary.getMachineId === "function"
        ? domainDictionary.getMachineId(input.m)
        : input.m;
    if (machineId) {
      output.m = machineId;
    }
  }
  if (input.accType != null) {
    var accTypeId =
      domainDictionary && typeof domainDictionary.getItemId === "function"
        ? domainDictionary.getItemId(input.accType)
        : input.accType;
    if (accTypeId) {
      output.accType = accTypeId;
    }
  }
  if (input.accValue != null) {
    var accValueId =
      domainDictionary && typeof domainDictionary.getAccValueId === "function"
        ? domainDictionary.getAccValueId(input.accValue)
        : input.accValue;
    if (accValueId) {
      output.accValue = accValueId;
    }
  }
  return output;
}

function normalizeMachineSettingsForStorage(source) {
  var input = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  var output = {};
  var keys = Object.keys(input);
  for (var i = 0; i < keys.length; i++) {
    output[keys[i]] = normalizeMachineSettingRecord(input[keys[i]]);
  }
  return output;
}

function normalizeSpeedSettingsForStorage(source) {
  var input = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  var output = {};
  var keys = Object.keys(input);
  for (var i = 0; i < keys.length; i++) {
    var rawKey = keys[i];
    var machineId =
      domainDictionary && typeof domainDictionary.getMachineId === "function"
        ? domainDictionary.getMachineId(rawKey)
        : rawKey;
    var numericValue = Number(input[rawKey]);
    if (!machineId || !Number.isFinite(numericValue) || numericValue <= 0) {
      continue;
    }
    output[machineId] = numericValue;
  }
  return output;
}

function normalizeProjectForStorage(project) {
  var snapshot =
    projectService && typeof projectService.createSnapshot === "function"
      ? projectService.createSnapshot(project)
      : project && typeof project === "object"
        ? project
        : {};
  snapshot.settings = normalizeMachineSettingsForStorage(snapshot.settings);
  return snapshot;
}

function normalizeProjectsForStorage(source) {
  if (!Array.isArray(source)) {
    return [];
  }
  var output = [];
  for (var i = 0; i < source.length; i++) {
    output.push(normalizeProjectForStorage(source[i]));
  }
  return output;
}

window.saveData = function (key, value) {
  setLocalStorageItem(key, value);
};

window.getData = function (key) {
  if (!hasLocalStorage()) {
    return readCookieValue(key);
  }
  var localValue = getLocalStorageItem(key);
  if (localValue != null) {
    return localValue;
  }
  return migrateCookieToLocalStorage(key);
};

window.saveSetting = function () {
  window.settings = normalizeMachineSettingsForStorage(window.settings);
  saveData("machine_settings" + window.version, JSON.stringify(window.settings));
};

window.loadSetting = function () {
  var parsed = loadStoredObject("machine_settings" + window.version, {});
  window.settings = normalizeMachineSettingsForStorage(parsed);
  var beltNode = document.getElementById("onlyConveyorBeltMk3");
  var sorterNode = document.getElementById("onlySorterMk3");
  if (beltNode) {
    beltNode.checked = true;
  }
  if (sorterNode) {
    sorterNode.checked = true;
  }
};

window.saveGlobalSettings = function () {
  saveData(
    "global_settings" + window.version,
    JSON.stringify(normalizeGlobalSettingsForStorage(window.global_settings))
  );
};

window.loadGlobalSettings = function () {
  var parsed = loadStoredObject("global_settings" + window.version, {});
  window.global_settings = normalizeGlobalSettingsForStorage(parsed);
};

window.saveSettingTime = function () {
  window.settings_time = normalizeSpeedSettingsForStorage(window.settings_time);
  saveData("machine_settings_time" + window.version, JSON.stringify(window.settings_time));
};

window.loadSettingTime = function () {
  var parsed = loadStoredObject("machine_settings_time" + window.version, {});
  window.settings_time = normalizeSpeedSettingsForStorage(parsed);
};

window.saveSettingPf = function () {
  saveData("machine_settings_pf" + window.version, JSON.stringify(window.settings_pf));
};

window.loadSettingPf = function () {
  var parsed = loadStoredObject("machine_settings_pf" + window.version, {});
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    window.settings_pf = parsed;
  }
};

window.saveSettingProjects = function () {
  window.projects = normalizeProjectsForStorage(window.projects);
  saveData("settings_projects" + window.version, JSON.stringify(window.projects));
};

window.loadSettingProjects = function () {
  var parsed = loadStoredObject("settings_projects" + window.version, []);
  window.projects = normalizeProjectsForStorage(parsed);
};
