import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";

const REQUIRED_FILES = ["index.html", "Scripts/data.js", "Scripts/blueprint.js"];

async function assertFileExists(filePath) {
  await access(filePath, constants.F_OK);
}

function assertSyntax(filePath) {
  const check = spawnSync(process.execPath, ["--check", filePath], {
    stdio: "pipe",
    encoding: "utf8"
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

  if (!html.includes("Scripts/data.js") || !html.includes("Scripts/blueprint")) {
    throw new Error("Smoke check failed: index.html does not include expected core script references.");
  }

  assertSyntax("Scripts/data.js");
  assertSyntax("Scripts/blueprint.js");

  console.log("smoke: core files and syntax checks passed.");
}

main().catch((error) => {
  console.error("smoke: failed.");
  console.error(error.message || error);
  process.exit(1);
});
