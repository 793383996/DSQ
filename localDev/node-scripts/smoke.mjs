import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";

const REQUIRED_FILES = [
  "index.html",
  "Scripts/data.state.js",
  "Scripts/data.storage.js",
  "Scripts/data.js",
  "Scripts/data.recipe-init.js",
  "Scripts/data.recipe.js",
  "Scripts/data.blueprint.js",
  "Scripts/data.ui-bindings.js",
  "Scripts/data.bootstrap.js",
  "Scripts/blueprint.constants.js",
  "Scripts/blueprint.serializer.js",
  "Scripts/blueprint.model.js",
  "Scripts/blueprint.layout.js",
  "Scripts/blueprint.js",
];

async function assertFileExists(filePath) {
  await access(filePath, constants.F_OK);
}

function assertSyntax(filePath) {
  const check = spawnSync(process.execPath, ["--check", filePath], {
    stdio: "pipe",
    encoding: "utf8",
  });

  if (check.status !== 0) {
    const output = [check.stdout, check.stderr].filter(Boolean).join("\n").trim();
    throw new Error(output || `Syntax check failed: ${filePath}`);
  }
}

async function main() {
  for (const file of REQUIRED_FILES) {
    await assertFileExists(file);
  }

  const html = await readFile("index.html", "utf8");

  if (
    !html.includes("Scripts/data.state.js") ||
    !html.includes("Scripts/data.storage.js") ||
    !html.includes("Scripts/data.js") ||
    !html.includes("Scripts/data.recipe-init.js") ||
    !html.includes("Scripts/data.recipe.js") ||
    !html.includes("Scripts/data.blueprint.js") ||
    !html.includes("Scripts/data.ui-bindings.js") ||
    !html.includes("Scripts/blueprint.constants.js") ||
    !html.includes("Scripts/blueprint.serializer.js") ||
    !html.includes("Scripts/blueprint.model.js") ||
    !html.includes("Scripts/blueprint.layout.js") ||
    !html.includes("Scripts/blueprint")
  ) {
    throw new Error("Smoke check failed: index.html does not include expected core script references.");
  }

  assertSyntax("Scripts/data.state.js");
  assertSyntax("Scripts/data.js");
  assertSyntax("Scripts/data.recipe-init.js");
  assertSyntax("Scripts/data.recipe.js");
  assertSyntax("Scripts/data.blueprint.js");
  assertSyntax("Scripts/data.ui-bindings.js");
  assertSyntax("Scripts/data.storage.js");
  assertSyntax("Scripts/data.bootstrap.js");
  assertSyntax("Scripts/blueprint.constants.js");
  assertSyntax("Scripts/blueprint.serializer.js");
  assertSyntax("Scripts/blueprint.model.js");
  assertSyntax("Scripts/blueprint.layout.js");
  assertSyntax("Scripts/blueprint.js");

  console.log("smoke: core files and syntax checks passed.");
}

main().catch(error => {
  console.error("smoke: failed.");
  console.error(error.message || error);
  process.exit(1);
});
