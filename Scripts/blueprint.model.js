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

  function configureLabBuilding(building) {
    building.outputToSlot = 14;
    building.inputFromSlot = 15;
    building.outputFromSlot = 15;
    building.inputToSlot = 14;
    if (!building.parameters) {
      building.parameters = {};
    }
    building.parameters.researchMode = 1;
    return building;
  }

  function createStackedLabBuilding(
    template,
    baseOffset,
    yaw,
    labBuildingDef,
    labHeight,
    recipeId,
    acceleratorMode,
    layer,
    inputObjIdx
  ) {
    template.localOffset = [
      { x: baseOffset.x, y: baseOffset.y, z: labHeight * layer },
      { x: baseOffset.x, y: baseOffset.y, z: labHeight * layer },
    ];
    template.yaw = yaw;
    template.itemId = labBuildingDef.itemId;
    template.modelIndex = labBuildingDef.modelIndex;
    template.recipeId = parseInt(recipeId);
    template.inputObjIdx = inputObjIdx;
    template.outputToSlot = 14;
    template.inputFromSlot = 15;
    template.outputFromSlot = 15;
    template.inputToSlot = 14;
    template.parameters = {
      acceleratorMode: acceleratorMode,
      researchMode: 1,
    };
    return template;
  }

  function createSorter(template, sorterDef, options) {
    template.itemId = sorterDef.itemId;
    template.modelIndex = sorterDef.modelIndex;
    if (typeof options.inputObjIdx === "number") {
      template.inputObjIdx = options.inputObjIdx;
    }
    if (typeof options.outputObjIdx === "number") {
      template.outputObjIdx = options.outputObjIdx;
    }
    if (typeof options.outputToSlot === "number") {
      template.outputToSlot = options.outputToSlot;
    }
    if (typeof options.inputToSlot === "number") {
      template.inputToSlot = options.inputToSlot;
    }
    if (typeof options.inputFromSlot === "number") {
      template.inputFromSlot = options.inputFromSlot;
    }
    if (typeof options.filterId === "number") {
      template.filterId = options.filterId;
    }
    template.parameters = options.parameters || null;
    template.localOffset = options.localOffset;
    template.yaw = options.yaw;
    return template;
  }

  function createSorterOwnerRecord(index, rate, ownerObjIdx, ownerName, ownerOffset, recipeID) {
    return {
      index,
      rate,
      ownerObjIdx,
      ownerName,
      ownerOffset: { x: ownerOffset.x, y: ownerOffset.y, z: ownerOffset.z },
      recipeID: parseInt(recipeID),
    };
  }

  function createSupplementSorterOwnerRecord(index, rate, sourceSorter) {
    return createSorterOwnerRecord(
      index,
      rate,
      sourceSorter.ownerObjIdx,
      sourceSorter.ownerName,
      sourceSorter.ownerOffset,
      sourceSorter.recipeID
    );
  }

  function createFoundationBuilding(template, foundationZ) {
    template.itemId = 1131;
    template.modelIndex = 37;
    template.localOffset = [
      { x: 0, y: 0, z: foundationZ },
      { x: 0, y: 0, z: foundationZ },
    ];
    template.inputToSlot = 1;
    template.parameters = null;
    return template;
  }

  function cloneBuildingForLayer(template, base, zOffset, outputObjIdx, inputObjIdx) {
    template.itemId = base.itemId;
    template.modelIndex = base.modelIndex;
    template.areaIndex = base.areaIndex;
    template.recipeId = base.recipeId;
    template.filterId = base.filterId;
    template.outputToSlot = base.outputToSlot;
    template.inputFromSlot = base.inputFromSlot;
    template.outputFromSlot = base.outputFromSlot;
    template.inputToSlot = base.inputToSlot;
    template.outputOffset = base.outputOffset;
    template.inputOffset = base.inputOffset;

    template.localOffset = base.localOffset
      ? base.localOffset.map(o => ({
          x: o.x,
          y: o.y,
          z: (o.z || 0) + zOffset,
        }))
      : null;
    template.yaw = base.yaw ? base.yaw.slice() : [0, 0];
    template.parameters =
      base.parameters !== null && base.parameters !== undefined ? JSON.parse(JSON.stringify(base.parameters)) : null;
    template.outputObjIdx = outputObjIdx;
    template.inputObjIdx = inputObjIdx;
    return template;
  }

  root.DSQBlueprintModel = {
    createBlueprintTemplate,
    createBuildingTemplate,
    createSprayCoater,
    createConveyorNode,
    createProductionBuilding,
    createSinglePointBuilding,
    configureLabBuilding,
    createStackedLabBuilding,
    createSorter,
    createSorterOwnerRecord,
    createSupplementSorterOwnerRecord,
    createFoundationBuilding,
    cloneBuildingForLayer,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
