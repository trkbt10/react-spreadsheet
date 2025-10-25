/**
 * @file Cell styling system with CSS-like specificity support.
 *
 * Specificity levels (lower to higher priority):
 * 1. Sheet-level: applies to all cells in the sheet
 * 2. Row-level: applies to all cells in a specific row
 * 3. Column-level: applies to all cells in a specific column
 * 4. Cell-level: applies to a specific cell at (col, row)
 *
 * When multiple styles apply to the same cell, higher specificity wins.
 * If specificity is equal, the most recently applied style wins.
 */

import type { CSSProperties } from "react";

/**
 * Supported CSS properties for cell styling.
 */
export type CellStyle = {
  backgroundColor?: CSSProperties["backgroundColor"];
  color?: CSSProperties["color"];
  fontWeight?: CSSProperties["fontWeight"];
  fontStyle?: CSSProperties["fontStyle"];
  textAlign?: CSSProperties["textAlign"];
  textDecoration?: CSSProperties["textDecoration"];
  fontSize?: CSSProperties["fontSize"];
  borderTop?: CSSProperties["borderTop"];
  borderRight?: CSSProperties["borderRight"];
  borderBottom?: CSSProperties["borderBottom"];
  borderLeft?: CSSProperties["borderLeft"];
};

/**
 * Style target specificity levels.
 */
export const enum StyleSpecificity {
  Sheet = 0,
  Row = 1,
  Column = 2,
  Range = 3,
  Cell = 4,
}

/**
 * Sheet-level style target (applies to all cells).
 */
export type SheetStyleTarget = {
  type: "sheet";
  specificity: StyleSpecificity.Sheet;
};

/**
 * Row-level style target (applies to all cells in row Y).
 */
export type RowStyleTarget = {
  type: "row";
  row: number;
  specificity: StyleSpecificity.Row;
};

/**
 * Column-level style target (applies to all cells in column X).
 */
export type ColumnStyleTarget = {
  type: "column";
  col: number;
  specificity: StyleSpecificity.Column;
};

/**
 * Range-level style target (applies to cells within a rectangular range).
 */
export type RangeStyleTarget = {
  type: "range";
  startCol: number;
  endCol: number;
  startRow: number;
  endRow: number;
  specificity: StyleSpecificity.Range;
};

/**
 * Cell-level style target (applies to a specific cell at (col, row)).
 */
export type CellStyleTarget = {
  type: "cell";
  col: number;
  row: number;
  specificity: StyleSpecificity.Cell;
};

/**
 * Union of all style targets.
 */
export type StyleTarget =
  | SheetStyleTarget
  | RowStyleTarget
  | ColumnStyleTarget
  | RangeStyleTarget
  | CellStyleTarget;

/**
 * Style rule with target and CSS properties.
 */
export type StyleRule = {
  target: StyleTarget;
  style: CellStyle;
  timestamp: number;
};

/**
 * Unique key for identifying style targets.
 */
export type StyleKey = string;

/**
 * Generate a unique key for a style target.
 * @param target - Style target
 * @returns Unique key string
 */
export const getStyleKey = (target: StyleTarget): StyleKey => {
  switch (target.type) {
    case "sheet":
      return "sheet";
    case "row":
      return `row:${target.row}`;
    case "column":
      return `col:${target.col}`;
    case "range":
      return `range:${target.startCol},${target.startRow}-${target.endCol},${target.endRow}`;
    case "cell":
      return `cell:${target.col},${target.row}`;
  }
};

/**
 * Create a sheet-level style target.
 * @returns Sheet style target
 */
export const createSheetTarget = (): SheetStyleTarget => ({
  type: "sheet",
  specificity: StyleSpecificity.Sheet,
});

/**
 * Create a row-level style target.
 * @param row - Row index
 * @returns Row style target
 */
export const createRowTarget = (row: number): RowStyleTarget => ({
  type: "row",
  row,
  specificity: StyleSpecificity.Row,
});

/**
 * Create a column-level style target.
 * @param col - Column index
 * @returns Column style target
 */
export const createColumnTarget = (col: number): ColumnStyleTarget => ({
  type: "column",
  col,
  specificity: StyleSpecificity.Column,
});

/**
 * Create a range-level style target.
 * @param startCol - Starting column index (inclusive)
 * @param startRow - Starting row index (inclusive)
 * @param endCol - Ending column index (exclusive)
 * @param endRow - Ending row index (exclusive)
 * @returns Range style target
 */
export const createRangeTarget = (
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
): RangeStyleTarget => ({
  type: "range",
  startCol,
  endCol,
  startRow,
  endRow,
  specificity: StyleSpecificity.Range,
});

/**
 * Create a cell-level style target.
 * @param col - Column index
 * @param row - Row index
 * @returns Cell style target
 */
export const createCellTarget = (col: number, row: number): CellStyleTarget => ({
  type: "cell",
  col,
  row,
  specificity: StyleSpecificity.Cell,
});

/**
 * Check if a style target applies to a specific cell.
 * @param target - Style target
 * @param col - Cell column
 * @param row - Cell row
 * @returns True if the target applies to the cell
 */
export const targetAppliesTo = (target: StyleTarget, col: number, row: number): boolean => {
  switch (target.type) {
    case "sheet":
      return true;
    case "row":
      return target.row === row;
    case "column":
      return target.col === col;
    case "range":
      return (
        col >= target.startCol &&
        col < target.endCol &&
        row >= target.startRow &&
        row < target.endRow
      );
    case "cell":
      return target.col === col && target.row === row;
  }
};

/**
 * Compare two style rules for specificity ordering.
 * Higher specificity wins; if equal, more recent timestamp wins.
 * @param a - First rule
 * @param b - Second rule
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export const compareStyleRules = (a: StyleRule, b: StyleRule): number => {
  const specificityDiff = a.target.specificity - b.target.specificity;
  if (specificityDiff !== 0) {
    return specificityDiff;
  }
  return a.timestamp - b.timestamp;
};
