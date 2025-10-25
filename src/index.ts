/**
 * @file Main entry point exporting the preview application and shared types.
 */

export { App } from "./App";
export type { SpreadSheet, Sheet, Cell, CellId, X, Y } from "./types";
export { VirtualScroll } from "./components/scrollarea/VirtualScroll";
export { useVirtualScrollContext } from "./components/scrollarea/VirtualScrollContext";
export { useVirtualScroll } from "./hooks/useVirtualScroll";
export type {
  UseVirtualScrollOptions,
  UseVirtualScrollReturn,
  ViewportWindow,
  ViewportRect,
} from "./hooks/useVirtualScroll";
export type { VirtualScrollProps } from "./components/scrollarea/VirtualScroll";
export type { VirtualScrollContextValue } from "./components/scrollarea/VirtualScrollContext";
export { SheetProvider, useSheetContext } from "./modules/spreadsheet/SheetContext";
export type { SheetContextValue, SheetProviderProps } from "./modules/spreadsheet/SheetContext";
export { SpreadSheetProvider, useSpreadSheetContext } from "./modules/spreadsheet/SpreadSheetContext";
export type { SpreadSheetContextValue, SpreadSheetProviderProps } from "./modules/spreadsheet/SpreadSheetContext";
export { sheetActions } from "./modules/spreadsheet/sheetActions";
export type {
  SheetState,
  SheetAction,
  SelectionRange,
  SelectionTarget,
  CellSelectionTarget,
  RangeSelectionTarget,
  EditingSelection,
} from "./modules/spreadsheet/sheetReducer";
export { rangeToSelectionTarget, selectionToRange } from "./modules/spreadsheet/sheetReducer";
export {
  createUpdatesFromRange,
  createUpdatesFromSelection,
  getSelectionAnchor,
} from "./modules/spreadsheet/selectionUtils";
export { useSheetPointerEvents } from "./modules/spreadsheet/useSheetPointerEvents";
export type { UseSheetPointerEventsParams, UseSheetPointerEventsReturn } from "./modules/spreadsheet/useSheetPointerEvents";
export type { CellPosition, GridRange, ColumnSizeMap, RowSizeMap } from "./modules/spreadsheet/gridLayout";
export {
  calculateColumnPosition,
  calculateRowPosition,
  calculateTotalWidth,
  calculateTotalHeight,
  findColumnAtPosition,
  findRowAtPosition,
  calculateVisibleRange,
  generateCellPositions,
  calculateSelectionRange,
} from "./modules/spreadsheet/gridLayout";
export type { Rect, Point, Size } from "./utils/rect";
export {
  createRectFromPoints,
  rectEquals,
  isRectEmpty,
  containsPoint,
  rectsIntersect,
  getIntersection,
  getUnion,
  expandRect,
  clampRect,
  getRectBounds,
  useRectState,
} from "./utils/rect";
export type { RectStateActions, UseRectStateReturn } from "./utils/rect";
