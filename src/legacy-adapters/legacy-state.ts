import type { Pinia } from "pinia";

import { syncI18nLocale, type DsqI18nInstance } from "../services/i18n";
import { useAppStore } from "../stores/app";
import { useCalculationStore } from "../stores/calculation";
import { useProjectsStore } from "../stores/projects";
import { useSeoStore } from "../stores/seo";
import { useSettingsStore } from "../stores/settings";
import { useUiStore } from "../stores/ui";
import {
  cloneJsonValue,
  createEmptyCalculationOutput,
  normalizeLocale,
  type CalculationOutput,
  type LegacyRuntimeSnapshot,
  type ProjectSnapshot,
  type RequirementEntry,
} from "../types/dsq";

function readLegacyLocale() {
  return normalizeLocale(window.DSQI18n?.getLocale?.(), "zh-CN");
}

function readLegacyProjects(): ProjectSnapshot[] {
  return Array.isArray(window.projects) ? cloneJsonValue(window.projects, []) : [];
}

function readLegacyRequirements(): RequirementEntry[] {
  return Array.isArray(window.xqs) ? cloneJsonValue(window.xqs, []) : [];
}

function readLegacyCalculationResult(): CalculationOutput | null {
  return window.currentCalculationResult
    ? cloneJsonValue(window.currentCalculationResult, createEmptyCalculationOutput())
    : null;
}

export function captureLegacyRuntimeSnapshot(): LegacyRuntimeSnapshot {
  return {
    locale: readLegacyLocale(),
    projects: readLegacyProjects(),
    globalSettings:
      window.global_settings && typeof window.global_settings === "object"
        ? cloneJsonValue(window.global_settings, {})
        : {},
    currentCalculationResult: readLegacyCalculationResult(),
    requirements: readLegacyRequirements(),
    isDataLoaded: window.isDataLoaded === true,
    currentItemName: window.currentItem && typeof window.currentItem.name === "string" ? window.currentItem.name : null,
  };
}

export function syncLegacyRuntimeSnapshot(
  pinia: Pinia,
  options: { i18n: DsqI18nInstance } | undefined
): LegacyRuntimeSnapshot {
  const snapshot = captureLegacyRuntimeSnapshot();
  const appStore = useAppStore(pinia);
  const uiStore = useUiStore(pinia);
  const settingsStore = useSettingsStore(pinia);
  const projectsStore = useProjectsStore(pinia);
  const calculationStore = useCalculationStore(pinia);
  const seoStore = useSeoStore(pinia);

  uiStore.setLocale(snapshot.locale);
  settingsStore.hydrateGlobalSettings(snapshot.globalSettings);
  projectsStore.hydrateProjects(snapshot.projects);
  calculationStore.hydrateRequirements(snapshot.requirements);
  calculationStore.hydrateCalculationResult(snapshot.currentCalculationResult);
  seoStore.setSnapshot(snapshot.currentCalculationResult?.seoSnapshot);

  if (options?.i18n) {
    syncI18nLocale(options.i18n, snapshot.locale);
  }

  appStore.markReady();
  return snapshot;
}
