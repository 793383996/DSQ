import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const ALLOWLIST = new Set(["__DSQLegacyBootstrapPromise"]);
const ASSIGNMENT_PATTERNS = [/\bwindow\.([A-Za-z_$][\w$]*)\s*=(?!=)/g, /\bglobalThis\.([A-Za-z_$][\w$]*)\s*=(?!=)/g];

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|vue)$/.test(entry.name)) continue;
    if (/\.d\.ts$/.test(entry.name)) continue;
    files.push(fullPath);
  }

  return files;
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

async function main() {
  const files = await collectFiles(SRC_DIR);
  const warnings = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    for (const pattern of ASSIGNMENT_PATTERNS) {
      for (const match of content.matchAll(pattern)) {
        const variableName = match[1];
        if (ALLOWLIST.has(variableName)) {
          continue;
        }
        warnings.push(`${toRelative(filePath)} -> ${variableName}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn("guard:globals warnings detected.");
    for (const warning of warnings) {
      console.warn(`- new global write candidate: ${warning}`);
    }
    process.exit(0);
  }

  console.log(`guard:globals passed. files=${files.length}`);
}

main().catch(error => {
  console.warn("guard:globals warning: script execution failed.");
  console.warn(error.message || error);
  process.exit(0);
});
