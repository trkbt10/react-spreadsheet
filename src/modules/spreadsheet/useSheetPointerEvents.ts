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
import type { SelectionTarget } from "./sheetReducer";

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
  selection: SelectionTarget | null;
  selectionAnchor: { col: number; row: number } | null;
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
  selection,
  selectionAnchor,
}: UseSheetPointerEventsParams): UseSheetPointerEventsReturn => {
  const isDraggingRef = useRef(false);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastClickRef = useRef<{ col: number; row: number; time: number } | null>(null);
  const isShiftExtendingRef = useRef(false);
  const lastExtendedCellRef = useRef<{ col: number; row: number } | null>(null);

  const resolveInitialValue = useCallback(
    (col: number, row: number): string => {
      const cellId = `${col}:${row}` as const;
      const cellData = sheet.cells[cellId];
      if (!cellData) {
        return "";
      }
      if (cellData.type === "formula" && cellData.formula) {
        return `=${cellData.formula}`;
      }
      if (cellData.value === null || cellData.value === undefined) {
        return "";
      }
      return String(cellData.value);
    },
    [sheet.cells],
  );

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
      isDraggingRef.current = false;
      isShiftExtendingRef.current = false;
      lastExtendedCellRef.current = null;

      event.currentTarget.setPointerCapture(event.pointerId);

      if (event.shiftKey) {
        if (selection === null) {
          return;
        }
        if (selectionAnchor === null) {
          return;
        }

        const cell = getCellAtPosition(pos.x, pos.y);
        if (cell) {
          actions.extendSelectionToCell(cell.col, cell.row);
          lastExtendedCellRef.current = cell;
          isShiftExtendingRef.current = true;
        }
        return;
      }
    },
    [getPositionFromPointer, getCellAtPosition, actions, selection, selectionAnchor],
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

      if (isShiftExtendingRef.current) {
        const cell = getCellAtPosition(pos.x, pos.y);
        if (!cell) {
          return;
        }

        const lastExtendedCell = lastExtendedCellRef.current;
        if (lastExtendedCell) {
          if (lastExtendedCell.col === cell.col) {
            if (lastExtendedCell.row === cell.row) {
              return;
            }
          }
        }

        actions.extendSelectionToCell(cell.col, cell.row);
        lastExtendedCellRef.current = cell;
        return;
      }

      const dx = Math.abs(pos.x - pointerDownPosRef.current.x);
      const dy = Math.abs(pos.y - pointerDownPosRef.current.y);

      // Start dragging if moved more than 3px
      if (!isDraggingRef.current) {
        if (dx <= 3 && dy <= 3) {
          return;
        }
        isDraggingRef.current = true;
        actions.startRectSelection(pointerDownPosRef.current.x, pointerDownPosRef.current.y);
      }

      actions.updateRectSelection(pos.x, pos.y);
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

      if (isShiftExtendingRef.current) {
        isShiftExtendingRef.current = false;
        pointerDownPosRef.current = null;
        lastExtendedCellRef.current = null;
        return;
      }

      if (isDraggingRef.current) {
        // Was dragging - end selection
        isDraggingRef.current = false;
        actions.endRectSelection();
      } else if (pos) {
        // Was a click - check for cell click or double-click
        const cell = getCellAtPosition(pos.x, pos.y);
        if (cell) {
          const now = Date.now();
          const lastClick = lastClickRef.current;
          const isDoubleClick =
            lastClick !== null &&
            lastClick.col === cell.col &&
            lastClick.row === cell.row &&
            now - lastClick.time < 300;

          if (event.shiftKey) {
            actions.extendSelectionToCell(cell.col, cell.row);
            lastClickRef.current = null;
          } else if (isDoubleClick) {
            const initialValue = resolveInitialValue(cell.col, cell.row);
            actions.startEditingCell(cell.col, cell.row, initialValue, "cellEditor");
            lastClickRef.current = null;
          } else {
            actions.setActiveCell(cell.col, cell.row);
            lastClickRef.current = { col: cell.col, row: cell.row, time: now };
          }
        }
      }

      pointerDownPosRef.current = null;
    },
    [getPositionFromPointer, getCellAtPosition, actions, resolveInitialValue],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};

// Notes:
// - Reviewed src/modules/spreadsheet/sheetReducer.ts to ensure shift-extend interactions align with existing selection state transitions.
// - Reviewed src/components/Sheet.tsx to confirm pointer event hook parameters cover current selection metadata for drag behaviors.
