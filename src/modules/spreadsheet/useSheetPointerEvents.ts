/**
 * @file Hook for handling pointer events on sheet container for rect-based selection and cell interaction.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { BoundActionCreators } from "../../utils/typedActions";
import type { sheetActions } from "./sheetActions";
import type { Sheet, SpreadSheet } from "../../types";
import { findColumnAtPosition, findRowAtPosition } from "./gridLayout";
import type { ColumnSizeMap, RowSizeMap } from "./gridLayout";
import type { SelectionTarget, EditingSelection, EditorActivity } from "./sheetReducer";
import type { FormulaTargetingState, CellRange, FormulaReferenceHighlight } from "./formulaTargetingTypes";
import { formatReferenceFromRange } from "../formula/editor/references";
import {
  analyseFormulaForTargeting,
  createFallbackArgumentEntry,
  type FormulaArgumentEntry,
} from "./formulaTargetingUtils";

export type UseSheetPointerEventsParams = {
  actions: BoundActionCreators<typeof sheetActions>;
  scrollLeft: number;
  scrollTop: number;
  headerColumnWidth: number;
  headerRowHeight: number;
  defaultCellWidth: number;
  defaultCellHeight: number;
  columnSizes: ColumnSizeMap;
  rowSizes: RowSizeMap;
  maxColumns: number;
  maxRows: number;
  sheet: Sheet;
  spreadsheet: SpreadSheet;
  selection: SelectionTarget | null;
  selectionAnchor: { col: number; row: number } | null;
  editingSelection: EditingSelection | null;
  editingCaret: { start: number; end: number };
  editorActivity: EditorActivity;
  formulaTargeting: FormulaTargetingState | null;
};

type PointerTarget = {
  setPointerCapture: (pointerId: number) => void;
  releasePointerCapture: (pointerId: number) => void;
  getBoundingClientRect: () => DOMRect;
};

export type SheetPointerEvent = {
  readonly pointerId: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly shiftKey: boolean;
  readonly currentTarget: PointerTarget;
  readonly preventDefault: () => void;
};

export type UseSheetPointerEventsReturn = {
  handlePointerDown: (event: SheetPointerEvent) => void;
  handlePointerMove: (event: SheetPointerEvent) => void;
  handlePointerUp: (event: SheetPointerEvent) => void;
};

/**
 * Hook for handling pointer events on sheet container.
 * Provides rect-based selection and cell interaction.
 * @param params - Configuration parameters
 * @returns Pointer event handlers
 */
export const useSheetPointerEvents = ({
  actions,
  scrollLeft,
  scrollTop,
  headerColumnWidth,
  headerRowHeight,
  defaultCellWidth,
  defaultCellHeight,
  columnSizes,
  rowSizes,
  maxColumns,
  maxRows,
  sheet,
  spreadsheet,
  selection,
  selectionAnchor,
  editingSelection,
  editingCaret,
  editorActivity,
  formulaTargeting,
}: UseSheetPointerEventsParams): UseSheetPointerEventsReturn => {
  const isDraggingRef = useRef(false);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastClickRef = useRef<{ col: number; row: number; time: number } | null>(null);
  const isShiftExtendingRef = useRef(false);
  const lastExtendedCellRef = useRef<{ col: number; row: number } | null>(null);
  const formulaTargetPointerRef = useRef<{ pointerId: number | null; startCell: { col: number; row: number } | null }>({
    pointerId: null,
    startCell: null,
  });

  const hasActiveEditor = [editorActivity.formulaBar, editorActivity.cellEditor].some((value) => value);
  const isFormulaCandidate = (() => {
    if (!editingSelection) {
      return false;
    }
    return editingSelection.value.trimStart().startsWith("=");
  })();
  const isFormulaEditingActive = hasActiveEditor ? isFormulaCandidate : false;

  const targetingAnalysis = useMemo(() => {
    if (!editingSelection) {
      return {
        analysis: null,
        entries: [],
        activeEntry: null,
      } satisfies ReturnType<typeof analyseFormulaForTargeting>;
    }
    return analyseFormulaForTargeting({
      value: editingSelection.value,
      caret: editingCaret,
      sheetId: sheet.id,
      sheetName: sheet.name,
      spreadsheet,
    });
  }, [editingSelection, editingCaret, sheet.id, sheet.name, spreadsheet]);

  const defaultTargetingEntry = useMemo<FormulaArgumentEntry | null>(() => {
    if (!editingSelection) {
      return null;
    }
    if (!isFormulaCandidate) {
      return null;
    }
    if (targetingAnalysis.entries.length > 0) {
      return targetingAnalysis.activeEntry ?? targetingAnalysis.entries[0] ?? null;
    }
    return createFallbackArgumentEntry({
      caret: editingCaret,
      sheetId: sheet.id,
      sheetName: sheet.name,
      value: editingSelection.value,
    });
  }, [editingSelection, editingCaret, isFormulaCandidate, sheet.id, sheet.name, targetingAnalysis]);

  const targetingFunctionName = targetingAnalysis.analysis?.name ?? "";

  const isTargetingReady = useCallback(
    (targeting: FormulaTargetingState | null): boolean => {
      if (!targeting) {
        return false;
      }
      return isFormulaEditingActive;
    },
    [isFormulaEditingActive],
  );

  useEffect(() => {
    const highlights = targetingAnalysis.entries
      .map((entry) => entry.highlight)
      .filter(
        (highlight): highlight is FormulaReferenceHighlight => highlight !== null,
      );
    actions.setFormulaReferenceHighlights(highlights);
    return () => {
      actions.setFormulaReferenceHighlights([]);
    };
  }, [actions, targetingAnalysis.entries]);

  const ensureFormulaTargeting = useCallback(
    (currentSheetId: string): FormulaTargetingState | null => {
      if (!isFormulaEditingActive) {
        return null;
      }
      if (formulaTargeting) {
        return formulaTargeting;
      }
      if (!defaultTargetingEntry) {
        return null;
      }
      const targetingState: FormulaTargetingState = {
        replaceStart: defaultTargetingEntry.replaceStart,
        replaceEnd: defaultTargetingEntry.replaceEnd,
        argumentLabel: defaultTargetingEntry.label,
        functionName: targetingFunctionName,
        argumentIndex: defaultTargetingEntry.argumentIndex,
        originSheetId: sheet.id,
        originSheetName: sheet.name,
        startColor: defaultTargetingEntry.color.start,
        endColor: defaultTargetingEntry.color.end,
        previewRange: null,
        previewSheetId: currentSheetId,
      };
      actions.startFormulaTargeting(targetingState);
      return targetingState;
    },
    [
      actions,
      defaultTargetingEntry,
      formulaTargeting,
      isFormulaEditingActive,
      sheet.id,
      sheet.name,
      targetingFunctionName,
    ],
  );

  const resolveInitialValue = useCallback(
    (col: number, row: number): string => {
      const cellId = `${col}:${row}` as const;
      const cellData = sheet.cells[cellId];
      if (!cellData) {
        return "";
      }
      if (cellData.type === "formula" && cellData.formula) {
        return `=${cellData.formula}`;
      }
      if (cellData.value === null || cellData.value === undefined) {
        return "";
      }
      return String(cellData.value);
    },
    [sheet.cells],
  );

  const getPositionFromPointer = useCallback(
    (event: SheetPointerEvent): { x: number; y: number } | null => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left + scrollLeft - headerColumnWidth;
      const y = event.clientY - rect.top + scrollTop - headerRowHeight;

      if (x < 0 || y < 0) {
        return null;
      }

      return { x, y };
    },
    [scrollLeft, scrollTop, headerColumnWidth, headerRowHeight],
  );

  const getCellAtPosition = useCallback(
    (x: number, y: number): { col: number; row: number } | null => {
      const col = findColumnAtPosition(x, defaultCellWidth, columnSizes, maxColumns);
      const row = findRowAtPosition(y, defaultCellHeight, rowSizes, maxRows);

      if (col >= maxColumns || row >= maxRows) {
        return null;
      }

      return { col, row };
    },
    [defaultCellWidth, defaultCellHeight, columnSizes, rowSizes, maxColumns, maxRows],
  );

  const createRangeFromCells = (start: { col: number; row: number }, end: { col: number; row: number }): CellRange => {
    const startCol = Math.min(start.col, end.col);
    const startRow = Math.min(start.row, end.row);
    const endCol = Math.max(start.col, end.col) + 1;
    const endRow = Math.max(start.row, end.row) + 1;
    return {
      startCol,
      startRow,
      endCol,
      endRow,
    };
  };

  const handlePointerDown = useCallback(
    (event: SheetPointerEvent): void => {
      const pos = getPositionFromPointer(event);
      if (!pos) {
        return;
      }

      let activeTargeting = formulaTargeting;
      if (!isTargetingReady(activeTargeting) && isFormulaEditingActive) {
        activeTargeting = ensureFormulaTargeting(sheet.id);
      }

      if (isTargetingReady(activeTargeting)) {
        event.preventDefault();
        const cell = getCellAtPosition(pos.x, pos.y);
        formulaTargetPointerRef.current = {
          pointerId: event.pointerId,
          startCell: cell,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        if (cell) {
          actions.updateFormulaTargetPreview(createRangeFromCells(cell, cell), sheet.id);
        } else {
          actions.updateFormulaTargetPreview(null, sheet.id);
        }
        return;
      }

      pointerDownPosRef.current = pos;
      isDraggingRef.current = false;
      isShiftExtendingRef.current = false;
      lastExtendedCellRef.current = null;

      event.currentTarget.setPointerCapture(event.pointerId);

      if (event.shiftKey) {
        if (selection === null) {
          return;
        }
        if (selectionAnchor === null) {
          return;
        }

        const cell = getCellAtPosition(pos.x, pos.y);
        if (cell) {
          actions.extendSelectionToCell(cell.col, cell.row);
          lastExtendedCellRef.current = cell;
          isShiftExtendingRef.current = true;
        }
        return;
      }
    },
    [
      actions,
      ensureFormulaTargeting,
      formulaTargeting,
      getCellAtPosition,
      getPositionFromPointer,
      isFormulaEditingActive,
      isTargetingReady,
      selection,
      selectionAnchor,
      sheet.id,
    ],
  );

  const handlePointerMove = useCallback(
    (event: SheetPointerEvent): void => {
      const pos = getPositionFromPointer(event);
      if (!pos) {
        return;
      }

      const pointerMatches = formulaTargetPointerRef.current.pointerId === event.pointerId;
      if (pointerMatches && isTargetingReady(formulaTargeting)) {
        const startCell = formulaTargetPointerRef.current.startCell;
        const cell = getCellAtPosition(pos.x, pos.y);
        if (!startCell) {
          if (!cell) {
            return;
          }
          formulaTargetPointerRef.current = {
            pointerId: event.pointerId,
            startCell: cell,
          };
          actions.updateFormulaTargetPreview(createRangeFromCells(cell, cell), sheet.id);
          return;
        }
        if (!cell) {
          return;
        }
        actions.updateFormulaTargetPreview(createRangeFromCells(startCell, cell), sheet.id);
        return;
      }

      if (!pointerDownPosRef.current) {
        return;
      }

      if (isShiftExtendingRef.current) {
        const cell = getCellAtPosition(pos.x, pos.y);
        if (!cell) {
          return;
        }

        const lastExtendedCell = lastExtendedCellRef.current;
        if (lastExtendedCell) {
          if (lastExtendedCell.col === cell.col) {
            if (lastExtendedCell.row === cell.row) {
              return;
            }
          }
        }

        actions.extendSelectionToCell(cell.col, cell.row);
        lastExtendedCellRef.current = cell;
        return;
      }

      const dx = Math.abs(pos.x - pointerDownPosRef.current.x);
      const dy = Math.abs(pos.y - pointerDownPosRef.current.y);

      // Start dragging if moved more than 3px
      if (!isDraggingRef.current) {
        if (dx <= 3 && dy <= 3) {
          return;
        }
        isDraggingRef.current = true;
        actions.startRectSelection(pointerDownPosRef.current.x, pointerDownPosRef.current.y);
      }

      actions.updateRectSelection(pos.x, pos.y);
    },
    [actions, formulaTargeting, getCellAtPosition, getPositionFromPointer, isTargetingReady, sheet.id],
  );

  const handlePointerUp = useCallback(
    (event: SheetPointerEvent): void => {
      const pointerMatches = formulaTargetPointerRef.current.pointerId === event.pointerId;
      if (pointerMatches && isTargetingReady(formulaTargeting)) {
        const pos = getPositionFromPointer(event);
        event.currentTarget.releasePointerCapture(event.pointerId);
        const startCell = formulaTargetPointerRef.current.startCell;
        const endCell = pos ? getCellAtPosition(pos.x, pos.y) : null;
        if (startCell) {
          const finalCell = endCell ?? startCell;
          const range = createRangeFromCells(startCell, finalCell);
          const originSheetId = formulaTargeting?.originSheetId ?? sheet.id;
          const sheetName = originSheetId === sheet.id ? null : sheet.name;
          const reference = formatReferenceFromRange(range, sheetName);
          const currentValue = editingSelection?.value ?? "";
          const replaceStart = formulaTargeting?.replaceStart ?? 0;
          const replaceEnd = formulaTargeting?.replaceEnd ?? replaceStart;
          const prefix = currentValue.slice(0, replaceStart);
          const suffix = currentValue.slice(replaceEnd);
          const nextValue = `${prefix}${reference}${suffix}`;
          actions.updateEditingValue(nextValue);
          const caretIndex = replaceStart + reference.length;
          actions.setEditingCaretRange(caretIndex, caretIndex);
        }
        actions.updateFormulaTargetPreview(null, sheet.id);
        actions.clearFormulaTargeting();
        formulaTargetPointerRef.current = { pointerId: null, startCell: null };
        pointerDownPosRef.current = null;
        lastExtendedCellRef.current = null;
        isShiftExtendingRef.current = false;
        isDraggingRef.current = false;
        return;
      }

      if (!pointerDownPosRef.current) {
        return;
      }

      const pos = getPositionFromPointer(event);
      event.currentTarget.releasePointerCapture(event.pointerId);

      if (isShiftExtendingRef.current) {
        isShiftExtendingRef.current = false;
        pointerDownPosRef.current = null;
        lastExtendedCellRef.current = null;
        return;
      }

      if (isDraggingRef.current) {
        // Was dragging - end selection
        isDraggingRef.current = false;
        actions.endRectSelection();
      } else if (pos) {
        // Was a click - check for cell click or double-click
        const cell = getCellAtPosition(pos.x, pos.y);
        if (cell) {
          const now = Date.now();
          const isDoubleClick = (() => {
            const previous = lastClickRef.current;
            if (!previous) {
              return false;
            }
            if (previous.col !== cell.col) {
              return false;
            }
            if (previous.row !== cell.row) {
              return false;
            }
            return now - previous.time < 300;
          })();

          if (event.shiftKey) {
            actions.extendSelectionToCell(cell.col, cell.row);
            lastClickRef.current = null;
          } else if (isDoubleClick) {
            const initialValue = resolveInitialValue(cell.col, cell.row);
            actions.startEditingCell(cell.col, cell.row, initialValue, "cellEditor");
            lastClickRef.current = null;
          } else {
            actions.setActiveCell(cell.col, cell.row);
            lastClickRef.current = { col: cell.col, row: cell.row, time: now };
          }
        }
      }

      pointerDownPosRef.current = null;
      formulaTargetPointerRef.current = { pointerId: null, startCell: null };
    },
    [
      actions,
      editingSelection,
      formulaTargeting,
      getCellAtPosition,
      getPositionFromPointer,
      isTargetingReady,
      resolveInitialValue,
      selection,
      selectionAnchor,
      sheet.id,
      sheet.name,
    ],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};

// Notes:
// - Reviewed src/modules/spreadsheet/sheetReducer.ts to ensure shift-extend interactions align with existing selection state transitions.
// - Reviewed src/components/Sheet.tsx to confirm pointer event hook parameters cover current selection metadata for drag behaviors.
// - Revisited src/modules/spreadsheet/formulaTargetingUtils.ts to validate fallback targeting is limited to formula-prefixed inputs.
