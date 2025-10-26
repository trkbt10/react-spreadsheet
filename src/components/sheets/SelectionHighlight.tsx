/**
 * @file SelectionHighlight component for rendering all selection types using SVG.
 */

import { useMemo, useState, useRef, useCallback } from "react";
import type { ReactElement, PointerEvent as ReactPointerEvent } from "react";
import { useVirtualScrollContext } from "../scrollarea/VirtualScrollContext";
import { useSheetContext } from "../../modules/spreadsheet/SheetContext";
import type { ViewportRect } from "../../hooks/useVirtualScroll";
import type { SelectionRange } from "../../modules/spreadsheet/sheetReducer";
import type { ColumnSizeMap, RowSizeMap } from "../../modules/spreadsheet/gridLayout";
import {
  calculateSelectionRange,
  calculateColumnPosition,
  calculateRowPosition,
  findColumnAtPosition,
  findRowAtPosition,
  SAFE_MAX_COLUMNS,
  SAFE_MAX_ROWS,
} from "../../modules/spreadsheet/gridLayout";
import { selectionToRange } from "../../modules/spreadsheet/sheetReducer";
import { deriveFillHandlePreview, computeAutofillUpdates } from "../../modules/spreadsheet/autofill";
import type { AutofillRequest, FillHandlePreview } from "../../modules/spreadsheet/autofill";
import styles from "./SelectionHighlight.module.css";

export type SelectionHighlightProps = {
  headerColumnWidth: number;
  headerRowHeight: number;
  autoFillHandler?: (request: AutofillRequest) => ReadonlyArray<{ col: number; row: number; value: string }>;
};

type VisibleRangeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const calculateVisibleRangeRect = (
  range: SelectionRange,
  viewportRect: ViewportRect,
  columnSizes: ColumnSizeMap,
  rowSizes: RowSizeMap,
  defaultCellWidth: number,
  defaultCellHeight: number,
  headerColumnWidth: number,
  headerRowHeight: number,
): VisibleRangeRect | null => {
  const visibleStartCol = findColumnAtPosition(viewportRect.left, defaultCellWidth, columnSizes, SAFE_MAX_COLUMNS);
  const visibleEndCol =
    findColumnAtPosition(viewportRect.left + viewportRect.width, defaultCellWidth, columnSizes, SAFE_MAX_COLUMNS) + 1;
  const visibleStartRow = findRowAtPosition(viewportRect.top, defaultCellHeight, rowSizes, SAFE_MAX_ROWS);
  const visibleEndRow =
    findRowAtPosition(viewportRect.top + viewportRect.height, defaultCellHeight, rowSizes, SAFE_MAX_ROWS) + 1;

  const startCol = Math.max(range.startCol, visibleStartCol);
  const endCol = Math.min(range.endCol, visibleEndCol);
  const startRow = Math.max(range.startRow, visibleStartRow);
  const endRow = Math.min(range.endRow, visibleEndRow);

  if (startCol >= endCol || startRow >= endRow) {
    return null;
  }

  const startX = calculateColumnPosition(startCol, defaultCellWidth, columnSizes);
  const endX = calculateColumnPosition(endCol, defaultCellWidth, columnSizes);
  const startY = calculateRowPosition(startRow, defaultCellHeight, rowSizes);
  const endY = calculateRowPosition(endRow, defaultCellHeight, rowSizes);

  const x = startX - viewportRect.left + headerColumnWidth;
  const y = startY - viewportRect.top + headerRowHeight;
  const width = endX - startX;
  const height = endY - startY;

  return { x, y, width, height };
};

/**
 * Renders selection highlights (range, anchor, fill handle) using SVG overlay.
 * @param props - Component props
 * @returns SelectionHighlight component
 */
export const SelectionHighlight = ({
  headerColumnWidth,
  headerRowHeight,
  autoFillHandler,
}: SelectionHighlightProps): ReactElement => {
  const { viewportRect } = useVirtualScrollContext();
  const { state, sheet, actions, onCellsUpdate } = useSheetContext();
  const {
    selectionRect,
    selection,
    selectionAnchor,
    columnSizes,
    rowSizes,
    defaultCellWidth,
    defaultCellHeight,
    editingSelection,
    editorActivity,
    isDragging,
  } = state;

  const isInlineEditing = editorActivity.cellEditor ? editingSelection !== null : false;

  const selectionRange = selection ? selectionToRange(selection) : null;
  const effectiveAutoFillHandler = autoFillHandler ?? computeAutofillUpdates;
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [fillPreview, setFillPreview] = useState<FillHandlePreview | null>(null);
  const fillPreviewRef = useRef<FillHandlePreview | null>(null);
  const fillDragStateRef = useRef<{ pointerId: number; baseRange: SelectionRange } | null>(null);

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

  const svgWidth = viewportRect.width + headerColumnWidth;
  const svgHeight = viewportRect.height + headerRowHeight;

  const visibleSelectionRect = useMemo(() => {
    if (!selectionRange || isInlineEditing) {
      return null;
    }

    return calculateVisibleRangeRect(
      selectionRange,
      viewportRect,
      columnSizes,
      rowSizes,
      defaultCellWidth,
      defaultCellHeight,
      headerColumnWidth,
      headerRowHeight,
    );
  }, [
    selectionRange,
    isInlineEditing,
    viewportRect,
    columnSizes,
    rowSizes,
    defaultCellWidth,
    defaultCellHeight,
    headerColumnWidth,
    headerRowHeight,
  ]);

  const visibleDraggingRect = useMemo(() => {
    if (!isDragging || !draggingRange) {
      return null;
    }

    return calculateVisibleRangeRect(
      draggingRange,
      viewportRect,
      columnSizes,
      rowSizes,
      defaultCellWidth,
      defaultCellHeight,
      headerColumnWidth,
      headerRowHeight,
    );
  }, [
    isDragging,
    draggingRange,
    viewportRect,
    columnSizes,
    rowSizes,
    defaultCellWidth,
    defaultCellHeight,
    headerColumnWidth,
    headerRowHeight,
  ]);

  const anchorRect = useMemo(() => {
    if (!selectionRange || !selectionAnchor || isInlineEditing) {
      return null;
    }

    const { col, row } = selectionAnchor;
    const x = calculateColumnPosition(col, defaultCellWidth, columnSizes);
    const y = calculateRowPosition(row, defaultCellHeight, rowSizes);
    const customWidth = columnSizes.get(col);
    const width = customWidth === undefined ? defaultCellWidth : customWidth;
    const customHeight = rowSizes.get(row);
    const height = customHeight === undefined ? defaultCellHeight : customHeight;

    const relativeX = x - viewportRect.left + headerColumnWidth;
    const relativeY = y - viewportRect.top + headerRowHeight;

    if (
      relativeX + width < headerColumnWidth ||
      relativeX > svgWidth ||
      relativeY + height < headerRowHeight ||
      relativeY > svgHeight
    ) {
      return null;
    }

    return {
      x: relativeX,
      y: relativeY,
      width,
      height,
    };
  }, [
    selectionRange,
    selectionAnchor,
    isInlineEditing,
    columnSizes,
    rowSizes,
    defaultCellWidth,
    defaultCellHeight,
    viewportRect,
    headerColumnWidth,
    headerRowHeight,
    svgWidth,
    svgHeight,
  ]);

  const visibleFillPreviewRect = useMemo(() => {
    if (!fillPreview) {
      return null;
    }

    return calculateVisibleRangeRect(
      fillPreview.range,
      viewportRect,
      columnSizes,
      rowSizes,
      defaultCellWidth,
      defaultCellHeight,
      headerColumnWidth,
      headerRowHeight,
    );
  }, [
    fillPreview,
    viewportRect,
    columnSizes,
    rowSizes,
    defaultCellWidth,
    defaultCellHeight,
    headerColumnWidth,
    headerRowHeight,
  ]);

  const updateFillPreview = useCallback((preview: FillHandlePreview | null) => {
    fillPreviewRef.current = preview;
    setFillPreview(preview);
  }, []);

  const getCellFromPointerEvent = useCallback(
    (event: ReactPointerEvent<Element>): { col: number; row: number } | null => {
      const svgElement = svgRef.current;
      if (!svgElement) {
        return null;
      }

      const bounds = svgElement.getBoundingClientRect();
      const gridX = event.clientX - bounds.left - headerColumnWidth + viewportRect.left;
      const gridY = event.clientY - bounds.top - headerRowHeight + viewportRect.top;

      if (gridX < 0 || gridY < 0) {
        return null;
      }

      const col = findColumnAtPosition(gridX, defaultCellWidth, columnSizes, SAFE_MAX_COLUMNS);
      const row = findRowAtPosition(gridY, defaultCellHeight, rowSizes, SAFE_MAX_ROWS);
      return { col, row };
    },
    [headerColumnWidth, headerRowHeight, viewportRect, defaultCellWidth, defaultCellHeight, columnSizes, rowSizes],
  );

  const handleFillPointerDown = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>) => {
      if (!selectionRange || isInlineEditing) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      fillDragStateRef.current = {
        pointerId: event.pointerId,
        baseRange: selectionRange,
      };
      updateFillPreview(null);
    },
    [selectionRange, isInlineEditing, updateFillPreview],
  );

  const handleFillPointerMove = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>) => {
      const dragState = fillDragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const cell = getCellFromPointerEvent(event);
      if (!cell) {
        updateFillPreview(null);
        return;
      }

      const preview = deriveFillHandlePreview(dragState.baseRange, cell);
      updateFillPreview(preview);
    },
    [getCellFromPointerEvent, updateFillPreview],
  );

  const handleFillPointerUp = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>) => {
      const dragState = fillDragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);
      fillDragStateRef.current = null;

      const preview = fillPreviewRef.current;
      updateFillPreview(null);

      if (!preview) {
        return;
      }

      const updates = effectiveAutoFillHandler({
        baseRange: dragState.baseRange,
        targetRange: preview.range,
        direction: preview.direction,
        sheet,
      });

      if (updates.length > 0) {
        onCellsUpdate?.(Array.from(updates));
      }

      actions.extendSelectionToCell(preview.targetCell.col, preview.targetCell.row);
    },
    [effectiveAutoFillHandler, sheet, actions, onCellsUpdate, updateFillPreview],
  );

  return (
    <svg
      className={styles.highlight}
      ref={svgRef}
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
    >
      {/* Dragging range highlight (during drag) */}
      {isDragging && visibleDraggingRect && (
        <g data-highlight="dragging">
          <rect
            className={styles.rangeFill}
            x={visibleDraggingRect.x}
            y={visibleDraggingRect.y}
            width={visibleDraggingRect.width}
            height={visibleDraggingRect.height}
          />
          <rect
            className={styles.rangeOutline}
            x={visibleDraggingRect.x + 1}
            y={visibleDraggingRect.y + 1}
            width={Math.max(0, visibleDraggingRect.width - 2)}
            height={Math.max(0, visibleDraggingRect.height - 2)}
          />
        </g>
      )}

      {/* Selection highlight (after drag is finished) */}
      {!isDragging && visibleSelectionRect && (
        <g data-highlight="selection">
          <rect
            className={styles.rangeFill}
            x={visibleSelectionRect.x}
            y={visibleSelectionRect.y}
            width={visibleSelectionRect.width}
            height={visibleSelectionRect.height}
          />
          <rect
            className={styles.rangeOutline}
            x={visibleSelectionRect.x + 1}
            y={visibleSelectionRect.y + 1}
            width={Math.max(0, visibleSelectionRect.width - 2)}
            height={Math.max(0, visibleSelectionRect.height - 2)}
          />
        </g>
      )}

      {/* Fill preview highlight */}
      {fillPreview && visibleFillPreviewRect && (
        <g data-highlight="fill-preview">
          <rect
            className={styles.fillPreviewFill}
            x={visibleFillPreviewRect.x}
            y={visibleFillPreviewRect.y}
            width={visibleFillPreviewRect.width}
            height={visibleFillPreviewRect.height}
          />
          <rect
            className={styles.fillPreviewOutline}
            x={visibleFillPreviewRect.x + 1}
            y={visibleFillPreviewRect.y + 1}
            width={Math.max(0, visibleFillPreviewRect.width - 2)}
            height={Math.max(0, visibleFillPreviewRect.height - 2)}
          />
        </g>
      )}

      {/* Anchor cell emphasis */}
      {anchorRect && (
        <rect
          className={styles.anchorRect}
          x={anchorRect.x + 1}
          y={anchorRect.y + 1}
          width={Math.max(0, anchorRect.width - 2)}
          height={Math.max(0, anchorRect.height - 2)}
        />
      )}

      {/* Fill handle */}
      {!isDragging && visibleSelectionRect && selectionRange && !isInlineEditing && (
        <circle
          className={styles.fillHandle}
          cx={visibleSelectionRect.x + visibleSelectionRect.width - 1}
          cy={visibleSelectionRect.y + visibleSelectionRect.height - 1}
          r={4}
          onPointerDown={handleFillPointerDown}
          onPointerMove={handleFillPointerMove}
          onPointerUp={handleFillPointerUp}
        />
      )}
    </svg>
  );
};

// Notes:
// - Reviewed src/components/Sheet.tsx to confirm fill handle interactions align with sheet actions dispatch.
// - Reviewed src/components/Cell.tsx to ensure anchor highlighting complements per-cell data attributes.
// - Reviewed src/modules/spreadsheet/autofill.ts to reuse preview and autofill computation helpers within the highlight overlay.
