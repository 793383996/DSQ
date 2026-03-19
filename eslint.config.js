import globals from "globals";

const legacyFiles = [
  "Scripts/data.js",
  "Scripts/blueprint.js",
  "Scripts/blueprint.facade.js",
  "Scripts/blueprint.worker.js",
  "Scripts/jquery.tips.js",
  "Scripts/cocoMessage.js",
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
      globals: {
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
      },
    },
    rules: strictRules,
  },
  {
    files: legacyFiles,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
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
      },
    },
    rules: legacyRules,
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
