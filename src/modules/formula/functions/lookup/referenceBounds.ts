/**
 * @file Utilities for deriving reference bounds from AST nodes.
 */

import type { FormulaAstNode } from "../../ast";

export type ReferenceBounds = {
  sheetId: string;
  sheetName: string;
  topRow: number;
  leftColumn: number;
  height: number;
  width: number;
};

export const resolveReferenceBounds = (node: FormulaAstNode, description: string): ReferenceBounds => {
  if (node.type === "Reference") {
    return {
      sheetId: node.address.sheetId,
      sheetName: node.address.sheetName,
      topRow: node.address.row,
      leftColumn: node.address.column,
      height: 1,
      width: 1,
    };
  }

  if (node.type === "Range") {
    const minRow = Math.min(node.start.row, node.end.row);
    const maxRow = Math.max(node.start.row, node.end.row);
    const minColumn = Math.min(node.start.column, node.end.column);
    const maxColumn = Math.max(node.start.column, node.end.column);
    return {
      sheetId: node.start.sheetId,
      sheetName: node.start.sheetName,
      topRow: minRow,
      leftColumn: minColumn,
      height: maxRow - minRow + 1,
      width: maxColumn - minColumn + 1,
    };
  }

  throw new Error(`${description} requires a cell reference or range as the first argument`);
};

// NOTE: Consumed by OFFSET for coordinate calculations.

