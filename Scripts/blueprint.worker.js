// Scripts/blueprint.worker.js
/**
 * @fileoverview Blueprint Generation Worker Endpoint
 * 隔离主线程的高密度 CPU 计算与内存分配，防范 UI 窒息崩溃。
 */

// 引入依赖项，注意路径需对齐项目真实路径
self.importScripts('pako.js', 'blueprint.js');

self.onmessage = function (e) {
    const { taskId, title, iconId, recipe, config } = e.data;
    
    try {
        // 1. 初始化无状态计算图谱
        const bp = new Blueprint(title, iconId, recipe, config);
        bp.init();
        
        // 2. 依次生成高密度数据结构
        bp.generateBuildings();
        bp.generateConveyorBelts();
        bp.generateConveyorBeltsForSprayCoater();
        bp.cloneToStackLayers();
        
        // 3. 处理蓝图元数据
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
        
        // 4. 执行重度序列化与压缩 (耗时峰值)
        const bpStr = bp.toStr();
        
        // 5. 将结果以不可变拷贝 (Immutable Copy) 传递回主线程
        self.postMessage({
            taskId: taskId,
            type: 'SUCCESS',
            payload: bpStr
        });
        
    } catch (error) {
        // 纵深防崩：任何计算异常必须被包裹并冒泡，严禁静默死亡
        self.postMessage({
            taskId: taskId,
            type: 'ERROR',
            payload: error instanceof Error ? error.message : error.toString()
        });
    }
};