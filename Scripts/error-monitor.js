const DEFAULT_MONITOR_CONFIG = {
  service: "dsq-web",
  environment: "production",
  defaultSampleRate: 1,
  eventSampleRates: {
    error_log: 1,
    blueprint_generation: 1,
    business_event: 0.5,
  },
  maxBlueprintHistory: 200,
};

function safeGetStorageItem(storage, key) {
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorageItem(storage, key, value) {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, value);
  } catch {
    // ignore storage write failures
  }
}

function safeParseJSON(raw, fallbackValue) {
  if (!raw) {
    return fallbackValue;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function getWindowConfig() {
  if (typeof window === "undefined") {
    return {};
  }
  if (window.__DSQ_MONITOR_CONFIG && typeof window.__DSQ_MONITOR_CONFIG === "object") {
    return window.__DSQ_MONITOR_CONFIG;
  }
  return {};
}

function getStorageConfig() {
  if (typeof window === "undefined") {
    return {};
  }
  const raw = safeGetStorageItem(window.localStorage, "dsq_monitor_config");
  const parsed = safeParseJSON(raw, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

function getMonitorConfig() {
  const storageConfig = getStorageConfig();
  const windowConfig = getWindowConfig();
  return {
    ...DEFAULT_MONITOR_CONFIG,
    ...storageConfig,
    ...windowConfig,
    eventSampleRates: {
      ...DEFAULT_MONITOR_CONFIG.eventSampleRates,
      ...(storageConfig.eventSampleRates || {}),
      ...(windowConfig.eventSampleRates || {}),
    },
  };
}

function getMonitorEndpoint(config) {
  if (typeof window === "undefined") {
    return null;
  }

  if (typeof config.endpoint === "string" && config.endpoint.trim()) {
    return config.endpoint.trim();
  }

  if (typeof window.__DSQ_MONITOR_ENDPOINT === "string" && window.__DSQ_MONITOR_ENDPOINT.trim()) {
    return window.__DSQ_MONITOR_ENDPOINT.trim();
  }

  const endpoint = safeGetStorageItem(window.localStorage, "dsq_monitor_endpoint");
  return endpoint && endpoint.trim() ? endpoint.trim() : null;
}

function getReleaseVersion() {
  if (typeof window === "undefined") {
    return "server";
  }

  if (typeof window.__DSQ_RELEASE === "string" && window.__DSQ_RELEASE.trim()) {
    return window.__DSQ_RELEASE.trim();
  }

  const meta = document.querySelector('meta[name="dsq-release"]');
  if (meta && typeof meta.content === "string" && meta.content.trim()) {
    return meta.content.trim();
  }

  const storedRelease = safeGetStorageItem(window.localStorage, "dsq_release");
  if (storedRelease && storedRelease.trim()) {
    return storedRelease.trim();
  }

  return "dev-local";
}

function generateId(prefix) {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomPart}`;
}

function getSessionId() {
  if (typeof window === "undefined") {
    return "session-server";
  }
  const key = "dsq_monitor_session_id";
  const existing = safeGetStorageItem(window.sessionStorage, key);
  if (existing && existing.trim()) {
    return existing.trim();
  }
  const created = generateId("session");
  safeSetStorageItem(window.sessionStorage, key, created);
  return created;
}

function resolveSampleRate(eventType, config) {
  const custom = config.eventSampleRates && config.eventSampleRates[eventType];
  const rate = typeof custom === "number" ? custom : config.defaultSampleRate;
  if (!Number.isFinite(rate)) {
    return 1;
  }
  return Math.max(0, Math.min(1, rate));
}

function shouldSampleEvent(eventType, config) {
  const sampleRate = resolveSampleRate(eventType, config);
  if (sampleRate >= 1) {
    return true;
  }
  if (sampleRate <= 0) {
    return false;
  }
  return Math.random() < sampleRate;
}

function buildMonitorContext(eventType, chain, config) {
  return {
    service: config.service,
    environment: config.environment,
    release: getReleaseVersion(),
    sessionId: getSessionId(),
    traceId: generateId("trace"),
    route: typeof location !== "undefined" ? `${location.pathname || "/"}${location.search || ""}` : "unknown",
    chain: chain || "unknown",
    userAgent:
      typeof navigator !== "undefined" && typeof navigator.userAgent === "string" ? navigator.userAgent : "unknown",
    eventType,
    timestamp: new Date().toISOString(),
  };
}

async function sendMonitorEvent(eventType, payload, options = {}) {
  if (typeof navigator === "undefined") {
    return;
  }

  const config = getMonitorConfig();
  const endpoint = getMonitorEndpoint(config);
  if (!endpoint || !shouldSampleEvent(eventType, config)) {
    return;
  }

  const envelope = {
    ...buildMonitorContext(eventType, options.chain, config),
    payload,
  };

  const body = JSON.stringify(envelope);

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) {
        return;
      }
    }

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DSQ-Release": envelope.release,
      },
      body,
      keepalive: true,
      mode: "cors",
    });
  } catch (error) {
    console.warn("[Monitor] Failed to send event:", error);
  }
}

function computePercentile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1));
  return sorted[index];
}

const ErrorMonitor = {
  logs: [],
  maxLogs: 100,

  init() {
    this.setupGlobalErrorHandler();
    this.setupUnhandledRejectionHandler();
    this.logs = this.loadLogs();
    console.log("[ErrorMonitor] Initialized");
  },

  setupGlobalErrorHandler() {
    const self = this;
    window.onerror = function (message, source, lineno, colno, error) {
      const logEntry = {
        type: "error",
        timestamp: new Date().toISOString(),
        message,
        source,
        line: lineno,
        column: colno,
        stack: error ? error.stack : null,
      };
      self.addLog(logEntry);
      console.error("[ErrorMonitor]", logEntry);
      return false;
    };
  },

  setupUnhandledRejectionHandler() {
    const self = this;
    window.addEventListener("unhandledrejection", function (event) {
      const logEntry = {
        type: "unhandledrejection",
        timestamp: new Date().toISOString(),
        message: event.reason ? event.reason.message : "Unknown rejection",
        stack: event.reason ? event.reason.stack : null,
      };
      self.addLog(logEntry);
      console.error("[ErrorMonitor]", logEntry);
    });
  },

  addLog(entry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.persistLogs();
    sendMonitorEvent("error_log", entry, { chain: "global_error" });
  },

  persistLogs() {
    safeSetStorageItem(window.localStorage, "dsq_error_logs", JSON.stringify(this.logs.slice(-20)));
  },

  loadLogs() {
    const stored = safeGetStorageItem(window.localStorage, "dsq_error_logs");
    return safeParseJSON(stored, []);
  },

  getLogs() {
    return this.logs;
  },

  clearLogs() {
    this.logs = [];
    safeSetStorageItem(window.localStorage, "dsq_error_logs", JSON.stringify([]));
  },

  getErrorRateEstimate() {
    if (!Array.isArray(this.logs) || this.logs.length === 0) {
      return 0;
    }
    const errorCount = this.logs.filter(
      log => log && (log.type === "error" || log.type === "unhandledrejection")
    ).length;
    return errorCount / this.logs.length;
  },
};

const PerformanceTracker = {
  metrics: {},

  startMeasure(name) {
    this.metrics[name] = {
      startTime: performance.now(),
      endTime: null,
      duration: null,
    };
  },

  endMeasure(name) {
    if (this.metrics[name]) {
      this.metrics[name].endTime = performance.now();
      this.metrics[name].duration = this.metrics[name].endTime - this.metrics[name].startTime;
      console.log("[PerformanceTracker]", `${name}: ${this.metrics[name].duration.toFixed(2)}ms`);
      return this.metrics[name].duration;
    }
    return null;
  },

  getMetrics() {
    return this.metrics;
  },

  getBlueprintHistory() {
    const raw = safeGetStorageItem(window.localStorage, "dsq_blueprint_metric_history");
    const parsed = safeParseJSON(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  },

  persistBlueprintHistory(history) {
    const maxHistory = Math.max(50, getMonitorConfig().maxBlueprintHistory || 200);
    const normalized = Array.isArray(history) ? history.slice(-maxHistory) : [];
    safeSetStorageItem(window.localStorage, "dsq_blueprint_metric_history", JSON.stringify(normalized));
    return normalized;
  },

  calculateBlueprintStats(history) {
    const safeHistory = Array.isArray(history) ? history : [];
    const total = safeHistory.length;
    const successful = safeHistory.filter(item => item && item.success);
    const failed = total - successful.length;
    const durations = successful
      .map(item => item.duration)
      .filter(duration => typeof duration === "number" && Number.isFinite(duration));

    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const avgDuration = durations.length > 0 ? totalDuration / durations.length : 0;
    const p95Duration = computePercentile(durations, 95);
    const successRate = total > 0 ? successful.length / total : 0;

    return {
      total,
      success: successful.length,
      failed,
      totalDuration,
      avgDuration,
      p95Duration,
      successRate,
    };
  },

  getBlueprintStats() {
    const history = this.getBlueprintHistory();
    return this.calculateBlueprintStats(history);
  },

  getSLOSnapshot() {
    const stats = this.getBlueprintStats();
    return {
      blueprint_generation_success_rate: stats.successRate,
      blueprint_generation_p95_ms: stats.p95Duration,
      frontend_js_error_rate: window.ErrorMonitor ? window.ErrorMonitor.getErrorRateEstimate() : 0,
    };
  },

  trackBlueprintGeneration(success, duration, error = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      success,
      duration,
      error,
    };

    const history = this.getBlueprintHistory();
    history.push(entry);
    const persistedHistory = this.persistBlueprintHistory(history);
    const stats = this.calculateBlueprintStats(persistedHistory);

    safeSetStorageItem(window.localStorage, "dsq_blueprint_stats", JSON.stringify(stats));

    const payload = {
      entry,
      stats,
      slo: this.getSLOSnapshot(),
    };

    console.log("[PerformanceTracker] Blueprint generation:", payload);
    sendMonitorEvent("blueprint_generation", payload, { chain: "blueprint_generation" });
    return entry;
  },

  trackBusinessEvent(eventName, attributes = {}, chain = "business") {
    const payload = {
      eventName,
      attributes,
    };
    sendMonitorEvent("business_event", payload, { chain });
  },
};

window.DSQMonitor = {
  getConfig: getMonitorConfig,
  getContext(eventType = "manual", chain = "manual") {
    return buildMonitorContext(eventType, chain, getMonitorConfig());
  },
  send(eventType, payload, chain = "manual") {
    return sendMonitorEvent(eventType, payload, { chain });
  },
};

window.ErrorMonitor = ErrorMonitor;
window.PerformanceTracker = PerformanceTracker;

ErrorMonitor.init();
