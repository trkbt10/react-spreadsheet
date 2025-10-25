/**
 * @file Hook for handling pointer events on sheet container for rect-based selection and cell interaction.
 */

import { useCallback, useRef } from "react";
import type { PointerEvent } from "react";
import type { BoundActionCreators } from "../../utils/typedActions";
import type { sheetActions } from "./sheetActions";
import type { Sheet } from "../../types";
import { findColumnAtPosition, findRowAtPosition } from "./gridLayout";
import type { ColumnSizeMap, RowSizeMap } from "./gridLayout";

export type UseSheetPointerEventsParams = {
  actions: BoundActionCreators<typeof sheetActions>;
  scrollLeft: number;
  scrollTop: number;
  headerColumnWidth: number;
  headerRowHeight: number;
  defaultCellWidth: number;
  defaultCellHeight: number;
  columnSizes: ColumnSizeMap;
  rowSizes: RowSizeMap;
  maxColumns: number;
  maxRows: number;
  sheet: Sheet;
};

export type UseSheetPointerEventsReturn = {
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
};

/**
 * Hook for handling pointer events on sheet container.
 * Provides rect-based selection and cell interaction.
 * @param params - Configuration parameters
 * @returns Pointer event handlers
 */
export const useSheetPointerEvents = ({
  actions,
  scrollLeft,
  scrollTop,
  headerColumnWidth,
  headerRowHeight,
  defaultCellWidth,
  defaultCellHeight,
  columnSizes,
  rowSizes,
  maxColumns,
  maxRows,
  sheet,
}: UseSheetPointerEventsParams): UseSheetPointerEventsReturn => {
  const isDraggingRef = useRef(false);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const clickTimeoutRef = useRef<number | null>(null);

  const getPositionFromPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>): { x: number; y: number } | null => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left + scrollLeft - headerColumnWidth;
      const y = event.clientY - rect.top + scrollTop - headerRowHeight;

      if (x < 0 || y < 0) {
        return null;
      }

      return { x, y };
    },
    [scrollLeft, scrollTop, headerColumnWidth, headerRowHeight],
  );

  const getCellAtPosition = useCallback(
    (x: number, y: number): { col: number; row: number } | null => {
      const col = findColumnAtPosition(x, defaultCellWidth, columnSizes, maxColumns);
      const row = findRowAtPosition(y, defaultCellHeight, rowSizes, maxRows);

      if (col >= maxColumns || row >= maxRows) {
        return null;
      }

      return { col, row };
    },
    [defaultCellWidth, defaultCellHeight, columnSizes, rowSizes, maxColumns, maxRows],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      const pos = getPositionFromPointer(event);
      if (!pos) {
        return;
      }

      pointerDownPosRef.current = pos;
      pointerDownTimeRef.current = Date.now();
      isDraggingRef.current = false;

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [getPositionFromPointer],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (!pointerDownPosRef.current) {
        return;
      }

      const pos = getPositionFromPointer(event);
      if (!pos) {
        return;
      }

      const dx = Math.abs(pos.x - pointerDownPosRef.current.x);
      const dy = Math.abs(pos.y - pointerDownPosRef.current.y);

      // Start dragging if moved more than 3px
      if (!isDraggingRef.current && (dx > 3 || dy > 3)) {
        isDraggingRef.current = true;
        actions.startRectSelection(pointerDownPosRef.current.x, pointerDownPosRef.current.y);
      }

      if (isDraggingRef.current) {
        actions.updateRectSelection(pos.x, pos.y);
      }
    },
    [getPositionFromPointer, actions],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (!pointerDownPosRef.current) {
        return;
      }

      const pos = getPositionFromPointer(event);
      event.currentTarget.releasePointerCapture(event.pointerId);

      if (isDraggingRef.current) {
        // Was dragging - end selection
        isDraggingRef.current = false;
        actions.endRectSelection();
      } else if (pos) {
        // Was a click - check for cell click or double-click
        const cell = getCellAtPosition(pos.x, pos.y);
        if (cell) {
          const timeSinceDown = Date.now() - pointerDownTimeRef.current;
          const isDoubleClick = timeSinceDown < 300 && clickTimeoutRef.current !== null;

          if (isDoubleClick) {
            // Double-click - start editing
            if (clickTimeoutRef.current !== null) {
              window.clearTimeout(clickTimeoutRef.current);
              clickTimeoutRef.current = null;
            }

            const cellId = `${cell.col}:${cell.row}` as const;
            const cellData = sheet.cells[cellId];
            const initialValue = cellData
              ? cellData.type === "formula" && cellData.formula
                ? `=${cellData.formula}`
                : cellData.value === null
                  ? ""
                  : String(cellData.value)
              : "";

            actions.startEditingCell(cell.col, cell.row, initialValue);
          } else if (event.shiftKey) {
            // Shift+click - extend selection
            if (clickTimeoutRef.current !== null) {
              window.clearTimeout(clickTimeoutRef.current);
              clickTimeoutRef.current = null;
            }

            actions.extendSelectionToCell(cell.col, cell.row);
          } else {
            // Single click - set active cell after delay
            if (clickTimeoutRef.current !== null) {
              window.clearTimeout(clickTimeoutRef.current);
            }

            clickTimeoutRef.current = window.setTimeout(() => {
              actions.setActiveCell(cell.col, cell.row);
              clickTimeoutRef.current = null;
            }, 200);
          }
        }
      }

      pointerDownPosRef.current = null;
    },
    [getPositionFromPointer, getCellAtPosition, actions, sheet.cells],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
