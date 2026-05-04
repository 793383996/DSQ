import { defineStore } from "pinia";

import {
  createEmptyQuoteIncludes,
  normalizeQuoteIncludes,
  normalizeRequirementDraft,
  type SplitDialogPayload,
  type SplitDialogState,
  type LocaleCode,
  type QuoteIncludeMap,
  type RequirementSelectorTabId,
  type RequirementDraftSnapshot,
} from "../types/dsq";

interface UiState {
  locale: LocaleCode;
  commandBridgeReady: boolean;
  activePanelId: string | null;
  activeDialogId: string | null;
  selectorActiveTab: RequirementSelectorTabId;
  splitDialog: SplitDialogState | null;
  requirementDraft: RequirementDraftSnapshot;
  quoteIncludes: QuoteIncludeMap;
  quoteIncludesLoading: boolean;
  quoteIncludesErrorMessage: string;
}

export const useUiStore = defineStore("ui", {
  state: (): UiState => ({
    locale: "zh-CN",
    commandBridgeReady: false,
    activePanelId: null,
    activeDialogId: null,
    selectorActiveTab: "components",
    splitDialog: null,
    requirementDraft: normalizeRequirementDraft(undefined),
    quoteIncludes: createEmptyQuoteIncludes(),
    quoteIncludesLoading: false,
    quoteIncludesErrorMessage: "",
  }),
  actions: {
    setLocale(locale: LocaleCode) {
      this.locale = locale;
    },
    markCommandBridgeReady() {
      this.commandBridgeReady = true;
    },
    setActivePanel(panelId: string | null) {
      this.activePanelId = panelId;
    },
    setActiveDialog(dialogId: string | null) {
      this.activeDialogId = dialogId;
    },
    setSelectorActiveTab(tabId: RequirementSelectorTabId) {
      this.selectorActiveTab = tabId;
    },
    openSplitDialog(payload: SplitDialogPayload) {
      this.splitDialog = {
        itemName: payload.itemName,
        recipes: payload.recipes.map(recipe => ({
          id: recipe.id,
          titleHtml: recipe.titleHtml,
        })),
        defaultNumber: payload.defaultNumber,
      };
    },
    closeSplitDialog() {
      this.splitDialog = null;
    },
    setRequirementDraft(snapshot: Partial<RequirementDraftSnapshot> | undefined) {
      this.requirementDraft = normalizeRequirementDraft({
        ...this.requirementDraft,
        ...(snapshot && typeof snapshot === "object" ? snapshot : {}),
      });
    },
    hydrateRequirementDraft(snapshot: Partial<RequirementDraftSnapshot> | undefined) {
      this.requirementDraft = normalizeRequirementDraft(snapshot);
    },
    markQuoteIncludesLoading() {
      this.quoteIncludesLoading = true;
      this.quoteIncludesErrorMessage = "";
    },
    setQuoteIncludes(snapshot: Partial<QuoteIncludeMap> | undefined) {
      this.quoteIncludes = normalizeQuoteIncludes(snapshot);
      this.quoteIncludesLoading = false;
      this.quoteIncludesErrorMessage = "";
    },
    markQuoteIncludesError(error: unknown) {
      this.quoteIncludesLoading = false;
      this.quoteIncludesErrorMessage = error instanceof Error ? error.message : String(error);
    },
    clearQuoteIncludes() {
      this.quoteIncludes = createEmptyQuoteIncludes();
      this.quoteIncludesLoading = false;
      this.quoteIncludesErrorMessage = "";
    },
    resetRuntimeUiState() {
      this.activePanelId = null;
      this.activeDialogId = null;
      this.selectorActiveTab = "components";
      this.splitDialog = null;
      this.requirementDraft = normalizeRequirementDraft(undefined);
      this.clearQuoteIncludes();
    },
  },
});
