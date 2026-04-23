/**
 * 绞杀者模式外观层 (Facade)
 * 对外暴露异步契约，对内封装 Worker 生命周期管理。
 */
class BlueprintFacade {
  // 状态管理：内存级互斥锁，防范 UI 异步渲染导致的事件穿透连点
  static _isGenerating = false;

  /**
   * @param {string} title
   * @param {number[]} iconId
   * @param {object} recipe
   * @param {object} config
   * @param {object} runtimeOptions
   * @returns {Promise<string>} Base64 Blueprint String
   */
  static generateAsync(title, iconId, recipe, config, runtimeOptions) {
    const options = runtimeOptions && typeof runtimeOptions === "object" ? runtimeOptions : {};
    const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Math.max(10, Number(options.timeoutMs)) : 60000;
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
    const startAt = Date.now();

    const resolveWorkerMessage = payload => {
      if (typeof payload === "string") {
        return payload;
      }
      if (!payload || typeof payload !== "object") {
        return "";
      }
      const key = typeof payload.key === "string" ? payload.key : "";
      const fallback = typeof payload.fallback === "string" ? payload.fallback : "";
      const params = payload.params && typeof payload.params === "object" ? payload.params : null;
      if (typeof window !== "undefined" && window.DSQI18n && typeof window.DSQI18n.t === "function" && key) {
        return window.DSQI18n.t(key, params, fallback);
      }
      return fallback || key;
    };

    const reportProgress = stage => {
      if (!stage || !onProgress) {
        return;
      }
      try {
        onProgress(stage);
      } catch (_error) {
        // ignore progress callback errors to avoid masking generation failures
      }
    };

    const assertNotTimedOut = () => {
      if (Date.now() - startAt <= timeoutMs) {
        return;
      }
      const timeoutError = new Error("ERR_BLUEPRINT_TIMEOUT");
      timeoutError.code = "ERR_BLUEPRINT_TIMEOUT";
      throw timeoutError;
    };

    // 纵深防崩：CAS (Compare-And-Swap) 思想拦截
    if (this._isGenerating) {
      return Promise.reject(new Error("ERR_ALREADY_RUNNING"));
    }
    this._isGenerating = true;

    return new Promise((resolve, reject) => {
      let worker = null;
      let timeoutHandle = null;
      let finished = false;

      const releaseLock = () => {
        BlueprintFacade._isGenerating = false;
      };

      const cleanup = () => {
        if (timeoutHandle !== null) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        if (worker) {
          worker.onmessage = null;
          worker.onerror = null;
          worker.terminate();
          worker = null;
        }
      };

      const finish = (handler, value) => {
        if (finished) {
          return;
        }
        finished = true;
        cleanup();
        releaseLock();
        handler(value);
      };

      const startTimeout = () => {
        timeoutHandle = setTimeout(() => {
          const timeoutError = new Error("ERR_BLUEPRINT_TIMEOUT");
          timeoutError.code = "ERR_BLUEPRINT_TIMEOUT";
          finish(reject, timeoutError);
        }, timeoutMs);
      };

      // 防护边界：检查 Worker 支持，低版本兜底 (Compat)
      if (typeof Worker === "undefined") {
        console.warn("[降级模式] 浏览器不支持 Web Worker，执行同步阻塞渲染。");
        try {
          reportProgress("init");
          const bp = new Blueprint(title, iconId, recipe, config);
          bp.init();
          assertNotTimedOut();

          reportProgress("buildings");
          bp.generateBuildings();
          assertNotTimedOut();

          reportProgress("belts");
          bp.generateConveyorBelts();
          assertNotTimedOut();

          reportProgress("spray");
          bp.generateConveyorBeltsForSprayCoater();
          assertNotTimedOut();

          reportProgress("stack");
          bp.cloneToStackLayers();
          assertNotTimedOut();

          // 处理蓝图元数据
          bp.blueprintTemplate.buildings = bp.buildings;
          if (config.blueprintDesc) {
            bp.blueprintTemplate.header.desc = config.blueprintDesc;
          }

          const iconLength = config.blueprintIconLength || 1;
          switch (iconLength) {
            case 1:
              bp.blueprintTemplate.header.layout = 10;
              break;
            case 2:
              bp.blueprintTemplate.header.layout = 20;
              break;
            case 3:
              bp.blueprintTemplate.header.layout = 30;
              break;
            case 4:
              bp.blueprintTemplate.header.layout = 40;
              break;
            default:
              bp.blueprintTemplate.header.layout = 51;
              break;
          }

          reportProgress("serialize");
          const bpStr = bp.toStr();
          assertNotTimedOut();
          finish(resolve, bpStr);
        } catch (e) {
          finish(reject, e);
        }
        return;
      }

      try {
        worker = new Worker("Scripts/blueprint.worker.js");
      } catch (err) {
        finish(reject, err instanceof Error ? err : new Error(String(err)));
        return;
      }

      const taskId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      startTimeout();

      worker.onmessage = e => {
        const data = e && e.data && typeof e.data === "object" ? e.data : {};
        if (data.taskId && data.taskId !== taskId) {
          return;
        }
        const type = data.type;
        const payload = data.payload;
        switch (type) {
          case "PROGRESS":
            if (payload && typeof payload === "object" && typeof payload.stage === "string") {
              reportProgress(payload.stage);
            }
            break;
          case "SUCCESS":
            finish(resolve, payload);
            break;
          case "ERROR":
            if (payload && payload.code === "ERR_BLUEPRINT_TIMEOUT") {
              const timeoutError = new Error("ERR_BLUEPRINT_TIMEOUT");
              timeoutError.code = "ERR_BLUEPRINT_TIMEOUT";
              finish(reject, timeoutError);
              return;
            }
            finish(reject, new Error(resolveWorkerMessage(payload) || "unknown_error"));
            break;
          case "WARNING":
            if (typeof window !== "undefined" && window.cocoMessage) {
              const warningText = resolveWorkerMessage(payload);
              if (warningText) {
                cocoMessage.warning(warningText, 5000);
              }
            }
            break;
        }
      };

      worker.onerror = err => {
        finish(reject, new Error(`Worker Thread Crash: ${err.message}`));
      };

      try {
        worker.postMessage({ taskId, title, iconId, recipe, config, timeoutMs });
      } catch (err) {
        finish(reject, err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
}
