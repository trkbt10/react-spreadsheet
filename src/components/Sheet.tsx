/**
 * @file Sheet component for rendering spreadsheet cells.
 */

import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { Sheet as SheetType } from "../types";
import { VirtualScroll } from "./scrollarea/VirtualScroll";
import { useVirtualScrollContext } from "./scrollarea/VirtualScrollContext";
import { useSheetContext } from "../modules/spreadsheet/SheetContext";
import { useSheetPointerEvents } from "../modules/spreadsheet/useSheetPointerEvents";
import {
  calculateVisibleRange,
  calculateTotalWidth,
  calculateTotalHeight,
  calculateSelectionRange,
  calculateColumnPosition,
  calculateRowPosition,
} from "../modules/spreadsheet/gridLayout";
import { useColumnResize } from "../modules/spreadsheet/useColumnResize";
import { useRowResize } from "../modules/spreadsheet/useRowResize";
import { ColumnHeader } from "./headers/ColumnHeader";
import { RowHeader } from "./headers/RowHeader";
import styles from "./Sheet.module.css";
import { GridLines } from "./GridLines";

export type SheetProps = {
  sheet?: SheetType;
  style?: CSSProperties;
  maxColumns?: number;
  maxRows?: number;
};

const HEADER_ROW_HEIGHT = 24;
const HEADER_COLUMN_WIDTH = 48;

/**
 * Renders cells in the visible viewport range.
 * @returns CellRenderer component
 */
const CellRenderer = (): ReactElement => {
  const { viewportRect } = useVirtualScrollContext();
  const { sheet, state } = useSheetContext();
  const { columnSizes, rowSizes, defaultCellWidth, defaultCellHeight } = state;

  const visibleRange = useMemo(
    () =>
      calculateVisibleRange(
        viewportRect.top,
        viewportRect.left,
        viewportRect.width,
        viewportRect.height,
        defaultCellWidth,
        defaultCellHeight,
        columnSizes,
        rowSizes,
        16384,
        1048576,
        5,
      ),
    [viewportRect, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight],
  );

  const visibleCells = useMemo(() => {
    return Object.entries(sheet.cells)
      .filter(([, cell]) => {
        return cell !== undefined;
      })
      .filter(([cellId]) => {
        const [colStr, rowStr] = cellId.split(":");
        const col = Number(colStr);
        const row = Number(rowStr);
        return (
          col >= visibleRange.startCol &&
          col < visibleRange.endCol &&
          row >= visibleRange.startRow &&
          row < visibleRange.endRow
        );
      });
  }, [sheet.cells, visibleRange]);

  return (
    <>
      {visibleCells.map(([cellId, cell]) => {
        if (cell === undefined) {
          return null;
        }

        const [colStr, rowStr] = cellId.split(":");
        const col = Number(colStr);
        const row = Number(rowStr);

        const x = calculateColumnPosition(col, defaultCellWidth, columnSizes);
        const y = calculateRowPosition(row, defaultCellHeight, rowSizes);

        const customWidth = columnSizes.get(col);
        const width = customWidth === undefined ? defaultCellWidth : customWidth;
        const customHeight = rowSizes.get(row);
        const height = customHeight === undefined ? defaultCellHeight : customHeight;

        return (
          <div
            key={cellId}
            className={styles.cell}
            data-cell-id={cellId}
            data-col={col}
            data-row={row}
            style={{
              left: x - viewportRect.left + HEADER_COLUMN_WIDTH,
              top: y - viewportRect.top + HEADER_ROW_HEIGHT,
              width,
              height,
              lineHeight: `${height - 4}px`,
            }}
          >
            {String(cell.value)}
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
  const { selectionRect, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight } = state;

  if (!selectionRect || selectionRect.width === 0 || selectionRect.height === 0) {
    return null;
  }

  const selectionRange = useMemo(
    () =>
      calculateSelectionRange(
        selectionRect,
        defaultCellWidth,
        defaultCellHeight,
        columnSizes,
        rowSizes,
        16384,
        1048576,
      ),
    [selectionRect, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight],
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
  const { columnSizes, rowSizes, defaultCellWidth, defaultCellHeight } = state;

  const contentWidth = useMemo(
    () => calculateTotalWidth(maxColumns, defaultCellWidth, columnSizes),
    [maxColumns, columnSizes, defaultCellWidth],
  );

  const contentHeight = useMemo(
    () => calculateTotalHeight(maxRows, defaultCellHeight, rowSizes),
    [maxRows, rowSizes, defaultCellHeight],
  );

  return (
    <div className={styles.sheetContainer} style={style}>
      <VirtualScroll contentWidth={contentWidth} contentHeight={contentHeight}>
        <SheetWithHeaders actions={actions} maxColumns={maxColumns} maxRows={maxRows} />
      </VirtualScroll>
    </div>
  );
};

type SheetWithHeadersProps = {
  actions: ReturnType<typeof useSheetContext>["actions"];
  maxColumns: number;
  maxRows: number;
};

const SheetWithHeaders = ({ actions, maxColumns, maxRows }: SheetWithHeadersProps): ReactElement => {
  const { viewportRect } = useVirtualScrollContext();
  const { state } = useSheetContext();
  const { columnSizes, rowSizes, defaultCellWidth, defaultCellHeight } = state;

  const { handleColumnResizeStart } = useColumnResize({
    actions,
    defaultCellWidth,
    columnSizes,
  });

  const { handleRowResizeStart } = useRowResize({
    actions,
    defaultCellHeight,
    rowSizes,
  });

  const visibleRange = useMemo(
    () =>
      calculateVisibleRange(
        viewportRect.top,
        viewportRect.left,
        viewportRect.width,
        viewportRect.height,
        defaultCellWidth,
        defaultCellHeight,
        columnSizes,
        rowSizes,
        maxColumns,
        maxRows,
        5,
      ),
    [viewportRect, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight, maxColumns, maxRows],
  );

  return (
    <div className={styles.sheetWithHeaders}>
      {/* Column header - fixed at top */}
      <div className={styles.columnHeaderFixed}>
        <ColumnHeader
          viewportLeft={viewportRect.left}
          viewportWidth={viewportRect.width}
          defaultCellWidth={defaultCellWidth}
          columnSizes={columnSizes}
          visibleStartCol={visibleRange.startCol}
          visibleEndCol={visibleRange.endCol}
          onResizeStart={handleColumnResizeStart}
        />
      </div>

      {/* Row header - fixed at left */}
      <div className={styles.rowHeaderFixed}>
        <RowHeader
          viewportTop={viewportRect.top}
          viewportHeight={viewportRect.height}
          defaultCellHeight={defaultCellHeight}
          rowSizes={rowSizes}
          visibleStartRow={visibleRange.startRow}
          visibleEndRow={visibleRange.endRow}
          onResizeStart={handleRowResizeStart}
        />
      </div>

      {/* Header corner - fixed at top-left */}
      <div className={styles.headerCornerFixed} />

      {/* Main grid content */}
      <SheetContent actions={actions} maxColumns={maxColumns} maxRows={maxRows} />
    </div>
  );
};

type SheetContentProps = {
  actions: ReturnType<typeof useSheetContext>["actions"];
  maxColumns: number;
  maxRows: number;
};

const SheetContent = ({ actions, maxColumns, maxRows }: SheetContentProps): ReactElement => {
  const { scrollLeft, scrollTop, viewportRect } = useVirtualScrollContext();
  const { state } = useSheetContext();
  const { columnSizes, rowSizes, defaultCellWidth, defaultCellHeight } = state;

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
        defaultCellWidth={defaultCellWidth}
        defaultCellHeight={defaultCellHeight}
        columnSizes={columnSizes}
        rowSizes={rowSizes}
        maxColumns={maxColumns}
        maxRows={maxRows}
      />
      <CellRenderer />
      <SelectionHighlight />
    </div>
  );
};
