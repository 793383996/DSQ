import { access, constants, readFile } from "node:fs/promises";
import path from "node:path";

const DIST_ROOT = path.join(process.cwd(), "dist");
const REQUIRED_FILES = [
  "index.html",
  "Scripts/data.state.js",
  "Scripts/data.storage.js",
  "Scripts/data.js",
  "Scripts/data.recipe.js",
  "Scripts/data.blueprint.js",
  "Scripts/data.ui-bindings.js",
  "Scripts/data.bootstrap.js",
  "Scripts/blueprint.constants.js",
  "Scripts/blueprint.serializer.js",
  "Scripts/blueprint.model.js",
  "Scripts/blueprint.layout.js",
  "Scripts/blueprint.js",
  "Scripts/calc-core.js",
];

async function assertExists(filePath) {
  await access(filePath, constants.F_OK);
}

function isLocalAssetRef(raw) {
  if (!raw) return false;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return false;
  if (raw.startsWith("data:")) return false;
  if (raw.startsWith("javascript:")) return false;
  if (raw.startsWith("#")) return false;

  if (raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../")) {
    return true;
  }

  return /\.(?:js|css|png|jpg|jpeg|gif|svg|ico|xml|txt|html|json)$/i.test(raw);
}

function normalizeToDistPath(raw) {
  const strippedQuery = raw.split("?")[0].split("#")[0];
  if (strippedQuery.startsWith("/")) {
    return strippedQuery.slice(1);
  }
  if (strippedQuery.startsWith("./")) {
    return strippedQuery.slice(2);
  }
  return strippedQuery;
}

async function main() {
  for (const file of REQUIRED_FILES) {
    await assertExists(path.join(DIST_ROOT, file));
  }

  const html = await readFile(path.join(DIST_ROOT, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
    .map(match => match[1])
    .filter(isLocalAssetRef)
    .map(normalizeToDistPath)
    .filter(Boolean);

  for (const ref of refs) {
    await assertExists(path.join(DIST_ROOT, ref));
  }

  console.log("verify:dist passed.");
}

main().catch(error => {
  console.error("verify:dist failed.");
  console.error(error.message || error);
  process.exit(1);
});
