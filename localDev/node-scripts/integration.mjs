import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DIST_ROOT = path.join(process.cwd(), "dist");
const HOST = "127.0.0.1";

const KEY_URLS = [
  "/",
  "/index.html",
  "/Scripts/data.state.js",
  "/Scripts/data.storage.js",
  "/Scripts/data.js",
  "/Scripts/data.recipe-init.js",
  "/Scripts/data.recipe.js",
  "/Scripts/data.recipe-ui.js",
  "/Scripts/data.blueprint.js",
  "/Scripts/data.ui-bindings.js",
  "/Scripts/data.bootstrap.js",
  "/Scripts/blueprint.constants.js",
  "/Scripts/blueprint.serializer.js",
  "/Scripts/blueprint.model.js",
  "/Scripts/blueprint.layout.js",
  "/Scripts/blueprint.js",
  "/Scripts/calc-core.js",
  "/quote/explanation.html",
  "/img/to.png",
];

const REQUIRED_MARKERS = [
  'id="txtnumber"',
  'id="selmaince"',
  'id="btnSetting"',
  'onclick="generateBlueprint()"',
  'id="main-content"',
];

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".xml") return "application/xml; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".ico") return "image/x-icon";
  return "application/octet-stream";
}

function resolvePath(urlPath) {
  if (urlPath === "/") return path.join(DIST_ROOT, "index.html");
  const normalized = urlPath.split("?")[0].split("#")[0].replace(/^\/+/, "");
  return path.join(DIST_ROOT, normalized);
}

function createStaticServer() {
  return createServer(async (req, res) => {
    try {
      const filePath = resolvePath(req.url || "/");
      const data = await readFile(filePath);
      res.writeHead(200, { "Content-Type": contentType(filePath) });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
    }
  });
}

async function assertHttpOk(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response;
}

async function main() {
  const server = createStaticServer();
  let baseUrl = "";
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, () => {
      const addr = server.address();
      if (!addr || typeof addr !== "object") {
        reject(new Error("integration: could not resolve listen address."));
        return;
      }
      baseUrl = `http://${HOST}:${addr.port}`;
      resolve();
    });
  });

  try {
    for (const pathname of KEY_URLS) {
      await assertHttpOk(`${baseUrl}${pathname}`);
    }

    const htmlResponse = await assertHttpOk(`${baseUrl}/index.html`);
    const html = await htmlResponse.text();
    for (const marker of REQUIRED_MARKERS) {
      if (!html.includes(marker)) {
        throw new Error(`Missing marker in index.html: ${marker}`);
      }
    }

    console.log("integration: dist key routes and UI markers passed.");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error("integration: failed.");
  console.error(error.message || error);
  process.exit(1);
});
