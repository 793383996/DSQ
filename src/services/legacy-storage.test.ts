import { describe, expect, it } from "vitest";

import { createBrowserStorageAdapter } from "./app-services";
import { createLegacyStorageService } from "./legacy-storage";

function createLocalStorage() {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] || null;
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key) || null : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

function createDocumentMock() {
  const nodes = {
    onlyConveyorBeltMk3: { checked: false },
    onlySorterMk3: { checked: false },
  };
  return {
    cookie: "",
    nodes,
    getElementById(id: keyof typeof nodes) {
      return nodes[id] || null;
    },
  };
}

describe("legacy-storage TypeScript module", () => {
  it("loads legacy machine settings as english ids and resets transport defaults", () => {
    const localStorage = createLocalStorage();
    const documentMock = createDocumentMock();
    const service = createLegacyStorageService({
      storage: createBrowserStorageAdapter({ localStorage }),
      document: documentMock,
    });
    const version = "20240202";

    localStorage.setItem(
      `machine_settings${version}`,
      JSON.stringify({
        1: { m: "原油精炼机", accType: "增产剂Mk.Ⅱ", accValue: "增产" },
      })
    );

    expect(service.loadMachineSettings(version)).toEqual({
      1: { m: "oilRefinery", accType: "proliferatorMk2", accValue: "extra" },
    });
    expect(documentMock.nodes.onlyConveyorBeltMk3.checked).toBe(true);
    expect(documentMock.nodes.onlySorterMk3.checked).toBe(true);
  });

  it("loads legacy machine speed settings as english ids", () => {
    const localStorage = createLocalStorage();
    const service = createLegacyStorageService({
      storage: createBrowserStorageAdapter({ localStorage }),
    });
    const version = "20240202";

    localStorage.setItem(
      `machine_settings_time${version}`,
      JSON.stringify({
        原油精炼机: 2,
        射线接收塔: 3,
      })
    );

    expect(service.loadSpeedSettings(version)).toEqual({
      oilRefinery: 2,
      rayReceiver: 3,
    });
  });

  it("loads legacy project settings as english ids", () => {
    const localStorage = createLocalStorage();
    const service = createLegacyStorageService({
      storage: createBrowserStorageAdapter({ localStorage }),
    });
    const version = "20240202";

    localStorage.setItem(
      `settings_projects${version}`,
      JSON.stringify([
        {
          name: "Legacy",
          singleMake: [],
          ig_names: [],
          value: [],
          settings: {
            1: { m: "射线接收塔", accType: "增产剂Mk.Ⅰ", accValue: "加速" },
          },
        },
      ])
    );

    expect(service.loadProjects(version)).toEqual([
      {
        name: "Legacy",
        singleMake: [],
        ig_names: [],
        value: [],
        settings: {
          1: { m: "rayReceiver", accType: "proliferatorMk1", accValue: "speedup" },
        },
      },
    ]);
  });

  it("migrates cookie data into localStorage on first read", () => {
    const localStorage = createLocalStorage();
    const documentMock = createDocumentMock();
    documentMock.cookie = "legacy_key=%7B%22ok%22%3Atrue%7D";

    const service = createLegacyStorageService({
      storage: createBrowserStorageAdapter({ localStorage }),
      document: documentMock,
    });

    expect(service.getData("legacy_key")).toBe('{"ok":true}');
    expect(localStorage.getItem("legacy_key")).toBe('{"ok":true}');
    expect(documentMock.cookie).toContain("expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });
});
