var migratedLegacyCookieKeys = {};
var storageServices = window.DSQServices || null;
var storageAdapter = storageServices && storageServices.storage ? storageServices.storage : null;
var globalSettingsService = storageServices && storageServices.globalSettings ? storageServices.globalSettings : null;

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
  saveData("machine_settings" + window.version, JSON.stringify(window.settings));
};

window.loadSetting = function () {
  var parsed = loadStoredObject("machine_settings" + window.version, {});
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    window.settings = parsed;
  }
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
  saveData("machine_settings_time" + window.version, JSON.stringify(window.settings_time));
};

window.loadSettingTime = function () {
  var parsed = loadStoredObject("machine_settings_time" + window.version, {});
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    window.settings_time = parsed;
  }
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
  saveData("settings_projects" + window.version, JSON.stringify(window.projects));
};

window.loadSettingProjects = function () {
  var parsed = loadStoredObject("settings_projects" + window.version, []);
  if (Array.isArray(parsed)) {
    window.projects = parsed;
  }
};
