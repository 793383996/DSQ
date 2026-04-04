var migratedLegacyCookieKeys = {};

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
  try {
    return !!window.localStorage;
  } catch {
    return false;
  }
}

function migrateCookieToLocalStorage(key) {
  if (!hasLocalStorage()) return null;
  if (migratedLegacyCookieKeys[key]) {
    return localStorage.getItem(key);
  }
  var cookieValue = readCookieValue(key);
  if (cookieValue == null) {
    migratedLegacyCookieKeys[key] = true;
    return localStorage.getItem(key);
  }
  localStorage.setItem(key, cookieValue);
  removeCookie(key);
  migratedLegacyCookieKeys[key] = true;
  return cookieValue;
}

window.saveData = function (key, value) {
  if (!hasLocalStorage()) return;
  localStorage.setItem(key, value);
};

window.getData = function (key) {
  if (!hasLocalStorage()) {
    return readCookieValue(key);
  }
  var localValue = localStorage.getItem(key);
  if (localValue != null) {
    return localValue;
  }
  return migrateCookieToLocalStorage(key);
};

window.saveSetting = function () {
  saveData("machine_settings" + window.version, JSON.stringify(window.settings));
};

window.loadSetting = function () {
  var json = getData("machine_settings" + window.version);
  if (json) {
    eval("window.settings = " + json);
  }
  document.getElementById("onlyConveyorBeltMk3").checked = true;
  document.getElementById("onlySorterMk3").checked = true;
};

window.saveSettingTime = function () {
  saveData("machine_settings_time" + window.version, JSON.stringify(window.settings_time));
};

window.loadSettingTime = function () {
  var json = getData("machine_settings_time" + window.version);
  if (json) {
    eval("window.settings_time = " + json);
  }
};

window.saveSettingPf = function () {
  saveData("machine_settings_pf" + window.version, JSON.stringify(window.settings_pf));
};

window.loadSettingPf = function () {
  var json = getData("machine_settings_pf" + window.version);
  if (json) {
    eval("window.settings_pf = " + json);
  }
};

window.saveSettingProjects = function () {
  saveData("settings_projects" + window.version, JSON.stringify(window.projects));
};

window.loadSettingProjects = function () {
  var json = getData("settings_projects" + window.version);
  if (json) {
    eval("window.projects = " + json);
  }
};
