/**
 * @file Tests for cell styling system.
 */

import { describe, it, expect } from "bun:test";
import {
  StyleSpecificity,
  createSheetTarget,
  createRowTarget,
  createColumnTarget,
  createRangeTarget,
  createCellTarget,
  getStyleKey,
  targetAppliesTo,
  compareStyleRules,
} from "./cellStyle";
import type { StyleRule } from "./cellStyle";

describe("cellStyle", () => {
  describe("createSheetTarget", () => {
    it("should create a sheet-level target", () => {
      const target = createSheetTarget();
      expect(target.type).toBe("sheet");
      expect(target.specificity).toBe(StyleSpecificity.Sheet);
    });
  });

  describe("createRowTarget", () => {
    it("should create a row-level target", () => {
      const target = createRowTarget(5);
      expect(target.type).toBe("row");
      expect(target.row).toBe(5);
      expect(target.specificity).toBe(StyleSpecificity.Row);
    });
  });

  describe("createColumnTarget", () => {
    it("should create a column-level target", () => {
      const target = createColumnTarget(10);
      expect(target.type).toBe("column");
      expect(target.col).toBe(10);
      expect(target.specificity).toBe(StyleSpecificity.Column);
    });
  });

  describe("createRangeTarget", () => {
    it("should create a range-level target", () => {
      const target = createRangeTarget(2, 3, 10, 8);
      expect(target.type).toBe("range");
      expect(target.startCol).toBe(2);
      expect(target.startRow).toBe(3);
      expect(target.endCol).toBe(10);
      expect(target.endRow).toBe(8);
      expect(target.specificity).toBe(StyleSpecificity.Range);
    });
  });

  describe("createCellTarget", () => {
    it("should create a cell-level target", () => {
      const target = createCellTarget(10, 5);
      expect(target.type).toBe("cell");
      expect(target.col).toBe(10);
      expect(target.row).toBe(5);
      expect(target.specificity).toBe(StyleSpecificity.Cell);
    });
  });

  describe("getStyleKey", () => {
    it("should generate unique key for sheet target", () => {
      const target = createSheetTarget();
      expect(getStyleKey(target)).toBe("sheet");
    });

    it("should generate unique key for row target", () => {
      const target = createRowTarget(5);
      expect(getStyleKey(target)).toBe("row:5");
    });

    it("should generate unique key for column target", () => {
      const target = createColumnTarget(10);
      expect(getStyleKey(target)).toBe("col:10");
    });

    it("should generate unique key for range target", () => {
      const target = createRangeTarget(2, 3, 10, 8);
      expect(getStyleKey(target)).toBe("range:2,3-10,8");
    });

    it("should generate unique key for cell target", () => {
      const target = createCellTarget(10, 5);
      expect(getStyleKey(target)).toBe("cell:10,5");
    });
  });

  describe("targetAppliesTo", () => {
    it("should apply sheet target to all cells", () => {
      const target = createSheetTarget();
      expect(targetAppliesTo(target, 0, 0)).toBe(true);
      expect(targetAppliesTo(target, 10, 5)).toBe(true);
      expect(targetAppliesTo(target, 100, 200)).toBe(true);
    });

    it("should apply row target only to cells in that row", () => {
      const target = createRowTarget(5);
      expect(targetAppliesTo(target, 0, 5)).toBe(true);
      expect(targetAppliesTo(target, 10, 5)).toBe(true);
      expect(targetAppliesTo(target, 10, 4)).toBe(false);
      expect(targetAppliesTo(target, 10, 6)).toBe(false);
    });

    it("should apply column target only to cells in that column", () => {
      const target = createColumnTarget(10);
      expect(targetAppliesTo(target, 10, 0)).toBe(true);
      expect(targetAppliesTo(target, 10, 5)).toBe(true);
      expect(targetAppliesTo(target, 9, 5)).toBe(false);
      expect(targetAppliesTo(target, 11, 5)).toBe(false);
    });

    it("should apply range target to cells within the range", () => {
      const target = createRangeTarget(2, 3, 10, 8);
      // Inside range
      expect(targetAppliesTo(target, 2, 3)).toBe(true);
      expect(targetAppliesTo(target, 5, 5)).toBe(true);
      expect(targetAppliesTo(target, 9, 7)).toBe(true);
      // Outside range
      expect(targetAppliesTo(target, 1, 5)).toBe(false);
      expect(targetAppliesTo(target, 10, 5)).toBe(false); // endCol is exclusive
      expect(targetAppliesTo(target, 5, 2)).toBe(false);
      expect(targetAppliesTo(target, 5, 8)).toBe(false); // endRow is exclusive
    });

    it("should apply cell target only to the specific cell", () => {
      const target = createCellTarget(10, 5);
      expect(targetAppliesTo(target, 10, 5)).toBe(true);
      expect(targetAppliesTo(target, 10, 4)).toBe(false);
      expect(targetAppliesTo(target, 9, 5)).toBe(false);
      expect(targetAppliesTo(target, 11, 6)).toBe(false);
    });
  });

  describe("compareStyleRules", () => {
    it("should order by specificity (sheet < row < column < range < cell)", () => {
      const sheetRule: StyleRule = {
        target: createSheetTarget(),
        style: { color: "red" },
        timestamp: 1000,
      };
      const rowRule: StyleRule = {
        target: createRowTarget(5),
        style: { color: "blue" },
        timestamp: 1000,
      };
      const colRule: StyleRule = {
        target: createColumnTarget(10),
        style: { color: "green" },
        timestamp: 1000,
      };
      const rangeRule: StyleRule = {
        target: createRangeTarget(2, 3, 10, 8),
        style: { color: "purple" },
        timestamp: 1000,
      };
      const cellRule: StyleRule = {
        target: createCellTarget(10, 5),
        style: { color: "yellow" },
        timestamp: 1000,
      };

      expect(compareStyleRules(sheetRule, rowRule)).toBeLessThan(0);
      expect(compareStyleRules(sheetRule, colRule)).toBeLessThan(0);
      expect(compareStyleRules(sheetRule, rangeRule)).toBeLessThan(0);
      expect(compareStyleRules(sheetRule, cellRule)).toBeLessThan(0);
      expect(compareStyleRules(rowRule, colRule)).toBeLessThan(0);
      expect(compareStyleRules(rowRule, rangeRule)).toBeLessThan(0);
      expect(compareStyleRules(rowRule, cellRule)).toBeLessThan(0);
      expect(compareStyleRules(colRule, rangeRule)).toBeLessThan(0);
      expect(compareStyleRules(colRule, cellRule)).toBeLessThan(0);
      expect(compareStyleRules(rangeRule, cellRule)).toBeLessThan(0);
    });

    it("should order by timestamp when specificity is equal", () => {
      const rule1: StyleRule = {
        target: createRowTarget(5),
        style: { color: "red" },
        timestamp: 1000,
      };
      const rule2: StyleRule = {
        target: createRowTarget(5),
        style: { color: "blue" },
        timestamp: 2000,
      };

      expect(compareStyleRules(rule1, rule2)).toBeLessThan(0);
      expect(compareStyleRules(rule2, rule1)).toBeGreaterThan(0);
    });

    it("should handle row and column as equal specificity", () => {
      const rowRule: StyleRule = {
        target: createRowTarget(5),
        style: { color: "red" },
        timestamp: 1000,
      };
      const colRule: StyleRule = {
        target: createColumnTarget(10),
        style: { color: "blue" },
        timestamp: 2000,
      };

      // Row and column have same specificity, so timestamp decides
      expect(compareStyleRules(rowRule, colRule)).toBeLessThan(0);
    });
  });
});
