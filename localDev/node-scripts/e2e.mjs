import assert from "node:assert/strict";
import { createServer } from "node:https";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const DIST_ROOT = path.join(ROOT, "dist");
const CERT_PATH = path.join(ROOT, "localhost.crt");
const KEY_PATH = path.join(ROOT, "localhost.key");
const HOST = "localhost";

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

async function assertPathExists(targetPath) {
  await access(targetPath, constants.F_OK);
}

async function createHttpsStaticServer() {
  const [cert, key] = await Promise.all([readFile(CERT_PATH), readFile(KEY_PATH)]);
  const server = createServer({ cert, key }, async (req, res) => {
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

  const baseUrl = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, () => {
      const addr = server.address();
      if (!addr || typeof addr !== "object") {
        reject(new Error("e2e: could not resolve listen address."));
        return;
      }
      resolve(`https://${HOST}:${addr.port}`);
    });
  });

  return { server, baseUrl };
}

async function waitForDataReady(page) {
  await page.waitForFunction(() => window.isDataLoaded === true, null, { timeout: 20000 });
}

async function addRequirement(page, itemName) {
  await page.locator('a[title="添加"]').first().click();
  const iconLocator = page.locator(`#UIselector .icons.icons-selected .icon[title="${itemName}"]`).first();
  await iconLocator.waitFor({ state: "visible", timeout: 20000 });
  await iconLocator.click();
  await page.waitForFunction(
    target => Array.isArray(window.xqs) && window.xqs.some(entry => entry && entry.item && entry.item.name === target),
    itemName,
    { timeout: 20000 }
  );
}

async function readMachineName(page, itemName) {
  return page.evaluate(target => {
    const rows = Array.from(document.querySelectorAll("tbody tr"));
    const row = rows.find(tr => tr.querySelector(`td.cell-name[data-name="${target}"]`));
    if (!row) {
      return null;
    }
    const machineNode = row.querySelector("td:nth-child(8) a.m.selected");
    return machineNode ? machineNode.textContent.trim() : null;
  }, itemName);
}

async function runE2E() {
  await Promise.all([assertPathExists(DIST_ROOT), assertPathExists(CERT_PATH), assertPathExists(KEY_PATH)]);
  const { server, baseUrl } = await createHttpsStaticServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    await context.addInitScript(() => {
      const fallbackWriteText = async text => {
        window.__copiedBlueprint = text;
      };
      if (!navigator.clipboard) {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: fallbackWriteText },
        });
        return;
      }
      const original =
        typeof navigator.clipboard.writeText === "function"
          ? navigator.clipboard.writeText.bind(navigator.clipboard)
          : null;
      navigator.clipboard.writeText = async text => {
        window.__copiedBlueprint = text;
        if (original) {
          try {
            return await original(text);
          } catch {
            return undefined;
          }
        }
        return undefined;
      };
    });

    const page = await context.newPage();
    await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
    await waitForDataReady(page);

    // Case 1: 新增需求 -> 触发计算 -> 展示结果
    await addRequirement(page, "齿轮");
    await page.locator('button:has-text("生成蓝图")').first().waitFor({ state: "visible", timeout: 10000 });
    const xqsLength = await page.evaluate(() => (Array.isArray(window.xqs) ? window.xqs.length : 0));
    assert.ok(xqsLength > 0, "e2e: adding requirement should update demand list.");

    // Case 2: 修改配置项 -> 结果更新
    const currentMode = await page.inputValue("#selmodein");
    const targetMode = currentMode === "重组式制造台" ? "制作台Mk.Ⅰ" : "重组式制造台";
    const beforeMachine = await readMachineName(page, "齿轮");
    await page.selectOption("#selmodein", targetMode);
    await page.waitForFunction(
      ({ itemName, modeName }) => {
        const rows = Array.from(document.querySelectorAll("tbody tr"));
        const row = rows.find(tr => tr.querySelector(`td.cell-name[data-name="${itemName}"]`));
        if (!row) {
          return false;
        }
        const machineNode = row.querySelector("td:nth-child(8) a.m.selected");
        return !!machineNode && machineNode.textContent.trim() === modeName;
      },
      { itemName: "齿轮", modeName: targetMode },
      { timeout: 10000 }
    );
    const afterMachine = await readMachineName(page, "齿轮");
    assert.equal(afterMachine, targetMode, "e2e: machine type should follow changed configuration.");
    assert.notEqual(beforeMachine, afterMachine, "e2e: machine type should change after updating configuration.");

    // Case 3: 蓝图生成 -> 返回文本/复制链路
    await page.locator('button:has-text("生成蓝图")').first().click();
    await page.waitForFunction(
      () => typeof window.__copiedBlueprint === "string" && window.__copiedBlueprint.length > 64,
      null,
      { timeout: 20000 }
    );
    const blueprintLength = await page.evaluate(() => window.__copiedBlueprint.length);
    assert.ok(blueprintLength > 64, "e2e: generated blueprint text should be non-empty.");
  } finally {
    if (browser) {
      await browser.close();
    }
    await new Promise(resolve => server.close(resolve));
  }
}

runE2E()
  .then(() => {
    console.log("e2e: browser interaction checks passed.");
  })
  .catch(error => {
    console.error("e2e: failed.");
    console.error(error.message || error);
    process.exit(1);
  });
