// @vitest-environment jsdom

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useUiStore } from "../stores/ui";
import { bindLegacyQuoteIncludeBridge } from "./legacy-quote-include-bridge";

function flushPromises(): Promise<void> {
  return Promise.resolve().then(
    () =>
      new Promise(resolve => {
        setTimeout(resolve, 0);
      })
  );
}

describe("legacy quote include bridge", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    setActivePinia(createPinia());
    fetchMock.mockReset();
    Reflect.set(globalThis, "fetch", fetchMock);
    window.DSQI18n = {
      getLocale: () => "zh-CN",
    };
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "DSQI18n");
    Reflect.deleteProperty(globalThis, "fetch");
  });

  it("loads quote includes on bootstrap and refreshes them on locale changes", async () => {
    fetchMock.mockImplementation(async input => {
      const pathname = String(input);
      return {
        ok: true,
        status: 200,
        text: async () => {
          if (pathname.endsWith("quote/updata.en-US.html")) {
            return "<p>English update</p>";
          }
          if (pathname.endsWith("quote/explanation.en-US.html")) {
            return "<p>English explanation</p>";
          }
          if (pathname.endsWith("quote/updata.html")) {
            return "<p>Chinese update</p>";
          }
          if (pathname.endsWith("quote/explanation.html")) {
            return "<p>Chinese explanation</p>";
          }
          return "";
        },
      } as Response;
    });

    const pinia = createPinia();
    const dispose = bindLegacyQuoteIncludeBridge(pinia);
    await flushPromises();

    expect(useUiStore(pinia).quoteIncludes).toEqual({
      updata: "<p>Chinese update</p>",
      explanation: "<p>Chinese explanation</p>",
    });

    window.dispatchEvent(new CustomEvent("dsq:locale-changed", { detail: { locale: "en-US" } }));
    await flushPromises();

    expect(useUiStore(pinia).quoteIncludes).toEqual({
      updata: "<p>English update</p>",
      explanation: "<p>English explanation</p>",
    });
    expect(useUiStore(pinia).quoteIncludesErrorMessage).toBe("");

    dispose();
  });
});
