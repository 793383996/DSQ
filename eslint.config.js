import globals from "globals";

const legacyFiles = [
  "Scripts/data.state.js",
  "Scripts/data.js",
  "Scripts/data.storage.js",
  "Scripts/data.bootstrap.js",
  "Scripts/blueprint.js",
  "Scripts/blueprint.constants.js",
  "Scripts/blueprint.facade.js",
  "Scripts/blueprint.worker.js",
  "Scripts/jquery.tips.js",
  "Scripts/cocoMessage.js",
  "Scripts/error-monitor.js",
];

const strictRules = {
  "no-unused-vars": "error",
  "no-undef": "error",
  "no-redeclare": "error",
  "no-case-declarations": "warn",
  "no-fallthrough": "error",
  "no-inner-declarations": "off",
  "no-useless-escape": "warn",
  "prefer-const": "warn",
  "no-var": "off",
  "prefer-arrow-callback": "off",
};

const legacyRules = {
  "no-unused-vars": "warn",
  "no-undef": "warn",
  "no-redeclare": "warn",
  "no-case-declarations": "off",
  "no-fallthrough": "warn",
  "no-inner-declarations": "off",
  "no-useless-escape": "warn",
  "prefer-const": "off",
  "no-var": "off",
  "prefer-arrow-callback": "off",
};

const globalVars = {
  ...globals.browser,
  ...globals.jquery,
  Vue: "readonly",
  pako: "readonly",
  cocoMessage: "readonly",
  data: "writable",
  blueprint: "writable",
  BlueprintFacade: "readonly",
  BlueprintWorker: "readonly",
  Blueprint: "readonly",
  DSQBlueprintConstants: "readonly",
  ErrorMonitor: "readonly",
  PerformanceTracker: "readonly",
  saveData: "readonly",
  getData: "readonly",
  saveSetting: "readonly",
  loadSetting: "readonly",
  saveSettingTime: "readonly",
  loadSettingTime: "readonly",
  saveSettingPf: "readonly",
  loadSettingPf: "readonly",
  saveSettingProjects: "readonly",
  loadSettingProjects: "readonly",
  version: "writable",
  pointLength: "writable",
  settingsLocal: "writable",
  settings: "writable",
  settings_time: "writable",
  settings_pf: "writable",
  projects: "writable",
  currentItem: "writable",
  xqs: "writable",
  singleMake: "writable",
  xqss: "writable",
  game_data: "writable",
  isDataLoaded: "writable",
};

export default [
  {
    ignores: [
      "**/*.min.js",
      "**/*.backup",
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "Scripts/pako.js",
      "Scripts/data.json",
    ],
  },
  {
    files: ["Scripts/**/*.js"],
    ignores: legacyFiles,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: globalVars,
    },
    rules: strictRules,
  },
  {
    files: legacyFiles,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: globalVars,
    },
    rules: legacyRules,
  },
  {
    files: ["Scripts/data.state.js", "Scripts/data.storage.js", "Scripts/data.bootstrap.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globalVars,
        f_init: "readonly",
        f_initIcons: "readonly",
      },
    },
    rules: {
      ...legacyRules,
      "no-unused-vars": "off",
    },
  },
  {
    files: ["localDev/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "error",
    },
  },
];
