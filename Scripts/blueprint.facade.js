// Scripts/blueprint.facade.js
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
   * @returns {Promise<string>} Base64 Blueprint String
   */
  static generateAsync(title, iconId, recipe, config) {
    // 纵深防崩：CAS (Compare-And-Swap) 思想拦截
    if (this._isGenerating) {
      return Promise.reject(new Error("ERR_ALREADY_RUNNING"));
    }
    this._isGenerating = true;

    return new Promise((resolve, reject) => {
      // 防护边界：检查 Worker 支持，低版本兜底 (Compat)
      if (typeof Worker === "undefined") {
        console.warn("[降级模式] 浏览器不支持 Web Worker，执行同步阻塞渲染。");
        try {
          const bp = new Blueprint(title, iconId, recipe, config);
          bp.init();
          bp.generateBuildings();
          bp.generateConveyorBelts();
          bp.generateConveyorBeltsForSprayCoater();
          bp.cloneToStackLayers();

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

          resolve(bp.toStr());
        } catch (e) {
          reject(e);
        } finally {
          this._isGenerating = false;
        }
        return;
      }

      const worker = new Worker("Scripts/blueprint.worker.js");
      const taskId = Date.now().toString(36) + Math.random().toString(36).substr(2);

      // 监听器清理卫语句：确保在任何退出路径下都终止线程
      const cleanup = () => {
        worker.onmessage = null;
        worker.onerror = null;
        worker.terminate();
        // 释放互斥锁
        BlueprintFacade._isGenerating = false;
      };

      worker.onmessage = e => {
        const { type, payload } = e.data;
        switch (type) {
          case "SUCCESS":
            cleanup();
            resolve(payload);
            break;
          case "ERROR":
            cleanup();
            reject(new Error(payload));
            break;
          case "WARNING":
            // 处理 Worker 内部向上冒泡的警告
            if (typeof window !== "undefined" && window.cocoMessage) {
              cocoMessage.warning(payload, 5000);
            }
            break;
        }
      };

      worker.onerror = err => {
        cleanup();
        reject(new Error(`Worker Thread Crash: ${err.message}`));
      };

      // 使用结构化克隆传递配置实体 (Immutable Transfer)
      worker.postMessage({ taskId, title, iconId, recipe, config });
    });
  }
}
