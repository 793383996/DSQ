import type { Pinia } from "pinia";

import { LEGACY_LOCALE_CHANGED_EVENT } from "./legacy-locale-bridge";
import { loadQuoteIncludes } from "../services/quote-includes";
import { useUiStore } from "../stores/ui";
import { normalizeLocale, type LocaleCode } from "../types/dsq";

let removeQuoteIncludeListener: (() => void) | null = null;
let activeAbortController: AbortController | null = null;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function resolveLocale(event?: Event): LocaleCode {
  const detail = event instanceof CustomEvent ? (event.detail as { locale?: unknown } | null) : null;
  return normalizeLocale(detail?.locale ?? window.DSQI18n?.getLocale?.(), "zh-CN");
}

async function syncQuoteIncludes(pinia: Pinia, locale: LocaleCode): Promise<void> {
  const uiStore = useUiStore(pinia);
  activeAbortController?.abort();
  activeAbortController = typeof AbortController !== "undefined" ? new AbortController() : null;
  const controller = activeAbortController;

  uiStore.markQuoteIncludesLoading();
  try {
    const quoteIncludes = await loadQuoteIncludes(locale, {
      signal: controller?.signal,
    });
    if (activeAbortController !== controller) {
      return;
    }
    uiStore.setQuoteIncludes(quoteIncludes);
  } catch (error) {
    if (isAbortError(error) || activeAbortController !== controller) {
      return;
    }
    uiStore.markQuoteIncludesError(error);
  } finally {
    if (activeAbortController === controller) {
      activeAbortController = null;
    }
  }
}

export function bindLegacyQuoteIncludeBridge(pinia: Pinia): () => void {
  removeQuoteIncludeListener?.();

  const handleLocaleChanged = (event: Event) => {
    void syncQuoteIncludes(pinia, resolveLocale(event));
  };

  void syncQuoteIncludes(pinia, resolveLocale());
  window.addEventListener(LEGACY_LOCALE_CHANGED_EVENT, handleLocaleChanged);

  removeQuoteIncludeListener = () => {
    activeAbortController?.abort();
    activeAbortController = null;
    window.removeEventListener(LEGACY_LOCALE_CHANGED_EVENT, handleLocaleChanged);
    removeQuoteIncludeListener = null;
  };

  return removeQuoteIncludeListener;
}
