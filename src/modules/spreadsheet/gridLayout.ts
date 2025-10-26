/**
 * @file Grid layout utilities for calculating cell positions with variable column/row sizes.
 */

import type { Rect } from "../../utils/rect";
import type { AdaptiveAdjustmentCache } from "./adaptiveAdjustments";
import {
  calculatePositionWithCache,
  getAdaptiveCache,
  sumAdjustmentsBeforeIndex,
  toSafeNumber,
} from "./adaptiveAdjustments";

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

export const SAFE_MAX_COLUMNS = Number.MAX_SAFE_INTEGER;
export const SAFE_MAX_ROWS = Number.MAX_SAFE_INTEGER;

const columnAdjustmentCache = new WeakMap<ColumnSizeMap, AdaptiveAdjustmentCache>();
const rowAdjustmentCache = new WeakMap<RowSizeMap, AdaptiveAdjustmentCache>();

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

const absBigInt = (value: bigint): bigint => {
  return value < 0n ? -value : value;
};

const ensurePositiveInteger = (value: number, label: string): bigint => {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer value.`);
  }
  return BigInt(value);
};

const ensureNonNegativeInteger = (value: number, label: string): bigint => {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer value.`);
  }
  return BigInt(value);
};

const getMaxRepresentableCount = (defaultSize: bigint): number => {
  const sizeAbs = absBigInt(defaultSize);
  if (sizeAbs === 0n) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Number(MAX_SAFE_BIGINT / sizeAbs);
};

const getEffectiveMaxCount = (requested: number, defaultSize: bigint): number => {
  const representable = getMaxRepresentableCount(defaultSize);
  if (requested > representable) {
    return representable;
  }
  return requested;
};

const clampIndex = (value: number, maxExclusive: number): number => {
  if (maxExclusive <= 0) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value >= maxExclusive) {
    return maxExclusive - 1;
  }
  return value;
};

/**
 * Calculate the x position for a given column.
 * @param col - Column index
 * @param defaultWidth - Default column width
 * @param columnSizes - Map of custom column widths
 * @returns X position in pixels
 */
export const calculateColumnPosition = (col: number, defaultWidth: number, columnSizes: ColumnSizeMap): number => {
  const defaultWidthBigInt = ensurePositiveInteger(defaultWidth, "default column width");
  if (col > getMaxRepresentableCount(defaultWidthBigInt)) {
    throw new Error("Column index exceeds representable layout range.");
  }
  const cache = getAdaptiveCache(columnAdjustmentCache, columnSizes, defaultWidth, defaultWidthBigInt);
  return calculatePositionWithCache(col, defaultWidth, cache);
};

/**
 * Calculate the y position for a given row.
 * @param row - Row index
 * @param defaultHeight - Default row height
 * @param rowSizes - Map of custom row heights
 * @returns Y position in pixels
 */
export const calculateRowPosition = (row: number, defaultHeight: number, rowSizes: RowSizeMap): number => {
  const defaultHeightBigInt = ensurePositiveInteger(defaultHeight, "default row height");
  if (row > getMaxRepresentableCount(defaultHeightBigInt)) {
    throw new Error("Row index exceeds representable layout range.");
  }
  const cache = getAdaptiveCache(rowAdjustmentCache, rowSizes, defaultHeight, defaultHeightBigInt);
  return calculatePositionWithCache(row, defaultHeight, cache);
};

/**
 * Calculate the total content width based on column sizes.
 * @param maxColumns - Maximum number of columns
 * @param defaultWidth - Default column width
 * @param columnSizes - Map of custom column widths
 * @returns Total width in pixels
 */
export const calculateTotalWidth = (maxColumns: number, defaultWidth: number, columnSizes: ColumnSizeMap): number => {
  if (maxColumns <= 0) {
    return 0;
  }
  const defaultWidthBigInt = ensurePositiveInteger(defaultWidth, "default column width");
  const cache = getAdaptiveCache(columnAdjustmentCache, columnSizes, defaultWidth, defaultWidthBigInt);
  const effectiveMaxColumns = getEffectiveMaxCount(maxColumns, cache.defaultSizeBigInt);
  const maxColumnsBigInt = ensureNonNegativeInteger(effectiveMaxColumns, "maxColumns");
  const baseline = maxColumnsBigInt * cache.defaultSizeBigInt;
  const adjustment = sumAdjustmentsBeforeIndex(cache, effectiveMaxColumns);
  return toSafeNumber(baseline + adjustment, "total width");
};

/**
 * Calculate the total content height based on row sizes.
 * @param maxRows - Maximum number of rows
 * @param defaultHeight - Default row height
 * @param rowSizes - Map of custom row heights
 * @returns Total height in pixels
 */
export const calculateTotalHeight = (maxRows: number, defaultHeight: number, rowSizes: RowSizeMap): number => {
  if (maxRows <= 0) {
    return 0;
  }
  const defaultHeightBigInt = ensurePositiveInteger(defaultHeight, "default row height");
  const cache = getAdaptiveCache(rowAdjustmentCache, rowSizes, defaultHeight, defaultHeightBigInt);
  const effectiveMaxRows = getEffectiveMaxCount(maxRows, cache.defaultSizeBigInt);
  const maxRowsBigInt = ensureNonNegativeInteger(effectiveMaxRows, "maxRows");
  const baseline = maxRowsBigInt * cache.defaultSizeBigInt;
  const adjustment = sumAdjustmentsBeforeIndex(cache, effectiveMaxRows);
  return toSafeNumber(baseline + adjustment, "total height");
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
  if (maxColumns <= 0) {
    return 0;
  }

  const defaultWidthBigInt = ensurePositiveInteger(defaultWidth, "default column width");
  const cache = getAdaptiveCache(columnAdjustmentCache, columnSizes, defaultWidth, defaultWidthBigInt);
  const effectiveMaxColumns = getEffectiveMaxCount(maxColumns, cache.defaultSizeBigInt);

  let low = 0;
  let high = effectiveMaxColumns - 1;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const position = calculatePositionWithCache(mid, defaultWidth, cache);
    const width = columnSizes.get(mid) ?? defaultWidth;

    if (x < position) {
      high = mid - 1;
      continue;
    }

    if (x >= position + width) {
      low = mid + 1;
      continue;
    }

    return mid;
  }

  return clampIndex(low, effectiveMaxColumns);
};

/**
 * Find the row index at a given y position.
 * @param y - Y position in pixels
 * @param defaultHeight - Default row height
 * @param rowSizes - Map of custom row heights
 * @param maxRows - Maximum number of rows
 * @returns Row index
 */
export const findRowAtPosition = (y: number, defaultHeight: number, rowSizes: RowSizeMap, maxRows: number): number => {
  if (maxRows <= 0) {
    return 0;
  }

  const defaultHeightBigInt = ensurePositiveInteger(defaultHeight, "default row height");
  const cache = getAdaptiveCache(rowAdjustmentCache, rowSizes, defaultHeight, defaultHeightBigInt);
  const effectiveMaxRows = getEffectiveMaxCount(maxRows, cache.defaultSizeBigInt);

  let low = 0;
  let high = effectiveMaxRows - 1;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const position = calculatePositionWithCache(mid, defaultHeight, cache);
    const height = rowSizes.get(mid) ?? defaultHeight;

    if (y < position) {
      high = mid - 1;
      continue;
    }

    if (y >= position + height) {
      low = mid + 1;
      continue;
    }

    return mid;
  }

  return clampIndex(low, effectiveMaxRows);
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
  maxColumns: number = SAFE_MAX_COLUMNS,
  maxRows: number = SAFE_MAX_ROWS,
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
  maxColumns: number = SAFE_MAX_COLUMNS,
  maxRows: number = SAFE_MAX_ROWS,
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

/**
 * Notes:
 * - Reviewed src/components/Sheet.tsx to validate how position helpers feed virtual scrolling before introducing adaptive windows.
 */
