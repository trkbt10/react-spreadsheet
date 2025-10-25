/**
 * @file Grid layout utilities for calculating cell positions with variable column/row sizes.
 */

import type { Rect } from "../../utils/rect";

export type ColumnSizeMap = Map<number, number>;
export type RowSizeMap = Map<number, number>;

export type CellPosition = {
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GridRange = {
  startCol: number;
  endCol: number;
  startRow: number;
  endRow: number;
};

/**
 * Calculate the x position for a given column.
 * @param col - Column index
 * @param defaultWidth - Default column width
 * @param columnSizes - Map of custom column widths
 * @returns X position in pixels
 */
export const calculateColumnPosition = (
  col: number,
  defaultWidth: number,
  columnSizes: ColumnSizeMap,
): number => {
  let position = 0;
  for (let i = 0; i < col; i++) {
    const width = columnSizes.get(i);
    if (width === undefined) {
      position += defaultWidth;
    } else {
      position += width;
    }
  }
  return position;
};

/**
 * Calculate the y position for a given row.
 * @param row - Row index
 * @param defaultHeight - Default row height
 * @param rowSizes - Map of custom row heights
 * @returns Y position in pixels
 */
export const calculateRowPosition = (
  row: number,
  defaultHeight: number,
  rowSizes: RowSizeMap,
): number => {
  let position = 0;
  for (let i = 0; i < row; i++) {
    const height = rowSizes.get(i);
    if (height === undefined) {
      position += defaultHeight;
    } else {
      position += height;
    }
  }
  return position;
};

/**
 * Calculate the total content width based on column sizes.
 * @param maxColumns - Maximum number of columns
 * @param defaultWidth - Default column width
 * @param columnSizes - Map of custom column widths
 * @returns Total width in pixels
 */
export const calculateTotalWidth = (
  maxColumns: number,
  defaultWidth: number,
  columnSizes: ColumnSizeMap,
): number => {
  let total = 0;
  for (let i = 0; i < maxColumns; i++) {
    const width = columnSizes.get(i);
    if (width === undefined) {
      total += defaultWidth;
    } else {
      total += width;
    }
  }
  return total;
};

/**
 * Calculate the total content height based on row sizes.
 * @param maxRows - Maximum number of rows
 * @param defaultHeight - Default row height
 * @param rowSizes - Map of custom row heights
 * @returns Total height in pixels
 */
export const calculateTotalHeight = (
  maxRows: number,
  defaultHeight: number,
  rowSizes: RowSizeMap,
): number => {
  let total = 0;
  for (let i = 0; i < maxRows; i++) {
    const height = rowSizes.get(i);
    if (height === undefined) {
      total += defaultHeight;
    } else {
      total += height;
    }
  }
  return total;
};

/**
 * Find the column index at a given x position.
 * @param x - X position in pixels
 * @param defaultWidth - Default column width
 * @param columnSizes - Map of custom column widths
 * @param maxColumns - Maximum number of columns
 * @returns Column index
 */
export const findColumnAtPosition = (
  x: number,
  defaultWidth: number,
  columnSizes: ColumnSizeMap,
  maxColumns: number,
): number => {
  let position = 0;
  for (let col = 0; col < maxColumns; col++) {
    const customWidth = columnSizes.get(col);
    const width = customWidth === undefined ? defaultWidth : customWidth;
    if (position + width > x) {
      return col;
    }
    position += width;
  }
  return maxColumns - 1;
};

/**
 * Find the row index at a given y position.
 * @param y - Y position in pixels
 * @param defaultHeight - Default row height
 * @param rowSizes - Map of custom row heights
 * @param maxRows - Maximum number of rows
 * @returns Row index
 */
export const findRowAtPosition = (
  y: number,
  defaultHeight: number,
  rowSizes: RowSizeMap,
  maxRows: number,
): number => {
  let position = 0;
  for (let row = 0; row < maxRows; row++) {
    const customHeight = rowSizes.get(row);
    const height = customHeight === undefined ? defaultHeight : customHeight;
    if (position + height > y) {
      return row;
    }
    position += height;
  }
  return maxRows - 1;
};

/**
 * Calculate visible grid range based on viewport rect.
 * @param viewportTop - Top of viewport in pixels
 * @param viewportLeft - Left of viewport in pixels
 * @param viewportWidth - Width of viewport in pixels
 * @param viewportHeight - Height of viewport in pixels
 * @param defaultWidth - Default column width
 * @param defaultHeight - Default row height
 * @param columnSizes - Map of custom column widths
 * @param rowSizes - Map of custom row heights
 * @param maxColumns - Maximum number of columns
 * @param maxRows - Maximum number of rows
 * @param overscan - Number of extra cells to render beyond viewport
 * @returns Grid range of visible cells
 */
export const calculateVisibleRange = (
  viewportTop: number,
  viewportLeft: number,
  viewportWidth: number,
  viewportHeight: number,
  defaultWidth: number,
  defaultHeight: number,
  columnSizes: ColumnSizeMap,
  rowSizes: RowSizeMap,
  maxColumns: number,
  maxRows: number,
  overscan: number = 5,
): GridRange => {
  const startCol = Math.max(0, findColumnAtPosition(viewportLeft, defaultWidth, columnSizes, maxColumns) - overscan);
  const endCol = Math.min(
    maxColumns,
    findColumnAtPosition(viewportLeft + viewportWidth, defaultWidth, columnSizes, maxColumns) + overscan + 1,
  );

  const startRow = Math.max(0, findRowAtPosition(viewportTop, defaultHeight, rowSizes, maxRows) - overscan);
  const endRow = Math.min(
    maxRows,
    findRowAtPosition(viewportTop + viewportHeight, defaultHeight, rowSizes, maxRows) + overscan + 1,
  );

  return { startCol, endCol, startRow, endRow };
};

/**
 * Generate cell positions for a given grid range.
 * @param range - Grid range to generate positions for
 * @param defaultWidth - Default column width
 * @param defaultHeight - Default row height
 * @param columnSizes - Map of custom column widths
 * @param rowSizes - Map of custom row heights
 * @returns Array of cell positions
 */
export const generateCellPositions = (
  range: GridRange,
  defaultWidth: number,
  defaultHeight: number,
  columnSizes: ColumnSizeMap,
  rowSizes: RowSizeMap,
): CellPosition[] => {
  const positions: CellPosition[] = [];

  for (let row = range.startRow; row < range.endRow; row++) {
    const y = calculateRowPosition(row, defaultHeight, rowSizes);
    const customHeight = rowSizes.get(row);
    const height = customHeight === undefined ? defaultHeight : customHeight;

    for (let col = range.startCol; col < range.endCol; col++) {
      const x = calculateColumnPosition(col, defaultWidth, columnSizes);
      const customWidth = columnSizes.get(col);
      const width = customWidth === undefined ? defaultWidth : customWidth;

      positions.push({ col, row, x, y, width, height });
    }
  }

  return positions;
};

/**
 * Calculate selection range (col/row indices) from selection rect.
 * @param rect - Selection rectangle
 * @param defaultWidth - Default column width
 * @param defaultHeight - Default row height
 * @param columnSizes - Map of custom column widths
 * @param rowSizes - Map of custom row heights
 * @param maxColumns - Maximum number of columns
 * @param maxRows - Maximum number of rows
 * @returns Grid range of selected cells
 */
export const calculateSelectionRange = (
  rect: Rect,
  defaultWidth: number,
  defaultHeight: number,
  columnSizes: ColumnSizeMap,
  rowSizes: RowSizeMap,
  maxColumns: number,
  maxRows: number,
): GridRange => {
  const startCol = findColumnAtPosition(rect.x, defaultWidth, columnSizes, maxColumns);
  const endCol = findColumnAtPosition(rect.x + rect.width, defaultWidth, columnSizes, maxColumns);
  const startRow = findRowAtPosition(rect.y, defaultHeight, rowSizes, maxRows);
  const endRow = findRowAtPosition(rect.y + rect.height, defaultHeight, rowSizes, maxRows);

  return {
    startCol,
    endCol: endCol + 1,
    startRow,
    endRow: endRow + 1,
  };
};
