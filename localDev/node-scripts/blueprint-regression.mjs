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
  assert.ok(layout, "clone-plan-helper: DSQBlueprintLayout should be loaded.");

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

  await testFacadeLockReleaseOnWorkerCtorFailure();
  await testFacadeLockReleaseOnPostMessageFailure();

  console.log("blueprint-regression: all blueprint flow checks passed.");
}

main().catch(error => {
  console.error("blueprint-regression: failed.");
  console.error(error.message || error);
  process.exit(1);
});
