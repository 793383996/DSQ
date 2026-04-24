import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

function flushPromises() {
  return Promise.resolve().then(
    () =>
      new Promise(resolve => {
        setTimeout(resolve, 0);
      })
  );
}

function createIncludeNode(name, initialHtml) {
  return {
    innerHTML: initialHtml || "",
    getAttribute(attributeName) {
      if (attributeName === "data-include") {
        return name;
      }
      return null;
    },
  };
}

function createEnvironment(options = {}) {
  const fetchMap = options.fetchMap || {};
  const includeNodes = [
    createIncludeNode("updata", options.initialHtml && options.initialHtml.updata),
    createIncludeNode("explanation", options.initialHtml && options.initialHtml.explanation),
  ];
  const timerQueue = [];
  const listeners = {};
  const inputs = {
    txtnumber: { value: "60", style: {}, addEventListener() {} },
    selmaince: { value: "", style: {}, addEventListener() {} },
  };

  async function fetchStub(pathname) {
    const entry = fetchMap[pathname];
    const response = Array.isArray(entry) ? entry.shift() : entry;
    if (response instanceof Error) {
      throw response;
    }
    if (!response) {
      throw new Error("Unexpected fetch: " + pathname);
    }
    return {
      ok: response.ok !== false,
      status: response.status || 200,
      text() {
        return Promise.resolve(response.text || "");
      },
    };
  }

  const context = {
    console: {
      warn() {},
      error() {},
      log() {},
    },
    location: {
      pathname: "/",
    },
    document: {
      readyState: "complete",
      getElementById(id) {
        return inputs[id] || null;
      },
      querySelectorAll(selector) {
        if (selector === "[data-include]") {
          return includeNodes;
        }
        return [];
      },
      addEventListener() {},
    },
    fetch: fetchStub,
    AbortController,
    setTimeout(callback) {
      timerQueue.push(callback);
      return timerQueue.length;
    },
    clearTimeout(id) {
      if (id > 0 && id <= timerQueue.length) {
        timerQueue[id - 1] = null;
      }
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    DSQI18n: {
      getLocale() {
        return options.locale || "zh-CN";
      },
    },
    __DSQQuoteIncludeState: options.quoteState || undefined,
    app: options.app || undefined,
  };
  context.globalThis = context;
  context.window = context;

  return {
    context,
    includeNodes,
    hasPendingRetry() {
      return timerQueue.some(Boolean);
    },
    runNextRetry() {
      const next = timerQueue.shift();
      if (typeof next === "function") {
        next();
      }
    },
    listeners,
  };
}

describe("index events include loading", () => {
  it("keeps previous include content and retries after transient fetch failures", async () => {
    const sourceCode = readFileSync("Scripts/index.events.js", "utf8");
    const env = createEnvironment({
      initialHtml: {
        updata: "<p>cached updata</p>",
        explanation: "<p>cached explanation</p>",
      },
      fetchMap: {
        "quote/updata.html": [new Error("network failed"), { text: "<p>fresh updata</p>" }],
        "quote/explanation.html": [new Error("network failed"), { text: "<p>fresh explanation</p>" }],
      },
    });

    runInNewContext(sourceCode, env.context, { filename: "Scripts/index.events.js" });
    await flushPromises();

    expect(env.includeNodes[0].innerHTML).toBe("<p>cached updata</p>");
    expect(env.includeNodes[1].innerHTML).toBe("<p>cached explanation</p>");
    expect(env.hasPendingRetry()).toBe(true);

    env.runNextRetry();
    await flushPromises();

    expect(env.includeNodes[0].innerHTML).toBe("<p>fresh updata</p>");
    expect(env.includeNodes[1].innerHTML).toBe("<p>fresh explanation</p>");
  });

  it("commits include html into shared app state when Vue owns the target nodes", async () => {
    const sourceCode = readFileSync("Scripts/index.events.js", "utf8");
    const env = createEnvironment({
      app: {
        quoteIncludes: {
          updata: "",
          explanation: "",
        },
      },
      fetchMap: {
        "quote/updata.html": { text: "<p>state updata</p>" },
        "quote/explanation.html": { text: "<p>state explanation</p>" },
      },
    });

    runInNewContext(sourceCode, env.context, { filename: "Scripts/index.events.js" });
    await flushPromises();

    expect(env.context.__DSQQuoteIncludeState).toEqual({
      updata: "<p>state updata</p>",
      explanation: "<p>state explanation</p>",
    });
    expect(env.context.app.quoteIncludes).toEqual({
      updata: "<p>state updata</p>",
      explanation: "<p>state explanation</p>",
    });
  });
});
