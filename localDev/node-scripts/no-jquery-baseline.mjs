import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SCRIPTS_DIR = path.join(ROOT, "Scripts");
const BLOCKED_PATTERNS = [
  { name: "dollar-call", regex: /\$\s*\(/g },
  { name: "dollar-dot", regex: /\$\s*\./g },
  { name: "jquery-token", regex: /\bjQuery\b/g },
  { name: "jquery-load", regex: /\.load\s*\(/g },
];
const INDEX_BLOCKED = [/jquery-.*\.js/i, /jquery\.cookie/i, /jquery\.tips/i];

async function collectScriptFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectScriptFiles(fullPath)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".js")) continue;
    if (entry.name.endsWith(".min.js")) continue;
    files.push(fullPath);
  }

  return files;
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

async function assertPathExists(targetPath) {
  await stat(targetPath);
}

async function main() {
  await assertPathExists(SCRIPTS_DIR);

  const files = await collectScriptFiles(SCRIPTS_DIR);
  const issues = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    for (const rule of BLOCKED_PATTERNS) {
      if (!rule.regex.test(content)) continue;
      issues.push(`${toRel(filePath)} -> ${rule.name}`);
    }
  }

  const html = await readFile(path.join(ROOT, "index.html"), "utf8");
  for (const blocked of INDEX_BLOCKED) {
    if (blocked.test(html)) {
      issues.push(`index.html -> blocked jquery script reference: ${blocked}`);
    }
  }

  if (issues.length > 0) {
    console.error("jquery:check failed.");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(`jquery:check passed. scanned=${files.length}`);
}

main().catch(error => {
  console.error("jquery:check failed.");
  console.error(error.message || error);
  process.exit(1);
});
