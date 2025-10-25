/**
 * @file Sheet component for rendering spreadsheet cells.
 */

import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { Sheet as SheetType, CellId } from "../types";
import { VirtualScroll } from "./scrollarea/VirtualScroll";
import { useVirtualScrollContext } from "./scrollarea/VirtualScrollContext";
import { useSheetContext } from "../modules/spreadsheet/SheetContext";
import { useSheetPointerEvents } from "../modules/spreadsheet/useSheetPointerEvents";
import {
  calculateVisibleRange,
  generateCellPositions,
  calculateTotalWidth,
  calculateTotalHeight,
  calculateSelectionRange,
} from "../modules/spreadsheet/gridLayout";
import { GridLines } from "./GridLines";
import styles from "./Sheet.module.css";

export type SheetProps = {
  sheet?: SheetType;
  style?: CSSProperties;
  maxColumns?: number;
  maxRows?: number;
};

const DEFAULT_CELL_WIDTH = 100;
const DEFAULT_CELL_HEIGHT = 24;

/**
 * Renders cells in the visible viewport range.
 * @returns CellRenderer component
 */
const CellRenderer = (): ReactElement => {
  const { viewportRect } = useVirtualScrollContext();
  const { sheet, state } = useSheetContext();
  const { columnSizes, rowSizes } = state;

  const visibleRange = useMemo(
    () =>
      calculateVisibleRange(
        viewportRect.top,
        viewportRect.left,
        viewportRect.width,
        viewportRect.height,
        DEFAULT_CELL_WIDTH,
        DEFAULT_CELL_HEIGHT,
        columnSizes,
        rowSizes,
        16384,
        1048576,
        5,
      ),
    [viewportRect, columnSizes, rowSizes],
  );

  const cellPositions = useMemo(
    () => generateCellPositions(visibleRange, DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT, columnSizes, rowSizes),
    [visibleRange, columnSizes, rowSizes],
  );

  return (
    <>
      {cellPositions.map((pos) => {
        const cellId: CellId = `${pos.col}:${pos.row}`;
        const cell = sheet.cells[cellId];

        return (
          <div
            key={cellId}
            className={styles.cell}
            data-cell-id={cellId}
            data-col={pos.col}
            data-row={pos.row}
            style={{
              left: pos.x - viewportRect.left,
              top: pos.y - viewportRect.top,
              width: pos.width,
              height: pos.height,
              lineHeight: `${pos.height - 4}px`,
            }}
          >
            {cell ? String(cell.value) : ""}
          </div>
        );
      })}
    </>
  );
};

/**
 * Renders selection highlight overlay.
 * @returns SelectionHighlight component
 */
const SelectionHighlight = (): ReactElement | null => {
  const { viewportRect } = useVirtualScrollContext();
  const { state } = useSheetContext();
  const { selectionRect, columnSizes, rowSizes } = state;

  if (!selectionRect || selectionRect.width === 0 || selectionRect.height === 0) {
    return null;
  }

  const selectionRange = useMemo(
    () =>
      calculateSelectionRange(
        selectionRect,
        DEFAULT_CELL_WIDTH,
        DEFAULT_CELL_HEIGHT,
        columnSizes,
        rowSizes,
        16384,
        1048576,
      ),
    [selectionRect, columnSizes, rowSizes],
  );

  return (
    <>
      {/* Selection rect overlay */}
      <div
        className={styles.selectionOverlay}
        style={{
          left: selectionRect.x - viewportRect.left,
          top: selectionRect.y - viewportRect.top,
          width: selectionRect.width,
          height: selectionRect.height,
        }}
      />
      {/* Selection range info */}
      <div
        className={styles.selectionInfo}
        style={{
          left: selectionRect.x - viewportRect.left + 5,
          top: selectionRect.y - viewportRect.top + 5,
        }}
      >
        Col: {selectionRange.startCol}-{selectionRange.endCol - 1} | Row: {selectionRange.startRow}-
        {selectionRange.endRow - 1}
      </div>
    </>
  );
};

/**
 * Renders a spreadsheet sheet with virtual scrolling for performance.
 * @param props - Component props
 * @returns Sheet component
 */
export const Sheet = ({ style, maxColumns = 16384, maxRows = 1048576 }: SheetProps): ReactElement => {
  const { state, actions } = useSheetContext();
  const { columnSizes, rowSizes } = state;

  const contentWidth = useMemo(
    () => calculateTotalWidth(maxColumns, DEFAULT_CELL_WIDTH, columnSizes),
    [maxColumns, columnSizes],
  );

  const contentHeight = useMemo(
    () => calculateTotalHeight(maxRows, DEFAULT_CELL_HEIGHT, rowSizes),
    [maxRows, rowSizes],
  );

  return (
    <div className={styles.sheetContainer} style={style}>
      <VirtualScroll contentWidth={contentWidth} contentHeight={contentHeight}>
        <SheetContent actions={actions} />
      </VirtualScroll>
    </div>
  );
};

type SheetContentProps = {
  actions: ReturnType<typeof useSheetContext>["actions"];
};

const SheetContent = ({ actions }: SheetContentProps): ReactElement => {
  const { scrollLeft, scrollTop, viewportRect } = useVirtualScrollContext();
  const { state } = useSheetContext();
  const { columnSizes, rowSizes } = state;

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useSheetPointerEvents({
    actions,
    scrollLeft,
    scrollTop,
  });

  return (
    <div
      className={styles.gridContent}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: "none" }}
    >
      <GridLines
        viewportTop={viewportRect.top}
        viewportLeft={viewportRect.left}
        viewportWidth={viewportRect.width}
        viewportHeight={viewportRect.height}
        defaultCellWidth={DEFAULT_CELL_WIDTH}
        defaultCellHeight={DEFAULT_CELL_HEIGHT}
        columnSizes={columnSizes}
        rowSizes={rowSizes}
        maxColumns={16384}
        maxRows={1048576}
      />
      <CellRenderer />
      <SelectionHighlight />
    </div>
  );
};
