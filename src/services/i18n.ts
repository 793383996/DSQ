import { createI18n } from "vue-i18n";

import enUS from "../../locales/en-US.json";
import zhCN from "../../locales/zh-CN.json";
import { normalizeLocale, type LocaleCode } from "../types/dsq";

const MESSAGES = {
  "zh-CN": zhCN,
  "en-US": enUS,
} as const;

function readLocaleFromUrl(): LocaleCode | null {
  const params = new URLSearchParams(window.location.search);
  const locale = params.get("lang");
  return locale ? normalizeLocale(locale, "zh-CN") : null;
}

function readLocaleFromDocument(): LocaleCode {
  return normalizeLocale(document.documentElement.lang, "zh-CN");
}

export function resolveInitialLocale(): LocaleCode {
  if (typeof window === "undefined") {
    return "zh-CN";
  }
  return readLocaleFromUrl() ?? readLocaleFromDocument();
}

export function createDsqI18n() {
  return createI18n({
    legacy: false,
    locale: resolveInitialLocale(),
    fallbackLocale: "zh-CN",
    messages: MESSAGES,
  });
}

export type DsqI18nInstance = ReturnType<typeof createDsqI18n>;

export function syncI18nLocale(i18n: DsqI18nInstance, locale: LocaleCode): void {
  i18n.global.locale.value = locale;
}
