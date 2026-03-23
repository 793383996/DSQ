import assert from "node:assert/strict";
import path from "node:path";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const ROOT = process.cwd();

const BLUEPRINT_RUNTIME_FILES = [
  "Scripts/pako.js",
  "Scripts/blueprint.constants.js",
  "Scripts/blueprint.serializer.js",
  "Scripts/blueprint.model.js",
  "Scripts/blueprint.layout.js",
  "Scripts/blueprint.js",
];

function createBrowserLikeContext() {
  const context = {
    console,
    Date,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Promise,
    Map,
    Set,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    ArrayBuffer,
    DataView,
    Uint8Array,
    Uint16Array,
    Uint32Array,
    Int8Array,
    Int16Array,
    Int32Array,
    Float32Array,
    Float64Array,
  };

  context.btoa = value => Buffer.from(value, "binary").toString("base64");
  context.atob = value => Buffer.from(value, "base64").toString("binary");
  context.window = context;
  context.self = context;
  context.globalThis = context;

  return vm.createContext(context);
}

async function loadScript(context, relativePath) {
  const absPath = path.join(ROOT, relativePath);
  const code = await readFile(absPath, "utf8");
  vm.runInContext(code, context, { filename: relativePath });
}

async function loadScripts(context, relativePaths) {
  for (const file of relativePaths) {
    await loadScript(context, file);
  }
}

function readBinding(context, expression) {
  return vm.runInContext(expression, context);
}

function createConfig(overrides = {}) {
  return {
    maxSorterNumOneBelt: 8,
    conveyorBeltStackLayer: 4,
    x_y_ratio: 2,
    compactLayout: false,
    upgradeConveyorBelt: false,
    onlyConveyorBeltMk3: true,
    onlySorterMk3: true,
    useSorterMk4: false,
    maxLabLayers: 15,
    selfSpray: true,
    generateTeslaTower: false,
    teslaTowerInterval: 10,
    teslaTowerLineInterval: 1,
    onlyConveyorBeltMk3Downgrade: false,
    stackLayers: 1,
    blueprintDesc: "",
    blueprintIconLength: 1,
    ...overrides,
  };
}

function runBlueprintPipeline(context, recipe, config, label) {
  const Blueprint = readBinding(context, "Blueprint");
  const constants = readBinding(context, "DSQBlueprintConstants");

  assert.equal(typeof Blueprint, "function", "Blueprint class should be available in runtime context.");
  assert.ok(constants && constants.buildingMap, "Blueprint constants should be loaded.");

  const bp = new Blueprint(label, [0, 0, 0, 0, 0], recipe, config);
  bp.init();
  bp.generateBuildings();
  bp.generateConveyorBelts();
  const beforeSpray = bp.buildings.length;
  bp.generateConveyorBeltsForSprayCoater();
  const beforeClone = bp.buildings.length;
  bp.cloneToStackLayers();
  bp.blueprintTemplate.buildings = bp.buildings;
  const encoded = bp.toStr();

  assert.equal(typeof encoded, "string", `${label}: encoded blueprint should be string.`);
  assert.ok(encoded.length > 64, `${label}: encoded blueprint should not be empty.`);

  return {
    bp,
    constants,
    beforeSpray,
    beforeClone,
    encoded,
  };
}

function testBasicAssemblerFlow(context) {
  const recipe = {
    proliferator: null,
    subRecipes: [
      {
        building: { name: "assemblingMachineMk1", num: 6 },
        output: [{ name: "gear", rate: 3 }],
        input: [{ name: "ironIngot", rate: 3 }],
        acceleratorMode: -1,
        recipeID: 0,
      },
      {
        building: null,
        output: [{ name: "ironIngot", rate: 3 }],
        input: null,
        acceleratorMode: -1,
        recipeID: 0,
      },
    ],
  };

  const result = runBlueprintPipeline(context, recipe, createConfig(), "basic-assembler");
  assert.equal(result.bp.recipe.subRecipes[0].recipeID, 5, "basic-assembler: recipeID should map to gear recipe.");
  assert.ok(result.bp.itemSummary.gear, "basic-assembler: itemSummary should include gear.");
  assert.ok(result.bp.itemSummary.ironIngot, "basic-assembler: itemSummary should include ironIngot.");
  assert.equal(result.bp.sprayCoaterOffsetList.length, 0, "basic-assembler: should not create spray offsets.");
}

function testSprayAndStackFlow(context) {
  const recipe = {
    proliferator: "proliferatorMk3",
    subRecipes: [
      {
        building: { name: "assemblingMachineMk1", num: 8 },
        output: [{ name: "magneticCoil", rate: 2 }],
        input: [
          { name: "magnet", rate: 2 },
          { name: "copperIngot", rate: 1 },
        ],
        acceleratorMode: 0,
        recipeID: 0,
      },
      {
        building: null,
        output: [{ name: "magnet", rate: 2 }],
        input: null,
        acceleratorMode: -1,
        recipeID: 0,
      },
      {
        building: null,
        output: [{ name: "copperIngot", rate: 1 }],
        input: null,
        acceleratorMode: -1,
        recipeID: 0,
      },
    ],
  };

  const result = runBlueprintPipeline(
    context,
    recipe,
    createConfig({
      stackLayers: 4,
      selfSpray: true,
    }),
    "spray-stack"
  );

  const sprayCoaterItemId = result.constants.buildingMap.sprayCoater.itemId;
  assert.equal(result.bp.recipe.subRecipes[0].recipeID, 6, "spray-stack: recipeID should map to magnetic coil recipe.");
  assert.ok(result.bp.sprayCoaterOffsetList.length > 0, "spray-stack: spray offsets should be generated.");
  assert.ok(
    result.bp.buildings.some(b => b.itemId === sprayCoaterItemId),
    "spray-stack: spray coater building should exist."
  );
  assert.ok(result.beforeClone > result.beforeSpray, "spray-stack: spray phase should append buildings.");
  assert.ok(result.bp.buildings.length > result.beforeClone, "spray-stack: clone phase should append buildings.");
}

function testRefineryMultiOutputFlow(context) {
  const recipe = {
    proliferator: null,
    subRecipes: [
      {
        building: { name: "oilRefinery", num: 4 },
        output: [
          { name: "hydrogen", rate: 2 },
          { name: "refinedOil", rate: 4 },
        ],
        input: [{ name: "oil", rate: 4 }],
        acceleratorMode: -1,
        recipeID: 0,
      },
      {
        building: null,
        output: [{ name: "oil", rate: 4 }],
        input: null,
        acceleratorMode: -1,
        recipeID: 0,
      },
    ],
  };

  const result = runBlueprintPipeline(context, recipe, createConfig(), "refinery-multi-output");
  assert.equal(
    result.bp.recipe.subRecipes[0].recipeID,
    16,
    "refinery-multi-output: recipeID should map to refinery recipe."
  );
  assert.ok(result.bp.itemSummary.hydrogen, "refinery-multi-output: hydrogen should exist in item summary.");
  assert.ok(result.bp.itemSummary.refinedOil, "refinery-multi-output: refinedOil should exist in item summary.");
  assert.equal(
    result.bp.itemSummary.hydrogen.toBuildingNum,
    0,
    "refinery-multi-output: hydrogen should be final output."
  );
  assert.equal(
    result.bp.itemSummary.refinedOil.toBuildingNum,
    0,
    "refinery-multi-output: refinedOil should be final output."
  );
}

function testClonePlanningHelpers(context) {
  const layout = readBinding(context, "DSQBlueprintLayout");
  const constants = readBinding(context, "DSQBlueprintConstants");
  assert.ok(layout, "clone-plan-helper: DSQBlueprintLayout should be loaded.");
  assert.ok(constants && constants.buildingMap, "clone-plan-helper: blueprint constants should be loaded.");

  const foundationOffsets = Array.from(layout.createFoundationZOffsets(4, 10));
  assert.deepEqual(
    foundationOffsets,
    [-10, 0, 10, 20],
    "clone-plan-helper: foundation z offsets should follow expected pattern."
  );

  const emptyPlans = layout.planCloneLayers([], 4, 10, 101, 201);
  assert.equal(emptyPlans.length, 3, "clone-plan-helper: empty clone source should still create layer plans.");
  assert.ok(
    emptyPlans.every(plan => Array.isArray(plan.clones) && plan.clones.length === 0),
    "clone-plan-helper: empty clone source should produce empty clone lists."
  );

  const cloneableBuildings = [
    { index: 11, inputObjIdx: -1, outputObjIdx: 31 },
    { index: 12, inputObjIdx: 11, outputObjIdx: 999 },
  ];
  const plans = layout.planCloneLayers(cloneableBuildings, 3, 10, 100, 200);

  assert.equal(plans.length, 2, "clone-plan-helper: stackLayers=3 should create 2 clone layer plans.");
  assert.equal(plans[0].clones[0].inputObjIdx, 101, "clone-plan-helper: layer 1 foundation index should be mapped.");
  assert.equal(plans[0].clones[1].inputObjIdx, 200, "clone-plan-helper: layer 1 linked clone index should map.");
  assert.equal(plans[1].clones[0].inputObjIdx, 102, "clone-plan-helper: layer 2 foundation index should be mapped.");
  assert.equal(plans[1].clones[1].inputObjIdx, 202, "clone-plan-helper: layer 2 linked clone index should map.");

  const baseBuildings = [
    {
      index: 1,
      itemId: constants.buildingMap.assemblingMachineMk1.itemId,
      inputObjIdx: -1,
      outputObjIdx: -1,
    },
    {
      index: 2,
      itemId: constants.buildingMap.assemblingMachineMk1.itemId,
      inputObjIdx: 1,
      outputObjIdx: -1,
    },
  ];
  const executionPlan = layout.buildCloneStackExecutionPlan(baseBuildings, constants.buildingMap, 3, 10, 300);
  assert.deepEqual(
    Array.from(executionPlan.foundationZOffsets),
    [-10, 0, 10],
    "clone-plan-helper: clone execution plan should provide foundation z offsets."
  );
  assert.equal(
    executionPlan.clonePlans.length,
    4,
    "clone-plan-helper: clone execution plan should flatten layer clones."
  );
  assert.equal(
    executionPlan.clonePlans[0].inputObjIdx,
    4,
    "clone-plan-helper: layer 1 first clone should map to the expected foundation index."
  );
  assert.equal(
    executionPlan.clonePlans[1].inputObjIdx,
    300,
    "clone-plan-helper: layer 1 second clone should map linked input index to firstCloneIndex."
  );
}

function testBeltLoadValidationHelper(context) {
  const layout = readBinding(context, "DSQBlueprintLayout");
  assert.ok(layout, "belt-load-helper: DSQBlueprintLayout should be loaded.");

  const buildings = [
    { index: 10, itemId: 2003, outputObjIdx: -1, inputObjIdx: -1 },
    { index: 11, itemId: 2001, outputObjIdx: -1, inputObjIdx: -1 },
    { index: 100, itemId: 2014, outputObjIdx: 10, inputObjIdx: -1 },
    { index: 101, itemId: 2014, outputObjIdx: 10, inputObjIdx: 11 },
    { index: 102, itemId: 2014, outputObjIdx: 14, inputObjIdx: 99 },
  ];
  const warnings = Array.from(layout.validateBeltLoad(buildings, 1));
  assert.deepEqual(
    warnings,
    ["传送带节点10超载: 2个分拣器 (限制: 1)"],
    "belt-load-helper: should warn when belt node sorter load exceeds configured threshold."
  );
}

function testConveyorLayoutHelpers(context) {
  const layout = readBinding(context, "DSQBlueprintLayout");
  assert.ok(layout, "conveyor-layout-helper: DSQBlueprintLayout should be loaded.");

  const occupiedArea = [
    { x1: -1, y1: -1, x2: 5, y2: 2 },
    { x1: 0, y1: 3, x2: 12, y2: 8 },
    { x1: 0, y1: 9, x2: 20, y2: 10 },
  ];
  const startOffset = JSON.parse(JSON.stringify(layout.getConveyorStartOffset(occupiedArea)));
  assert.deepEqual(
    startOffset,
    { x: 21, y: 8, z: 0 },
    "conveyor-layout-helper: start offset should use last-row x2 and previous-row y2."
  );

  layout.reserveConveyorColumn(occupiedArea);
  assert.equal(
    occupiedArea[occupiedArea.length - 1].x2,
    21,
    "conveyor-layout-helper: reserveConveyorColumn should increment current row x2."
  );

  assert.deepEqual(
    Array.from(layout.getConveyorNodeYaw(1)),
    [0, 0],
    "conveyor-layout-helper: positive direction should use forward yaw."
  );
  assert.deepEqual(
    Array.from(layout.getConveyorNodeYaw(-1)),
    [180, 180],
    "conveyor-layout-helper: negative direction should use reverse yaw."
  );

  const forwardMidLink = JSON.parse(JSON.stringify(layout.resolveConveyorOutputLink(1, 0, 2, 99)));
  assert.deepEqual(
    forwardMidLink,
    { outputObjIdx: 101, outputToSlot: 1 },
    "conveyor-layout-helper: forward non-terminal node should connect to next conveyor node."
  );
  const forwardTailLink = JSON.parse(JSON.stringify(layout.resolveConveyorOutputLink(1, 1, 2, 99)));
  assert.deepEqual(
    forwardTailLink,
    { outputObjIdx: -1, outputToSlot: 0 },
    "conveyor-layout-helper: forward terminal node should stop linking."
  );
  const reverseHeadLink = JSON.parse(JSON.stringify(layout.resolveConveyorOutputLink(-1, 0, 2, 99)));
  assert.deepEqual(
    reverseHeadLink,
    { outputObjIdx: -1, outputToSlot: 0 },
    "conveyor-layout-helper: reverse first node should keep output detached."
  );
  const reverseMidLink = JSON.parse(JSON.stringify(layout.resolveConveyorOutputLink(-1, 1, 2, 99)));
  assert.deepEqual(
    reverseMidLink,
    { outputObjIdx: 99, outputToSlot: 1 },
    "conveyor-layout-helper: reverse subsequent node should link to current building index."
  );

  assert.equal(
    layout.shouldInsertForwardSpraySupportNode(true, 1, 2),
    true,
    "conveyor-layout-helper: forward spray support should trigger on even node count."
  );
  assert.equal(
    layout.shouldInsertReverseSpraySupportNode(true, -1, 2),
    true,
    "conveyor-layout-helper: reverse spray support should trigger on even node count."
  );
  assert.equal(
    layout.shouldSealForwardConveyorTail(1, 0, 1),
    true,
    "conveyor-layout-helper: forward tail should seal when no output groups exist."
  );

  const forwardSprayRecord = JSON.parse(JSON.stringify(layout.createSprayOffsetRecord(1, 6, 10, 0)));
  assert.deepEqual(
    forwardSprayRecord,
    { x: 6, y: 9, z: 0 },
    "conveyor-layout-helper: forward spray record should anchor on previous y."
  );
  const reverseSprayRecord = JSON.parse(JSON.stringify(layout.createSprayOffsetRecord(-1, 6, 10, 0)));
  assert.deepEqual(
    reverseSprayRecord,
    { x: 6, y: 11, z: 0 },
    "conveyor-layout-helper: reverse spray record should anchor on next y."
  );

  layout.updateConveyorOccupiedAreaX(occupiedArea, 42);
  assert.equal(
    occupiedArea[occupiedArea.length - 1].x2,
    42,
    "conveyor-layout-helper: occupied area x2 should be updated with final conveyor x."
  );
}

function testSupplementSorterHelpers(context) {
  const layout = readBinding(context, "DSQBlueprintLayout");
  const model = readBinding(context, "DSQBlueprintModel");
  assert.ok(layout && model, "supplement-helper: layout/model factories should be loaded.");

  const sourceSorter = {
    ownerObjIdx: 501,
    ownerName: "assemblingMachineMk1",
    ownerOffset: { x: 12, y: 8, z: 0 },
    recipeID: 6,
  };
  const record = model.createSupplementSorterOwnerRecord(700, 1.5, sourceSorter);
  assert.equal(record.index, 700, "supplement-helper: record index should match supplement sorter index.");
  assert.equal(record.rate, 1.5, "supplement-helper: record rate should match supplement sorter rate.");
  assert.equal(record.ownerObjIdx, 501, "supplement-helper: ownerObjIdx should come from source sorter.");
  assert.equal(
    record.ownerName,
    "assemblingMachineMk1",
    "supplement-helper: ownerName should come from source sorter."
  );
  assert.equal(record.recipeID, 6, "supplement-helper: recipeID should come from source sorter.");

  const inputSorters = [{ index: 1 }, { index: 2 }, { index: 3 }];
  layout.applySupplementSorterToInputBucket(inputSorters, record);
  assert.equal(inputSorters.length, 3, "supplement-helper: bucket length should stay unchanged after apply.");
  assert.equal(
    inputSorters[0].index,
    700,
    "supplement-helper: new supplement record should be inserted at bucket head."
  );
  assert.equal(inputSorters[2].index, 2, "supplement-helper: oldest tail entry should be popped.");
}

function testSelfSprayLayoutHelpers(context) {
  const layout = readBinding(context, "DSQBlueprintLayout");
  const constants = readBinding(context, "DSQBlueprintConstants");
  assert.ok(layout && constants, "self-spray-helper: layout/constants should be loaded.");

  const productionCategory = constants.productionCategory;
  const firstSprayOffset = { x: 10, y: 8, z: 0 };
  const startOffset = JSON.parse(
    JSON.stringify(layout.calculateSelfSprayStartOffset(firstSprayOffset, productionCategory.lab, productionCategory))
  );
  assert.deepEqual(
    startOffset,
    { x: 10, y: 10, z: 0 },
    "self-spray-helper: lab should shift self-spray start offset by +2 on y-axis."
  );

  const plan = layout.buildSelfSprayStructurePlan(4, startOffset, firstSprayOffset);
  const sprayCoaterOffset = JSON.parse(JSON.stringify(plan.sprayCoaterOffset));
  assert.deepEqual(
    sprayCoaterOffset,
    { x: 3, y: 14, z: 0 },
    "self-spray-helper: spray coater offset should match expected anchor position."
  );

  const nodeOffsets = Array.from(plan.conveyorNodeOffsets, offset => JSON.parse(JSON.stringify(offset)));
  assert.equal(nodeOffsets.length, 28, "self-spray-helper: structure plan should include core + bridge nodes.");
  assert.deepEqual(
    nodeOffsets[0],
    { x: 3, y: 16, z: 0 },
    "self-spray-helper: first conveyor node should be the proliferator input node."
  );
  assert.deepEqual(
    nodeOffsets[nodeOffsets.length - 1],
    { x: 9, y: 9, z: 1 },
    "self-spray-helper: final bridge node should match expected vertical link endpoint."
  );
}

function testSprayMainLineHelper(context) {
  const layout = readBinding(context, "DSQBlueprintLayout");
  assert.ok(layout, "spray-mainline-helper: DSQBlueprintLayout should be loaded.");

  const sameRowSprays = [
    { x: 2, y: 6, z: 0 },
    { x: 5, y: 6, z: 0 },
  ];
  const sameRowPlan = layout.planSprayCoaterMainLine(sameRowSprays, sameRowSprays[0]);
  assert.equal(sameRowPlan.error, null, "spray-mainline-helper: same-row route should be generated.");
  assert.equal(sameRowPlan.nodeOffsets.length, 3, "spray-mainline-helper: same-row route should include 3 nodes.");
  assert.deepEqual(
    JSON.parse(JSON.stringify(sameRowPlan.terminalOffset)),
    { x: 6, y: 6, z: 1 },
    "spray-mainline-helper: terminal offset should continue to +x direction for same-row route."
  );

  const invalidSprays = [
    { x: 2, y: 1, z: 0 },
    { x: 6, y: 4, z: 0 },
  ];
  const invalidPlan = layout.planSprayCoaterMainLine(invalidSprays, invalidSprays[0]);
  assert.equal(invalidPlan.error, "route_failed", "spray-mainline-helper: invalid route should return route_failed.");
}

function testSprayExecutionPlanHelper(context) {
  const layout = readBinding(context, "DSQBlueprintLayout");
  const constants = readBinding(context, "DSQBlueprintConstants");
  assert.ok(layout && constants, "spray-exec-helper: layout/constants should be loaded.");

  const productionCategory = constants.productionCategory;
  const baseOffsets = [
    { x: 2, y: 6, z: 0 },
    { x: 5, y: 6, z: 0 },
  ];
  const firstSprayOffset = baseOffsets[0];

  const noSelfPlan = layout.planSprayCoaterConveyorExecution(
    baseOffsets.map(o => ({ ...o })),
    firstSprayOffset,
    false,
    4,
    productionCategory.lab,
    productionCategory
  );
  assert.equal(
    noSelfPlan.selfSprayPlan,
    null,
    "spray-exec-helper: selfSpray=false should not include self-spray plan."
  );
  assert.equal(
    noSelfPlan.entryNodePlan[0].useProliferatorParameters,
    true,
    "spray-exec-helper: selfSpray=false should inject proliferator on first entry node."
  );
  assert.equal(noSelfPlan.mainLinePlan.error, null, "spray-exec-helper: no-self route should be generated.");

  const selfPlan = layout.planSprayCoaterConveyorExecution(
    baseOffsets.map(o => ({ ...o })),
    firstSprayOffset,
    true,
    4,
    productionCategory.lab,
    productionCategory
  );
  assert.ok(selfPlan.selfSprayPlan, "spray-exec-helper: selfSpray=true should include self-spray plan.");
  assert.equal(
    selfPlan.entryNodePlan[0].useProliferatorParameters,
    false,
    "spray-exec-helper: selfSpray=true should consume proliferator before entry nodes."
  );
  assert.ok(
    selfPlan.selfSprayPlan.conveyorNodeOffsets.length > 0,
    "spray-exec-helper: self-spray plan should include conveyor nodes."
  );
}

function testSprayNodeSequenceHelper(context) {
  const layout = readBinding(context, "DSQBlueprintLayout");
  const constants = readBinding(context, "DSQBlueprintConstants");
  assert.ok(layout && constants, "spray-seq-helper: layout/constants should be loaded.");

  const productionCategory = constants.productionCategory;
  const baseOffsets = [
    { x: 2, y: 6, z: 0 },
    { x: 5, y: 6, z: 0 },
  ];
  const firstSprayOffset = baseOffsets[0];

  const noSelfPlan = layout.planSprayCoaterConveyorExecution(
    baseOffsets.map(o => ({ ...o })),
    firstSprayOffset,
    false,
    4,
    productionCategory.lab,
    productionCategory
  );
  const noSelfSeq = Array.from(layout.buildSprayConveyorNodeSequence(noSelfPlan, { iconId: 1234 }), node =>
    JSON.parse(JSON.stringify(node))
  );
  assert.equal(noSelfSeq[0].parameters.iconId, 1234, "spray-seq-helper: no-self first node should carry proliferator.");
  assert.equal(
    noSelfSeq[noSelfSeq.length - 1].outputObjIdx,
    -1,
    "spray-seq-helper: terminal node should end the spray conveyor chain."
  );
  assert.equal(noSelfSeq[noSelfSeq.length - 1].outputToSlot, -1, "spray-seq-helper: terminal slot should be -1.");

  const selfPlan = layout.planSprayCoaterConveyorExecution(
    baseOffsets.map(o => ({ ...o })),
    firstSprayOffset,
    true,
    4,
    productionCategory.lab,
    productionCategory
  );
  const selfSeq = Array.from(layout.buildSprayConveyorNodeSequence(selfPlan, { iconId: 5678 }), node =>
    JSON.parse(JSON.stringify(node))
  );
  assert.equal(
    selfSeq[0].parameters.iconId,
    5678,
    "spray-seq-helper: self-spray first core node should carry proliferator."
  );
  assert.equal(
    selfSeq[selfPlan.selfSprayPlan.conveyorNodeOffsets.length].parameters,
    null,
    "spray-seq-helper: first entry node should not carry proliferator after self-spray consumption."
  );
}

function testSprayActionPlanHelper(context) {
  const layout = readBinding(context, "DSQBlueprintLayout");
  const constants = readBinding(context, "DSQBlueprintConstants");
  assert.ok(layout && constants, "spray-action-helper: layout/constants should be loaded.");

  const productionCategory = constants.productionCategory;
  const baseOffsets = [
    { x: 2, y: 6, z: 0 },
    { x: 5, y: 6, z: 0 },
  ];
  const firstSprayOffset = baseOffsets[0];

  const selfPlan = layout.planSprayCoaterConveyorExecution(
    baseOffsets.map(o => ({ ...o })),
    firstSprayOffset,
    true,
    4,
    productionCategory.lab,
    productionCategory
  );
  const actionPlan = Array.from(layout.buildSprayConveyorActionPlan(selfPlan, { iconId: 4321 }), action =>
    JSON.parse(JSON.stringify(action))
  );
  assert.equal(
    actionPlan[0].type,
    "sprayCoater",
    "spray-action-helper: self-spray plan should start with spray coater action."
  );
  assert.equal(actionPlan[1].type, "node", "spray-action-helper: spray coater should be followed by node actions.");
  assert.equal(
    actionPlan[actionPlan.length - 1].outputObjIdxMode,
    "fixed",
    "spray-action-helper: terminal node action should use fixed output mode."
  );
  assert.equal(
    actionPlan[actionPlan.length - 1].outputObjIdx,
    -1,
    "spray-action-helper: terminal node action should point to -1 output index."
  );

  const resolvedNextIdx = layout.resolveSprayNodeOutputObjIdx({ outputObjIdxMode: "next", outputObjIdx: null }, 100);
  const resolvedFixedIdx = layout.resolveSprayNodeOutputObjIdx({ outputObjIdxMode: "fixed", outputObjIdx: -1 }, 100);
  assert.equal(resolvedNextIdx, 102, "spray-action-helper: next output mode should map to current index + 2.");
  assert.equal(resolvedFixedIdx, -1, "spray-action-helper: fixed output mode should keep explicit output index.");
}

function testSprayErrorHelper(context) {
  const layout = readBinding(context, "DSQBlueprintLayout");
  assert.ok(layout, "spray-error-helper: DSQBlueprintLayout should be loaded.");

  const okResult = layout.resolveSprayCoaterMainLineError(null);
  assert.equal(okResult, null, "spray-error-helper: null error code should not produce error payload.");

  const routeFailedResult = JSON.parse(JSON.stringify(layout.resolveSprayCoaterMainLineError("route_failed")));
  assert.deepEqual(
    routeFailedResult,
    {
      message: "喷涂剂排线错误",
      duration: 4000,
      throwReason: "generate sprayCoater error",
    },
    "spray-error-helper: route_failed should map to expected UI/throw payload."
  );
}

async function testFacadeLockReleaseOnWorkerCtorFailure() {
  const context = createBrowserLikeContext();
  context.Worker = class WorkerCtorFail {
    constructor() {
      throw new Error("worker ctor fail");
    }
  };

  await loadScript(context, "Scripts/blueprint.facade.js");

  let rejected = false;
  try {
    await readBinding(context, "BlueprintFacade.generateAsync('t', [0], { subRecipes: [] }, {})");
  } catch {
    rejected = true;
  }

  assert.equal(rejected, true, "facade-lock-ctor: generateAsync should reject when Worker ctor throws.");
  assert.equal(
    readBinding(context, "BlueprintFacade._isGenerating"),
    false,
    "facade-lock-ctor: lock should be released after Worker ctor failure."
  );
}

async function testFacadeLockReleaseOnPostMessageFailure() {
  const context = createBrowserLikeContext();
  context.Worker = class WorkerPostFail {
    terminate() {}
    postMessage() {
      throw new Error("worker postMessage fail");
    }
  };

  await loadScript(context, "Scripts/blueprint.facade.js");

  let rejected = false;
  try {
    await readBinding(context, "BlueprintFacade.generateAsync('t', [0], { subRecipes: [] }, {})");
  } catch {
    rejected = true;
  }

  assert.equal(rejected, true, "facade-lock-post: generateAsync should reject when postMessage throws.");
  assert.equal(
    readBinding(context, "BlueprintFacade._isGenerating"),
    false,
    "facade-lock-post: lock should be released after postMessage failure."
  );
}

async function main() {
  const runtimeContext = createBrowserLikeContext();
  await loadScripts(runtimeContext, BLUEPRINT_RUNTIME_FILES);

  if (runtimeContext.pako && !runtimeContext.pako.default) {
    runtimeContext.pako.default = runtimeContext.pako;
  }

  testBasicAssemblerFlow(runtimeContext);
  testSprayAndStackFlow(runtimeContext);
  testRefineryMultiOutputFlow(runtimeContext);
  testClonePlanningHelpers(runtimeContext);
  testBeltLoadValidationHelper(runtimeContext);
  testConveyorLayoutHelpers(runtimeContext);
  testSupplementSorterHelpers(runtimeContext);
  testSelfSprayLayoutHelpers(runtimeContext);
  testSprayMainLineHelper(runtimeContext);
  testSprayExecutionPlanHelper(runtimeContext);
  testSprayNodeSequenceHelper(runtimeContext);
  testSprayActionPlanHelper(runtimeContext);
  testSprayErrorHelper(runtimeContext);

  await testFacadeLockReleaseOnWorkerCtorFailure();
  await testFacadeLockReleaseOnPostMessageFailure();

  console.log("blueprint-regression: all blueprint flow checks passed.");
}

main().catch(error => {
  console.error("blueprint-regression: failed.");
  console.error(error.message || error);
  process.exit(1);
});
