/**
 * @file Tests for style resolution logic.
 */

import { describe, it, expect } from "bun:test";
import {
  createStyleRegistry,
  addStyleRule,
  removeStyleRule,
  clearStyleRegistry,
  resolveStyle,
  resolveStylesForCells,
  cellStyleToCSSProperties,
} from "./styleResolver";
import {
  createSheetTarget,
  createRowTarget,
  createColumnTarget,
  createRangeTarget,
  createCellTarget,
  getStyleKey,
} from "./cellStyle";
import type { StyleRule } from "./cellStyle";

describe("styleResolver", () => {
  describe("createStyleRegistry", () => {
    it("should create an empty registry", () => {
      const registry = createStyleRegistry();
      expect(registry.rules.size).toBe(0);
    });
  });

  describe("addStyleRule", () => {
    it("should add a style rule to the registry", () => {
      const registry = createStyleRegistry();
      const rule: StyleRule = {
        target: createSheetTarget(),
        style: { color: "red" },
        timestamp: 1000,
      };

      const updated = addStyleRule(registry, rule);
      expect(updated.rules.size).toBe(1);
      expect(updated.rules.get("sheet")).toEqual(rule);
    });

    it("should replace existing rule with same key", () => {
      const registry = createStyleRegistry();
      const rule1: StyleRule = {
        target: createSheetTarget(),
        style: { color: "red" },
        timestamp: 1000,
      };
      const rule2: StyleRule = {
        target: createSheetTarget(),
        style: { color: "blue" },
        timestamp: 2000,
      };

      const updated1 = addStyleRule(registry, rule1);
      const updated2 = addStyleRule(updated1, rule2);

      expect(updated2.rules.size).toBe(1);
      expect(updated2.rules.get("sheet")?.style.color).toBe("blue");
    });

    it("should not mutate original registry", () => {
      const registry = createStyleRegistry();
      const rule: StyleRule = {
        target: createSheetTarget(),
        style: { color: "red" },
        timestamp: 1000,
      };

      const updated = addStyleRule(registry, rule);
      expect(registry.rules.size).toBe(0);
      expect(updated.rules.size).toBe(1);
    });
  });

  describe("removeStyleRule", () => {
    it("should remove a style rule from the registry", () => {
      const registry = createStyleRegistry();
      const rule: StyleRule = {
        target: createSheetTarget(),
        style: { color: "red" },
        timestamp: 1000,
      };

      const updated = addStyleRule(registry, rule);
      const removed = removeStyleRule(updated, "sheet");

      expect(removed.rules.size).toBe(0);
    });

    it("should not mutate original registry", () => {
      const registry = createStyleRegistry();
      const rule: StyleRule = {
        target: createSheetTarget(),
        style: { color: "red" },
        timestamp: 1000,
      };

      const updated = addStyleRule(registry, rule);
      const removed = removeStyleRule(updated, "sheet");

      expect(updated.rules.size).toBe(1);
      expect(removed.rules.size).toBe(0);
    });
  });

  describe("clearStyleRegistry", () => {
    it("should clear all rules from the registry", () => {
      const registry = createStyleRegistry();
      const rule1: StyleRule = {
        target: createSheetTarget(),
        style: { color: "red" },
        timestamp: 1000,
      };
      const rule2: StyleRule = {
        target: createRowTarget(5),
        style: { color: "blue" },
        timestamp: 2000,
      };

      const updated = addStyleRule(addStyleRule(registry, rule1), rule2);
      const cleared = clearStyleRegistry(updated);

      expect(cleared.rules.size).toBe(0);
    });
  });

  describe("resolveStyle", () => {
    it("should return empty style when no rules apply", () => {
      const registry = createStyleRegistry();
      const style = resolveStyle(registry, 10, 5);
      expect(style).toEqual({});
    });

    it("should apply sheet-level style to all cells", () => {
      const registry = createStyleRegistry();
      const rule: StyleRule = {
        target: createSheetTarget(),
        style: { color: "red" },
        timestamp: 1000,
      };

      const updated = addStyleRule(registry, rule);
      const style1 = resolveStyle(updated, 0, 0);
      const style2 = resolveStyle(updated, 10, 5);

      expect(style1.color).toBe("red");
      expect(style2.color).toBe("red");
    });

    it("should apply row-level style only to cells in that row", () => {
      const registry = createStyleRegistry();
      const rule: StyleRule = {
        target: createRowTarget(5),
        style: { color: "blue" },
        timestamp: 1000,
      };

      const updated = addStyleRule(registry, rule);
      const style1 = resolveStyle(updated, 10, 5);
      const style2 = resolveStyle(updated, 10, 4);

      expect(style1.color).toBe("blue");
      expect(style2).toEqual({});
    });

    it("should override sheet style with row style", () => {
      const registry = createStyleRegistry();
      const sheetRule: StyleRule = {
        target: createSheetTarget(),
        style: { color: "red" },
        timestamp: 1000,
      };
      const rowRule: StyleRule = {
        target: createRowTarget(5),
        style: { color: "blue" },
        timestamp: 2000,
      };

      const updated = addStyleRule(addStyleRule(registry, sheetRule), rowRule);
      const style = resolveStyle(updated, 10, 5);

      expect(style.color).toBe("blue");
    });

    it("should override row/column style with cell style", () => {
      const registry = createStyleRegistry();
      const rowRule: StyleRule = {
        target: createRowTarget(5),
        style: { color: "blue" },
        timestamp: 1000,
      };
      const colRule: StyleRule = {
        target: createColumnTarget(10),
        style: { backgroundColor: "yellow" },
        timestamp: 2000,
      };
      const cellRule: StyleRule = {
        target: createCellTarget(10, 5),
        style: { color: "green" },
        timestamp: 3000,
      };

      const updated = addStyleRule(addStyleRule(addStyleRule(registry, rowRule), colRule), cellRule);
      const style = resolveStyle(updated, 10, 5);

      expect(style.color).toBe("green");
      expect(style.backgroundColor).toBe("yellow");
    });

    it("should merge non-overlapping style properties", () => {
      const registry = createStyleRegistry();
      const sheetRule: StyleRule = {
        target: createSheetTarget(),
        style: { color: "red", fontSize: "14px" },
        timestamp: 1000,
      };
      const rowRule: StyleRule = {
        target: createRowTarget(5),
        style: { backgroundColor: "yellow" },
        timestamp: 2000,
      };

      const updated = addStyleRule(addStyleRule(registry, sheetRule), rowRule);
      const style = resolveStyle(updated, 10, 5);

      expect(style.color).toBe("red");
      expect(style.fontSize).toBe("14px");
      expect(style.backgroundColor).toBe("yellow");
    });

    it("should respect timestamp order for same specificity", () => {
      const registry = createStyleRegistry();
      const rule1: StyleRule = {
        target: createRowTarget(5),
        style: { color: "red" },
        timestamp: 1000,
      };
      const rule2: StyleRule = {
        target: createColumnTarget(10),
        style: { color: "blue" },
        timestamp: 2000,
      };

      const updated = addStyleRule(addStyleRule(registry, rule1), rule2);
      const style = resolveStyle(updated, 10, 5);

      // Column and row have same specificity, so later timestamp wins
      expect(style.color).toBe("blue");
    });

    it("should apply range style to cells within the range", () => {
      const registry = createStyleRegistry();
      const rangeRule: StyleRule = {
        target: createRangeTarget(2, 3, 10, 8),
        style: { backgroundColor: "yellow" },
        timestamp: 1000,
      };

      const updated = addStyleRule(registry, rangeRule);
      const style1 = resolveStyle(updated, 5, 5);
      const style2 = resolveStyle(updated, 1, 5);
      const style3 = resolveStyle(updated, 10, 5);

      expect(style1.backgroundColor).toBe("yellow");
      expect(style2).toEqual({});
      expect(style3).toEqual({});
    });

    it("should override row/column style with range style", () => {
      const registry = createStyleRegistry();
      const rowRule: StyleRule = {
        target: createRowTarget(5),
        style: { color: "red" },
        timestamp: 1000,
      };
      const rangeRule: StyleRule = {
        target: createRangeTarget(2, 3, 10, 8),
        style: { color: "blue" },
        timestamp: 2000,
      };

      const updated = addStyleRule(addStyleRule(registry, rowRule), rangeRule);
      const style = resolveStyle(updated, 5, 5);

      expect(style.color).toBe("blue");
    });

    it("should override range style with cell style", () => {
      const registry = createStyleRegistry();
      const rangeRule: StyleRule = {
        target: createRangeTarget(2, 3, 10, 8),
        style: { color: "blue", backgroundColor: "yellow" },
        timestamp: 1000,
      };
      const cellRule: StyleRule = {
        target: createCellTarget(5, 5),
        style: { color: "green" },
        timestamp: 2000,
      };

      const updated = addStyleRule(addStyleRule(registry, rangeRule), cellRule);
      const style = resolveStyle(updated, 5, 5);

      expect(style.color).toBe("green");
      expect(style.backgroundColor).toBe("yellow");
    });
  });

  describe("resolveStylesForCells", () => {
    it("should resolve styles for multiple cells", () => {
      const registry = createStyleRegistry();
      const sheetRule: StyleRule = {
        target: createSheetTarget(),
        style: { color: "red" },
        timestamp: 1000,
      };
      const rowRule: StyleRule = {
        target: createRowTarget(5),
        style: { color: "blue" },
        timestamp: 2000,
      };

      const updated = addStyleRule(addStyleRule(registry, sheetRule), rowRule);
      const cells = [
        { col: 0, row: 0 },
        { col: 10, row: 5 },
        { col: 20, row: 10 },
      ];

      const styles = resolveStylesForCells(updated, cells);

      expect(styles.get("0,0")?.color).toBe("red");
      expect(styles.get("10,5")?.color).toBe("blue");
      expect(styles.get("20,10")?.color).toBe("red");
    });

    it("should only include cells with non-empty styles", () => {
      const registry = createStyleRegistry();
      const cells = [
        { col: 0, row: 0 },
        { col: 10, row: 5 },
      ];

      const styles = resolveStylesForCells(registry, cells);
      expect(styles.size).toBe(0);
    });
  });

  describe("cellStyleToCSSProperties", () => {
    it("should convert CellStyle to CSSProperties", () => {
      const cellStyle = {
        color: "red",
        backgroundColor: "yellow",
        fontSize: "14px",
      };

      const cssProps = cellStyleToCSSProperties(cellStyle);
      expect(cssProps.color).toBe("red");
      expect(cssProps.backgroundColor).toBe("yellow");
      expect(cssProps.fontSize).toBe("14px");
    });

    it("should handle empty style", () => {
      const cellStyle = {};
      const cssProps = cellStyleToCSSProperties(cellStyle);
      expect(cssProps).toEqual({});
    });
  });
});
