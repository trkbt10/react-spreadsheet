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
import {
  createCellSelection,
  extendSelection,
  clearSelection as clearSelectionState,
  createRangeSelectionWithoutAnchor,
} from "./selectionState";
import type { CellUpdate } from "./cellUpdates";
import type { FormulaReferenceHighlight, FormulaTargetingState } from "./formulaTargetingTypes";

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
  if (!isSingleColumn) {
    return false;
  }
  return range.endRow - range.startRow === 1;
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

const generateUpdatesFromRange = (range: SelectionRange, value: string): Array<CellUpdate> => {
  const rowIndexes = Array.from({ length: range.endRow - range.startRow }, (_, index) => range.startRow + index);
  return rowIndexes.flatMap((row) => {
    const colIndexes = Array.from({ length: range.endCol - range.startCol }, (__, index) => range.startCol + index);
    return colIndexes.map(
      (col) =>
        ({
          col,
          row,
          value,
        }) satisfies CellUpdate,
    );
  });
};

const highlightsEqual = (
  left: ReadonlyArray<FormulaReferenceHighlight>,
  right: ReadonlyArray<FormulaReferenceHighlight>,
): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((highlight, index) => {
    const other = right[index];
    if (!other) {
      return false;
    }
    if (highlight.range.startCol !== other.range.startCol) {
      return false;
    }
    if (highlight.range.startRow !== other.range.startRow) {
      return false;
    }
    if (highlight.range.endCol !== other.range.endCol) {
      return false;
    }
    if (highlight.range.endRow !== other.range.endRow) {
      return false;
    }
    if (highlight.startColor !== other.startColor) {
      return false;
    }
    if (highlight.endColor !== other.endColor) {
      return false;
    }
    if (highlight.label !== other.label) {
      return false;
    }
    return highlight.sheetId === other.sheetId;
  });
};

const caretEqual = (left: { start: number; end: number }, right: { start: number; end: number }): boolean => {
  return left.start === right.start && left.end === right.end;
};

const previewEqual = (
  left: FormulaTargetingState["previewRange"],
  right: FormulaTargetingState["previewRange"],
): boolean => {
  if (!left || !right) {
    return left === right;
  }
  if (left.startCol !== right.startCol) {
    return false;
  }
  if (left.startRow !== right.startRow) {
    return false;
  }
  if (left.endCol !== right.endCol) {
    return false;
  }
  return left.endRow === right.endRow;
};

const targetingEqual = (left: FormulaTargetingState | null, right: FormulaTargetingState | null): boolean => {
  if (!left || !right) {
    return left === right;
  }
  if (left.replaceStart !== right.replaceStart) {
    return false;
  }
  if (left.replaceEnd !== right.replaceEnd) {
    return false;
  }
  if (left.argumentLabel !== right.argumentLabel) {
    return false;
  }
  if (left.functionName !== right.functionName) {
    return false;
  }
  if (left.argumentIndex !== right.argumentIndex) {
    return false;
  }
  if (left.originSheetId !== right.originSheetId) {
    return false;
  }
  if (left.originSheetName !== right.originSheetName) {
    return false;
  }
  if (left.previewSheetId !== right.previewSheetId) {
    return false;
  }
  if (left.startColor !== right.startColor) {
    return false;
  }
  if (left.endColor !== right.endColor) {
    return false;
  }
  return previewEqual(left.previewRange, right.previewRange);
};

const createUpdateKey = (update: CellUpdate): string => `${update.col}:${update.row}`;

const mergeOptimisticUpdates = (
  base: ReadonlyArray<CellUpdate>,
  updates: ReadonlyArray<CellUpdate>,
): ReadonlyArray<CellUpdate> => {
  if (updates.length === 0) {
    return base;
  }

  const baseMap = new Map(base.map((update) => [createUpdateKey(update), update] as const));
  const mergedMap = updates.reduce(
    (map, update) => {
      map.set(createUpdateKey(update), update);
      return map;
    },
    new Map(baseMap),
  );

  const merged = Array.from(mergedMap.values());
  if (merged.length !== base.length) {
    return merged;
  }

  const allMatching = merged.every((update) => {
    const original = baseMap.get(createUpdateKey(update));
    return original !== undefined && original.value === update.value;
  });

  return allMatching ? base : merged;
};

const pruneOptimisticUpdates = (
  base: ReadonlyArray<CellUpdate>,
  updates: ReadonlyArray<CellUpdate>,
): ReadonlyArray<CellUpdate> => {
  if (base.length === 0 || updates.length === 0) {
    return base;
  }

  const keysToRemove = new Set(updates.map(createUpdateKey));
  if (keysToRemove.size === 0) {
    return base;
  }

  const next = base.filter((update) => !keysToRemove.has(createUpdateKey(update)));
  if (next.length === base.length) {
    return base;
  }

  return next;
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
  pendingUpdates: ReadonlyArray<CellUpdate>;
  optimisticUpdates: ReadonlyArray<CellUpdate>;
  editingCaret: { start: number; end: number };
  formulaReferenceHighlights: ReadonlyArray<FormulaReferenceHighlight>;
  formulaTargeting: FormulaTargetingState | null;
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
  pendingUpdates: [],
  optimisticUpdates: [],
  editingCaret: { start: 0, end: 0 },
  formulaReferenceHighlights: [],
  formulaTargeting: null,
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
    const editorActivity: EditorActivity = createInactiveEditors();
    editorActivity[origin] = true;
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
      editingCaret: {
        start: 0,
        end: initialValue.length,
      },
      formulaReferenceHighlights: [],
      formulaTargeting: null,
    };
  },

  startEditingRange: (state, action) => {
    const { range, initialValue, origin } = action.payload;
    const editorActivity: EditorActivity = createInactiveEditors();
    editorActivity[origin] = true;
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
      editingCaret: {
        start: 0,
        end: initialValue.length,
      },
      formulaReferenceHighlights: [],
      formulaTargeting: null,
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

  setEditingCaretRange: (state, action) => {
    const nextCaret = {
      start: action.payload.start,
      end: action.payload.end,
    };
    if (caretEqual(state.editingCaret, nextCaret)) {
      return state;
    }
    return {
      ...state,
      editingCaret: nextCaret,
    };
  },

  setFormulaReferenceHighlights: (state, action) => {
    if (highlightsEqual(state.formulaReferenceHighlights, action.payload.highlights)) {
      return state;
    }
    return {
      ...state,
      formulaReferenceHighlights: action.payload.highlights,
    };
  },

  startFormulaTargeting: (state, action) => {
    const nextTargeting: FormulaTargetingState = {
      ...action.payload.targeting,
      previewRange: null,
      previewSheetId: action.payload.targeting.previewSheetId ?? action.payload.targeting.originSheetId,
    };
    if (targetingEqual(state.formulaTargeting, nextTargeting)) {
      return state;
    }
    return {
      ...state,
      formulaTargeting: nextTargeting,
    };
  },

  updateFormulaTargetPreview: (state, action) => {
    if (!state.formulaTargeting) {
      return state;
    }
    const nextPreviewSheetId = action.payload.sheetId ?? state.formulaTargeting.previewSheetId;
    if (
      previewEqual(state.formulaTargeting.previewRange, action.payload.previewRange) &&
      state.formulaTargeting.previewSheetId === nextPreviewSheetId
    ) {
      return state;
    }
    return {
      ...state,
      formulaTargeting: {
        ...state.formulaTargeting,
        previewRange: action.payload.previewRange,
        previewSheetId: nextPreviewSheetId,
      },
    };
  },

  clearFormulaTargeting: (state) => {
    if (!state.formulaTargeting) {
      return state;
    }
    return {
      ...state,
      formulaTargeting: null,
    };
  },

  commitEdit: (state, action) => {
    const editingSelection = state.editingSelection;
    const explicitRange = action.payload.range ?? null;
    const overrideValue = action.payload.value;

    if (!editingSelection && explicitRange === null) {
      throw new Error("commitEdit requires an active editing selection or an explicit range");
    }

    if (
      editingSelection !== null &&
      !editingSelection.isDirty &&
      overrideValue === undefined &&
      explicitRange === null
    ) {
      return {
        ...state,
        editingSelection: null,
        editorActivity: createInactiveEditors(),
        pendingUpdates: [],
        formulaReferenceHighlights: [],
        formulaTargeting: null,
        editingCaret: { start: 0, end: 0 },
      };
    }

    const targetRange = explicitRange ?? (editingSelection ? selectionToRange(editingSelection) : null);
    if (!targetRange) {
      throw new Error("commitEdit could not determine a target range");
    }

    const valueToApply = overrideValue ?? editingSelection?.value;
    if (valueToApply === undefined) {
      throw new Error("commitEdit requires a value to apply");
    }

    const updates = generateUpdatesFromRange(targetRange, valueToApply);

    return {
      ...state,
      editingSelection: null,
      editorActivity: createInactiveEditors(),
      pendingUpdates: updates,
      optimisticUpdates: mergeOptimisticUpdates(state.optimisticUpdates, updates),
      formulaReferenceHighlights: [],
      formulaTargeting: null,
      editingCaret: { start: 0, end: 0 },
    };
  },

  clearPendingUpdates: (state) => {
    if (state.pendingUpdates.length === 0) {
      return state;
    }
    return {
      ...state,
      pendingUpdates: [],
    };
  },

  recordOptimisticUpdates: (state, action) => {
    const merged = mergeOptimisticUpdates(state.optimisticUpdates, action.payload.updates);
    if (merged === state.optimisticUpdates) {
      return state;
    }
    return {
      ...state,
      optimisticUpdates: merged,
    };
  },

  removeOptimisticUpdates: (state, action) => {
  const reduced = pruneOptimisticUpdates(state.optimisticUpdates, action.payload.updates);
    if (reduced === state.optimisticUpdates) {
      return state;
    }
    return {
      ...state,
      optimisticUpdates: reduced,
    };
  },

  setOptimisticUpdates: (state, action) => {
    if (state.optimisticUpdates === action.payload.updates) {
      return state;
    }
    return {
      ...state,
      optimisticUpdates: action.payload.updates,
    };
  },

  cancelEdit: (state) => {
    return {
      ...state,
      editingSelection: null,
      editorActivity: createInactiveEditors(),
      formulaReferenceHighlights: [],
      formulaTargeting: null,
      editingCaret: { start: 0, end: 0 },
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
