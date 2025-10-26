/**
 * @file Reducer for sheet state management with typed actions.
 */

import { createActionHandlerMap } from "../../utils/typedActions";
import type { ActionUnion } from "../../utils/typedActions";
import { sheetActions } from "./sheetActions";
import type { ColumnSizeMap, RowSizeMap } from "./gridLayout";
import { SAFE_MAX_COLUMNS, SAFE_MAX_ROWS, calculateSelectionRange } from "./gridLayout";
import type { Rect, Point } from "../../utils/rect";
import { createRectFromPoints } from "../../utils/rect";
import type { StyleRegistry } from "./styleResolver";
import { createStyleRegistry, addStyleRule, removeStyleRule, clearStyleRegistry } from "./styleResolver";
import { getStyleKey } from "./cellStyle";
import {
  createCellSelection,
  createRangeSelection,
  extendSelection,
  clearSelection as clearSelectionState,
  createRangeSelectionWithoutAnchor,
} from "./selectionState";

export type SelectionRange = {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
};

export type CellSelectionTarget = {
  kind: "cell";
  col: number;
  row: number;
};

export type RangeSelectionTarget = SelectionRange & {
  kind: "range";
};

export type SelectionTarget = CellSelectionTarget | RangeSelectionTarget;

export type EditingOrigin = "formulaBar" | "cellEditor";

export type EditingSelection =
  | (CellSelectionTarget & { value: string; isDirty: boolean })
  | (RangeSelectionTarget & { value: string; isDirty: boolean });

export type EditorActivity = Record<EditingOrigin, boolean>;

const createInactiveEditors = (): EditorActivity => ({
  formulaBar: false,
  cellEditor: false,
});

const isSingleCellRange = (range: SelectionRange): boolean => {
  const isSingleColumn = range.endCol - range.startCol === 1;
  const isSingleRow = range.endRow - range.startRow === 1;
  return isSingleColumn && isSingleRow;
};

export const rangeToSelectionTarget = (range: SelectionRange | null): SelectionTarget | null => {
  if (!range) {
    return null;
  }
  if (isSingleCellRange(range)) {
    return {
      kind: "cell",
      col: range.startCol,
      row: range.startRow,
    } satisfies CellSelectionTarget;
  }
  return {
    kind: "range",
    startCol: range.startCol,
    endCol: range.endCol,
    startRow: range.startRow,
    endRow: range.endRow,
  } satisfies RangeSelectionTarget;
};

export const selectionToRange = (selection: SelectionTarget): SelectionRange => {
  if (selection.kind === "cell") {
    const { col, row } = selection;
    return {
      startCol: col,
      endCol: col + 1,
      startRow: row,
      endRow: row + 1,
    };
  }
  return {
    startCol: selection.startCol,
    endCol: selection.endCol,
    startRow: selection.startRow,
    endRow: selection.endRow,
  };
};

export type SheetState = {
  columnSizes: ColumnSizeMap;
  rowSizes: RowSizeMap;
  defaultCellWidth: number;
  defaultCellHeight: number;
  selectionRect: Rect | null;
  selection: SelectionTarget | null;
  selectionAnchor: { col: number; row: number } | null;
  isDragging: boolean;
  dragStartPos: Point | null;
  styleRegistry: StyleRegistry;
  editingSelection: EditingSelection | null;
  editorActivity: EditorActivity;
};

export type SheetAction = ActionUnion<typeof sheetActions>;

export const initialSheetState: SheetState = {
  columnSizes: new Map(),
  rowSizes: new Map(),
  defaultCellWidth: 100,
  defaultCellHeight: 24,
  selectionRect: null,
  selection: null,
  selectionAnchor: null,
  isDragging: false,
  dragStartPos: null,
  styleRegistry: createStyleRegistry(),
  editingSelection: null,
  editorActivity: createInactiveEditors(),
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
      selection: null,
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

    const selection = rangeToSelectionTarget(range);

    return {
      ...state,
      isDragging: false,
      selectionRect: null, // Clear rect after selection is done
      selection,
      // Set anchor to the start of the range for future shift selections
      selectionAnchor: range ? { col: range.startCol, row: range.startRow } : null,
    };
  },

  clearSelection: (state) => {
    const selectionState = clearSelectionState();
    return {
      ...state,
      selectionRect: null,
      selection: selectionState.selection,
      selectionAnchor: selectionState.anchor,
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
    const selectionState = createRangeSelectionWithoutAnchor(0, SAFE_MAX_COLUMNS, row, row + 1);

    return {
      ...state,
      selectionRect: null,
      selection: selectionState.selection,
      selectionAnchor: selectionState.anchor,
      isDragging: false,
      dragStartPos: null,
    };
  },

  selectColumn: (state, action) => {
    const { col } = action.payload;
    const selectionState = createRangeSelectionWithoutAnchor(col, col + 1, 0, SAFE_MAX_ROWS);

    return {
      ...state,
      selectionRect: null,
      selection: selectionState.selection,
      selectionAnchor: selectionState.anchor,
      isDragging: false,
      dragStartPos: null,
    };
  },

  selectSheet: (state) => {
    const selectionState = createRangeSelectionWithoutAnchor(0, SAFE_MAX_COLUMNS, 0, SAFE_MAX_ROWS);

    return {
      ...state,
      selectionRect: null,
      selection: selectionState.selection,
      selectionAnchor: selectionState.anchor,
      isDragging: false,
      dragStartPos: null,
    };
  },

  startEditingCell: (state, action) => {
    const { col, row, initialValue, origin } = action.payload;
    const editorActivity: EditorActivity = {
      ...state.editorActivity,
      [origin]: true,
    };
    return {
      ...state,
      selection: {
        kind: "cell",
        col,
        row,
      },
      editingSelection: {
        kind: "cell",
        col,
        row,
        value: initialValue,
        isDirty: false,
      },
      editorActivity,
    };
  },

  startEditingRange: (state, action) => {
    const { range, initialValue, origin } = action.payload;
    const editorActivity: EditorActivity = {
      ...state.editorActivity,
      [origin]: true,
    };
    return {
      ...state,
      selection: rangeToSelectionTarget(range),
      editingSelection: {
        kind: "range",
        startCol: range.startCol,
        endCol: range.endCol,
        startRow: range.startRow,
        endRow: range.endRow,
        value: initialValue,
        isDirty: false,
      },
      editorActivity,
    };
  },

  updateEditingValue: (state, action) => {
    if (!state.editingSelection) {
      return state;
    }
    if (state.editingSelection.value === action.payload.value) {
      return state;
    }
    return {
      ...state,
      editingSelection: {
        ...state.editingSelection,
        value: action.payload.value,
        isDirty: true,
      },
    };
  },

  commitEdit: (state, action) => {
    // TODO: Apply the edit value to the actual cell data
    // For now, we just clear the editing state
    // The actual implementation should update sheet.cells based on:
    // - action.payload.value (or state.editingSelection.value if not provided)
    // - action.payload.range (or derived from state.editingSelection if not provided)
    return {
      ...state,
      editingSelection: null,
      editorActivity: createInactiveEditors(),
    };
  },

  cancelEdit: (state) => {
    return {
      ...state,
      editingSelection: null,
      editorActivity: createInactiveEditors(),
    };
  },

  setActiveCell: (state, action) => {
    const { col, row } = action.payload;
    const selectionState = createCellSelection(col, row);
    return {
      ...state,
      selection: selectionState.selection,
      selectionAnchor: selectionState.anchor,
    };
  },

  clearActiveCell: (state) => {
    const selectionState = clearSelectionState();
    return {
      ...state,
      selection: selectionState.selection,
      selectionAnchor: selectionState.anchor,
    };
  },

  extendSelectionToCell: (state, action) => {
    const { col, row } = action.payload;
    const currentSelectionState = {
      selection: state.selection,
      anchor: state.selectionAnchor,
    };
    const newSelectionState = extendSelection(currentSelectionState, col, row);

    return {
      ...state,
      selection: newSelectionState.selection,
      selectionAnchor: newSelectionState.anchor,
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
