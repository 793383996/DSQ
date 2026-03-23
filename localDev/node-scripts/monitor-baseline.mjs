import { access, readFile } from "node:fs/promises";

const CONFIG_PATH = "localDev/monitoring/monitoring.config.json";

const REQUIRED_CONTEXT_FIELDS = new Set(["service", "release", "sessionId", "traceId", "route", "chain", "timestamp"]);

const REQUIRED_SLO_IDS = new Set([
  "blueprint_generation_success_rate",
  "blueprint_generation_p95_ms",
  "frontend_js_error_rate",
]);

const ALLOWED_OPERATORS = new Set([">=", "<=", ">", "<"]);
const ALLOWED_SEVERITY = new Set(["warning", "critical"]);

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateSampleRate(sampleRate, fieldName) {
  ensure(isFiniteNumber(sampleRate), `monitor:check failed: ${fieldName} must be a number.`);
  ensure(sampleRate >= 0 && sampleRate <= 1, `monitor:check failed: ${fieldName} must be in [0, 1].`);
}

function validateContextFields(contextFields) {
  ensure(Array.isArray(contextFields), "monitor:check failed: requiredContextFields must be an array.");
  const seen = new Set(contextFields);
  for (const field of REQUIRED_CONTEXT_FIELDS) {
    ensure(seen.has(field), `monitor:check failed: requiredContextFields missing "${field}".`);
  }
}

function validateSLO(sloConfig) {
  ensure(sloConfig && typeof sloConfig === "object", "monitor:check failed: missing slo object.");
  ensure(isNonEmptyString(sloConfig.window), "monitor:check failed: slo.window is required.");
  ensure(Array.isArray(sloConfig.indicators), "monitor:check failed: slo.indicators must be an array.");

  const indicatorIds = new Set();
  for (let i = 0; i < sloConfig.indicators.length; i += 1) {
    const indicator = sloConfig.indicators[i];
    const prefix = `monitor:check failed: slo.indicators[${i}]`;
    ensure(isNonEmptyString(indicator.id), `${prefix} missing id.`);
    ensure(!indicatorIds.has(indicator.id), `${prefix} duplicate id "${indicator.id}".`);
    indicatorIds.add(indicator.id);
    ensure(isNonEmptyString(indicator.description), `${prefix} missing description.`);
    ensure(isFiniteNumber(indicator.target), `${prefix} target must be a number.`);
    ensure(ALLOWED_OPERATORS.has(indicator.operator), `${prefix} invalid operator "${indicator.operator}".`);
    ensure(isNonEmptyString(indicator.owner), `${prefix} missing owner.`);
  }

  for (const requiredId of REQUIRED_SLO_IDS) {
    ensure(indicatorIds.has(requiredId), `monitor:check failed: missing required SLO indicator "${requiredId}".`);
  }
}

function validateAlerts(alerts, indicatorIds) {
  ensure(Array.isArray(alerts), "monitor:check failed: alerts must be an array.");
  ensure(alerts.length > 0, "monitor:check failed: alerts cannot be empty.");

  const alertsByMetric = new Map();
  for (let i = 0; i < alerts.length; i += 1) {
    const alert = alerts[i];
    const prefix = `monitor:check failed: alerts[${i}]`;
    ensure(isNonEmptyString(alert.name), `${prefix} missing name.`);
    ensure(ALLOWED_SEVERITY.has(alert.severity), `${prefix} invalid severity "${alert.severity}".`);
    ensure(isNonEmptyString(alert.metricId), `${prefix} missing metricId.`);
    ensure(indicatorIds.has(alert.metricId), `${prefix} metricId "${alert.metricId}" has no matching SLO indicator.`);
    ensure(isNonEmptyString(alert.window), `${prefix} missing window.`);
    ensure(isFiniteNumber(alert.threshold), `${prefix} threshold must be a number.`);
    ensure(Array.isArray(alert.notifyChannels) && alert.notifyChannels.length > 0, `${prefix} missing notifyChannels.`);
    ensure(alert.notifyChannels.every(isNonEmptyString), `${prefix} notifyChannels must contain non-empty strings.`);

    if (!alertsByMetric.has(alert.metricId)) {
      alertsByMetric.set(alert.metricId, []);
    }
    alertsByMetric.get(alert.metricId).push(alert);
  }

  for (const requiredId of REQUIRED_SLO_IDS) {
    ensure(alertsByMetric.has(requiredId), `monitor:check failed: missing alert policy for "${requiredId}".`);
  }
}

async function main() {
  const raw = await readFile(CONFIG_PATH, "utf8");
  const config = JSON.parse(raw);

  ensure(isNonEmptyString(config.service), "monitor:check failed: service is required.");
  ensure(isNonEmptyString(config.environment), "monitor:check failed: environment is required.");
  ensure(isNonEmptyString(config.releaseSource), "monitor:check failed: releaseSource is required.");
  ensure(isNonEmptyString(config.endpointSource), "monitor:check failed: endpointSource is required.");
  ensure(isFiniteNumber(config.triageTargetMinutes), "monitor:check failed: triageTargetMinutes must be numeric.");
  ensure(
    config.triageTargetMinutes <= 10,
    "monitor:check failed: triageTargetMinutes must be <= 10 to satisfy incident goal."
  );
  validateSampleRate(config.defaultSampleRate, "defaultSampleRate");

  ensure(
    config.eventSampleRates && typeof config.eventSampleRates === "object",
    "monitor:check failed: missing eventSampleRates."
  );
  for (const [eventName, rate] of Object.entries(config.eventSampleRates)) {
    validateSampleRate(rate, `eventSampleRates.${eventName}`);
  }

  validateContextFields(config.requiredContextFields);
  validateSLO(config.slo);

  const indicatorIds = new Set(config.slo.indicators.map(indicator => indicator.id));
  validateAlerts(config.alerts, indicatorIds);

  ensure(isNonEmptyString(config.runbook), "monitor:check failed: runbook path is required.");
  await access(config.runbook).catch(() => {
    throw new Error(`monitor:check failed: runbook file not found: ${config.runbook}`);
  });

  console.log(
    `monitor:check passed. indicators=${config.slo.indicators.length}, alerts=${config.alerts.length}, triage_target=${config.triageTargetMinutes}m`
  );
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
