/**
 * @file Reducer for sheet state management with typed actions.
 */

import { createActionHandlerMap } from "../../utils/typedActions";
import type { ActionUnion } from "../../utils/typedActions";
import { sheetActions } from "./sheetActions";
import type { ColumnSizeMap, RowSizeMap } from "./gridLayout";
import {
  SAFE_MAX_COLUMNS,
  SAFE_MAX_ROWS,
  calculateColumnPosition,
  calculateRowPosition,
  calculateTotalWidth,
  calculateTotalHeight,
} from "./gridLayout";
import type { Rect, Point } from "../../utils/rect";
import { createRectFromPoints } from "../../utils/rect";
import type { StyleRegistry } from "./styleResolver";
import { createStyleRegistry, addStyleRule, removeStyleRule, clearStyleRegistry } from "./styleResolver";
import { getStyleKey } from "./cellStyle";

export type SelectionRange = {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
};

export type SheetState = {
  columnSizes: ColumnSizeMap;
  rowSizes: RowSizeMap;
  defaultCellWidth: number;
  defaultCellHeight: number;
  selectionRect: Rect | null;
  selectionRange: SelectionRange | null;
  isDragging: boolean;
  dragStartPos: Point | null;
  styleRegistry: StyleRegistry;
};

export type SheetAction = ActionUnion<typeof sheetActions>;

export const initialSheetState: SheetState = {
  columnSizes: new Map(),
  rowSizes: new Map(),
  defaultCellWidth: 100,
  defaultCellHeight: 24,
  selectionRect: null,
  selectionRange: null,
  isDragging: false,
  dragStartPos: null,
  styleRegistry: createStyleRegistry(),
};

const actionHandlers = createActionHandlerMap<SheetState, typeof sheetActions>(sheetActions, {
  setColumnWidth: (state, action) => {
    const newColumnSizes = new Map(state.columnSizes);
    newColumnSizes.set(action.payload.col, action.payload.width);
    return {
      ...state,
      columnSizes: newColumnSizes,
    };
  },

  setRowHeight: (state, action) => {
    const newRowSizes = new Map(state.rowSizes);
    newRowSizes.set(action.payload.row, action.payload.height);
    return {
      ...state,
      rowSizes: newRowSizes,
    };
  },

  startRectSelection: (state, action) => {
    const { x, y } = action.payload;
    const startPoint: Point = { x, y };
    return {
      ...state,
      isDragging: true,
      dragStartPos: startPoint,
      selectionRect: {
        x,
        y,
        width: 0,
        height: 0,
      },
      selectionRange: null,
    };
  },

  updateRectSelection: (state, action) => {
    if (!state.isDragging || !state.dragStartPos) {
      return state;
    }

    const { x, y } = action.payload;
    const currentPoint: Point = { x, y };
    const newRect = createRectFromPoints(state.dragStartPos, currentPoint);

    return {
      ...state,
      selectionRect: newRect,
    };
  },

  endRectSelection: (state) => {
    return {
      ...state,
      isDragging: false,
    };
  },

  clearSelection: (state) => {
    return {
      ...state,
      selectionRect: null,
      selectionRange: null,
      isDragging: false,
      dragStartPos: null,
    };
  },

  applyStyle: (state, action) => {
    const { target, style } = action.payload;
    const timestamp = Date.now();
    const rule = { target, style, timestamp };
    return {
      ...state,
      styleRegistry: addStyleRule(state.styleRegistry, rule),
    };
  },

  removeStyle: (state, action) => {
    const { key } = action.payload;
    return {
      ...state,
      styleRegistry: removeStyleRule(state.styleRegistry, key),
    };
  },

  clearAllStyles: (state) => {
    return {
      ...state,
      styleRegistry: clearStyleRegistry(state.styleRegistry),
    };
  },

  selectRow: (state, action) => {
    const { row } = action.payload;
    const x = 0;
    const y = calculateRowPosition(row, state.defaultCellHeight, state.rowSizes);
    const width = calculateTotalWidth(SAFE_MAX_COLUMNS, state.defaultCellWidth, state.columnSizes);
    const customHeight = state.rowSizes.get(row);
    const height = customHeight === undefined ? state.defaultCellHeight : customHeight;

    return {
      ...state,
      selectionRect: { x, y, width, height },
      selectionRange: {
        startCol: 0,
        endCol: SAFE_MAX_COLUMNS,
        startRow: row,
        endRow: row + 1,
      },
      isDragging: false,
      dragStartPos: null,
    };
  },

  selectColumn: (state, action) => {
    const { col } = action.payload;
    const x = calculateColumnPosition(col, state.defaultCellWidth, state.columnSizes);
    const y = 0;
    const customWidth = state.columnSizes.get(col);
    const width = customWidth === undefined ? state.defaultCellWidth : customWidth;
    const height = calculateTotalHeight(SAFE_MAX_ROWS, state.defaultCellHeight, state.rowSizes);

    return {
      ...state,
      selectionRect: { x, y, width, height },
      selectionRange: {
        startCol: col,
        endCol: col + 1,
        startRow: 0,
        endRow: SAFE_MAX_ROWS,
      },
      isDragging: false,
      dragStartPos: null,
    };
  },

  selectSheet: (state) => {
    const width = calculateTotalWidth(SAFE_MAX_COLUMNS, state.defaultCellWidth, state.columnSizes);
    const height = calculateTotalHeight(SAFE_MAX_ROWS, state.defaultCellHeight, state.rowSizes);

    return {
      ...state,
      selectionRect: { x: 0, y: 0, width, height },
      selectionRange: {
        startCol: 0,
        endCol: SAFE_MAX_COLUMNS,
        startRow: 0,
        endRow: SAFE_MAX_ROWS,
      },
      isDragging: false,
      dragStartPos: null,
    };
  },
});

/**
 * Reducer for sheet state.
 * @param state - Current state
 * @param action - Action to apply
 * @returns New state
 */
export const sheetReducer = (state: SheetState, action: SheetAction): SheetState => {
  const handler = actionHandlers[action.type];
  if (!handler) {
    return state;
  }
  return handler(state, action, undefined);
};
