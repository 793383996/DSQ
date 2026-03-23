import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const ROOT = process.cwd();
const DIST_ROOT = path.join(ROOT, "dist");
const HOST = "127.0.0.1";
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

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

function summarizeViolations(violations) {
  const impacts = {};
  for (const violation of violations) {
    const impact = violation.impact || "unknown";
    impacts[impact] = (impacts[impact] || 0) + 1;
  }
  return impacts;
}

async function main() {
  const server = createStaticServer();
  let baseUrl = "";
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, () => {
      const addr = server.address();
      if (!addr || typeof addr !== "object") {
        reject(new Error("a11y: could not resolve listen address."));
        return;
      }
      baseUrl = `http://${HOST}:${addr.port}`;
      resolve();
    });
  });

  let browser;
  let context;
  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.isDataLoaded === true, null, { timeout: 20000 });

    const result = await new AxeBuilder({ page })
      // Known false positive: badge-style exclude link uses dynamic background blend in table row.
      .exclude("#btnExcludeAccLine")
      // Legacy changelog block keeps historical rich-text colors and is out of core interaction flow.
      .exclude('div[data-include="updata"]')
      // Legacy explanation block contains rich text copied from history pages.
      .exclude('div[data-include="explanation"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blockingViolations = result.violations.filter(v => BLOCKING_IMPACTS.has(v.impact || ""));
    if (blockingViolations.length > 0) {
      console.error("a11y: blocking violations detected.");
      for (const violation of blockingViolations) {
        const nodes = violation.nodes || [];
        const selector = nodes[0] && nodes[0].target ? nodes[0].target.join(", ") : "n/a";
        console.error(`- [${violation.impact}] ${violation.id}: ${violation.help} (first target: ${selector})`);
      }
      throw new Error(`a11y: found ${blockingViolations.length} serious/critical accessibility violations.`);
    }

    const impacts = summarizeViolations(result.violations);
    console.log(`a11y: passed. total_violations=${result.violations.length}, impacts=${JSON.stringify(impacts)}`);
  } finally {
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
