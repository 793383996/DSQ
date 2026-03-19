import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set([".git", "node_modules", ".idea", ".novel-assistant"]);

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name)) {
        const nested = await collectJsFiles(path.join(dir, entry.name));
        results.push(...nested);
      }
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      const nested = await collectJsFiles(fullPath);
      results.push(...nested);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }

    if (entry.name.endsWith(".min.js") || entry.name.endsWith(".backup")) {
      continue;
    }

    results.push(fullPath);
  }

  return results;
}

function syntaxCheck(filePath) {
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
  const files = await collectJsFiles(ROOT);

  if (files.length === 0) {
    console.log("lint: no JS files found.");
    return;
  }

  const failures = [];

  for (const file of files) {
    try {
      syntaxCheck(file);
    } catch (error) {
      failures.push({ file, error: error.message });
    }
  }

  if (failures.length > 0) {
    console.error("lint: syntax validation failed.");
    for (const failure of failures) {
      console.error(`- ${path.relative(ROOT, failure.file)}`);
      console.error(failure.error);
    }
    process.exit(1);
  }

  console.log(`lint: syntax validation passed for ${files.length} JS files.`);
}

main().catch((error) => {
  console.error("lint: unexpected error.");
  console.error(error);
  process.exit(1);
});
