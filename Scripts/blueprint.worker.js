/**
 * @fileoverview Blueprint Generation Worker Endpoint
 * 隔离主线程的高密度 CPU 计算与内存分配，防范 UI 窒息崩溃。
 */

// 引入依赖项，注意路径需对齐项目真实路径
self.importScripts(
  "pako.js",
  "blueprint.constants.js",
  "blueprint.serializer.js",
  "blueprint.model.js",
  "blueprint.layout.js",
  "blueprint.js"
);

self.onmessage = function (e) {
  const { taskId, title, iconId, recipe, config, timeoutMs } = e.data;
  const startedAt = Date.now();
  const absoluteTimeout = Number.isFinite(Number(timeoutMs)) ? Number(timeoutMs) : 60000;

  function emitProgress(stage) {
    self.postMessage({
      taskId: taskId,
      type: "PROGRESS",
      payload: { stage: stage },
    });
  }

  function assertNotTimedOut() {
    if (Date.now() - startedAt <= absoluteTimeout) {
      return;
    }
    const timeoutError = new Error("ERR_BLUEPRINT_TIMEOUT");
    timeoutError.code = "ERR_BLUEPRINT_TIMEOUT";
    throw timeoutError;
  }

  try {
    emitProgress("init");
    const bp = new Blueprint(title, iconId, recipe, config);
    bp.init();
    assertNotTimedOut();

    emitProgress("buildings");
    bp.generateBuildings();
    assertNotTimedOut();

    emitProgress("belts");
    bp.generateConveyorBelts();
    assertNotTimedOut();

    emitProgress("spray");
    bp.generateConveyorBeltsForSprayCoater();
    assertNotTimedOut();

    emitProgress("stack");
    bp.cloneToStackLayers();
    assertNotTimedOut();

    // 处理蓝图元数据
    bp.blueprintTemplate.buildings = bp.buildings;
    if (config.blueprintDesc) {
      bp.blueprintTemplate.header.desc = config.blueprintDesc;
    }

    // 根据 icon 数量设置 layout
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

    emitProgress("serialize");
    const bpStr = bp.toStr();
    assertNotTimedOut();

    self.postMessage({
      taskId: taskId,
      type: "SUCCESS",
      payload: bpStr,
    });
  } catch (error) {
    // 纵深防崩：任何计算异常必须被包裹并冒泡，严禁静默死亡
    const errorPayload =
      error && error.code === "ERR_BLUEPRINT_TIMEOUT"
        ? { code: "ERR_BLUEPRINT_TIMEOUT" }
        : error && typeof error === "object" && error.dsqPayload
          ? error.dsqPayload
          : error instanceof Error
            ? error.message
            : error.toString();
    self.postMessage({
      taskId: taskId,
      type: "ERROR",
      payload: errorPayload,
    });
  }
};
