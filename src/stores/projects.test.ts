import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useProjectsStore } from "./projects";

describe("projects store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("saves, overwrites, loads, and resets projects", () => {
    const store = useProjectsStore();

    store.saveProject("Alpha", {
      singleMake: [{ id: 1, number: 2 }],
      ig_names: ["氢"],
      value: [{ item: { name: "铁块" }, number: 60 }],
      settings: {
        1: { m: "原油精炼机" },
      },
    });

    expect(store.items).toHaveLength(1);
    expect(store.activeProjectName).toBe("Alpha");
    expect(store.items[0]?.settings).toEqual({
      1: { m: "oilRefinery" },
    });

    store.saveProject("Alpha", {
      singleMake: [{ id: "pf-2", number: 5 }],
      ig_names: [],
      value: [{ item: { name: "铜块" }, number: 90 }],
      settings: {},
    });

    expect(store.items).toHaveLength(1);
    expect(store.loadProject("Alpha")).toEqual({
      name: "Alpha",
      singleMake: [{ id: "pf-2", number: 5 }],
      ig_names: [],
      value: [{ item: { name: "铜块" }, number: 90 }],
      settings: {},
    });

    store.resetProject();
    expect(store.activeProjectName).toBeNull();
  });
});
