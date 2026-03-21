const ErrorMonitor = {
  logs: [],
  maxLogs: 100,

  init() {
    this.setupGlobalErrorHandler();
    this.setupUnhandledRejectionHandler();
    console.log("[ErrorMonitor] Initialized");
  },

  setupGlobalErrorHandler() {
    const self = this;
    window.onerror = function (message, source, lineno, colno, error) {
      const logEntry = {
        type: "error",
        timestamp: new Date().toISOString(),
        message: message,
        source: source,
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
  },

  persistLogs() {
    try {
      localStorage.setItem("dsq_error_logs", JSON.stringify(this.logs.slice(-20)));
    } catch (e) {
      console.warn("[ErrorMonitor] Failed to persist logs:", e);
    }
  },

  loadLogs() {
    try {
      const stored = localStorage.getItem("dsq_error_logs");
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("[ErrorMonitor] Failed to load logs:", e);
    }
    return this.logs;
  },

  getLogs() {
    return this.logs;
  },

  clearLogs() {
    this.logs = [];
    localStorage.removeItem("dsq_error_logs");
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
      console.log("[PerformanceTracker]", name + ":", this.metrics[name].duration.toFixed(2) + "ms");
      return this.metrics[name].duration;
    }
    return null;
  },

  getMetrics() {
    return this.metrics;
  },

  trackBlueprintGeneration(success, duration, error = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      success: success,
      duration: duration,
      error: error,
    };

    let stats = this.getBlueprintStats();
    stats.total++;
    if (success) {
      stats.success++;
      stats.totalDuration += duration;
      stats.avgDuration = stats.totalDuration / stats.success;
    } else {
      stats.failed++;
    }

    try {
      localStorage.setItem("dsq_blueprint_stats", JSON.stringify(stats));
    } catch (e) {
      console.warn("[PerformanceTracker] Failed to persist blueprint stats:", e);
    }

    console.log("[PerformanceTracker] Blueprint generation:", entry);
    return entry;
  },

  getBlueprintStats() {
    try {
      const stored = localStorage.getItem("dsq_blueprint_stats");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("[PerformanceTracker] Failed to load blueprint stats:", e);
    }
    return {
      total: 0,
      success: 0,
      failed: 0,
      totalDuration: 0,
      avgDuration: 0,
    };
  },
};

window.ErrorMonitor = ErrorMonitor;
window.PerformanceTracker = PerformanceTracker;

ErrorMonitor.init();
