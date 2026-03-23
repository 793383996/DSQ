import { access, readFile } from "node:fs/promises";

const CONFIG_PATH = "localDev/monitoring/business-metrics.config.json";
const SOURCE_PATHS = ["Scripts/index.events.js", "Scripts/data.blueprint.js", "Scripts/i18n.js"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_EVENTS = new Set([
  "page_view",
  "add_requirement_click",
  "save_project_click",
  "generate_blueprint_click",
  "blueprint_generate_attempt",
  "blueprint_generate_success",
  "blueprint_generate_failed",
]);

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

async function readSources(paths) {
  const contents = await Promise.all(paths.map(path => readFile(path, "utf8")));
  return contents.join("\n");
}

async function main() {
  const raw = await readFile(CONFIG_PATH, "utf8");
  const config = JSON.parse(raw);

  ensure(isNonEmptyString(config.updatedAt), "metrics:check failed: missing updatedAt.");
  ensure(DATE_PATTERN.test(config.updatedAt), `metrics:check failed: invalid updatedAt "${config.updatedAt}".`);
  ensure(isNonEmptyString(config.owner), "metrics:check failed: missing owner.");

  ensure(Array.isArray(config.events), "metrics:check failed: events must be an array.");
  ensure(config.events.length > 0, "metrics:check failed: events cannot be empty.");

  const eventNames = new Set();
  for (let i = 0; i < config.events.length; i += 1) {
    const event = config.events[i];
    const prefix = `metrics:check failed: events[${i}]`;
    ensure(isNonEmptyString(event.name), `${prefix} missing name.`);
    ensure(!eventNames.has(event.name), `${prefix} duplicate event name "${event.name}".`);
    eventNames.add(event.name);
    ensure(isNonEmptyString(event.description), `${prefix} missing description.`);
    ensure(isNonEmptyString(event.trigger), `${prefix} missing trigger.`);
    ensure(isNonEmptyString(event.chain), `${prefix} missing chain.`);
    ensure(isNonEmptyStringArray(event.requiredFields), `${prefix} requiredFields must be a non-empty string array.`);
  }

  for (const requiredEvent of REQUIRED_EVENTS) {
    ensure(eventNames.has(requiredEvent), `metrics:check failed: missing required event "${requiredEvent}".`);
  }

  ensure(config.funnel && typeof config.funnel === "object", "metrics:check failed: missing funnel config.");
  ensure(isNonEmptyString(config.funnel.name), "metrics:check failed: funnel.name is required.");
  ensure(Number.isFinite(config.funnel.windowDays), "metrics:check failed: funnel.windowDays must be numeric.");
  ensure(
    Array.isArray(config.funnel.steps) && config.funnel.steps.length >= 2,
    "metrics:check failed: funnel.steps is invalid."
  );
  for (let i = 0; i < config.funnel.steps.length; i += 1) {
    const step = config.funnel.steps[i];
    ensure(step && isNonEmptyString(step.event), `metrics:check failed: funnel.steps[${i}] missing event.`);
    ensure(eventNames.has(step.event), `metrics:check failed: funnel step event not declared: "${step.event}".`);
  }

  ensure(config.retention && typeof config.retention === "object", "metrics:check failed: missing retention config.");
  ensure(
    Array.isArray(config.retention.cohorts) && config.retention.cohorts.length > 0,
    "metrics:check failed: retention.cohorts cannot be empty."
  );
  for (let i = 0; i < config.retention.cohorts.length; i += 1) {
    const cohort = config.retention.cohorts[i];
    const prefix = `metrics:check failed: retention.cohorts[${i}]`;
    ensure(isNonEmptyString(cohort.name), `${prefix} missing name.`);
    ensure(isNonEmptyString(cohort.entryEvent), `${prefix} missing entryEvent.`);
    ensure(isNonEmptyString(cohort.returnEvent), `${prefix} missing returnEvent.`);
    ensure(eventNames.has(cohort.entryEvent), `${prefix} entryEvent not declared: "${cohort.entryEvent}".`);
    ensure(eventNames.has(cohort.returnEvent), `${prefix} returnEvent not declared: "${cohort.returnEvent}".`);
    ensure(isNonEmptyStringArray(cohort.windows), `${prefix} windows must be a non-empty string array.`);
  }

  ensure(config.reporting && typeof config.reporting === "object", "metrics:check failed: missing reporting config.");
  ensure(config.reporting.cadence === "weekly", "metrics:check failed: reporting cadence must be weekly.");
  ensure(isNonEmptyString(config.reporting.dashboard), "metrics:check failed: reporting.dashboard is required.");
  ensure(isNonEmptyString(config.reporting.owner), "metrics:check failed: reporting.owner is required.");
  ensure(isNonEmptyString(config.doc), "metrics:check failed: doc path is required.");
  await access(config.doc).catch(() => {
    throw new Error(`metrics:check failed: doc file not found: ${config.doc}`);
  });

  const sourceBundle = await readSources(SOURCE_PATHS);
  for (const eventName of REQUIRED_EVENTS) {
    ensure(
      sourceBundle.includes(eventName),
      `metrics:check failed: instrumentation reference missing in source for event "${eventName}".`
    );
  }

  console.log(
    `metrics:check passed. events=${config.events.length}, funnel_steps=${config.funnel.steps.length}, retention_cohorts=${config.retention.cohorts.length}`
  );
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
