// Scripts/blueprint.model.js
// 从 blueprint.js 抽离的蓝图数据模型构造能力。
(function (root) {
  function createBlueprintTemplate(title, iconId) {
    return {
      header: {
        layout: 10,
        icons: iconId,
        time: new Date(),
        gameVersion: "0.9.26.13026",
        shortDesc: title,
        desc: "",
      },
      version: 1,
      cursorOffset: { x: 0, y: 0 },
      cursorTargetArea: 0,
      dragBoxSize: { x: 1, y: 1 },
      primaryAreaIdx: 0,
      areas: [
        {
          index: 0,
          parentIndex: -1,
          tropicAnchor: 0,
          areaSegments: 200,
          anchorLocalOffset: { x: 0, y: 0 },
          size: { x: 1, y: 1 },
        },
      ],
      buildings: [],
    };
  }

  function createBuildingTemplate(index) {
    return {
      index,
      areaIndex: 0,
      localOffset: null,
      yaw: [0, 0],
      itemId: 0,
      modelIndex: 0,
      outputObjIdx: -1,
      inputObjIdx: -1,
      outputToSlot: 0,
      inputFromSlot: 0,
      outputFromSlot: 0,
      inputToSlot: 0,
      outputOffset: 0,
      inputOffset: 0,
      recipeId: 0,
      filterId: 0,
      parameters: null,
    };
  }

  function createSprayCoater(template, offset, yaw, sprayCoaterDef) {
    template.localOffset = [offset, offset];
    template.yaw = yaw;
    template.itemId = sprayCoaterDef.itemId;
    template.modelIndex = sprayCoaterDef.modelIndex;
    template.outputToSlot = 14;
    template.inputFromSlot = 15;
    template.outputFromSlot = 15;
    template.inputToSlot = 14;
    return template;
  }

  function createConveyorNode(index, offset, yaw, conveyor, outputObjIdx, outputToSlot, parameters) {
    return {
      index,
      areaIndex: 0,
      localOffset: [offset, offset],
      yaw,
      itemId: conveyor.itemId,
      modelIndex: conveyor.modelIndex,
      outputObjIdx,
      inputObjIdx: -1,
      outputToSlot,
      inputFromSlot: 0,
      outputFromSlot: 0,
      inputToSlot: 1,
      outputOffset: 0,
      inputOffset: 0,
      recipeId: 0,
      filterId: 0,
      parameters,
    };
  }

  function createProductionBuilding(index, offset, yaw, buildingDef, recipeId, acceleratorMode) {
    const left = { x: offset.x, y: offset.y, z: offset.z };
    const right = { x: offset.x, y: offset.y, z: offset.z };
    return {
      index,
      areaIndex: 0,
      localOffset: [left, right],
      yaw,
      itemId: buildingDef.itemId,
      modelIndex: buildingDef.modelIndex,
      outputObjIdx: -1,
      inputObjIdx: -1,
      outputToSlot: 0,
      inputFromSlot: 0,
      outputFromSlot: 0,
      inputToSlot: 0,
      outputOffset: 0,
      inputOffset: 0,
      recipeId: parseInt(recipeId),
      filterId: 0,
      parameters: {
        acceleratorMode,
      },
    };
  }

  function createSinglePointBuilding(template, buildingDef, offset) {
    const left = { x: offset.x, y: offset.y, z: offset.z };
    const right = { x: offset.x, y: offset.y, z: offset.z };
    template.itemId = buildingDef.itemId;
    template.modelIndex = buildingDef.modelIndex;
    template.localOffset = [left, right];
    return template;
  }

  root.DSQBlueprintModel = {
    createBlueprintTemplate,
    createBuildingTemplate,
    createSprayCoater,
    createConveyorNode,
    createProductionBuilding,
    createSinglePointBuilding,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
