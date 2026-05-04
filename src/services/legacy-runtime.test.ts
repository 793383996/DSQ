import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  bootstrapLegacyRuntime,
  LEGACY_RUNTIME_READY_EVENT,
  LEGACY_RUNTIME_READY_TIMEOUT_MS,
} from "./legacy-runtime";

type FakeScriptElement = {
  src: string;
  async: boolean;
  defer: boolean;
  setAttribute: (name: string, value: string) => void;
  onload: null | (() => void);
  onerror: null | (() => void);
};

type RuntimeWindow = typeof globalThis & {
  window?: unknown;
  document?: Document;
  location?: Location;
  __DSQLegacyBootstrapPromise?: Promise<void>;
  isDataLoaded?: boolean;
  currentCalculationResult?: unknown;
  app?: Record<string, unknown> | null;
};

function flushMicrotasks() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe("legacy runtime bootstrap", () => {
  const runtimeWindow = globalThis as RuntimeWindow;
  const scriptNodes: Array<{ src: string }> = [];
  const eventTarget = new EventTarget();

  beforeEach(() => {
    scriptNodes.length = 0;
    Reflect.set(globalThis, "window", runtimeWindow);
    runtimeWindow.location = new URL("https://dsqstar.xyz/index.html") as unknown as Location;
    runtimeWindow.addEventListener = eventTarget.addEventListener.bind(eventTarget);
    runtimeWindow.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
    runtimeWindow.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);
    runtimeWindow.isDataLoaded = false;
    runtimeWindow.currentCalculationResult = null;
    runtimeWindow.app = null;

    runtimeWindow.document = {
      head: {
        appendChild(script: FakeScriptElement) {
          scriptNodes.push({ src: script.src });
          if (typeof script.onload === "function") {
            script.onload();
          }
          return script as unknown as Node;
        },
      },
      createElement(tagName: string) {
        if (tagName !== "script") {
          throw new Error(`unsupported tag:${tagName}`);
        }
        return {
          src: "",
          async: true,
          defer: true,
          setAttribute() {},
          onload: null,
          onerror: null,
        } as FakeScriptElement;
      },
      getElementsByTagName(tagName: string) {
        if (tagName !== "script") {
          return [] as unknown as HTMLCollectionOf<HTMLScriptElement>;
        }
        return scriptNodes as unknown as HTMLCollectionOf<HTMLScriptElement>;
      },
    } as unknown as Document;
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(runtimeWindow, "__DSQLegacyBootstrapPromise");
    Reflect.deleteProperty(runtimeWindow, "document");
    Reflect.deleteProperty(runtimeWindow, "location");
    Reflect.deleteProperty(runtimeWindow, "isDataLoaded");
    Reflect.deleteProperty(runtimeWindow, "currentCalculationResult");
    Reflect.deleteProperty(runtimeWindow, "app");
    Reflect.deleteProperty(runtimeWindow, "window");
  });

  it("waits for the real legacy ready signal before resolving", async () => {
    let resolved = false;
    const bootstrapPromise = bootstrapLegacyRuntime().then(() => {
      resolved = true;
    });

    await flushMicrotasks();

    expect(scriptNodes.some(node => node.src.includes("vue.min.js"))).toBe(false);
    expect(resolved).toBe(false);

    runtimeWindow.dispatchEvent(
      new CustomEvent(LEGACY_RUNTIME_READY_EVENT, {
        detail: {
          isDataLoaded: true,
          hasApp: true,
          hasResult: false,
        },
      })
    );
    await flushMicrotasks();
    expect(resolved).toBe(false);

    runtimeWindow.isDataLoaded = true;
    runtimeWindow.app = {};
    runtimeWindow.currentCalculationResult = { requirements: [] };
    runtimeWindow.dispatchEvent(
      new CustomEvent(LEGACY_RUNTIME_READY_EVENT, {
        detail: {
          isDataLoaded: true,
          hasApp: true,
          hasResult: true,
        },
      })
    );

    await bootstrapPromise;
    expect(resolved).toBe(true);
  });

  it("rejects and clears the cached promise when ready never arrives", async () => {
    vi.useFakeTimers();
    const bootstrapPromise = bootstrapLegacyRuntime().catch(error => error);

    await vi.advanceTimersByTimeAsync(LEGACY_RUNTIME_READY_TIMEOUT_MS + 1);

    const error = await bootstrapPromise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("legacy_runtime_ready_timeout");
    expect(runtimeWindow.__DSQLegacyBootstrapPromise).toBeUndefined();
  });
});
