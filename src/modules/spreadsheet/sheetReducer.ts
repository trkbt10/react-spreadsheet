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
  calculateSelectionRange,
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

export type EditingCell = {
  col: number;
  row: number;
  value: string;
  range?: SelectionRange | null;
};

export type ActiveCell = {
  col: number;
  row: number;
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
  editingCell: EditingCell | null;
  activeCell: ActiveCell | null;
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
  editingCell: null,
  activeCell: null,
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
    if (!state.selectionRect) {
      return {
        ...state,
        isDragging: false,
      };
    }

    // Calculate selection range from rect
    const range = calculateSelectionRange(
      state.selectionRect,
      state.defaultCellWidth,
      state.defaultCellHeight,
      state.columnSizes,
      state.rowSizes,
      SAFE_MAX_COLUMNS,
      SAFE_MAX_ROWS,
    );

    // Set active cell to the top-left of the range
    const activeCell = range
      ? { col: range.startCol, row: range.startRow }
      : null;

    return {
      ...state,
      isDragging: false,
      selectionRect: null, // Clear rect after selection is done
      selectionRange: range,
      activeCell,
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

    return {
      ...state,
      selectionRect: null,
      selectionRange: {
        startCol: 0,
        endCol: SAFE_MAX_COLUMNS,
        startRow: row,
        endRow: row + 1,
      },
      activeCell: { col: 0, row },
      isDragging: false,
      dragStartPos: null,
    };
  },

  selectColumn: (state, action) => {
    const { col } = action.payload;

    return {
      ...state,
      selectionRect: null,
      selectionRange: {
        startCol: col,
        endCol: col + 1,
        startRow: 0,
        endRow: SAFE_MAX_ROWS,
      },
      activeCell: { col, row: 0 },
      isDragging: false,
      dragStartPos: null,
    };
  },

  selectSheet: (state) => {
    return {
      ...state,
      selectionRect: null,
      selectionRange: {
        startCol: 0,
        endCol: SAFE_MAX_COLUMNS,
        startRow: 0,
        endRow: SAFE_MAX_ROWS,
      },
      activeCell: { col: 0, row: 0 },
      isDragging: false,
      dragStartPos: null,
    };
  },

  startEditingCell: (state, action) => {
    const { col, row, initialValue } = action.payload;
    return {
      ...state,
      editingCell: { col, row, value: initialValue, range: null },
      activeCell: { col, row },
    };
  },

  startEditingRange: (state, action) => {
    const { range, initialValue } = action.payload;
    return {
      ...state,
      editingCell: {
        col: range.startCol,
        row: range.startRow,
        value: initialValue,
        range,
      },
      activeCell: { col: range.startCol, row: range.startRow },
    };
  },

  updateEditingValue: (state, action) => {
    if (!state.editingCell) {
      return state;
    }
    return {
      ...state,
      editingCell: {
        ...state.editingCell,
        value: action.payload.value,
      },
    };
  },

  commitEdit: (state, action) => {
    // TODO: Apply the edit value to the actual cell data
    // For now, we just clear the editing state
    // The actual implementation should update sheet.cells based on:
    // - action.payload.value (or state.editingCell.value if not provided)
    // - action.payload.range (or state.editingCell.range if not provided)
    return {
      ...state,
      editingCell: null,
    };
  },

  cancelEdit: (state) => {
    return {
      ...state,
      editingCell: null,
    };
  },

  setActiveCell: (state, action) => {
    const { col, row } = action.payload;
    return {
      ...state,
      activeCell: { col, row },
    };
  },

  clearActiveCell: (state) => {
    return {
      ...state,
      activeCell: null,
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
