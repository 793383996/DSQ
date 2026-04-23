import assert from "node:assert/strict";
import { createServer } from "node:https";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const DIST_ROOT = path.join(ROOT, "dist-vite");
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
  const cleanPath = (urlPath || "/").split("?")[0].split("#")[0] || "/";
  if (cleanPath === "/") return path.join(DIST_ROOT, "index.html");
  const normalized = cleanPath.replace(/^\/+/, "");
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
  await page.locator("#btnAddRequirement").first().click();
  const iconLocator = page.locator(`#UIselector .icons.icons-selected .icon[title="${itemName}"]`).first();
  await iconLocator.waitFor({ state: "visible", timeout: 20000 });
  await iconLocator.click();
  await page.waitForFunction(
    target => Array.isArray(window.xqs) && window.xqs.some(entry => entry && entry.item && entry.item.name === target),
    itemName,
    { timeout: 20000 }
  );
}

async function waitForPanelState(page, panelId, expectedOpen) {
  await page.waitForFunction(
    ({ id, open }) => {
      const panel = document.getElementById(id);
      if (!panel) return false;
      const hasOpenClass = panel.classList.contains("is-open");
      const ariaHidden = panel.getAttribute("aria-hidden");
      if (open) {
        return panel.hidden === false && hasOpenClass && ariaHidden === "false";
      }
      return panel.hidden === true && !hasOpenClass && ariaHidden !== "false";
    },
    { id: panelId, open: expectedOpen },
    { timeout: 10000 }
  );
}

async function readMachineMode(page, itemName) {
  return page.evaluate(target => {
    const rows = Array.from(document.querySelectorAll("tbody tr"));
    const row = rows.find(tr => tr.querySelector(`td.cell-name[data-name="${target}"]`));
    if (!row) {
      return null;
    }
    const machineNode = row.querySelector("td:nth-child(8) a.m.selected");
    if (!machineNode) {
      return null;
    }
    return machineNode.getAttribute("data-modein") || machineNode.textContent.trim();
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

    let persistedMachineMode = "";

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
        "https://dsqstar.xyz/?lang=en-US",
        "e2e: canonical URL should follow switched locale."
      );
      const webAppSchema = await page.locator("#schemaWebApplication").first().textContent();
      assert.ok(
        (webAppSchema || "").includes('"@type":"WebApplication"'),
        "e2e: WebApplication JSON-LD should exist after locale switch."
      );
      const faqSchema = await page.locator("#schemaFAQPage").first().textContent();
      assert.ok((faqSchema || "").includes('"@type":"FAQPage"'), "e2e: FAQ JSON-LD should exist after locale switch.");

      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForDataReady(page);
      const locale = await page.inputValue("#langSwitcher");
      assert.equal(locale, "en-US", "e2e: locale should persist after reload.");
      const settingText = await page.locator("#btnSetting").first().textContent();
      assert.equal((settingText || "").trim(), "Settings", "e2e: translated text should be restored after reload.");
    });

    // Case 0.1: 语言快速切换 -> 最后一次请求获胜
    await runStep("locale-race-last-write-wins", async () => {
      await page.evaluate(() => {
        window.DSQI18n.setLocale("zh-CN", { persist: true, syncQuery: true }).catch(() => {});
        window.DSQI18n.setLocale("en-US", { persist: true, syncQuery: true }).catch(() => {});
      });
      await page.waitForFunction(
        () => {
          const settingButton = document.querySelector("#btnSetting");
          return (
            window.DSQI18n &&
            window.DSQI18n.getLocale() === "en-US" &&
            new URL(window.location.href).searchParams.get("lang") === "en-US" &&
            settingButton &&
            settingButton.textContent.trim() === "Settings"
          );
        },
        null,
        { timeout: 10000 }
      );
      const schema = await page.locator("#schemaWebApplication").first().textContent();
      assert.ok((schema || "").includes('"inLanguage":"en-US"'), "e2e: JSON-LD should match the final locale.");
    });

    // Case 1: 新增需求 -> 触发计算 -> 展示结果
    await runStep("add-requirement", async () => {
      const titleBefore = await page.title();
      await addRequirement(page, "齿轮");
      await page.locator("#btnGenerateBlueprint").first().waitFor({ state: "visible", timeout: 10000 });
      const xqsLength = await page.evaluate(() => (Array.isArray(window.xqs) ? window.xqs.length : 0));
      assert.ok(xqsLength > 0, "e2e: adding requirement should update demand list.");
      await page.waitForFunction(
        expectedTitle => typeof document !== "undefined" && document.title !== expectedTitle,
        titleBefore,
        { timeout: 20000 }
      );
      const titleAfter = await page.title();
      assert.notEqual(titleAfter, titleBefore, "e2e: dynamic SEO title should update after adding requirement.");
    });

    // Case 2: UIselector 键盘路径（打开/Tab/Esc/焦点回退）
    await runStep("ui-selector-keyboard-flow", async () => {
      await page.locator("#btnAddRequirement").first().focus();
      await page.keyboard.press("Enter");
      await waitForPanelState(page, "UIselector", true);
      await page.keyboard.press("Tab");
      const focusInsideSelector = await page.evaluate(() => {
        const panel = document.getElementById("UIselector");
        return !!panel && panel.contains(document.activeElement);
      });
      assert.ok(focusInsideSelector, "e2e: Tab should keep focus inside UIselector dialog.");
      await page.keyboard.press("Escape");
      await waitForPanelState(page, "UIselector", false);
      const focusedId = await page.evaluate(() => (document.activeElement ? document.activeElement.id : ""));
      assert.equal(focusedId, "btnAddRequirement", "e2e: focus should return to add button after closing UIselector.");
    });

    // Case 3: 参数设置开合状态（视觉 + ARIA）
    await runStep("settings-panel-toggle", async () => {
      const settingButton = page.locator("#btnSetting").first();
      await settingButton.click();
      await waitForPanelState(page, "MoreSetting", true);
      const expandedWhenOpen = await settingButton.getAttribute("aria-expanded");
      assert.equal(expandedWhenOpen, "true", "e2e: settings button aria-expanded should be true when panel is open.");

      await settingButton.click();
      await waitForPanelState(page, "MoreSetting", false);
      const expandedWhenClosed = await settingButton.getAttribute("aria-expanded");
      assert.equal(
        expandedWhenClosed,
        "false",
        "e2e: settings button aria-expanded should be false when panel is closed."
      );
    });

    // Case 4: 修改配置项 -> 结果更新
    await runStep("change-config", async () => {
      const currentMode = await page.inputValue("#selmodein");
      const targetMode = currentMode === "重组式制造台" ? "制作台Mk.Ⅰ" : "重组式制造台";
      const beforeMachine = await readMachineMode(page, "齿轮");
      await page.selectOption("#selmodein", targetMode);
      await page.waitForFunction(
        ({ itemName, modeName }) => {
          const rows = Array.from(document.querySelectorAll("tbody tr"));
          const row = rows.find(tr => tr.querySelector(`td.cell-name[data-name="${itemName}"]`));
          if (!row) {
            return false;
          }
          const machineNode = row.querySelector("td:nth-child(8) a.m.selected");
          return !!machineNode && machineNode.getAttribute("data-modein") === modeName;
        },
        { itemName: "齿轮", modeName: targetMode },
        { timeout: 10000 }
      );
      const afterMachine = await readMachineMode(page, "齿轮");
      assert.equal(afterMachine, targetMode, "e2e: machine type should follow changed configuration.");
      assert.notEqual(beforeMachine, afterMachine, "e2e: machine type should change after updating configuration.");
      persistedMachineMode = targetMode;
    });

    // Case 4.1: 全局设置刷新后仍恢复，并按回退顺序影响计算
    await runStep("global-settings-persistence", async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForDataReady(page);
      const selectedMode = await page.inputValue("#selmodein");
      assert.equal(selectedMode, persistedMachineMode, "e2e: global machine mode should persist after reload.");

      await addRequirement(page, "齿轮");
      await page.waitForFunction(
        ({ itemName, modeName }) => {
          const rows = Array.from(document.querySelectorAll("tbody tr"));
          const row = rows.find(tr => tr.querySelector(`td.cell-name[data-name="${itemName}"]`));
          if (!row) {
            return false;
          }
          const machineNode = row.querySelector("td:nth-child(8) a.m.selected");
          return !!machineNode && machineNode.getAttribute("data-modein") === modeName;
        },
        { itemName: "齿轮", modeName: persistedMachineMode },
        { timeout: 10000 }
      );
    });

    // Case 4.2: 方案名安全渲染，恶意名称只能是 option 文本
    await runStep("project-name-safe-render", async () => {
      await page.evaluate(() => {
        window.prompt = () => "<img src=x onerror=window.__projectNameInjected=1>";
        window.confirm = () => true;
        window.__projectNameInjected = 0;
        window.f_save();
      });
      const optionText = await page.locator("#selprojects option").last().textContent();
      assert.equal(
        optionText,
        "<img src=x onerror=window.__projectNameInjected=1>",
        "e2e: project name should be rendered as text."
      );
      const injected = await page.evaluate(() => window.__projectNameInjected);
      assert.equal(injected, 0, "e2e: project name should not execute injected markup.");
      const nestedImgCount = await page.locator("#selprojects img").count();
      assert.equal(nestedImgCount, 0, "e2e: project option should not contain injected nodes.");
    });

    // Case 5: 蓝图生成 -> 返回文本/复制链路，且不依赖结果表格 DOM 反向解析
    await runStep("generate-blueprint", async () => {
      await page.evaluate(() => {
        const tbody = document.querySelector("tbody");
        if (tbody) {
          tbody.innerHTML = "<tr><td>table intentionally changed by e2e</td></tr>";
        }
      });
      await page.locator("#btnGenerateBlueprint").first().click();
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
