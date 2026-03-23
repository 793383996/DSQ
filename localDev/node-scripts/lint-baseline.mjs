import { spawnSync } from "node:child_process";
import path from "node:path";

const BASELINE_WARNING_COUNT = 61;

function runEslintJson() {
  const eslintCli = path.join(process.cwd(), "node_modules", "eslint", "bin", "eslint.js");
  const result = spawnSync(process.execPath, [eslintCli, "Scripts", "localDev", "-f", "json"], {
    encoding: "utf8",
  });

  if (result.status !== 0 && !result.stdout) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(output || "lint-baseline: eslint execution failed.");
  }

  return result.stdout;
}

function parseLintReport(reportText) {
  const report = JSON.parse(reportText || "[]");
  return report.reduce(
    (acc, fileResult) => {
      acc.warningCount += fileResult.warningCount || 0;
      acc.errorCount += fileResult.errorCount || 0;
      return acc;
    },
    { warningCount: 0, errorCount: 0 }
  );
}

function main() {
  const lintJson = runEslintJson();
  const { warningCount, errorCount } = parseLintReport(lintJson);

  if (errorCount > 0) {
    throw new Error(`lint-baseline: detected ${errorCount} lint errors.`);
  }

  if (warningCount > BASELINE_WARNING_COUNT) {
    throw new Error(
      `lint-baseline: warning count increased from baseline ${BASELINE_WARNING_COUNT} to ${warningCount}.`
    );
  }

  console.log(`lint-baseline: warnings=${warningCount}, baseline=${BASELINE_WARNING_COUNT} (ok).`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
