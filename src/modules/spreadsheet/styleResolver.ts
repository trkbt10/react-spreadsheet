/**
 * @file Style resolution logic with specificity-based priority.
 */

import type { CSSProperties } from "react";
import type { StyleRule, CellStyle, StyleKey } from "./cellStyle";
import { targetAppliesTo, compareStyleRules, getStyleKey } from "./cellStyle";

/**
 * Style registry for managing style rules.
 */
export type StyleRegistry = {
  rules: Map<StyleKey, StyleRule>;
};

/**
 * Create an empty style registry.
 * @returns New style registry
 */
export const createStyleRegistry = (): StyleRegistry => ({
  rules: new Map(),
});

/**
 * Add or update a style rule in the registry.
 * @param registry - Style registry
 * @param rule - Style rule to add
 * @returns Updated registry
 */
export const addStyleRule = (registry: StyleRegistry, rule: StyleRule): StyleRegistry => {
  const key = getStyleKey(rule.target);
  const newRules = new Map(registry.rules);
  newRules.set(key, rule);
  return {
    rules: newRules,
  };
};

/**
 * Remove a style rule from the registry.
 * @param registry - Style registry
 * @param key - Style key to remove
 * @returns Updated registry
 */
export const removeStyleRule = (registry: StyleRegistry, key: StyleKey): StyleRegistry => {
  const newRules = new Map(registry.rules);
  newRules.delete(key);
  return {
    rules: newRules,
  };
};

/**
 * Clear all style rules from the registry.
 * @param registry - Style registry
 * @returns Cleared registry
 */
export const clearStyleRegistry = (registry: StyleRegistry): StyleRegistry => {
  if (registry.rules.size === 0) {
    return registry;
  }
  return {
    rules: new Map(),
  };
};

/**
 * Resolve the effective style for a cell by applying all matching rules.
 * Rules are applied in specificity order (sheet -> row/column -> cell).
 * Later rules override earlier rules for the same properties.
 * @param registry - Style registry
 * @param col - Cell column
 * @param row - Cell row
 * @returns Merged cell style
 */
export const resolveStyle = (registry: StyleRegistry, col: number, row: number): CellStyle => {
  const applicableRules: StyleRule[] = [];

  for (const rule of registry.rules.values()) {
    if (targetAppliesTo(rule.target, col, row)) {
      applicableRules.push(rule);
    }
  }

  if (applicableRules.length === 0) {
    return {};
  }

  applicableRules.sort(compareStyleRules);

  const mergedStyle: CellStyle = {};
  for (const rule of applicableRules) {
    Object.assign(mergedStyle, rule.style);
  }

  return mergedStyle;
};

/**
 * Resolve styles for multiple cells efficiently.
 * @param registry - Style registry
 * @param cells - Array of cell coordinates
 * @returns Map of cell coordinates to resolved styles
 */
export const resolveStylesForCells = (
  registry: StyleRegistry,
  cells: Array<{ col: number; row: number }>,
): Map<string, CellStyle> => {
  const result = new Map<string, CellStyle>();

  for (const { col, row } of cells) {
    const style = resolveStyle(registry, col, row);
    if (Object.keys(style).length > 0) {
      result.set(`${col},${row}`, style);
    }
  }

  return result;
};

/**
 * Convert CellStyle to React CSSProperties.
 * @param cellStyle - Cell style object
 * @returns CSS properties
 */
export const cellStyleToCSSProperties = (cellStyle: CellStyle): CSSProperties => {
  return { ...cellStyle };
};
