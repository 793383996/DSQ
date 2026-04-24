import { readFileSync } from "node:fs";

const TARGET_FILES = [
  "Scripts/calc-core.js",
  "Scripts/data.recipe-init.js",
  "Scripts/data.recipe.js",
  "Scripts/data.recipe-ui.js",
  "Scripts/data.ui-bindings.js",
  "Scripts/data.blueprint.js",
];

const PATTERNS = [
  /(?:==|===|!=|!==)\s*["'`][^"'`\r\n]*[\u4e00-\u9fff][^"'`\r\n]*["'`]/,
  /["'`][^"'`\r\n]*[\u4e00-\u9fff][^"'`\r\n]*["'`]\s*(?:==|===|!=|!==)/,
  /\.includes\(\s*["'`][^"'`\r\n]*[\u4e00-\u9fff][^"'`\r\n]*["'`]/,
  /\.indexOf\(\s*["'`][^"'`\r\n]*[\u4e00-\u9fff][^"'`\r\n]*["'`]/,
];

const violations = [];

for (const file of TARGET_FILES) {
  const source = readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      return;
    }
    for (const pattern of PATTERNS) {
      if (pattern.test(line)) {
        violations.push(`${file}:${index + 1}: ${trimmed}`);
        break;
      }
    }
  });
}

if (violations.length > 0) {
  console.error("Detected direct Chinese-name logic comparisons in core files:");
  violations.forEach(item => console.error(item));
  process.exit(1);
}

console.log("Logic id guard passed.");
