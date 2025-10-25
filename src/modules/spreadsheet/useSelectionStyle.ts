/**
 * @file Hook for applying styles to current selection.
 */

import { useCallback } from "react";
import { useSheetContext } from "./SheetContext";
import { useSheetStyles } from "./useSheetStyles";
import type { CellStyle } from "./cellStyle";
import { calculateSelectionRange, SAFE_MAX_COLUMNS, SAFE_MAX_ROWS } from "./gridLayout";
import { selectionToRange } from "./sheetReducer";

/**
 * Selection type for styling.
 */
export type SelectionType = "none" | "range" | "row" | "column" | "sheet";

/**
 * Hook for applying styles to the current selection.
 * @returns Selection style utilities
 */
export const useSelectionStyle = () => {
  const { state } = useSheetContext();
  const {
    applySheetStyle,
    applyRowStyle,
    applyColumnStyle,
    applyRangeStyle,
  } = useSheetStyles();

  const { selectionRect, selection, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight } = state;
  const selectionRange = selection ? selectionToRange(selection) : null;

  /**
   * Get the current selection type.
   * @returns Selection type
   */
  const getSelectionType = useCallback((): SelectionType => {
    if (selectionRange) {
      const { startCol, endCol, startRow, endRow } = selectionRange;

      // Check if entire sheet is selected
      if (startCol === 0 && endCol === SAFE_MAX_COLUMNS && startRow === 0 && endRow === SAFE_MAX_ROWS) {
        return "sheet";
      }

      // Check if entire column(s) selected
      if (startRow === 0 && endRow === SAFE_MAX_ROWS) {
        return "column";
      }

      // Check if entire row(s) selected
      if (startCol === 0 && endCol === SAFE_MAX_COLUMNS) {
        return "row";
      }

      return "range";
    }

    return "none";
  }, [selectionRange]);

  /**
   * Apply style to the current selection.
   * @param style - Cell style to apply
   */
  const applyStyleToSelection = useCallback(
    (style: CellStyle): void => {
      if (!selectionRange) {
        return;
      }

      const { startCol, endCol, startRow, endRow } = selectionRange;
      const selectionType = getSelectionType();

      switch (selectionType) {
        case "sheet":
          applySheetStyle(style);
          break;

        case "row":
          // Apply to each row in selection
          for (let row = startRow; row < endRow; row++) {
            applyRowStyle(row, style);
          }
          break;

        case "column":
          // Apply to each column in selection
          for (let col = startCol; col < endCol; col++) {
            applyColumnStyle(col, style);
          }
          break;

        case "range":
          applyRangeStyle(startCol, startRow, endCol, endRow, style);
          break;

        case "none":
          // No selection, do nothing
          break;
      }
    },
    [selectionRange, getSelectionType, applySheetStyle, applyRowStyle, applyColumnStyle, applyRangeStyle],
  );

  /**
   * Convert selection rect to range if not already calculated.
   * @returns Selection range or null
   */
  const getOrCalculateSelectionRange = useCallback(() => {
    if (selectionRange) {
      return selectionRange;
    }

    if (selectionRect) {
      return calculateSelectionRange(
        selectionRect,
        defaultCellWidth,
        defaultCellHeight,
        columnSizes,
        rowSizes,
        SAFE_MAX_COLUMNS,
        SAFE_MAX_ROWS,
      );
    }

    return null;
  }, [selectionRange, selectionRect, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight]);

  return {
    selectionType: getSelectionType(),
    selectionRange: getOrCalculateSelectionRange(),
    applyStyleToSelection,
  };
};
