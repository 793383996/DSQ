import { access, readFile } from "node:fs/promises";

const INVENTORY_PATH = "localDev/vendor-inventory.json";

const REQUIRED_DEP_FIELDS = [
  "name",
  "file",
  "version",
  "source",
  "license",
  "riskLevel",
  "status",
  "alternative",
  "migrationPlan",
  "targetQuarter",
];

const ALLOWED_RISK_LEVELS = new Set(["low", "medium", "high", "critical"]);
const ALLOWED_STATUS = new Set(["keep", "upgrade", "replace", "isolate", "remove"]);
const QUARTER_PATTERN = /^\d{4}-Q[1-4]$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function validateDependency(dep, index) {
  const prefix = `vendor-baseline failed: dependencies[${index}]`;

  for (const field of REQUIRED_DEP_FIELDS) {
    ensure(isNonEmptyString(dep[field]), `${prefix} missing required field "${field}".`);
  }

  ensure(ALLOWED_RISK_LEVELS.has(dep.riskLevel), `${prefix} has invalid riskLevel "${dep.riskLevel}".`);
  ensure(ALLOWED_STATUS.has(dep.status), `${prefix} has invalid status "${dep.status}".`);
  ensure(QUARTER_PATTERN.test(dep.targetQuarter), `${prefix} has invalid targetQuarter "${dep.targetQuarter}".`);

  await access(dep.file).catch(() => {
    throw new Error(`${prefix} file not found: ${dep.file}`);
  });
}

function validateQuarterPlan(plan) {
  ensure(Array.isArray(plan), "vendor-baseline failed: quarterlyPlan must be an array.");
  ensure(plan.length >= 3, "vendor-baseline failed: quarterlyPlan should include at least 3 quarters.");

  for (let i = 0; i < plan.length; i += 1) {
    const item = plan[i];
    const prefix = `vendor-baseline failed: quarterlyPlan[${i}]`;
    ensure(isNonEmptyString(item.quarter), `${prefix} missing quarter.`);
    ensure(QUARTER_PATTERN.test(item.quarter), `${prefix} has invalid quarter "${item.quarter}".`);
    ensure(isNonEmptyString(item.goal), `${prefix} missing goal.`);
    ensure(Array.isArray(item.deliverables) && item.deliverables.length > 0, `${prefix} missing deliverables.`);
    ensure(item.deliverables.every(isNonEmptyString), `${prefix} deliverables must only contain non-empty strings.`);
  }
}

function ensureHighRiskCovered(dependencies, quarterlyPlan) {
  const planText = JSON.stringify(quarterlyPlan).toLowerCase();
  const highRisk = dependencies.filter(dep => dep.riskLevel === "high" || dep.riskLevel === "critical");
  const uncovered = highRisk.map(dep => dep.name).filter(name => !planText.includes(String(name).toLowerCase()));

  ensure(
    uncovered.length === 0,
    `vendor-baseline failed: high-risk dependencies missing from quarterlyPlan: ${uncovered.join(", ")}`
  );
}

async function main() {
  const raw = await readFile(INVENTORY_PATH, "utf8");
  const inventory = JSON.parse(raw);

  ensure(isNonEmptyString(inventory.updatedAt), "vendor-baseline failed: missing updatedAt.");
  ensure(DATE_PATTERN.test(inventory.updatedAt), `vendor-baseline failed: invalid updatedAt "${inventory.updatedAt}".`);
  ensure(isNonEmptyString(inventory.owner), "vendor-baseline failed: missing owner.");
  ensure(Array.isArray(inventory.dependencies), "vendor-baseline failed: dependencies must be an array.");
  ensure(inventory.dependencies.length > 0, "vendor-baseline failed: dependencies cannot be empty.");

  for (let i = 0; i < inventory.dependencies.length; i += 1) {
    await validateDependency(inventory.dependencies[i], i);
  }

  validateQuarterPlan(inventory.quarterlyPlan);
  ensureHighRiskCovered(inventory.dependencies, inventory.quarterlyPlan);

  const riskSummary = inventory.dependencies.reduce(
    (acc, dep) => {
      acc.total += 1;
      acc[dep.riskLevel] += 1;
      return acc;
    },
    { total: 0, low: 0, medium: 0, high: 0, critical: 0 }
  );

  console.log(
    `vendor-baseline passed. total=${riskSummary.total}, low=${riskSummary.low}, medium=${riskSummary.medium}, high=${riskSummary.high}, critical=${riskSummary.critical}`
  );
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
