/**
 * @file SelectionHighlight component for rendering all selection types using SVG.
 */

import { useMemo } from "react";
import type { ReactElement } from "react";
import { useVirtualScrollContext } from "../scrollarea/VirtualScrollContext";
import { useSheetContext } from "../../modules/spreadsheet/SheetContext";
import { calculateSelectionRange, calculateColumnPosition, calculateRowPosition, findColumnAtPosition, findRowAtPosition, SAFE_MAX_COLUMNS, SAFE_MAX_ROWS } from "../../modules/spreadsheet/gridLayout";
import styles from "./SelectionHighlight.module.css";

export type SelectionHighlightProps = {
  headerColumnWidth: number;
  headerRowHeight: number;
};

/**
 * Renders all selection highlights (range, active cell) using SVG overlay.
 * @param props - Component props
 * @returns SelectionHighlight component
 */
export const SelectionHighlight = ({ headerColumnWidth, headerRowHeight }: SelectionHighlightProps): ReactElement => {
  const { viewportRect } = useVirtualScrollContext();
  const { state } = useSheetContext();
  const { selectionRect, selectionRange, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight, activeCell, editingCell, isDragging } = state;

  const draggingRange = useMemo(() => {
    if (!isDragging || !selectionRect) {
      return null;
    }
    return calculateSelectionRange(
      selectionRect,
      defaultCellWidth,
      defaultCellHeight,
      columnSizes,
      rowSizes,
      SAFE_MAX_COLUMNS,
      SAFE_MAX_ROWS,
    );
  }, [isDragging, selectionRect, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight]);

  const getSelectionLabel = (range: { startCol: number; endCol: number; startRow: number; endRow: number } | null): string | null => {
    if (!range) {
      return null;
    }

    const { startCol, endCol, startRow, endRow } = range;

    // Check if entire sheet
    if (startCol === 0 && endCol >= SAFE_MAX_COLUMNS && startRow === 0 && endRow >= SAFE_MAX_ROWS) {
      return "Entire sheet";
    }

    // Check if column(s)
    if (startRow === 0 && endRow >= SAFE_MAX_ROWS) {
      if (startCol === endCol - 1) {
        return `Column ${startCol}`;
      }
      return `Columns ${startCol}-${endCol - 1}`;
    }

    // Check if row(s)
    if (startCol === 0 && endCol >= SAFE_MAX_COLUMNS) {
      if (startRow === endRow - 1) {
        return `Row ${startRow}`;
      }
      return `Rows ${startRow}-${endRow - 1}`;
    }

    // Regular range
    return `Col: ${startCol}-${endCol - 1} | Row: ${startRow}-${endRow - 1}`;
  };

  const svgWidth = viewportRect.width + headerColumnWidth;
  const svgHeight = viewportRect.height + headerRowHeight;

  // Calculate visible cells in selection range
  const rangeCells = useMemo(() => {
    if (!selectionRange || editingCell) {
      return [];
    }

    const cells: Array<{ col: number; row: number; x: number; y: number; width: number; height: number }> = [];
    const visibleStartCol = findColumnAtPosition(viewportRect.left, defaultCellWidth, columnSizes, SAFE_MAX_COLUMNS);
    const visibleEndCol = findColumnAtPosition(viewportRect.left + viewportRect.width, defaultCellWidth, columnSizes, SAFE_MAX_COLUMNS) + 1;
    const visibleStartRow = findRowAtPosition(viewportRect.top, defaultCellHeight, rowSizes, SAFE_MAX_ROWS);
    const visibleEndRow = findRowAtPosition(viewportRect.top + viewportRect.height, defaultCellHeight, rowSizes, SAFE_MAX_ROWS) + 1;

    const startCol = Math.max(selectionRange.startCol, visibleStartCol);
    const endCol = Math.min(selectionRange.endCol, visibleEndCol);
    const startRow = Math.max(selectionRange.startRow, visibleStartRow);
    const endRow = Math.min(selectionRange.endRow, visibleEndRow);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const x = calculateColumnPosition(col, defaultCellWidth, columnSizes);
        const y = calculateRowPosition(row, defaultCellHeight, rowSizes);
        const customWidth = columnSizes.get(col);
        const width = customWidth === undefined ? defaultCellWidth : customWidth;
        const customHeight = rowSizes.get(row);
        const height = customHeight === undefined ? defaultCellHeight : customHeight;

        cells.push({
          col,
          row,
          x: x - viewportRect.left + headerColumnWidth,
          y: y - viewportRect.top + headerRowHeight,
          width,
          height,
        });
      }
    }

    return cells;
  }, [selectionRange, editingCell, viewportRect, defaultCellWidth, defaultCellHeight, columnSizes, rowSizes, headerColumnWidth, headerRowHeight]);

  // Calculate active cell position
  const activeCellRect = useMemo(() => {
    if (!activeCell || editingCell) {
      return null;
    }

    const { col, row } = activeCell;
    const x = calculateColumnPosition(col, defaultCellWidth, columnSizes);
    const y = calculateRowPosition(row, defaultCellHeight, rowSizes);

    const customWidth = columnSizes.get(col);
    const width = customWidth === undefined ? defaultCellWidth : customWidth;
    const customHeight = rowSizes.get(row);
    const height = customHeight === undefined ? defaultCellHeight : customHeight;

    const relativeX = x - viewportRect.left + headerColumnWidth;
    const relativeY = y - viewportRect.top + headerRowHeight;

    // Check if active cell is in viewport
    if (
      relativeX + width < headerColumnWidth ||
      relativeX > svgWidth ||
      relativeY + height < headerRowHeight ||
      relativeY > svgHeight
    ) {
      return null;
    }

    return { x: relativeX, y: relativeY, width, height };
  }, [activeCell, editingCell, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight, viewportRect, headerColumnWidth, headerRowHeight, svgWidth, svgHeight]);

  // Calculate cells for dragging range
  const draggingCells = useMemo(() => {
    if (!isDragging || !draggingRange) {
      return [];
    }

    const cells: Array<{ col: number; row: number; x: number; y: number; width: number; height: number }> = [];
    const visibleStartCol = findColumnAtPosition(viewportRect.left, defaultCellWidth, columnSizes, SAFE_MAX_COLUMNS);
    const visibleEndCol = findColumnAtPosition(viewportRect.left + viewportRect.width, defaultCellWidth, columnSizes, SAFE_MAX_COLUMNS) + 1;
    const visibleStartRow = findRowAtPosition(viewportRect.top, defaultCellHeight, rowSizes, SAFE_MAX_ROWS);
    const visibleEndRow = findRowAtPosition(viewportRect.top + viewportRect.height, defaultCellHeight, rowSizes, SAFE_MAX_ROWS) + 1;

    const startCol = Math.max(draggingRange.startCol, visibleStartCol);
    const endCol = Math.min(draggingRange.endCol, visibleEndCol);
    const startRow = Math.max(draggingRange.startRow, visibleStartRow);
    const endRow = Math.min(draggingRange.endRow, visibleEndRow);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const x = calculateColumnPosition(col, defaultCellWidth, columnSizes);
        const y = calculateRowPosition(row, defaultCellHeight, rowSizes);
        const customWidth = columnSizes.get(col);
        const width = customWidth === undefined ? defaultCellWidth : customWidth;
        const customHeight = rowSizes.get(row);
        const height = customHeight === undefined ? defaultCellHeight : customHeight;

        cells.push({
          col,
          row,
          x: x - viewportRect.left + headerColumnWidth,
          y: y - viewportRect.top + headerRowHeight,
          width,
          height,
        });
      }
    }

    return cells;
  }, [isDragging, draggingRange, viewportRect, defaultCellWidth, defaultCellHeight, columnSizes, rowSizes, headerColumnWidth, headerRowHeight]);

  return (
    <svg
      className={styles.highlight}
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
    >
      {/* Dragging range cells (during drag) */}
      {isDragging && draggingCells.map((cell) => (
        <rect
          key={`dragging-${cell.col}-${cell.row}`}
          className={styles.rangeCell}
          x={cell.x}
          y={cell.y}
          width={cell.width}
          height={cell.height}
        />
      ))}

      {/* Range cells highlight (after drag is finished) */}
      {!isDragging && rangeCells.map((cell) => (
        <rect
          key={`range-${cell.col}-${cell.row}`}
          className={styles.rangeCell}
          x={cell.x}
          y={cell.y}
          width={cell.width}
          height={cell.height}
        />
      ))}

      {/* Active cell highlight */}
      {activeCellRect && (
        <rect
          className={styles.activeCellRect}
          x={activeCellRect.x + 1}
          y={activeCellRect.y + 1}
          width={activeCellRect.width - 2}
          height={activeCellRect.height - 2}
        />
      )}
    </svg>
  );
};
