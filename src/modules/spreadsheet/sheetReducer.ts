/**
 * @file Reducer for sheet state management with typed actions.
 */

import { createActionHandlerMap } from "../../utils/typedActions";
import type { ActionUnion } from "../../utils/typedActions";
import { sheetActions } from "./sheetActions";
import type { ColumnSizeMap, RowSizeMap } from "./gridLayout";
import type { Rect, Point } from "../../utils/rect";
import { createRectFromPoints } from "../../utils/rect";

export type SelectionRange = {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
};

export type SheetState = {
  columnSizes: ColumnSizeMap;
  rowSizes: RowSizeMap;
  selectionRect: Rect | null;
  selectionRange: SelectionRange | null;
  isDragging: boolean;
  dragStartPos: Point | null;
};

export type SheetAction = ActionUnion<typeof sheetActions>;

export const initialSheetState: SheetState = {
  columnSizes: new Map(),
  rowSizes: new Map(),
  selectionRect: null,
  selectionRange: null,
  isDragging: false,
  dragStartPos: null,
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
