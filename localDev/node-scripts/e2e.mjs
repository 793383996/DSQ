import assert from "node:assert/strict";
import { createServer } from "node:https";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const DIST_ROOT = path.join(ROOT, "dist");
const CERT_PATH = path.join(ROOT, "localhost.crt");
const KEY_PATH = path.join(ROOT, "localhost.key");
const ARTIFACT_DIR = path.join(ROOT, "localTest", "e2e-artifacts");
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

function sanitizeArtifactName(name) {
  return name.replace(/[^a-z0-9-]/gi, "_");
}

async function writeStepArtifacts(page, consoleLogs, stepName, error) {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[^\d]/g, "").slice(0, 14);
  const baseName = `${timestamp}-${sanitizeArtifactName(stepName)}`;
  const screenshotPath = path.join(ARTIFACT_DIR, `${baseName}.png`);
  const logPath = path.join(ARTIFACT_DIR, `${baseName}.log`);

  if (page) {
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch {
      // Ignore screenshot capture errors to avoid masking the original failure.
    }
  }

  const logContent = [
    `step: ${stepName}`,
    `error: ${error && error.message ? error.message : String(error)}`,
    "",
    "console logs:",
    ...(consoleLogs.length > 0 ? consoleLogs : ["(no console output)"]),
    "",
  ].join("\n");
  await writeFile(logPath, logContent, "utf8");
}

async function runE2EAttempt(attempt) {
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
    const consoleLogs = [];
    page.on("console", msg => {
      consoleLogs.push(`[console:${msg.type()}] ${msg.text()}`);
    });
    page.on("pageerror", err => {
      consoleLogs.push(`[pageerror] ${err.message}`);
    });

    async function runStep(stepName, fn) {
      try {
        await fn();
      } catch (error) {
        await writeStepArtifacts(page, consoleLogs, `${attempt}-${stepName}`, error);
        throw error;
      }
    }

    await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
    await runStep("wait-data-ready", async () => {
      await waitForDataReady(page);
    });

    // Case 0: 语言切换 -> 刷新保持
    await runStep("locale-persistence", async () => {
      await page.selectOption("#langSwitcher", "en-US");
      await page.waitForFunction(
        () => {
          const settingButton = document.querySelector("#btnSetting");
          return !!settingButton && settingButton.textContent.trim() === "Settings";
        },
        null,
        { timeout: 10000 }
      );
      await page.waitForFunction(() => {
        return new URL(window.location.href).searchParams.get("lang") === "en-US";
      });
      const canonicalHref = await page.locator("#canonicalLink").first().getAttribute("href");
      assert.equal(
        canonicalHref,
        "https://dsq.vercel.app/?lang=en-US",
        "e2e: canonical URL should follow switched locale."
      );

      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForDataReady(page);
      const locale = await page.inputValue("#langSwitcher");
      assert.equal(locale, "en-US", "e2e: locale should persist after reload.");
      const settingText = await page.locator("#btnSetting").first().textContent();
      assert.equal((settingText || "").trim(), "Settings", "e2e: translated text should be restored after reload.");
    });

    // Case 1: 新增需求 -> 触发计算 -> 展示结果
    await runStep("add-requirement", async () => {
      await addRequirement(page, "齿轮");
      await page.locator('button:has-text("生成蓝图")').first().waitFor({ state: "visible", timeout: 10000 });
      const xqsLength = await page.evaluate(() => (Array.isArray(window.xqs) ? window.xqs.length : 0));
      assert.ok(xqsLength > 0, "e2e: adding requirement should update demand list.");
    });

    // Case 2: 修改配置项 -> 结果更新
    await runStep("change-config", async () => {
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
    });

    // Case 3: 蓝图生成 -> 返回文本/复制链路
    await runStep("generate-blueprint", async () => {
      await page.locator('button:has-text("生成蓝图")').first().click();
      await page.waitForFunction(
        () => typeof window.__copiedBlueprint === "string" && window.__copiedBlueprint.length > 64,
        null,
        { timeout: 20000 }
      );
      const blueprintLength = await page.evaluate(() => window.__copiedBlueprint.length);
      assert.ok(blueprintLength > 64, "e2e: generated blueprint text should be non-empty.");
    });
  } finally {
    if (browser) {
      await browser.close();
    }
    await new Promise(resolve => server.close(resolve));
  }
}

async function runE2EWithRetry(maxAttempts = 2) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await runE2EAttempt(attempt);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        console.warn(`e2e: attempt ${attempt} failed, retrying...`);
      }
    }
  }
  throw lastError;
}

runE2EWithRetry()
  .then(() => {
    console.log("e2e: browser interaction checks passed.");
  })
  .catch(error => {
    console.error("e2e: failed.");
    console.error(error.message || error);
    process.exit(1);
  });
