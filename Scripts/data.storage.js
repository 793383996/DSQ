window.saveData = function (key, value) {
  if (window.localStorage) {
    localStorage.setItem(key, value);
  } else {
    $.cookie(key, value);
  }
};

window.getData = function (key) {
  if (window.localStorage) {
    return localStorage.getItem(key);
  }
  return $.cookie(key);
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
