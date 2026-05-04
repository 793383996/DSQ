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

function createEnvironment() {
  const includeNodes = [
    createIncludeNode("updata", "<p>cached updata</p>"),
    createIncludeNode("explanation", "<p>cached explanation</p>"),
  ];
  const documentListeners = new Map();
  const trackedEvents = [];
  const inputs = {
    txtnumber: { value: "60", style: {}, addEventListener() {} },
    selmaince: { value: "", style: {}, addEventListener() {} },
  };

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
      addEventListener(type, listener) {
        documentListeners.set(type, listener);
      },
    },
    fetch() {
      throw new Error("index.events.js should no longer fetch quote includes");
    },
    setTimeout,
    clearTimeout,
    addEventListener() {},
    DSQI18n: {
      getLocale() {
        return "zh-CN";
      },
    },
    PerformanceTracker: {
      trackBusinessEvent(name, attributes, chain) {
        trackedEvents.push({ name, attributes, chain });
      },
    },
  };
  context.globalThis = context;
  context.window = context;

  return {
    context,
    documentListeners,
    includeNodes,
    trackedEvents,
  };
}

describe("index events runtime", () => {
  it("no longer owns quote include loading after the Vue store migration", async () => {
    const sourceCode = readFileSync("Scripts/index.events.js", "utf8");
    const env = createEnvironment();

    runInNewContext(sourceCode, env.context, { filename: "Scripts/index.events.js" });
    await flushPromises();

    expect(env.includeNodes[0].innerHTML).toBe("<p>cached updata</p>");
    expect(env.includeNodes[1].innerHTML).toBe("<p>cached explanation</p>");
  });

  it("keeps funnel click tracking without restoring legacy business dispatch", async () => {
    const sourceCode = readFileSync("Scripts/index.events.js", "utf8");
    const env = createEnvironment();

    runInNewContext(sourceCode, env.context, { filename: "Scripts/index.events.js" });
    await flushPromises();

    const clickListener = env.documentListeners.get("click");
    expect(typeof clickListener).toBe("function");

    const actionNode = {
      getAttribute(attributeName) {
        return attributeName === "data-click-action" ? "addRequirement" : null;
      },
    };

    clickListener({
      target: {
        closest(selector) {
          return selector === "[data-click-action]" ? actionNode : null;
        },
      },
    });

    expect(env.trackedEvents).toEqual(
      expect.arrayContaining([
        {
          name: "add_requirement_click",
          attributes: { action: "addRequirement" },
          chain: "ui_funnel",
        },
      ])
    );
  });
});
