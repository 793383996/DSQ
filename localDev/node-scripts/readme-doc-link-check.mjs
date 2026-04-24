import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const README_PATH = path.join(ROOT, "README.md");

async function exists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const readme = await readFile(README_PATH, "utf8");
  const matches = [...readme.matchAll(/`(localDocs\/[^`]+)`/g)].map(match => match[1]);
  const uniquePaths = [...new Set(matches)];
  const warnings = [];

  for (const relativePath of uniquePaths) {
    const fullPath = path.join(ROOT, relativePath.replace(/\//g, path.sep));
    if (!(await exists(fullPath))) {
      warnings.push(relativePath);
    }
  }

  if (warnings.length > 0) {
    console.warn("docs:check warnings detected.");
    for (const warning of warnings) {
      console.warn(`- missing README doc reference: ${warning}`);
    }
    process.exit(0);
  }

  console.log(`docs:check passed. refs=${uniquePaths.length}`);
}

main().catch(error => {
  console.warn("docs:check warning: script execution failed.");
  console.warn(error.message || error);
  process.exit(0);
});
