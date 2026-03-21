// Scripts/data.state.js
// data.js 拆分出的全局状态边界，保持 legacy script 运行形态不变。
const root = typeof globalThis !== "undefined" ? globalThis : window;

// 版本号，用于 data.json 缓存键。
root.version = "20240202";

// 全局配置与运行态状态
root.pointLength = 3;
root.settingsLocal = {};
root.settings = {};
root.settings_time = {};
root.settings_pf = {};
root.projects = [];
root.currentItem = null;
root.xqs = [];
root.singleMake = [];
root.xqss = [];
root.game_data = {};
root.isDataLoaded = false;
