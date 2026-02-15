/**
 * 存储管理模块 - 从 data.js 拆分
 *
 * 职责：
 * - localStorage/cookie 数据存储
 * - 配方设置持久化 (settings/settings_time/settings_pf)
 * - 项目列表管理 (projects)
 *
 * 架构师注：
 * - 此模块仅包含纯存储逻辑，不包含业务逻辑
 * - 保持全局变量挂载到window，确保向后兼容
 * - 隐私模式下localStorage不可用时静默失败
 */

function saveData(key, value) {
  try {
    if (window.localStorage) {
      localStorage.setItem(key, value)
    } else {
      document.cookie = key + '=' + encodeURIComponent(value) + ';path=/'
    }
  } catch (e) {
    // 隐私模式下 localStorage 不可用，静默失败
  }
}

function getData(key) {
  try {
    if (window.localStorage) {
      return localStorage.getItem(key)
    } else {
      var cookies = document.cookie.split(';')
      for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i].trim()
        if (cookie.indexOf(key + '=') === 0) {
          return decodeURIComponent(cookie.substring(key.length + 1))
        }
      }
      return null
    }
  } catch (e) {
    return null
  }
}

var settings = {}
window.settings = settings

function saveSetting() {
  saveData('machine_settings' + window.version, JSON.stringify(settings))
}
window.saveSetting = saveSetting

function loadSetting() {
  var json = getData('machine_settings' + window.version)
  if (json) {
    try {
      var parsed = JSON.parse(json)
      Object.keys(settings).forEach(function (key) {
        delete settings[key]
      })
      Object.keys(parsed).forEach(function (key) {
        settings[key] = parsed[key]
      })
    } catch (e) {
      Object.keys(settings).forEach(function (key) {
        delete settings[key]
      })
    }
  }
  var el1 = document.getElementById('onlyConveyorBeltMk3')
  var el2 = document.getElementById('onlySorterMk3')
  if (el1) el1.checked = true
  if (el2) el2.checked = true
}
window.loadSetting = loadSetting

var settings_time = {}
window.settings_time = settings_time

function saveSettingTime() {
  saveData('machine_settings_time' + window.version, JSON.stringify(settings_time))
}
window.saveSettingTime = saveSettingTime

function loadSettingTime() {
  var json = getData('machine_settings_time' + window.version)
  if (json) {
    try {
      var parsed = JSON.parse(json)
      Object.keys(settings_time).forEach(function (key) {
        delete settings_time[key]
      })
      Object.keys(parsed).forEach(function (key) {
        settings_time[key] = parsed[key]
      })
    } catch (e) {
      Object.keys(settings_time).forEach(function (key) {
        delete settings_time[key]
      })
    }
  }
}
window.loadSettingTime = loadSettingTime

var settings_pf = {}
window.settings_pf = settings_pf

function saveSettingPf() {
  saveData('machine_settings_pf' + window.version, JSON.stringify(settings_pf))
}
window.saveSettingPf = saveSettingPf

function loadSettingPf() {
  var json = getData('machine_settings_pf' + window.version)
  if (json) {
    try {
      var parsed = JSON.parse(json)
      Object.keys(settings_pf).forEach(function (key) {
        delete settings_pf[key]
      })
      Object.keys(parsed).forEach(function (key) {
        settings_pf[key] = parsed[key]
      })
    } catch (e) {
      Object.keys(settings_pf).forEach(function (key) {
        delete settings_pf[key]
      })
    }
  }
}
window.loadSettingPf = loadSettingPf

var projects = []

function saveSettingProjects() {
  saveData('settings_projects' + window.version, JSON.stringify(projects))
}

function loadSettingProjects() {
  var json = getData('settings_projects' + window.version)
  if (json) {
    try {
      var parsed = JSON.parse(json)
      projects.length = 0
      parsed.forEach(function (item) {
        projects.push(item)
      })
    } catch (e) {
      projects.length = 0
    }
  }
}

export {
  saveData,
  getData,
  settings,
  saveSetting,
  loadSetting,
  settings_time,
  saveSettingTime,
  loadSettingTime,
  settings_pf,
  saveSettingPf,
  loadSettingPf,
  projects,
  saveSettingProjects,
  loadSettingProjects
}
