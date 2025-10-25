/**
 * @file Helper functions for managing selection state with anchor tracking.
 * This module provides a single source of truth for selection operations.
 */

import type { SelectionTarget, CellSelectionTarget, RangeSelectionTarget } from "./sheetReducer";

/**
 * Selection state with anchor information.
 * The anchor represents the starting point of a selection for shift-click extension.
 */
export type SelectionState = {
  selection: SelectionTarget | null;
  anchor: { col: number; row: number } | null;
};

/**
 * Creates a cell selection state with the cell as the anchor.
 * @param col - Column index
 * @param row - Row index
 * @returns Selection state with cell and anchor
 */
export const createCellSelection = (col: number, row: number): SelectionState => {
  return {
    selection: {
      kind: "cell",
      col,
      row,
    } satisfies CellSelectionTarget,
    anchor: { col, row },
  };
};

/**
 * Creates a range selection state with the start position as the anchor.
 * @param startCol - Start column index
 * @param endCol - End column index (exclusive)
 * @param startRow - Start row index
 * @param endRow - End row index (exclusive)
 * @returns Selection state with range and anchor
 */
export const createRangeSelection = (
  startCol: number,
  endCol: number,
  startRow: number,
  endRow: number,
): SelectionState => {
  return {
    selection: {
      kind: "range",
      startCol,
      endCol,
      startRow,
      endRow,
    } satisfies RangeSelectionTarget,
    anchor: { col: startCol, row: startRow },
  };
};

/**
 * Extends the current selection to a target cell, maintaining the original anchor.
 * @param currentState - Current selection state
 * @param targetCol - Target column index
 * @param targetRow - Target row index
 * @returns New selection state with extended range
 */
export const extendSelection = (
  currentState: SelectionState,
  targetCol: number,
  targetRow: number,
): SelectionState => {
  // If no anchor exists, create a new cell selection
  if (!currentState.anchor) {
    return createCellSelection(targetCol, targetRow);
  }

  const anchorCol = currentState.anchor.col;
  const anchorRow = currentState.anchor.row;

  // If target is the same as anchor, return a cell selection
  if (targetCol === anchorCol && targetRow === anchorRow) {
    return createCellSelection(targetCol, targetRow);
  }

  // Create range from anchor to target
  const startCol = Math.min(anchorCol, targetCol);
  const endCol = Math.max(anchorCol, targetCol) + 1;
  const startRow = Math.min(anchorRow, targetRow);
  const endRow = Math.max(anchorRow, targetRow) + 1;

  return {
    selection: {
      kind: "range",
      startCol,
      endCol,
      startRow,
      endRow,
    } satisfies RangeSelectionTarget,
    // Preserve the original anchor
    anchor: currentState.anchor,
  };
};

/**
 * Clears the selection state.
 * @returns Empty selection state
 */
export const clearSelection = (): SelectionState => {
  return {
    selection: null,
    anchor: null,
  };
};

/**
 * Creates a selection state for a range without an anchor (e.g., row/column/sheet selection).
 * These types of selections don't support shift-extension.
 * @param startCol - Start column index
 * @param endCol - End column index (exclusive)
 * @param startRow - Start row index
 * @param endRow - End row index (exclusive)
 * @returns Selection state with range but no anchor
 */
export const createRangeSelectionWithoutAnchor = (
  startCol: number,
  endCol: number,
  startRow: number,
  endRow: number,
): SelectionState => {
  return {
    selection: {
      kind: "range",
      startCol,
      endCol,
      startRow,
      endRow,
    } satisfies RangeSelectionTarget,
    anchor: null,
  };
};
