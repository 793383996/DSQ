// @vitest-environment jsdom

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadPersistedState } from "../services/persistence";
import { createDsqI18n } from "../services/i18n";
import { useUiStore } from "../stores/ui";
import { bindLegacyLocaleBridge } from "./legacy-locale-bridge";

describe("legacy locale bridge", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    window.version = "test";
    window.DSQI18n = {
      getLocale: () => "zh-CN",
    };
  });

  afterEach(() => {
    localStorage.clear();
    Reflect.deleteProperty(window, "DSQI18n");
    Reflect.deleteProperty(window, "version");
  });

  it("mirrors legacy locale changes into uiStore, vue-i18n and persisted bootstrap state", () => {
    const pinia = createPinia();
    const i18n = createDsqI18n();
    const dispose = bindLegacyLocaleBridge(pinia, i18n);

    window.dispatchEvent(new CustomEvent("dsq:locale-changed", { detail: { locale: "en-US" } }));

    expect(useUiStore(pinia).locale).toBe("en-US");
    expect(i18n.global.locale.value).toBe("en-US");
    expect(loadPersistedState()?.locale).toBe("en-US");

    dispose();
  });
});
