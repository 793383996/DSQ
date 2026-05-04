import { getAccSpeed } from "../domain/calc-core";
import {
  cloneJsonValue,
  type RequirementDraftSnapshot,
  type RequirementEntry,
  type RequirementSelectorCatalog,
  type RequirementSelectorItem,
  type RequirementSelectorSection,
  type RequirementSelectorTabId,
  type SplitDialogPayload,
} from "../types/dsq";

interface ParsedLegacyIconName {
  row: number;
  column: number;
  displayName: string;
}

const LEGACY_ICON_NAME_PATTERN = /^(\d+)-(\d{1,2})-(.+)$/;
const LEGACY_ICON_FALLBACK_MAP: Record<string, ParsedLegacyIconName> = {
  氢: { row: 3, column: 7, displayName: "氢" },
  可燃冰: { row: 2, column: 7, displayName: "可燃冰" },
};

let cachedRequirementSelectorCatalog: RequirementSelectorCatalog | null = null;

function cloneRequirementSelectorCatalog(catalog: RequirementSelectorCatalog): RequirementSelectorCatalog {
  return {
    sections: catalog.sections.map(section => ({
      id: section.id,
      items: section.items.map(item => ({
        name: item.name,
        iconValue: item.iconValue,
        row: item.row,
        column: item.column,
      })),
    })),
  };
}

function parseLegacyIconName(name: unknown): ParsedLegacyIconName | null {
  if (typeof name !== "string" || !name) {
    return null;
  }
  const matched = LEGACY_ICON_NAME_PATTERN.exec(name);
  if (matched) {
    return {
      row: Number(matched[1]),
      column: Number(matched[2]),
      displayName: matched[3],
    };
  }
  return LEGACY_ICON_FALLBACK_MAP[name] ?? null;
}

function buildSelectorSection(
  id: RequirementSelectorTabId,
  assets: Array<{ name?: unknown; value?: unknown }> | undefined
): RequirementSelectorSection {
  const items: RequirementSelectorItem[] = [];
  for (const asset of assets ?? []) {
    const parsed = parseLegacyIconName(asset?.name);
    if (!parsed || typeof asset?.value !== "string" || !asset.value) {
      continue;
    }
    items.push({
      name: parsed.displayName,
      iconValue: asset.value,
      row: parsed.row,
      column: parsed.column,
    });
  }
  items.sort((left, right) => {
    if (left.row !== right.row) {
      return left.row - right.row;
    }
    if (left.column !== right.column) {
      return left.column - right.column;
    }
    return left.name.localeCompare(right.name, "zh-CN");
  });
  return {
    id,
    items,
  };
}

export function getRequirementSelectorCatalog(): RequirementSelectorCatalog | null {
  if (cachedRequirementSelectorCatalog) {
    return cloneRequirementSelectorCatalog(cachedRequirementSelectorCatalog);
  }
  const icons1 = window.game_data?.icons1;
  const icons2 = window.game_data?.icons2;
  if (!Array.isArray(icons1) || !Array.isArray(icons2)) {
    return null;
  }
  cachedRequirementSelectorCatalog = {
    sections: [buildSelectorSection("components", icons1), buildSelectorSection("buildings", icons2)],
  };
  return cloneRequirementSelectorCatalog(cachedRequirementSelectorCatalog);
}

export function buildRequirementEntryFromName(
  name: string,
  draft: RequirementDraftSnapshot
): RequirementEntry | null {
  if (!name || typeof window.find !== "function") {
    return null;
  }
  const currentItem = window.find(name);
  if (!currentItem) {
    return null;
  }

  let number = Number.isFinite(Number(draft.ratePerMinute)) ? Number(draft.ratePerMinute) : 60;
  const rawMachineCount = draft.machineCount;
  if (rawMachineCount != null && Number.isFinite(Number(rawMachineCount)) && Number(rawMachineCount) > 0) {
    const machineCount = Number(rawMachineCount);
    let accType = typeof window.getAccType === "function" ? window.getAccType(currentItem) || window.defaultAccType : window.defaultAccType;
    let accValue =
      typeof window.getAccValue === "function" ? window.getAccValue(currentItem) || window.defaultAccValue : window.defaultAccValue;
    if (accValue === "extra" && currentItem.noExtra) {
      accValue = "none";
    }
    if (Array.isArray(currentItem.q) && currentItem.q.length === 0) {
      accValue = "none";
    }

    const info = typeof window.getValue === "function" ? window.getValue(currentItem) : null;
    if (info && Number.isFinite(Number(info.speed)) && Number(info.speed) > 0 && Array.isArray(currentItem.s)) {
      for (const output of currentItem.s) {
        if (output?.name === name) {
          number = ((machineCount * 60) / (currentItem.t || 1)) * Number(info.speed) * (output.n || 1);
        }
        number *= getAccSpeed(accType, accValue);
      }
    }
  }

  return {
    item: cloneJsonValue(currentItem, currentItem),
    number,
  };
}

export function getSplitDialogPayload(name: string): SplitDialogPayload | null {
  if (!name || typeof window.getPfs !== "function" || typeof window.getPfTitle !== "function") {
    return null;
  }
  const recipes = window.getPfs(name);
  if (!Array.isArray(recipes) || recipes.length <= 1) {
    return null;
  }
  return {
    itemName: name,
    recipes: recipes.map((recipe, index) => ({
      id: recipe?.id ?? `${name}-${index}`,
      titleHtml: window.getPfTitle?.(recipe) ?? "",
    })),
    defaultNumber: 1,
  };
}
