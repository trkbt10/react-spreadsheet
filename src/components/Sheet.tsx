/**
 * @file Sheet component for rendering spreadsheet cells.
 */

import { useMemo, useCallback } from "react";
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
  calculateColumnPosition,
  calculateRowPosition,
  SAFE_MAX_COLUMNS,
  SAFE_MAX_ROWS,
} from "../modules/spreadsheet/gridLayout";
import { useColumnResize } from "../modules/spreadsheet/useColumnResize";
import { useRowResize } from "../modules/spreadsheet/useRowResize";
import { ColumnHeader } from "./headers/ColumnHeader";
import { RowHeader } from "./headers/RowHeader";
import { HeaderCorner } from "./headers/HeaderCorner";
import { Cell } from "./Cell";
import { SelectionHighlight } from "./sheets/SelectionHighlight";
import { CellEditor } from "./sheets/CellEditor";
import styles from "./Sheet.module.css";
import { GridLines } from "./GridLines";
import { resolveStyle } from "../modules/spreadsheet/styleResolver";
import { VisualElementLayer } from "./sheets/VisualElementLayer";

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
  const { columnSizes, rowSizes, defaultCellWidth, defaultCellHeight, styleRegistry } = state;

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
        SAFE_MAX_COLUMNS,
        SAFE_MAX_ROWS,
        5,
      ),
    [viewportRect, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight],
  );

  // Generate all visible cells (including empty ones)
  const allVisibleCells = useMemo(() => {
    const cells: Array<{ col: number; row: number; cellId: string }> = [];
    for (let row = visibleRange.startRow; row < visibleRange.endRow; row++) {
      for (let col = visibleRange.startCol; col < visibleRange.endCol; col++) {
        const cellId = `${col}:${row}`;
        cells.push({ col, row, cellId });
      }
    }
    return cells;
  }, [visibleRange]);

  return (
    <>
      {allVisibleCells.map(({ col, row, cellId }) => {
        const cell = sheet.cells[cellId as `${number}:${number}`];
        const x = calculateColumnPosition(col, defaultCellWidth, columnSizes);
        const y = calculateRowPosition(row, defaultCellHeight, rowSizes);

        const customWidth = columnSizes.get(col);
        const width = customWidth === undefined ? defaultCellWidth : customWidth;
        const customHeight = rowSizes.get(row);
        const height = customHeight === undefined ? defaultCellHeight : customHeight;

        // Skip rendering if no data and no style
        const cellStyle = resolveStyle(styleRegistry, col, row);
        if (!cell && Object.keys(cellStyle).length === 0) {
          return null;
        }

        return (
          <Cell
            key={cellId}
            cell={cell}
            col={col}
            row={row}
            style={{
              position: "absolute",
              left: x - viewportRect.left + HEADER_COLUMN_WIDTH,
              top: y - viewportRect.top + HEADER_ROW_HEIGHT,
              width,
              height,
              lineHeight: `${height - 4}px`,
            }}
          />
        );
      })}
    </>
  );
};

/**
 * Renders a spreadsheet sheet with virtual scrolling for performance.
 * @param props - Component props
 * @returns Sheet component
 */
export const Sheet = ({ style, maxColumns = SAFE_MAX_COLUMNS, maxRows = SAFE_MAX_ROWS }: SheetProps): ReactElement => {
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

  const handleColumnClick = useCallback(
    (col: number) => {
      actions.selectColumn(col);
    },
    [actions],
  );

  const handleRowClick = useCallback(
    (row: number) => {
      actions.selectRow(row);
    },
    [actions],
  );

  const handleCornerClick = useCallback(() => {
    actions.selectSheet();
  }, [actions]);

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
          onColumnClick={handleColumnClick}
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
          onRowClick={handleRowClick}
        />
      </div>

      {/* Header corner - fixed at top-left */}
      <div className={styles.headerCornerFixed}>
        <HeaderCorner onClick={handleCornerClick} />
      </div>

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
  const { sheet, state } = useSheetContext();
  const {
    columnSizes,
    rowSizes,
    defaultCellWidth,
    defaultCellHeight,
    selection,
    selectionAnchor,
    editingSelection,
    editorActivity,
  } = state;

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useSheetPointerEvents({
    actions,
    scrollLeft,
    scrollTop,
    headerColumnWidth: HEADER_COLUMN_WIDTH,
    headerRowHeight: HEADER_ROW_HEIGHT,
    defaultCellWidth,
    defaultCellHeight,
    columnSizes,
    rowSizes,
    maxColumns,
    maxRows,
    sheet,
    selection,
    selectionAnchor,
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
      <SelectionHighlight headerColumnWidth={HEADER_COLUMN_WIDTH} headerRowHeight={HEADER_ROW_HEIGHT} />
      <VisualElementLayer sheet={sheet} viewport={viewportRect} />
      {editorActivity.cellEditor && editingSelection ? <CellEditor /> : null}
    </div>
  );
};
