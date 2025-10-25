/**
 * @file React hook for applying and resolving cell styles.
 */

import { useCallback } from "react";
import { useSheetContext } from "./SheetContext";
import type { CellStyle, StyleKey } from "./cellStyle";
import {
  createSheetTarget,
  createRowTarget,
  createColumnTarget,
  createRangeTarget,
  createCellTarget,
  getStyleKey,
} from "./cellStyle";
import { resolveStyle } from "./styleResolver";

/**
 * Hook providing style application and resolution utilities.
 * @returns Style utilities
 */
export const useSheetStyles = () => {
  const { state, actions } = useSheetContext();

  /**
   * Apply style to entire sheet.
   * @param style - Cell style to apply
   */
  const applySheetStyle = useCallback(
    (style: CellStyle): void => {
      const target = createSheetTarget();
      actions.applyStyle(target, style);
    },
    [actions],
  );

  /**
   * Apply style to a specific row.
   * @param row - Row index
   * @param style - Cell style to apply
   */
  const applyRowStyle = useCallback(
    (row: number, style: CellStyle): void => {
      const target = createRowTarget(row);
      actions.applyStyle(target, style);
    },
    [actions],
  );

  /**
   * Apply style to a specific column.
   * @param col - Column index
   * @param style - Cell style to apply
   */
  const applyColumnStyle = useCallback(
    (col: number, style: CellStyle): void => {
      const target = createColumnTarget(col);
      actions.applyStyle(target, style);
    },
    [actions],
  );

  /**
   * Apply style to a range of cells.
   * @param startCol - Starting column index (inclusive)
   * @param startRow - Starting row index (inclusive)
   * @param endCol - Ending column index (exclusive)
   * @param endRow - Ending row index (exclusive)
   * @param style - Cell style to apply
   */
  const applyRangeStyle = useCallback(
    (startCol: number, startRow: number, endCol: number, endRow: number, style: CellStyle): void => {
      const target = createRangeTarget(startCol, startRow, endCol, endRow);
      actions.applyStyle(target, style);
    },
    [actions],
  );

  /**
   * Apply style to a specific cell.
   * @param col - Column index
   * @param row - Row index
   * @param style - Cell style to apply
   */
  const applyCellStyle = useCallback(
    (col: number, row: number, style: CellStyle): void => {
      const target = createCellTarget(col, row);
      actions.applyStyle(target, style);
    },
    [actions],
  );

  /**
   * Remove style from sheet.
   * @returns Style key
   */
  const removeSheetStyle = useCallback((): void => {
    const target = createSheetTarget();
    const key = getStyleKey(target);
    actions.removeStyle(key);
  }, [actions]);

  /**
   * Remove style from a specific row.
   * @param row - Row index
   */
  const removeRowStyle = useCallback(
    (row: number): void => {
      const target = createRowTarget(row);
      const key = getStyleKey(target);
      actions.removeStyle(key);
    },
    [actions],
  );

  /**
   * Remove style from a specific column.
   * @param col - Column index
   */
  const removeColumnStyle = useCallback(
    (col: number): void => {
      const target = createColumnTarget(col);
      const key = getStyleKey(target);
      actions.removeStyle(key);
    },
    [actions],
  );

  /**
   * Remove style from a range.
   * @param startCol - Starting column index (inclusive)
   * @param startRow - Starting row index (inclusive)
   * @param endCol - Ending column index (exclusive)
   * @param endRow - Ending row index (exclusive)
   */
  const removeRangeStyle = useCallback(
    (startCol: number, startRow: number, endCol: number, endRow: number): void => {
      const target = createRangeTarget(startCol, startRow, endCol, endRow);
      const key = getStyleKey(target);
      actions.removeStyle(key);
    },
    [actions],
  );

  /**
   * Remove style from a specific cell.
   * @param col - Column index
   * @param row - Row index
   */
  const removeCellStyle = useCallback(
    (col: number, row: number): void => {
      const target = createCellTarget(col, row);
      const key = getStyleKey(target);
      actions.removeStyle(key);
    },
    [actions],
  );

  /**
   * Clear all styles from the sheet.
   */
  const clearAllStyles = useCallback((): void => {
    actions.clearAllStyles();
  }, [actions]);

  /**
   * Get the resolved style for a specific cell.
   * @param col - Column index
   * @param row - Row index
   * @returns Resolved cell style
   */
  const getCellStyle = useCallback(
    (col: number, row: number): CellStyle => {
      return resolveStyle(state.styleRegistry, col, row);
    },
    [state.styleRegistry],
  );

  /**
   * Get style key for a specific target.
   * @param type - Target type
   * @param params - Parameters for the target
   * @returns Style key
   */
  const getKeyForTarget = useCallback(
    (
      type: "sheet" | "row" | "column" | "range" | "cell",
      params?: {
        col?: number;
        row?: number;
        startCol?: number;
        startRow?: number;
        endCol?: number;
        endRow?: number;
      },
    ): StyleKey => {
      if (type === "sheet") {
        return getStyleKey(createSheetTarget());
      }
      if (type === "row") {
        if (params?.row === undefined) {
          throw new Error("Row index is required for row target");
        }
        return getStyleKey(createRowTarget(params.row));
      }
      if (type === "column") {
        if (params?.col === undefined) {
          throw new Error("Column index is required for column target");
        }
        return getStyleKey(createColumnTarget(params.col));
      }
      if (type === "range") {
        if (
          params?.startCol === undefined ||
          params?.startRow === undefined ||
          params?.endCol === undefined ||
          params?.endRow === undefined
        ) {
          throw new Error("Range coordinates are required for range target");
        }
        return getStyleKey(createRangeTarget(params.startCol, params.startRow, params.endCol, params.endRow));
      }
      if (type === "cell") {
        if (params?.col === undefined || params?.row === undefined) {
          throw new Error("Both column and row indices are required for cell target");
        }
        return getStyleKey(createCellTarget(params.col, params.row));
      }
      throw new Error(`Invalid target type: ${type}`);
    },
    [],
  );

  return {
    applySheetStyle,
    applyRowStyle,
    applyColumnStyle,
    applyRangeStyle,
    applyCellStyle,
    removeSheetStyle,
    removeRowStyle,
    removeColumnStyle,
    removeRangeStyle,
    removeCellStyle,
    clearAllStyles,
    getCellStyle,
    getKeyForTarget,
  };
};
