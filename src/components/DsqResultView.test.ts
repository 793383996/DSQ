// @vitest-environment jsdom

import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDsqI18n } from "../services/i18n";
import { useCalculationStore } from "../stores/calculation";
import { useSettingsStore } from "../stores/settings";
import DsqResultView from "./DsqResultView.vue";

type RuntimeWindow = typeof globalThis & {
  window?: unknown;
  icons?: Record<string, string>;
  DSQCommandBridge?: {
    has: (commandName: string) => boolean;
    invoke: (commandName: string, ...args: unknown[]) => unknown;
  };
  __DSQQuoteIncludeState?: Record<string, string>;
  app?: Record<string, unknown> | null;
};

describe("DsqResultView", () => {
  const runtimeWindow = globalThis as RuntimeWindow;
  const bridgeInvoke = vi.fn();
  const i18n = createDsqI18n();
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    Reflect.set(globalThis, "window", runtimeWindow);
    runtimeWindow.icons = {
      齿轮: "gear-icon",
      石墨烯: "graphene-icon",
      铁矿: "iron-ore-icon",
      氢: "hydrogen-icon",
      proliferatorMk1: "acc1-icon",
      proliferatorMk2: "acc2-icon",
      assemblingMachineMk1: "machine1-icon",
      assemblingMachineMk2: "machine2-icon",
    };
    runtimeWindow.DSQCommandBridge = {
      has() {
        return true;
      },
      invoke: bridgeInvoke,
    };
    bridgeInvoke.mockReset();
    i18n.global.locale.value = "zh-CN";

    const calculationStore = useCalculationStore();
    const settingsStore = useSettingsStore();

    calculationStore.setRequirements([
      {
        item: { name: "齿轮", itemId: "gear" },
        number: 60,
      },
    ]);
    calculationStore.setExcludedNames(["石墨烯"]);
    calculationStore.hydrateCalculationResult({
      requirements: [{ item: { name: "齿轮", itemId: "gear" }, number: 60 }],
      independentLines: [
        {
          name: "铁矿",
          number1: "60.000",
          number2: "1.000",
          pfTitle: "<span>采集</span>",
          mName: "矿脉",
          rowClass: "",
        },
      ],
      productionLines: [
        {
          id: 1,
          name: "齿轮",
          itemId: "gear",
          number1: "60.000",
          number2: "2.000",
          number2full: "<img class='sicon' alt='machine' />2.000",
          number2img: "<img class='sicon' alt='machine' />",
          rowClass: "xqsrow",
          pf: [
            { class: "pf selected", recipeId: 1, title: "配方A" },
            { class: "pf", recipeId: 2, title: "配方B" },
          ],
          accType: [
            {
              class: "m selected",
              id: "proliferatorMk1",
              itemName: "齿轮",
              name: "增产剂Mk.Ⅰ",
              iconName: "proliferatorMk1",
              title: "增产剂Mk.Ⅰ",
              showName: "Mk.Ⅰ",
            },
            {
              class: "m",
              id: "proliferatorMk2",
              itemName: "齿轮",
              name: "增产剂Mk.Ⅱ",
              iconName: "proliferatorMk2",
              title: "增产剂Mk.Ⅱ",
              showName: "Mk.Ⅱ",
            },
          ],
          accValue: [
            {
              class: "m selected",
              id: "speedup",
              itemName: "齿轮",
              name: "加速",
              title: "加速",
              showName: "加速",
            },
            {
              class: "m",
              id: "extra",
              itemName: "齿轮",
              name: "增产",
              title: "增产",
              showName: "增产",
            },
          ],
          m: [
            {
              class: "m selected",
              id: "assemblingMachineMk1",
              itemName: "齿轮",
              name: "制作台Mk.Ⅰ",
              iconName: "assemblingMachineMk1",
              title: "1.0",
              showName: "Mk.Ⅰ",
            },
            {
              class: "m",
              id: "assemblingMachineMk2",
              itemName: "齿轮",
              name: "制作台Mk.Ⅱ",
              iconName: "assemblingMachineMk2",
              title: "1.5",
              showName: "Mk.Ⅱ",
            },
          ],
          accTotal: 1.25,
          accTotalLabel: "需求：",
        },
      ],
      excessOutputs: [
        {
          name: "氢",
          number1: "-5.000",
          number2: "",
          rowClass: "outrow",
        },
      ],
      totals: {
        machines: [{ name: "assemblingMachineMk1", value: 2, energy: 10, space: 4 }],
        totalAcc: 1.25,
        totalEnergy: 10,
        totalSpace: 4,
      },
      seoSnapshot: {
        requirementCount: 1,
        primaryItemName: "齿轮",
        primaryRatePerMinute: 60,
        totalLineCount: 1,
        totalEnergy: 10,
        totalSpace: 4,
      },
      blueprintSnapshot: {
        title: "齿轮-60min",
        subRecipes: [],
      },
    });
    settingsStore.applyRuntimeOptions({ pointLength: 3 });
  });

  afterEach(() => {
    Reflect.deleteProperty(runtimeWindow, "icons");
    Reflect.deleteProperty(runtimeWindow, "DSQCommandBridge");
    Reflect.deleteProperty(runtimeWindow, "__DSQQuoteIncludeState");
    Reflect.deleteProperty(runtimeWindow, "app");
    Reflect.deleteProperty(runtimeWindow, "window");
    document.body.innerHTML = "";
  });

  it("renders the current store result and reacts to locale/include updates", async () => {
    const wrapper = mount(DsqResultView, {
      global: {
        plugins: [pinia, i18n],
      },
      attachTo: document.body,
    });

    await nextTick();

    expect(wrapper.get("#btnGenerateBlueprint").text()).toBe("生成蓝图");
    expect(wrapper.find("img[title='齿轮']").exists()).toBe(true);
    expect(wrapper.text()).toContain("排除增产剂产线");
    expect(wrapper.find("img[title='氢']").exists()).toBe(true);

    runtimeWindow.__DSQQuoteIncludeState!.updata = "<p>更新内容</p>";
    runtimeWindow.__DSQQuoteIncludeState!.explanation = "<p>使用说明内容</p>";
    await nextTick();

    expect(wrapper.html()).toContain("更新内容");
    expect(wrapper.html()).toContain("使用说明内容");

    i18n.global.locale.value = "en-US";
    await nextTick();

    expect(wrapper.get("#btnSaveProject").text()).toBe("Save Project");
    expect(wrapper.text()).toContain("Usage Guide");
  });

  it("routes inline result interactions through the shared command bridge", async () => {
    const wrapper = mount(DsqResultView, {
      global: {
        plugins: [pinia, i18n],
      },
      attachTo: document.body,
    });

    await nextTick();

    await wrapper.findAll(".item_number")[0].trigger("click");
    await wrapper.get("input.number_editor").setValue("120");
    expect(bridgeInvoke).toHaveBeenCalledWith("updateRequirementNumber", 0, 120);

    bridgeInvoke.mockClear();
    await wrapper.findAll(".item_number")[1].trigger("click");
    await wrapper.get("input.number_editor").setValue("3");
    expect(bridgeInvoke).toHaveBeenCalledWith("scaleRequirementsByFactor", 0, 3);

    bridgeInvoke.mockClear();
    await wrapper.get("a[data-modein='assemblingMachineMk2']").trigger("click");
    expect(bridgeInvoke).toHaveBeenCalledWith("updateMachineSelection", 1, "assemblingMachineMk2");

    bridgeInvoke.mockClear();
    await wrapper.get("a[data-modein='proliferatorMk2']").trigger("click");
    expect(bridgeInvoke).toHaveBeenCalledWith("updateAccType", 1, "proliferatorMk2");

    bridgeInvoke.mockClear();
    await wrapper.get("a[data-modein='extra']").trigger("click");
    expect(bridgeInvoke).toHaveBeenCalledWith("updateAccValue", 1, "extra");

    bridgeInvoke.mockClear();
    await wrapper.get(".pfs a.pf:not(.selected)").trigger("click");
    expect(bridgeInvoke).toHaveBeenCalledWith("updateRecipeSelection", "齿轮", 2);

    bridgeInvoke.mockClear();
    await wrapper.find("img[title='石墨烯']").trigger("contextmenu");
    expect(bridgeInvoke).toHaveBeenCalledWith("removeExcludedName", "石墨烯");
  });
});
